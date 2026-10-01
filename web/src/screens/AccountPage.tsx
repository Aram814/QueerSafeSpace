import { useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { deleteAccount, signOut, updatePassword } from '../lib/auth';
import { AVATARS, saveAvatar, saveUsername } from '../lib/profiles';
import type { Profile } from '../lib/types';
import Icon from '../components/Icon';
import { PageShell } from './InfoPages';

interface Props {
  user: User;
  profile: Profile | null;
  onBack: () => void;
  onProfileChange: (profile: Profile) => void;
  onSignedOut: () => void;
  onToast: (message: string) => void;
}

const MIN_PASSWORD = 8;

export default function AccountPage({ user, profile, onBack, onProfileChange, onSignedOut, onToast }: Props) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameMsg, setUsernameMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const avatar = profile?.avatar_url ?? AVATARS[0];

  async function pickAvatar(next: string) {
    if (!profile) return;
    try {
      await saveAvatar(user.id, next);
      onProfileChange({ ...profile, avatar_url: next });
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not save your avatar');
    }
  }

  async function submitUsername(e: FormEvent) {
    e.preventDefault();
    const next = username.trim();
    if (!profile || next === profile.username) return;
    if (next.length < 2 || next.length > 30) {
      setUsernameMsg({ text: 'Usernames are 2 to 30 characters.', error: true });
      return;
    }
    try {
      await saveUsername(user.id, next);
      onProfileChange({ ...profile, username: next });
      setUsernameMsg({ text: 'Username saved.', error: false });
    } catch (err) {
      setUsernameMsg({ text: err instanceof Error ? err.message : 'Could not save', error: true });
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setPasswordMsg({ text: `Password must be at least ${MIN_PASSWORD} characters.`, error: true });
      return;
    }
    if (password !== confirm) {
      setPasswordMsg({ text: 'Passwords do not match.', error: true });
      return;
    }
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      setPasswordMsg({ text: 'Password updated.', error: false });
    } catch (err) {
      setPasswordMsg({ text: err instanceof Error ? err.message : 'Could not update', error: true });
    }
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteMsg(null);
    try {
      await deleteAccount();
      onToast('Your account has been deleted');
      onSignedOut();
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <PageShell title="Account settings" onBack={onBack}>
      <article className="info-card">
        <h2>Profile</h2>
        <p className="account-email">{user.email}</p>
        <div className="avatar-row" role="radiogroup" aria-label="Avatar">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={avatar === a}
              className={`avatar-opt${avatar === a ? ' on' : ''}`}
              onClick={() => void pickAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <form onSubmit={submitUsername}>
          <div className="fg">
            <label className="fl" htmlFor="acct-username">
              Username
            </label>
            <input
              id="acct-username"
              className="fi"
              value={username}
              maxLength={30}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {usernameMsg && <div className={`fmsg${usernameMsg.error ? ' error' : ''}`}>{usernameMsg.text}</div>}
          <button type="submit" className="btn btn-primary">
            Save username
          </button>
        </form>
        <p className="account-note">
          Your username is shown publicly next to your ratings and comments. Please don&apos;t use
          your real name. This protects everyone&apos;s identity and safety, including yours.
        </p>
      </article>

      <article className="info-card">
        <h2>Change password</h2>
        <form onSubmit={submitPassword}>
          <div className="fg">
            <label className="fl" htmlFor="acct-pw">
              New password
            </label>
            <input
              id="acct-pw"
              type="password"
              className="fi"
              autoComplete="new-password"
              placeholder={`Minimum ${MIN_PASSWORD} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="fl" htmlFor="acct-cpw">
              Confirm new password
            </label>
            <input
              id="acct-cpw"
              type="password"
              className="fi"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {passwordMsg && <div className={`fmsg${passwordMsg.error ? ' error' : ''}`}>{passwordMsg.text}</div>}
          <button type="submit" className="btn btn-primary">
            Update password
          </button>
        </form>
      </article>

      <article className="info-card">
        <h2>Sign out</h2>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            await signOut();
            onSignedOut();
            onToast('Signed out');
          }}
        >
          <Icon name="logout" />
          Sign out
        </button>
      </article>

      <article className="info-card danger-card">
        <h2>Delete account</h2>
        <p>
          This permanently deletes your login and profile. The ratings and spaces you added stay on
          the map for the community, but they are no longer connected to you in any way. This can&apos;t
          be undone.
        </p>
        {!confirmDelete ? (
          <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </button>
        ) : (
          <>
            <div className="fg">
              <label className="fl" htmlFor="acct-del">
                Type DELETE to confirm
              </label>
              <input
                id="acct-del"
                className="fi"
                autoCapitalize="characters"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
            {deleteMsg && <div className="fmsg error">{deleteMsg}</div>}
            <button
              className="btn btn-danger"
              disabled={typed.trim() !== 'DELETE' || busy}
              onClick={() => void handleDelete()}
            >
              {busy ? 'Deleting…' : 'Permanently delete my account'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setConfirmDelete(false);
                setTyped('');
                setDeleteMsg(null);
              }}
            >
              Cancel
            </button>
          </>
        )}
      </article>
    </PageShell>
  );
}
