import { useEffect } from 'react';

const SITE_URL = 'https://quiz-trail.web.app';

function setHeadAttribute(selector: string, tagName: 'meta' | 'link', identifyingAttributes: Record<string, string>, attribute: string, value: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement(tagName);
    Object.entries(identifyingAttributes).forEach(([name, content]) => element?.setAttribute(name, content));
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

const faqs = [
  {
    question: 'What is the Google Cloud Professional Machine Learning Engineer certification?',
    answer: 'The PMLE certification assesses your ability to design, build, productionize, and improve machine learning and AI solutions on Google Cloud, including data preparation, model development, serving, MLOps, monitoring, and responsible AI.',
  },
  {
    question: 'Is Quiz Trail an official Google Cloud product?',
    answer: 'No. Quiz Trail is an independent, open-source study aid and is not affiliated with or endorsed by Google. Use the official certification page and exam guide as the final source for current exam requirements.',
  },
  {
    question: 'How many PMLE practice questions are included?',
    answer: 'Quiz Trail currently includes 408 carefully curated single-choice and multiple-choice practice questions with explanations and references.',
  },
  {
    question: 'How should I use Quiz Trail to prepare?',
    answer: 'Practice in short sessions, read the explanation after every answer, save questions that need another look, and use the Summary view to focus on weak exam sections and objectives. Combine practice questions with hands-on Google Cloud experience and the official exam guide.',
  },
  {
    question: 'Are these the real certification exam questions?',
    answer: 'No. Quiz Trail provides original and curated practice material for learning. It does not provide exam dumps or claim that its questions appear on the certification exam.',
  },
  {
    question: 'How is my progress saved?',
    answer: 'In local mode, progress is stored in your browser. In cloud mode, it is linked to your signed-in Firebase account so it can be resumed across devices. Answer and bookmark changes are saved only when you choose Save progress.',
  },
  {
    question: 'Is Quiz Trail free?',
    answer: 'Yes. Quiz Trail is free and open source. Optional contributions through Buy Me a Coffee help cover cloud costs, and starring the project on GitHub is a free way to support it.',
    content: <>
      Yes. Quiz Trail is free and open source. Optional contributions through{' '}
      <a href="https://buymeacoffee.com/okeanos" target="_blank" rel="noopener noreferrer">Buy Me a Coffee</a>{' '}
      help cover cloud costs, and starring the project on{' '}
      <a href="https://github.com/Ameenota/quiz-trail" target="_blank" rel="noopener noreferrer">GitHub</a>{' '}
      is a free way to support it.
    </>,
  },
  {
    question: 'How can I report an incorrect or outdated question?',
    answer: 'Open a GitHub issue with the question ID and a clear description of the problem. Do not include personal, account, or certification-exam confidential information.',
  },
];

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export function FaqPage({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const title = 'Google Cloud PMLE Practice FAQ | Quiz Trail';
    const description = 'Answers about Quiz Trail, Google Cloud PMLE practice questions, study strategy, progress saving, question sources, and contributing.';
    document.title = title;
    setHeadAttribute('meta[name="description"]', 'meta', { name: 'description' }, 'content', description);
    setHeadAttribute('link[rel="canonical"]', 'link', { rel: 'canonical' }, 'href', `${SITE_URL}/faq`);
    setHeadAttribute('meta[property="og:title"]', 'meta', { property: 'og:title' }, 'content', title);
    setHeadAttribute('meta[property="og:description"]', 'meta', { property: 'og:description' }, 'content', description);
    setHeadAttribute('meta[property="og:url"]', 'meta', { property: 'og:url' }, 'content', `${SITE_URL}/faq`);
    setHeadAttribute('meta[name="twitter:title"]', 'meta', { name: 'twitter:title' }, 'content', title);
    setHeadAttribute('meta[name="twitter:description"]', 'meta', { name: 'twitter:description' }, 'content', description);
    const faqSchema = document.createElement('script');
    faqSchema.type = 'application/ld+json';
    faqSchema.dataset.quizTrailSchema = 'faq';
    faqSchema.textContent = JSON.stringify(faqStructuredData);
    document.head.appendChild(faqSchema);

    return () => {
      faqSchema.remove();
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
    <main className="faq-shell">
        <button className="settings-back" type="button" onClick={onBack}>← Back to quiz</button>
        <header className="faq-heading">
          <p className="eyebrow">Quiz Trail FAQ</p>
          <h1>Google Cloud PMLE practice questions, answered.</h1>
          <p>How Quiz Trail works, what the question bank covers, and how to make your study time count.</p>
        </header>
        <div className="faq-list">
          {faqs.map(({ question, answer, content }) => (
            <section className="faq-card" key={question}>
              <h2>{question}</h2>
              <p>{content ?? answer}</p>
            </section>
          ))}
        </div>
        <section className="faq-cta" aria-labelledby="faq-cta-heading">
          <h2 id="faq-cta-heading">Ready to practice?</h2>
          <p>Work through the question bank at your own pace and use your results to guide the next study session.</p>
          <button className="primary-button" type="button" onClick={onBack}>Start practicing</button>
        </section>
    </main>
  );
}
