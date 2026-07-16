export function SaveProgressButton({
  dirty,
  status,
  error,
  onSave,
  onReset,
}: {
  dirty: boolean;
  status: 'idle' | 'saving' | 'saved' | 'failed';
  error: string | null;
  onSave: () => void;
  onReset: () => void;
}) {
  const label = status === 'saving' ? 'Saving…' : 'Save progress';
  return (
    <section className="save-panel" aria-label="Progress storage">
      <div>
        <p className="save-state" role="status">
          <span className={`status-dot ${dirty ? 'dirty' : 'clean'}`} />
          {dirty ? 'Unsaved changes' : status === 'saved' ? 'Progress saved' : 'No unsaved changes'}
        </p>
        <p className="save-note">Saved only in this browser during Phase 1.</p>
        {error && <p className="error-message">{error}</p>}
      </div>
      <div className="save-actions">
        <button type="button" className="secondary-button danger-button" onClick={onReset}>Reset progress</button>
        <button type="button" className="primary-button" disabled={!dirty || status === 'saving'} onClick={onSave}>{label}</button>
      </div>
    </section>
  );
}
