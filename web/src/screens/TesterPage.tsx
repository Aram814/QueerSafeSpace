import { useState, type FormEvent } from 'react';
import Icon from '../components/Icon';
import {
  submitTesterSignup,
  TESTER_DEVICES,
  TESTER_ROLES,
  validateSignup,
  type TesterRole,
  type TesterSignup,
} from '../lib/testers';
import { PageShell, type InfoPage } from './InfoPages';

const EMPTY: TesterSignup = { name: '', email: '', location: '', device: '', roles: ['rater', 'tester'], note: '' };

export default function TesterPage({
  onBack,
  onOpenPage,
  onCreateAccount,
  signedIn,
}: {
  onBack: () => void;
  onOpenPage: (page: InfoPage) => void;
  onCreateAccount: () => void;
  signedIn: boolean;
}) {
  const [form, setForm] = useState<TesterSignup>(EMPTY);
  const [trap, setTrap] = useState(''); // hidden field: only bots fill it in
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof TesterSignup>(key: K, value: TesterSignup[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  function toggleRole(role: TesterRole) {
    set('roles', form.roles.includes(role) ? form.roles.filter((r) => r !== role) : [...form.roles, role]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateSignup(form);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!trap) await submitTesterSignup(form);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <PageShell title="Thank you!" onBack={onBack}>
        <article className="info-card tester-done">
          <Icon name="heart" size={32} />
          <h2>You&apos;re on the list</h2>
          <p>
            Thank you for helping build QueerSafeSpace. We&apos;ll email you at{' '}
            <strong>{form.email.trim()}</strong> with next steps. In the meantime, the best way to
            help is to open the map, search for places you know firsthand, and rate them. We plan to
            thank our early supporters with special perks.
          </p>
          {signedIn ? (
            <button className="btn btn-primary" onClick={onBack}>
              Start rating places
            </button>
          ) : (
            <>
              <p className="account-note">
                To rate places you also need a free account. That is separate from this sign-up.
              </p>
              <button className="btn btn-primary" onClick={onCreateAccount}>
                Create my account
              </button>
              <button className="btn btn-ghost" onClick={onBack}>
                Maybe later
              </button>
            </>
          )}
        </article>
      </PageShell>
    );
  }

  return (
    <PageShell title="Help us build it" onBack={onBack}>
      <p className="page-lede">
        QueerSafeSpace is in beta and built by and for the community. We especially need{' '}
        <strong>data collectors</strong> and <strong>testers</strong>. Tell us a little about
        yourself and how you would like to help.
      </p>
      <p className="tester-note">
        <Icon name="user" size={16} />
        <span>
          This is a volunteer sign-up, not an account. {signedIn ? '' : 'To rate places you will also need a free account. '}
          {!signedIn && (
            <button type="button" className="link-btn" onClick={onCreateAccount}>
              Create an account
            </button>
          )}
        </span>
      </p>
      <article className="info-card">
        <form onSubmit={submit} noValidate>
          <div className="fg">
            <label className="fl" htmlFor="t-name">
              Your name
            </label>
            <input
              id="t-name"
              className="fi"
              autoComplete="given-name"
              placeholder="A first name is fine"
              maxLength={80}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="t-email">
              Email
            </label>
            <input
              id="t-email"
              type="email"
              className="fi"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="t-loc">
              Where can you rate places? <span className="opt">(city and state, optional)</span>
            </label>
            <input
              id="t-loc"
              className="fi"
              placeholder="e.g. Ocala, FL"
              maxLength={120}
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="t-device">
              What do you use? <span className="opt">(optional)</span>
            </label>
            <select
              id="t-device"
              className="fi"
              value={form.device}
              onChange={(e) => set('device', e.target.value as TesterSignup['device'])}
            >
              <option value="">Choose one</option>
              {TESTER_DEVICES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="fg role-set">
            <legend className="fl">How would you like to help?</legend>
            {TESTER_ROLES.map((r) => (
              <label className="role-opt" key={r.value}>
                <input
                  type="checkbox"
                  checked={form.roles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                />
                <span>
                  <strong>{r.label}</strong>
                  <small>{r.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="fg">
            <label className="fl" htmlFor="t-note">
              Anything else? <span className="opt">(optional)</span>
            </label>
            <textarea
              id="t-note"
              className="fi ta"
              maxLength={1000}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>

          {/* Honeypot: hidden from people, bots fill it in. */}
          <input
            className="hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
            name="website"
          />

          <p className="account-note">
            Please only rate places you have been to or know firsthand. Accuracy matters more than
            how many you do. We can&apos;t offer payment, but we plan to thank our early supporters
            with special perks.
          </p>

          {error && <div className="fmsg error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Count me in'}
          </button>
          <p className="account-note">
            We only use this to contact you about QueerSafeSpace. See our{' '}
            <button type="button" className="link-btn" onClick={() => onOpenPage('privacy')}>
              privacy policy
            </button>
            . Ask us at any time to delete your sign-up.
          </p>
        </form>
      </article>
    </PageShell>
  );
}
