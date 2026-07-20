const safeExternalUrl = (raw?: string) => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export function TipJar({ buyMeACoffeeUrl, venmoUrl }: { buyMeACoffeeUrl?: string; venmoUrl?: string }) {
  const links = [
    { label: 'Buy Me a Coffee', url: safeExternalUrl(buyMeACoffeeUrl) },
    { label: 'Venmo', url: safeExternalUrl(venmoUrl) },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));
  if (!links.length) return null;
  return (
    <aside className="tip-jar">
      <div><p className="eyebrow">Enjoying Quiz Trail?</p><p>Optional support helps cover our cloud costs.</p></div>
      <div>{links.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label === 'Buy Me a Coffee' ? link.label : `Support via ${link.label}`}</a>)}</div>
    </aside>
  );
}
