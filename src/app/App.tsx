import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { LocalAuthService, type AuthService, type AuthUser } from '../auth/AuthService';
import type { DataMode } from '../config/dataMode';
import { AccountSettings } from '../components/AccountSettings';
import { AnalyticsSummary } from '../components/AnalyticsSummary';
import { FaqPage } from '../components/FaqPage';
import { ProgressSummary } from '../components/ProgressSummary';
import { PmleOverview } from '../components/PmleOverview';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionNavigation } from '../components/QuestionNavigation';
import { QuizFilters } from '../components/QuizFilters';
import { SaveProgressButton } from '../components/SaveProgressButton';
import { SampleQuestionsPage } from '../components/SampleQuestionsPage';
import { TipJar } from '../components/TipJar';
import { loadQuestionBank, type LoadedQuestionBank } from '../data/csv/loadQuestionBank';
import { initialQuizState, quizReducer } from '../domain/quizReducer';
import { selectCounts, selectFilteredQuestions, toUserProgress } from '../domain/selectors';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { ProgressStore } from '../storage/ProgressStore';
import { LocalStorageQuizPreferences, type QuizPreferences } from '../storage/QuizPreferences';
import { reconcileProgress } from '../storage/reconcileProgress';
import { LocalFeedbackStore, type FeedbackStore } from '../storage/FeedbackStore';

export interface AppProps {
  bankLoader?: () => Promise<LoadedQuestionBank>;
  progressStore?: ProgressStore;
  preferences?: QuizPreferences;
  authService?: AuthService;
  feedbackStore?: FeedbackStore;
  dataMode?: DataMode;
}

export function App({
  bankLoader = loadQuestionBank,
  progressStore,
  preferences,
  authService,
  feedbackStore,
  dataMode = 'local',
}: AppProps) {
  const buyMeACoffeeUrl = import.meta.env.VITE_BUY_ME_A_COFFEE_URL || 'https://buymeacoffee.com/okeanos';
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const [authResolved, setAuthResolved] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'practice' | 'summary'>('practice');
  const [faqOpen, setFaqOpen] = useState(() => window.location.pathname.replace(/\/$/, '') === '/faq');
  const [samplesOpen, setSamplesOpen] = useState(() => window.location.pathname.replace(/\/$/, '') === '/sample-questions');
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const store = useMemo(() => progressStore ?? new LocalStorageProgressStore(), [progressStore]);
  const preferenceStore = useMemo(() => preferences ?? new LocalStorageQuizPreferences(), [preferences]);
  const auth = useMemo(() => authService ?? new LocalAuthService(), [authService]);
  const feedback = useMemo(() => feedbackStore ?? new LocalFeedbackStore(), [feedbackStore]);
  const accountMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPage = () => {
      const path = window.location.pathname.replace(/\/$/, '');
      setFaqOpen(path === '/faq');
      setSamplesOpen(path === '/sample-questions');
    };
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenu.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => auth.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthResolved(true);
    setAuthError(null);
  }), [auth]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function start() {
      setLoading(true);
      setFatalError(null);
      setStorageError(null);
      dispatch({ type: 'reset' });
      try {
        const bank = await bankLoader();
        if (!active) return;
        dispatch({ type: 'bankLoaded', questions: bank.questions, questionBankVersion: bank.version });
        dispatch({ type: 'filterChanged', filter: preferenceStore.loadFilter() });
        try {
          const saved = await store.load(user!.uid);
          if (saved && active) {
            const reconciled = reconcileProgress(saved, bank.questions, bank.version);
            dispatch({ type: 'progressLoaded', progress: reconciled.progress, reconciliationNotice: reconciled.notice });
          }
        } catch (error) {
          if (active) setStorageError(error instanceof Error ? error.message : 'Saved progress could not be loaded.');
        }
      } catch (error) {
        if (active) setFatalError(error instanceof Error ? error.message : 'The question bank could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void start();
    return () => { active = false; };
  }, [bankLoader, preferenceStore, store, user]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!state.dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.dirty]);

  const visible = selectFilteredQuestions(state);
  const currentFromBank = state.questions.find((question) => question.questionId === state.currentQuestionId);
  const displayQuestions = currentFromBank && !visible.some((question) => question.questionId === currentFromBank.questionId)
    ? [currentFromBank, ...visible]
    : visible;
  const currentIndex = displayQuestions.findIndex((question) => question.questionId === state.currentQuestionId);
  const current = displayQuestions[currentIndex] ?? displayQuestions[0];
  const counts = selectCounts(state);
  const debugMetadata = new URLSearchParams(window.location.search).get('debug') === 'true';
  const changeFilter = (filter: typeof state.filter) => {
    preferenceStore.saveFilter(filter);
    dispatch({ type: 'filterChanged', filter });
  };
  const openReviewQueue = (filter: typeof state.filter) => {
    changeFilter(filter);
    setActiveView('practice');
  };
  const openFaq = () => {
    window.history.pushState({}, '', '/faq');
    setFaqOpen(true);
    setSamplesOpen(false);
    setSettingsOpen(false);
    setAccountMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const closeFaq = () => {
    window.history.pushState({}, '', '/');
    setFaqOpen(false);
    setSamplesOpen(false);
    window.scrollTo({ top: 0 });
  };
  const openSamples = () => {
    window.history.pushState({}, '', '/sample-questions');
    setSamplesOpen(true);
    setFaqOpen(false);
    setSettingsOpen(false);
    setAccountMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  const save = async () => {
    dispatch({ type: 'saveStarted' });
    try {
      await store.save(toUserProgress(state), user?.uid);
      dispatch({ type: 'saveSucceeded' });
    } catch (error) {
      dispatch({ type: 'saveFailed', message: error instanceof Error ? error.message : 'Progress could not be saved.' });
    }
  };
  const reset = async () => {
    const warning = state.dirty
      ? `You have unsaved changes. Reset all ${dataMode === 'local' ? 'local' : 'cloud'} progress anyway?`
      : `Reset all progress saved ${dataMode === 'local' ? 'in this browser' : 'for this account'}?`;
    if (!window.confirm(warning)) return;
    try {
      await store.reset(user?.uid);
      dispatch({ type: 'reset' });
      setStorageError(null);
    } catch (error) {
      dispatch({ type: 'saveFailed', message: error instanceof Error ? error.message : 'Progress could not be reset.' });
    }
  };

  const signIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await auth.signIn();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (state.dirty && !window.confirm('You have unsaved changes. Sign out and discard them?')) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await auth.signOut();
      setSettingsOpen(false);
    } catch {
      setAuthError('Sign out could not be completed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setAuthBusy(true);
    setAccountError(null);
    let progressDeleted = false;
    try {
      await auth.reauthenticate();
      await store.reset(user.uid);
      progressDeleted = true;
      await auth.deleteAccount();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your account could not be deleted. Please try again.';
      setAccountError(progressDeleted ? `Your progress was deleted, but your account remains. ${message}` : message);
    } finally {
      setAuthBusy(false);
    }
  };

  if (faqOpen) return (
    <>
      <header className="site-header">
        <a href="/" className="brand" onClick={(event) => { event.preventDefault(); closeFaq(); }}><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <button className="header-button" type="button" onClick={closeFaq}>Practice</button>
      </header>
      <FaqPage onBack={closeFaq} />
      <footer><span>Quiz Trail</span><div><a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a></div></footer>
    </>
  );
  if (samplesOpen) return (
    <>
      <header className="site-header">
        <a href="/" className="brand" onClick={(event) => { event.preventDefault(); closeFaq(); }}><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <div className="account-controls">
          <a className="header-button header-link" href="/faq" onClick={(event) => { event.preventDefault(); openFaq(); }}>FAQ</a>
          <button className="header-button" type="button" onClick={closeFaq}>Practice</button>
        </div>
      </header>
      <SampleQuestionsPage bankLoader={bankLoader} onBack={closeFaq} />
      <footer><span>Quiz Trail</span><div><a href="/faq" onClick={(event) => { event.preventDefault(); openFaq(); }}>FAQ</a><a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a></div></footer>
    </>
  );
  if (!authResolved) return <main className="centered-state"><div className="loader" /><h1>Checking your session…</h1><p>Preparing Quiz Trail.</p></main>;
  if (!user) return (
    <main className="centered-state auth-state">
      <span className="brand-mark" aria-hidden="true">Q</span>
      <p className="eyebrow">PMLE practice</p>
      <h1>Continue your trail</h1>
      <p>Sign in with Google to load and save your progress across devices.</p>
      <button className="primary-button" type="button" disabled={authBusy} onClick={() => void signIn()}>
        {authBusy ? 'Opening Google…' : 'Sign in with Google'}
      </button>
      {authError && <p className="error-message" role="alert">{authError}</p>}
      <PmleOverview buyMeACoffeeUrl={buyMeACoffeeUrl} />
    </main>
  );
  if (loading) return <main className="centered-state"><div className="loader" /><h1>Loading your trail…</h1><p>Preparing the question bank.</p></main>;
  if (fatalError) return <main className="centered-state error-state"><p className="eyebrow">Question bank error</p><h1>Quiz Trail can’t start</h1><p>{fatalError}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again</button></main>;

  return (
    <>
      <header className="site-header">
        <a href="#quiz" className="brand" onClick={() => { setSettingsOpen(false); setAccountMenuOpen(false); setActiveView('practice'); }}><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <div className="account-controls">
          <a className="header-button header-link" href="/faq" onClick={(event) => { event.preventDefault(); openFaq(); }}>FAQ</a>
          <button className="header-button" type="button" onClick={() => { setSettingsOpen(false); setAccountMenuOpen(false); setActiveView((view) => view === 'summary' ? 'practice' : 'summary'); }}>{activeView === 'summary' && !settingsOpen ? 'Practice' : 'Summary'}</button>
          {auth.mode === 'local' && <button className="header-button" type="button" onClick={() => { setAccountError(null); setActiveView('practice'); setSettingsOpen(true); }}>Settings</button>}
          {auth.mode === 'firebase' && (
            <div className="account-menu" ref={accountMenu}>
              <button className="header-identity" type="button" title={user.email ?? user.displayName} aria-label={`Open account menu for ${user.displayName}`} aria-expanded={accountMenuOpen} aria-haspopup="menu" onClick={() => setAccountMenuOpen((open) => !open)}>
                {user.photoUrl
                  ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" />
                  : <span className="header-avatar" aria-hidden="true">{user.displayName.charAt(0).toUpperCase()}</span>}
                <span className="account-name">{user.displayName}</span>
                <span className="account-chevron" aria-hidden="true">⌄</span>
              </button>
              {accountMenuOpen && (
                <div className="account-popover" role="menu">
                  <div><strong>{user.displayName}</strong>{user.email && <span>{user.email}</span>}</div>
                  <button type="button" role="menuitem" disabled={authBusy} onClick={() => { setAccountError(null); setAccountMenuOpen(false); setSettingsOpen(true); }}>Settings</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {settingsOpen ? (
        <AccountSettings
          user={user}
          mode={auth.mode}
          busy={authBusy}
          error={accountError}
          buyMeACoffeeUrl={buyMeACoffeeUrl}
          onBack={() => setSettingsOpen(false)}
          onReset={() => void reset()}
          onSignOut={() => void signOut()}
          onDelete={deleteAccount}
        />
      ) : <main id="quiz" className="app-shell">
        {activeView === 'summary' ? (
          <AnalyticsSummary
            questions={state.questions}
            progress={state.progress}
            savedForLater={state.savedForLater}
            onBack={() => setActiveView('practice')}
            onReview={openReviewQueue}
          />
        ) : <>
        <section className="intro">
          <p className="eyebrow">PMLE practice</p>
          <h1>One question at a time. <em>Keep moving forward.</em></h1>
          <p>Prepare for Google Cloud’s Professional Machine Learning Engineer certification with focused practice, immediate feedback, and progress you can resume across devices.</p>
          <a className="intro-link" href="/sample-questions" onClick={(event) => { event.preventDefault(); openSamples(); }}>Try 10 free PMLE sample questions →</a>
        </section>
        <ProgressSummary counts={counts} onOpenSummary={() => setActiveView('summary')} />
        {(state.reconciliationNotice || storageError) && <div className="notice" role="status">{state.reconciliationNotice ?? storageError}</div>}
        <QuizFilters active={state.filter} onChange={changeFilter} />
        {current ? (
          <>
            <QuestionCard
              key={current.questionId}
              question={current}
              position={Math.max(currentIndex, 0) + 1}
              total={displayQuestions.length}
              saved={state.savedForLater.includes(current.questionId)}
              priorOutcome={state.progress[current.questionId]}
              showInternalMetadata={debugMetadata}
              onSubmit={(correct) => dispatch({ type: 'answerSubmitted', questionId: current.questionId, correct })}
              onToggleSaved={() => dispatch({ type: 'savedToggled', questionId: current.questionId })}
              onSubmitFeedback={async (feedbackText) => {
                const userId = user?.uid || 'anonymous';
                await feedback.submitFeedback(current.questionId, feedbackText, userId);
              }}
            />
            <QuestionNavigation
              hasPrevious={currentIndex > 0}
              hasNext={currentIndex >= 0 && currentIndex < displayQuestions.length - 1}
              onPrevious={() => dispatch({ type: 'questionChanged', questionId: displayQuestions[currentIndex - 1].questionId })}
              onNext={() => dispatch({ type: 'questionChanged', questionId: displayQuestions[currentIndex + 1].questionId })}
            />
          </>
        ) : (
          <section className="empty-state">
            <span aria-hidden="true">✓</span><h2>Nothing here right now</h2>
            <p>This view has no questions yet. Try another view to keep studying.</p>
            <button type="button" className="primary-button" onClick={() => changeFilter(counts.remaining ? 'unanswered' : 'all')}>Go to {counts.remaining ? 'Unanswered' : 'All'}</button>
          </section>
        )}
        </>}
        <SaveProgressButton
          dirty={state.dirty}
          status={state.saveStatus}
          error={state.saveError}
          storageNote={dataMode === 'local' ? 'Saved only in this browser.' : 'Saved securely to your account when you choose Save progress.'}
          onSave={() => void save()}
        />
        <TipJar buyMeACoffeeUrl={buyMeACoffeeUrl} venmoUrl={import.meta.env.VITE_VENMO_URL} />
      </main>}
      <footer>
        <span>Quiz Trail</span>
        <div>
          <span className="mode-badge">{dataMode === 'local' ? 'Local mode' : dataMode === 'firebase-emulator' ? 'Emulator mode' : 'Cloud mode'}</span>
          <span>{dataMode === 'local' ? 'Progress stays on this device' : 'Progress is linked to your signed-in account'}</span>
          <a href="/faq" onClick={(event) => { event.preventDefault(); openFaq(); }}>FAQ</a>
          <a href="/sample-questions" onClick={(event) => { event.preventDefault(); openSamples(); }}>Sample questions</a>
          <a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </>
  );
}
