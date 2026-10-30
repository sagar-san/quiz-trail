import { certifications, canAccessCertification, type Certification } from '../config/certifications';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { LocalAuthService, type AuthService, type AuthUser } from '../auth/AuthService';
import type { DataMode } from '../config/dataMode';
import { AccountSettings } from '../components/AccountSettings';
import { AnalyticsSummary } from '../components/AnalyticsSummary';
import { ProgressSummary } from '../components/ProgressSummary';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionNavigation } from '../components/QuestionNavigation';
import { QuizFilters } from '../components/QuizFilters';
import { TipJar } from '../components/TipJar';
import { loadQuestionBank, type LoadedQuestionBank } from '../data/csv/loadQuestionBank';
import { initialQuizState, quizReducer } from '../domain/quizReducer';
import { selectCounts, selectFilteredQuestions } from '../domain/selectors';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { ProgressStore } from '../storage/ProgressStore';
import { LocalStorageQuizPreferences, type QuizPreferences } from '../storage/QuizPreferences';
import { reconcileProgress } from '../storage/reconcileProgress';
import type { FeedbackStore } from '../storage/FeedbackStore';

export interface AppProps {
  certification?: Certification;
  bankLoader?: () => Promise<LoadedQuestionBank>;
  progressStore?: ProgressStore;
  preferences?: QuizPreferences;
  authService?: AuthService;
  feedbackStore?: FeedbackStore;
  dataMode?: DataMode;
}

const GUEST_QUESTION_LIMIT = 10;
type PracticeView = 'practice' | 'summary';
const viewFromUrl = (): PracticeView => new URLSearchParams(window.location.search).get('view') === 'summary' ? 'summary' : 'practice';
const isPlainClick = (event: ReactMouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function App({
  certification = certifications.pmle,
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
  const [activeView, setActiveView] = useState<PracticeView>(viewFromUrl);
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const store = useMemo<ProgressStore>(() => progressStore ?? new LocalStorageProgressStore(), [progressStore]);
  const preferenceStore = useMemo(() => preferences ?? new LocalStorageQuizPreferences(), [preferences]);
  const auth = useMemo(() => authService ?? new LocalAuthService(), [authService]);
  const allowed = canAccessCertification(certification, user);
  const isGuest = auth.mode === 'firebase' && authResolved && !user;
  const pendingWrites = useRef(new Set<Promise<void>>());
  function trackWrite(write: Promise<void>): Promise<void> {
    const tracked = write.finally(() => pendingWrites.current.delete(tracked));
    pendingWrites.current.add(tracked);
    return tracked;
  }
  async function navigateAway(href: string) {
    try {
      await Promise.all([...pendingWrites.current]);
      window.location.assign(href);
    } catch {
      setStorageError('A save failed. Review your progress before leaving this page.');
    }
  }
  const accountMenu = useRef<HTMLDivElement>(null);
  const initialProgressScrollDone = useRef(false);
  const signInRequested = useRef(new URLSearchParams(window.location.search).get('signIn') === 'true');
  const practiceHref = certification.id === 'pmle' ? '/practice/' : `/practice/?cert=${certification.id}`;
  const summaryHref = `${practiceHref}${practiceHref.includes('?') ? '&' : '?'}view=summary`;
  const leavePage = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void navigateAway(event.currentTarget.href);
  };
  const showView = (view: PracticeView) => {
    const url = new URL(window.location.href);
    if (view === 'summary') url.searchParams.set('view', 'summary');
    else url.searchParams.delete('view');
    url.hash = '';
    if (view !== activeView) window.history.pushState(null, '', `${url.pathname}${url.search}`);
    setActiveView(view);
    setSettingsOpen(false);
    setAccountMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const restoreView = () => {
      setActiveView(viewFromUrl());
      setSettingsOpen(false);
      setAccountMenuOpen(false);
    };
    window.addEventListener('popstate', restoreView);
    return () => window.removeEventListener('popstate', restoreView);
  }, []);

  useEffect(() => {
    document.title = activeView === 'summary'
      ? `${certification.label} Progress Summary | Quiz Trail`
      : certification.preview ? `${certification.title} Practice | Quiz Trail` : 'Practice Google Cloud PMLE Questions | Quiz Trail';
  }, [activeView, certification]);

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

  useEffect(() => {
    if (initialProgressScrollDone.current || loading || !state.questions.length || settingsOpen || activeView !== 'practice') return;
    initialProgressScrollDone.current = true;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(isGuest ? 'guest-start' : 'progress-start');
      if (!target || typeof window.scrollTo !== 'function') return;
      const headerHeight = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 42;
      const priorScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      document.documentElement.style.scrollBehavior = priorScrollBehavior;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeView, isGuest, loading, settingsOpen, state.questions.length]);

  useEffect(() => auth.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthResolved(true);
    setAuthError(null);
  }), [auth]);

  useEffect(() => {
    if (!authResolved || !allowed) return;
    let active = true;
    const userId = user?.uid;
    async function start() {
      setLoading(true);
      setFatalError(null);
      setStorageError(null);
      dispatch({ type: 'reset' });
      try {
        const bank = await bankLoader();
        if (!active) return;
        const sessionQuestions = userId ? bank.questions : bank.questions.slice(0, GUEST_QUESTION_LIMIT);
        dispatch({ type: 'bankLoaded', questions: sessionQuestions, questionBankVersion: bank.version });
        dispatch({ type: 'filterChanged', filter: userId ? preferenceStore.loadFilter() : 'unanswered' });
        if (userId) {
          try {
            const saved = await store.load(userId);
            if (saved && active) {
              const reconciled = reconcileProgress(saved, bank.questions, bank.version);
              dispatch({ type: 'progressLoaded', progress: reconciled.progress, reconciliationNotice: reconciled.notice });
            }
          } catch (error) {
            if (active) setStorageError(error instanceof Error ? error.message : 'Saved progress could not be loaded.');
          }
        }
      } catch (error) {
        if (active) setFatalError(error instanceof Error ? error.message : 'The question bank could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void start();
    return () => { active = false; };
  }, [authResolved, allowed, bankLoader, preferenceStore, store, user?.uid]);

  const visible = selectFilteredQuestions(state);
  const currentFromBank = state.questions.find((question) => question.questionId === state.currentQuestionId);
  const displayQuestions = currentFromBank && !visible.some((question) => question.questionId === currentFromBank.questionId)
    ? [currentFromBank, ...visible]
    : visible;
  const currentIndex = displayQuestions.findIndex((question) => question.questionId === state.currentQuestionId);
  const current = displayQuestions[currentIndex] ?? displayQuestions[0];
  const counts = selectCounts(state);
  const queuePosition = Math.max(currentIndex, 0) + 1;
  const progressLabel = state.filter === 'unanswered'
    ? `${counts.remaining} remaining of ${counts.total}`
    : state.filter === 'incorrect'
      ? `Question ${queuePosition} of ${displayQuestions.length} incorrect`
      : state.filter === 'saved'
        ? `Question ${queuePosition} of ${displayQuestions.length} saved`
        : `Question ${queuePosition} of ${displayQuestions.length}`;
  const debugMetadata = new URLSearchParams(window.location.search).get('debug') === 'true';
  const changeFilter = (filter: typeof state.filter) => {
    if (!isGuest) preferenceStore.saveFilter(filter);
    dispatch({ type: 'filterChanged', filter });
  };
  const openReviewQueue = (filter: typeof state.filter) => {
    changeFilter(filter);
    showView('practice');
  };

  const reset = async () => {
    const warning = `Reset ${certification.label} progress saved ${dataMode === 'local' ? 'in this browser' : 'for this account'}?`;
    if (!window.confirm(warning)) return;
    try {
      await Promise.all([...pendingWrites.current]);
      await store.reset(user?.uid);
      dispatch({ type: 'reset' });
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Progress could not be reset.');
    }
  };

  const signIn = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await auth.signIn();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
    } finally {
      setAuthBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!authResolved || !signInRequested.current) return;
    signInRequested.current = false;
    const url = new URL(window.location.href);
    url.searchParams.delete('signIn');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (auth.mode === 'firebase' && !user) queueMicrotask(() => void signIn());
  }, [auth.mode, authResolved, signIn, user]);

  const signOut = async () => {
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
      await Promise.all([...pendingWrites.current]);
      await auth.reauthenticate();
      await (store.resetAll ? store.resetAll(user.uid) : store.reset(user.uid));
      progressDeleted = true;
      await auth.deleteAccount();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your account could not be deleted. Please try again.';
      setAccountError(progressDeleted ? `Your progress was deleted, but your account remains. ${message}` : message);
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authResolved) return <main className="centered-state"><div className="loader" /><h1>Checking your session…</h1><p>Preparing Quiz Trail.</p></main>;
  if (!allowed) return <main className="centered-state auth-state"><a href="/" className="brand">Quiz Trail</a><p className="eyebrow">Private preview</p><h1>{certification.title} is coming soon</h1><p>{user ? 'This preview is not available to this account.' : 'Sign in with an authorized account to open the private preview.'}</p>{authError && <p role="alert">{authError}</p>}{auth.mode === 'firebase' && <button className="primary-button" disabled={authBusy} onClick={() => void (user ? signOut() : signIn())}>{user ? 'Sign out' : 'Sign in'}</button>}<a href={certification.faqPath}>{certification.label} FAQ</a><a href="/">Back to home</a></main>;
  if (fatalError) return <main className="centered-state error-state"><p className="eyebrow">Question bank error</p><h1>Quiz Trail can’t start</h1><p>{fatalError}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again</button></main>;
  if (loading || !state.questions.length) return <main className="centered-state"><div className="loader" /><h1>Loading the question bank…</h1><p>Preparing Quiz Trail.</p></main>;

  return (
    <>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Quiz Trail home" onClick={leavePage}><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <div className="account-controls">
          <a className="header-button header-link" href="/" onClick={leavePage}>Home</a>
          {canAccessCertification(certifications['agentic-ai'], user) && <a className="header-button header-link" href={certification.id === 'pmle' ? '/practice/?cert=agentic-ai' : '/practice/'} onClick={leavePage}>{certification.id === 'pmle' ? 'PAA preview' : 'PMLE'}</a>}
          {auth.mode === 'local' && <button className="header-button" type="button" onClick={() => { setAccountError(null); setSettingsOpen(true); }}>Settings</button>}
          {auth.mode === 'firebase' && (
            user ? <div className="account-menu" ref={accountMenu}>
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
            </div> : <button className="header-button" type="button" disabled={authBusy} onClick={() => void signIn()}>{authBusy ? 'Opening Google…' : 'Sign in'}</button>
          )}
        </div>
      </header>
      {settingsOpen && user ? (
        <AccountSettings
          user={user}
          mode={auth.mode}
          busy={authBusy}
          error={accountError}
          buyMeACoffeeUrl={debugMetadata ? buyMeACoffeeUrl : undefined}
          showSupport={debugMetadata}
          onBack={() => setSettingsOpen(false)}
          onReset={() => void reset()}
          onSignOut={() => void signOut()}
          onDelete={deleteAccount}
        />
      ) : <main id="quiz" className="app-shell">
        {activeView === 'summary' ? (
          <AnalyticsSummary
            certification={certification}
            questions={state.questions}
            progress={state.progress}
            savedForLater={state.savedForLater}
            onBack={() => showView('practice')}
            onReview={openReviewQueue}
          />
        ) : <>
        <section className="intro">
          <h1>{certification.title} practice questions</h1>
          <p>{certification.preview ? 'Private preview · Questions are under review.' : 'Free practice questions with explanations and official references.'}</p>
        </section>
        <ProgressSummary counts={counts} onOpenSummary={() => showView('summary')} />
        {(storageError || (debugMetadata && state.reconciliationNotice)) && (
          <div className="notice" role="status">{storageError ?? state.reconciliationNotice}</div>
        )}
        {isGuest && (
          <aside className="guest-banner" id="guest-start" aria-labelledby="guest-title">
            <div>
              <strong id="guest-title">Practicing as a guest</strong>
              <span>Try 10 questions as a guest. Sign in to save your progress and access all 400+ questions.</span>
              {authError && <span className="error-message" role="alert">{authError}</span>}
            </div>
            <button className="primary-button" type="button" disabled={authBusy} onClick={() => void signIn()}>
              {authBusy ? 'Opening Google…' : 'Sign in to save progress'}
            </button>
          </aside>
        )}
        <QuizFilters active={state.filter} onChange={changeFilter} />
        {current ? (
          <>
            <QuestionCard
              certificationTitle={certification.title}
              key={current.questionId}
              question={current}
              progressLabel={progressLabel}
              saved={state.savedForLater.includes(current.questionId)}
              priorOutcome={state.progress[current.questionId]}
              showInternalMetadata={debugMetadata}
              sessionOnly={isGuest}
              onSubmit={async (correct) => {
                dispatch({ type: 'answerSubmitted', questionId: current.questionId, correct });
                if (user) await trackWrite(store.saveAnswer(current.questionId, correct, state.questionBankVersion, user.uid));
              }}
              onToggleSaved={() => {
                const saved = !state.savedForLater.includes(current.questionId);
                dispatch({ type: 'savedToggled', questionId: current.questionId });
                if (!user) return;
                void trackWrite(store.saveBookmark(current.questionId, saved, state.questionBankVersion, user.uid))
                  .then(() => setStorageError(null))
                  .catch((error) => setStorageError(error instanceof Error ? error.message : 'Your bookmark could not be saved.'));
              }}
              onSubmitFeedback={feedbackStore && user ? async (feedbackText) => {
                await feedbackStore.submitFeedback(current.questionId, feedbackText, user.uid);
              } : undefined}
              onLoadFeedback={feedbackStore && user ? async () => (
                feedbackStore.loadFeedback(current.questionId, user.uid)
              ) : undefined}
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
        {debugMetadata && <TipJar buyMeACoffeeUrl={buyMeACoffeeUrl} venmoUrl={import.meta.env.VITE_VENMO_URL} />}
      </main>}
      <footer>
        <span>Quiz Trail</span>
        <div>
          <nav className="certification-resources" aria-label={`${certification.label} resources`}>
            <a href="/faq/" onClick={leavePage}>General FAQ</a>
            <a href={certification.faqPath} onClick={leavePage}>{certification.label} FAQ</a>
            <a href={summaryHref} aria-current={activeView === 'summary' && !settingsOpen ? 'page' : undefined} onClick={(event) => { if (isPlainClick(event)) { event.preventDefault(); showView('summary'); } }}>{certification.label} summary</a>
            {certification.id === 'pmle' && <a href="/sample-questions/" onClick={leavePage}>PMLE sample questions</a>}
          </nav>
          <span className="mode-badge">{dataMode === 'local' ? 'Local mode' : isGuest ? 'Guest session' : dataMode === 'firebase-emulator' ? 'Emulator mode' : 'Cloud mode'}</span>
          <span>{dataMode === 'local' ? 'Progress stays on this device' : isGuest ? 'Progress is not saved' : 'Progress is linked to your signed-in account'}</span>
          {debugMetadata && <><a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a><a href={buyMeACoffeeUrl} target="_blank" rel="noopener noreferrer">Buy Me a Coffee <span aria-hidden="true">↗</span></a></>}
        </div>
      </footer>
    </>
  );
}
