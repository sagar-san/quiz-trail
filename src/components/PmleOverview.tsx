const CERTIFICATION_URL = 'https://cloud.google.com/learn/certification/machine-learning-engineer';
const SOURCE_URL = 'https://github.com/Ameenota/quiz-trail';

function safeExternalUrl(raw?: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function PmleOverview({ paypalUrl }: { paypalUrl?: string }) {
  const supportUrl = safeExternalUrl(paypalUrl);
  return (
    <section className="pmle-overview" aria-labelledby="pmle-overview-heading">
      <div>
        <p className="eyebrow">About the certification</p>
        <h2 id="pmle-overview-heading">What is the PMLE?</h2>
        <p>
          The Google Cloud Professional Machine Learning Engineer certification covers designing, building, productionizing,
          and improving scalable AI and machine learning solutions—from data and model architecture to MLOps and monitoring.
        </p>
        <p>This carefully curated practice bank is maintained to reflect the current exam and was updated in August 2026.</p>
      </div>
      <div className="pmle-links">
        <a href={CERTIFICATION_URL} target="_blank" rel="noopener noreferrer">View the official PMLE certification <span aria-hidden="true">↗</span></a>
        {supportUrl && <a href={supportUrl} target="_blank" rel="noopener noreferrer">Support Quiz Trail via PayPal <span aria-hidden="true">↗</span></a>}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">View the source on GitHub <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}
