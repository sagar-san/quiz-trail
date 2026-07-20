import { useEffect, useState } from 'react';
import type { LoadedQuestionBank } from '../data/csv/loadQuestionBank';
import type { QuizQuestion } from '../domain/types';

const SITE_URL = 'https://quiz-trail.web.app';
const CURATED_IDS = ['PMLE-0383', 'PMLE-0384', 'PMLE-0385', 'PMLE-0386', 'PMLE-0387', 'PMLE-0388', 'PMLE-0389', 'PMLE-0390', 'PMLE-0391', 'PMLE-0392'];

function selectSampleQuestions(questions: QuizQuestion[]) {
  const byId = new Map(questions.map((question) => [question.questionId, question]));
  const selected = CURATED_IDS.map((id) => byId.get(id)).filter((question): question is QuizQuestion => Boolean(question));
  const selectedIds = new Set(selected.map((question) => question.questionId));
  const fallback = questions.filter((question) => !selectedIds.has(question.questionId) && !question.isOutdated && question.reviewStatus !== 'Needs Review');
  return [...selected, ...fallback].slice(0, 10);
}

export function SampleQuestionsPage({ bankLoader, onBack }: { bankLoader: () => Promise<LoadedQuestionBank>; onBack: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void bankLoader()
      .then((bank) => { if (active) setQuestions(selectSampleQuestions(bank.questions)); })
      .catch(() => { if (active) setError('The sample questions could not be loaded. Please try again.'); });
    return () => { active = false; };
  }, [bankLoader]);

  useEffect(() => {
    const title = '10 Google Cloud PMLE Sample Questions | Quiz Trail';
    const description = 'Try 10 free Google Cloud Professional Machine Learning Engineer sample questions with answers, explanations, and official references.';
    const canonical = `${SITE_URL}/sample-questions`;
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);

    return () => {
      const defaultTitle = 'Quiz Trail — Google Cloud PMLE Practice Questions';
      const defaultDescription = "Prepare for Google Cloud's Professional Machine Learning Engineer certification with a carefully curated bank of 408 practice questions, explanations, and progress tracking.";
      document.title = defaultTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', defaultDescription);
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${SITE_URL}/`);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', defaultTitle);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', defaultDescription);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', `${SITE_URL}/`);
      document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', defaultTitle);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', defaultDescription);
    };
  }, []);

  return (
    <main className="samples-shell">
      <button className="settings-back" type="button" onClick={onBack}>← Back to quiz</button>
      <header className="samples-heading">
        <p className="eyebrow">Free PMLE practice</p>
        <h1>10 Google Cloud PMLE sample questions</h1>
        <p>Test your judgment across architecture, generative AI, security, evaluation, and production ML. Open each answer when you are ready to check your reasoning.</p>
      </header>
      {!questions.length && !error && <div className="samples-loading" role="status"><div className="loader" /><p>Loading sample questions…</p></div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="sample-list">
        {questions.map((question, index) => (
          <article className="sample-card" key={question.questionId}>
            <div className="sample-meta"><span>Question {index + 1} of {questions.length}</span><span>{question.difficulty} · {question.examSection}</span></div>
            <h2>{question.prompt}</h2>
            <ol className="sample-options" type="A">
              {question.options.map((option) => <li key={option.key}>{option.text}</li>)}
            </ol>
            <details className="sample-answer">
              <summary>Show answer and explanation</summary>
              <div>
                <p><strong>Answer: {question.correctAnswers.join(', ')}</strong></p>
                <p>{question.explanation}</p>
                {question.referenceUrl && <a href={question.referenceUrl} target="_blank" rel="noopener noreferrer">Read the official reference <span aria-hidden="true">↗</span></a>}
              </div>
            </details>
          </article>
        ))}
      </div>
      <section className="faq-cta" aria-labelledby="samples-cta-heading">
        <h2 id="samples-cta-heading">Keep practicing</h2>
        <p>Quiz Trail includes 408 questions, progress tracking, review queues, and section-level insights.</p>
        <button className="primary-button" type="button" onClick={onBack}>Open the full question bank</button>
      </section>
    </main>
  );
}
