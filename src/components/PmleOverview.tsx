const CERTIFICATION_URL = 'https://cloud.google.com/learn/certification/machine-learning-engineer';

export function PmleOverview() {
  return (
    <section className="pmle-overview" aria-labelledby="pmle-overview-heading">
      <div className="pmle-copy">
        <p className="eyebrow">About the certification</p>
        <h2 id="pmle-overview-heading">What is the PMLE?</h2>
        <p>
          The Google Cloud Professional Machine Learning Engineer certification covers designing, building, productionizing,
          and improving scalable AI and machine learning solutions—from data and model architecture to MLOps and monitoring.
        </p>
        <p className="pmle-free-message">
          <strong>All 400+ practice questions are completely free.</strong>
          <span>No paywall, trial, or premium question tier.</span>
        </p>
        <p>
          The question bank is carefully curated and maintained to reflect the current exam. New here?{' '}
          <a href="/sample-questions/">Preview ten representative questions</a> before starting the full bank.
        </p>
      </div>
      <div className="pmle-preview">
        <a className="pmle-sample-cta" href="/sample-questions/">
          <span>Preview</span>
          <strong>Try 10 free PMLE sample questions</strong>
          <small>No sign-in required · Answers, explanations, and official references included.</small>
          <b aria-hidden="true">→</b>
        </a>
        <p className="pmle-trust-note">Independent study tool · Not affiliated with Google</p>
      </div>
      <nav className="pmle-secondary-links" aria-label="PMLE resources">
        <a href={CERTIFICATION_URL} target="_blank" rel="noopener noreferrer">Official certification <span aria-hidden="true">↗</span></a>
        <a href="/faq/">Practice FAQ</a>
      </nav>
    </section>
  );
}
