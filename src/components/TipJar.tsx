const safeExternalUrl = (raw?: string) => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export function TipJar({ paypalUrl, venmoUrl }: { paypalUrl?: string; venmoUrl?: string }) {
  const links = [
    { label: 'PayPal', url: safeExternalUrl(paypalUrl) },
    { label: 'Venmo', url: safeExternalUrl(venmoUrl) },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));
  if (!links.length) return null;
  return (
    <aside className="tip-jar">
      <div><p className="eyebrow">Enjoying Quiz Trail?</p><p>Optional support helps cover our cloud costs.</p></div>
      <div>{links.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">Support via {link.label}</a>)}</div>
    </aside>
  );
}
