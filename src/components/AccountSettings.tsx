import { useState } from 'react';
import type { AuthUser } from '../auth/AuthService';

export function AccountSettings({
  user,
  busy,
  error,
  paypalUrl,
  onBack,
  onReset,
  onSignOut,
  onDelete,
  mode,
}: {
  user: AuthUser;
  mode: 'local' | 'firebase';
  busy: boolean;
  error: string | null;
  paypalUrl?: string;
  onBack: () => void;
  onReset: () => void;
  onSignOut: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const supportUrl = paypalUrl && /^https?:\/\//.test(paypalUrl) ? paypalUrl : undefined;

  return (
    <main className="settings-shell">
      <button className="settings-back" type="button" onClick={onBack}>← Back to quiz</button>
      <div className="settings-heading">
        <p className="eyebrow">Settings</p>
        <h1>{mode === 'firebase' ? 'Account & data' : 'Data & support'}</h1>
        <p>{mode === 'firebase' ? 'Manage your Quiz Trail account and the progress saved to it.' : 'Manage the Quiz Trail progress saved in this browser.'}</p>
      </div>

      {mode === 'firebase' && <section className="settings-card" aria-labelledby="account-heading">
        <h2 id="account-heading">Your account</h2>
        <div className="account-profile">
          {user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{user.displayName.charAt(0).toUpperCase()}</span>}
          <div><strong>{user.displayName}</strong>{user.email && <p>{user.email}</p>}</div>
        </div>
        <button className="secondary-button" type="button" disabled={busy} onClick={onSignOut}>Sign out</button>
      </section>}

      <section className="settings-card" aria-labelledby="data-heading">
        <h2 id="data-heading">Your quiz data</h2>
        <p>{mode === 'firebase' ? 'Your answers, bookmarks, and saved return point are stored in Firebase and linked to your account. Changes are uploaded only when you choose Save progress.' : 'Your answers and bookmarks are stored only in this browser when you choose Save progress.'}</p>
        <button className="secondary-button danger-button" type="button" disabled={busy} onClick={onReset}>Reset all progress</button>
      </section>

      <section className="settings-card" aria-labelledby="support-heading">
        <h2 id="support-heading">Support</h2>
        <p>Found a bug, an outdated question, or have an idea? Open a public GitHub issue and do not include personal or account information.</p>
        <div className="settings-links">
          <a className="settings-link" href="https://github.com/Ameenota/quiz-trail/issues/new/choose" target="_blank" rel="noopener noreferrer">Open a GitHub issue</a>
          {supportUrl && <a className="settings-link" href={supportUrl} target="_blank" rel="noopener noreferrer">Support cloud costs via PayPal</a>}
        </div>
      </section>

      {mode === 'firebase' && <section className="settings-card danger-zone" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete account</h2>
        <p>Permanently delete your Firebase account and all saved Quiz Trail progress. This cannot be undone.</p>
        {!confirmingDelete ? (
          <button className="secondary-button danger-button" type="button" disabled={busy} onClick={() => setConfirmingDelete(true)}>Delete account</button>
        ) : (
          <div className="delete-confirmation">
            <label htmlFor="delete-confirmation">Type <strong>DELETE</strong> to confirm</label>
            <input id="delete-confirmation" value={confirmation} disabled={busy} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
            <p>Google will ask you to verify your identity before deletion.</p>
            <div>
              <button className="secondary-button" type="button" disabled={busy} onClick={() => { setConfirmingDelete(false); setConfirmation(''); }}>Cancel</button>
              <button className="primary-button delete-button" type="button" disabled={busy || confirmation !== 'DELETE'} onClick={() => void onDelete()}>{busy ? 'Deleting…' : 'Permanently delete account'}</button>
            </div>
          </div>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>}
    </main>
  );
}
