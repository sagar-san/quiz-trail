import { certifications, type Certification } from '../config/certifications';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { LocalAuthService, type AuthService, type AuthUser } from '../auth/AuthService';
import type { DataMode } from '../config/dataMode';
import { AccountSettings } from '../components/AccountSettings';
import { AnalyticsSummary } from '../components/AnalyticsSummary';
import { ProgressSummary } from '../components/ProgressSummary';
import { QuestionCard } from '../components/QuestionCard';
import { QuizFilters } from '../components/QuizFilters';
import { TipJar } from '../components/TipJar';
import { loadQuestionBank, type LoadedQuestionBank } from '../data/csv/loadQuestionBank';
import { initialQuizState, quizReducer } from '../domain/quizReducer';
import { selectCounts, selectFilteredQuestions } from '../domain/selectors';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { ProgressStore } from '../storage/ProgressStore';
import { LocalStorageQuizPreferences, type QuizPreferences } from '../storage/QuizPreferences';
import { reconcileProgress } from '../storage/reconcileProgress';
import type { CommentStore } from '../storage/CommentStore';
import { QuestionDiscussion } from '../components/QuestionDiscussion';

export interface AppProps {
  certification?: Certification;
  bankLoader?: () => Promise<LoadedQuestionBank>;
  progressStore?: ProgressStore;
  preferences?: QuizPreferences;
  authService?: AuthService;
  commentStore?: CommentStore;
  dataMode?: DataMode;
}

type PracticeView = 'practice' | 'summary';
const viewFromUrl = (): PracticeView => new URLSearchParams(window.location.search).get('view') === 'summary' ? 'summary' : 'practice';
const isPlainClick = (event: ReactMouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function App({
  certification = certifications.pmle,
  bankLoader = loadQuestionBank,
  progressStore,
  preferences,
  authService,
  commentStore,
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
      : certification.id === 'pmle' ? 'Practice Google Cloud PMLE Questions | Quiz Trail' : `${certification.title} Practice | Quiz Trail`;
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
    if (!user || initialProgressScrollDone.current || loading || !state.questions.length || settingsOpen || activeView !== 'practice') return;
    initialProgressScrollDone.current = true;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('progress-start');
      if (!target || typeof window.scrollTo !== 'function') return;
      const headerHeight = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 42;
      const priorScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      document.documentElement.style.scrollBehavior = priorScrollBehavior;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeView, user, loading, settingsOpen, state.questions.length]);

  useEffect(() => auth.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthResolved(true);
    setAuthError(null);
  }), [auth]);

  useEffect(() => {
    const userId = user?.uid;
    if (!authResolved || !userId) return;
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
  }, [authResolved, bankLoader, preferenceStore, store, user?.uid]);

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
    preferenceStore.saveFilter(filter);
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
      await Promise.all([...pendingWrites.current]);
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
      if (commentStore) await commentStore.deleteUserCommentData(user.uid);
      await (store.resetAll ? store.resetAll(user.uid) : store.reset(user.uid));
      progressDeleted = true;
      await auth.deleteAccount();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your account could not be deleted. Please try again.';
      setAccountError(progressDeleted ? `Your progress was deleted, but your account remains. ${message}` : `${message} If comment cleanup started, retry Delete account in Settings to finish; your identity has been kept.`);
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authResolved) return <main className="centered-state"><div className="loader" /><h1>Checking your session…</h1><p>Preparing Quiz Trail.</p></main>;
  if (!user) return (
    <main className="centered-state auth-state sign-in-state">
      <a href="/" className="brand" aria-label="Quiz Trail home"><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
      <p className="eyebrow">{certification.title}</p>
      <h1>{activeView === 'summary' ? 'Sign in to view your summary' : 'Sign in to practice'}</h1>
      <p>Use your Google account to access the full question bank, save your progress, and join discussions.</p>
      {authError && <p className="error-message" role="alert">{authError}</p>}
      <button type="button" className="primary-button" disabled={authBusy} onClick={() => void signIn()}>
        {authBusy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <a className="sign-in-samples" href={certification.samplePath}>View sample questions</a>
    </main>
  );
  if (fatalError) return <main className="centered-state error-state"><p className="eyebrow">Question bank error</p><h1>Quiz Trail can’t start</h1><p>{fatalError}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again</button></main>;
  if (loading || !state.questions.length) return <main className="centered-state"><div className="loader" /><h1>Loading the question bank…</h1><p>Preparing Quiz Trail.</p></main>;

  return (
    <>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Quiz Trail home" onClick={leavePage}><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <div className="account-controls">
          <a className="header-button header-link" href="/" onClick={leavePage}>Home</a>
          <a className="header-button header-link" href={certification.id === 'pmle' ? '/practice/?cert=agentic-ai' : '/practice/'} onClick={leavePage}>{certification.id === 'pmle' ? 'PAA' : 'PMLE'}</a>
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
          <p>Free practice questions with explanations and official references.</p>
        </section>
        <ProgressSummary counts={counts} onOpenSummary={() => showView('summary')} />
        {(storageError || (debugMetadata && state.reconciliationNotice)) && (
          <div className="notice" role="status">{storageError ?? state.reconciliationNotice}</div>
        )}
        <QuizFilters active={state.filter} onChange={changeFilter} />
        {current ? (
          <>
            <QuestionCard
              certificationTitle={certification.title}
              key={`${certification.id}:${user?.uid}:${current.questionId}`}
              question={current}
              progressLabel={progressLabel}
              saved={state.savedForLater.includes(current.questionId)}
              priorOutcome={state.progress[current.questionId]}
              showInternalMetadata={debugMetadata}
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
              navigation={{
                hasPrevious: currentIndex > 0,
                hasNext: currentIndex >= 0 && currentIndex < displayQuestions.length - 1,
                onPrevious: () => dispatch({ type: 'questionChanged', questionId: displayQuestions[currentIndex - 1].questionId }),
                onNext: () => dispatch({ type: 'questionChanged', questionId: displayQuestions[currentIndex + 1].questionId }),
              }}
              discussion={<QuestionDiscussion store={commentStore} user={user}
                scope={{ certificationId: certification.id, questionId: current.questionId }}
                cloud={auth.mode === 'firebase'} busy={authBusy} onSignIn={() => void signIn()} trackWrite={trackWrite} />}
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
            <a href="/faq/" onClick={leavePage}>FAQ</a>
            <a href={certification.faqPath} onClick={leavePage}>{certification.label} FAQ</a>
            <a href={summaryHref} aria-current={activeView === 'summary' && !settingsOpen ? 'page' : undefined} onClick={(event) => { if (isPlainClick(event)) { event.preventDefault(); showView('summary'); } }}>{certification.label} summary</a>
            <a href={certification.samplePath} onClick={leavePage}>{certification.label} sample questions</a>
          </nav>
          <span className="mode-badge">{dataMode === 'local' ? 'Local mode' : dataMode === 'firebase-emulator' ? 'Emulator mode' : 'Cloud mode'}</span>
          <span>{dataMode === 'local' ? 'Progress stays on this device' : 'Progress is linked to your signed-in account'}</span>
          {debugMetadata && <a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>}
          {/^https?:\/\//i.test(buyMeACoffeeUrl) && <a href={buyMeACoffeeUrl} target="_blank" rel="noopener noreferrer">Buy Me a Coffee <span aria-hidden="true">↗</span></a>}
        </div>
      </footer>
    </>
  );
}
