export function UnsavedProgressWarning({ count }: { count: number }) {
  if (count < 10) return null;
  return (
    <p className="save-warning" role="status">
      You have {count} questions with unsaved answers. Save your progress so you don’t lose them.
    </p>
  );
}

export function SaveProgressButton({
  dirty,
  status,
  error,
  storageNote,
  onSave,
}: {
  dirty: boolean;
  status: 'idle' | 'saving' | 'saved' | 'failed';
  error: string | null;
  storageNote: string;
  onSave: () => void;
}) {
  const label = status === 'saving' ? 'Saving…' : 'Save progress';
  return (
    <section className="save-panel" aria-label="Progress storage">
      <div>
        <p className="save-state" role="status">
          <span className={`status-dot ${dirty ? 'dirty' : 'clean'}`} />
          {dirty ? 'Unsaved changes' : status === 'saved' ? 'Progress saved' : 'No unsaved changes'}
        </p>
        <p className="save-note">{storageNote}</p>
        {error && <p className="error-message">{error}</p>}
      </div>
      <div className="save-actions">
        <button type="button" className="primary-button" disabled={!dirty || status === 'saving'} onClick={onSave}>{label}</button>
      </div>
    </section>
  );
}
