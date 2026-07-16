import { useEffect, useMemo, useReducer, useState } from 'react';
import { LocalAuthService, type AuthService, type AuthUser } from '../auth/AuthService';
import type { DataMode } from '../config/dataMode';
import { ProgressSummary } from '../components/ProgressSummary';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionNavigation } from '../components/QuestionNavigation';
import { QuizFilters } from '../components/QuizFilters';
import { SaveProgressButton } from '../components/SaveProgressButton';
import { TipJar } from '../components/TipJar';
import { loadQuestionBank, type LoadedQuestionBank } from '../data/csv/loadQuestionBank';
import { initialQuizState, quizReducer } from '../domain/quizReducer';
import { selectCounts, selectFilteredQuestions, toUserProgress } from '../domain/selectors';
import { LocalStorageProgressStore } from '../storage/LocalStorageProgressStore';
import type { ProgressStore } from '../storage/ProgressStore';
import { LocalStorageQuizPreferences, type QuizPreferences } from '../storage/QuizPreferences';
import { reconcileProgress } from '../storage/reconcileProgress';

export interface AppProps {
  bankLoader?: () => Promise<LoadedQuestionBank>;
  progressStore?: ProgressStore;
  preferences?: QuizPreferences;
  authService?: AuthService;
  dataMode?: DataMode;
}

export function App({
  bankLoader = loadQuestionBank,
  progressStore,
  preferences,
  authService,
  dataMode = 'local',
}: AppProps) {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const [authResolved, setAuthResolved] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const store = useMemo(() => progressStore ?? new LocalStorageProgressStore(), [progressStore]);
  const preferenceStore = useMemo(() => preferences ?? new LocalStorageQuizPreferences(), [preferences]);
  const auth = useMemo(() => authService ?? new LocalAuthService(), [authService]);

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
  const changeFilter = (filter: typeof state.filter) => {
    preferenceStore.saveFilter(filter);
    dispatch({ type: 'filterChanged', filter });
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
    } catch {
      setAuthError('Sign out could not be completed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

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
    </main>
  );
  if (loading) return <main className="centered-state"><div className="loader" /><h1>Loading your trail…</h1><p>Preparing the question bank.</p></main>;
  if (fatalError) return <main className="centered-state error-state"><p className="eyebrow">Question bank error</p><h1>Quiz Trail can’t start</h1><p>{fatalError}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again</button></main>;

  return (
    <>
      <header className="site-header">
        <a href="#quiz" className="brand"><span className="brand-mark" aria-hidden="true">Q</span><span>Quiz Trail</span></a>
        <div className="account-controls">
          <span className="mode-badge">{dataMode === 'local' ? 'Local mode' : dataMode === 'firebase-emulator' ? 'Emulator mode' : 'Cloud mode'}</span>
          {auth.mode === 'firebase' && (
            <>
              <span className="account-name" title={user.email}>{user.displayName}</span>
              <button className="header-button" type="button" disabled={authBusy} onClick={() => void signOut()}>Sign out</button>
            </>
          )}
        </div>
      </header>
      <main id="quiz" className="app-shell">
        <section className="intro">
          <p className="eyebrow">PMLE practice</p>
          <h1>One question at a time. <em>Keep moving forward.</em></h1>
          <p>Work through the bank in short sessions. Review what needs attention and save when you’re ready to stop.</p>
        </section>
        <ProgressSummary counts={counts} />
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
              onSubmit={(correct) => dispatch({ type: 'answerSubmitted', questionId: current.questionId, correct })}
              onToggleSaved={() => dispatch({ type: 'savedToggled', questionId: current.questionId })}
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
        <SaveProgressButton
          dirty={state.dirty}
          status={state.saveStatus}
          error={state.saveError}
          storageNote={dataMode === 'local' ? 'Saved only in this browser.' : 'Saved securely to your account when you choose Save progress.'}
          onSave={() => void save()}
          onReset={() => void reset()}
        />
        <TipJar paypalUrl={import.meta.env.VITE_PAYPAL_URL} venmoUrl={import.meta.env.VITE_VENMO_URL} />
      </main>
      <footer><span>Quiz Trail</span><span>{dataMode === 'local' ? 'Progress stays on this device' : 'Progress is linked to your signed-in account'}</span></footer>
    </>
  );
}
