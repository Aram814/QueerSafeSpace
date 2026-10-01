import { useState, type FormEvent } from 'react';
import { updatePassword } from '../lib/auth';
import ShieldLogo from '../components/ShieldLogo';

const MIN_PASSWORD = 8;

/** Shown when someone opens the link from a "reset your password" email. */
export default function ResetPasswordScreen({ onDone }: { onDone: (message: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      onDone('Password updated. You are signed in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="overlay center" role="dialog" aria-modal="true" style={{ zIndex: 3000 }}>
      <div className="sheet">
        <div className="reset-head">
          <ShieldLogo className="reset-shield" />
          <span className="sheet-title">Choose a new password</span>
        </div>
        <form onSubmit={submit}>
          <div className="fg">
            <label className="fl" htmlFor="rp-pw">
              New password
            </label>
            <input
              id="rp-pw"
              type="password"
              className="fi"
              autoComplete="new-password"
              placeholder={`Minimum ${MIN_PASSWORD} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="rp-cpw">
              Confirm new password
            </label>
            <input
              id="rp-cpw"
              type="password"
              className="fi"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <div className="fmsg error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
