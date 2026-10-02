import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { deleteAccount, signOut, updatePassword } from '../lib/auth';
import { isEmailName, isUsernameAvailable, saveAvatar, setBadgeVisibility, saveUsername, USERNAME_HINT, validateUsername } from '../lib/profiles';
import type { Profile } from '../lib/types';
import FoundingBadge from '../components/FoundingBadge';
import Avatar from '../components/Avatar';
import ImpactCard from '../components/ImpactCard';
import { AVATAR_DEFS, DEFAULT_AVATAR, isUnlocked, TIER_UNLOCK } from '../lib/avatars';
import { loadImpact, type Impact } from '../lib/impact';
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

  const [impact, setImpact] = useState<Impact | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const founding = Boolean(profile?.founding);

  useEffect(() => {
    if (!founding) return;
    let alive = true;
    loadImpact()
      .then((i) => alive && setImpact(i))
      .catch((err) => alive && setImpactError(err instanceof Error ? err.message : 'Could not load your stats'));
    return () => {
      alive = false;
    };
  }, [founding]);

  const referrals = impact?.referrals ?? 0;
  const avatar = profile?.avatar_url ?? DEFAULT_AVATAR;

  async function pickAvatar(next: string) {
    if (!profile) return;
    try {
      await saveAvatar(user.id, next);
      onProfileChange({ ...profile, avatar_url: next });
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not save your avatar');
    }
  }

  async function toggleBadge(show: boolean) {
    if (!profile) return;
    onProfileChange({ ...profile, badgeVisible: show });
    try {
      await setBadgeVisibility(show);
    } catch (err) {
      onProfileChange({ ...profile, badgeVisible: !show });
      onToast(err instanceof Error ? err.message : 'Could not update your badge setting');
    }
  }

  async function submitUsername(e: FormEvent) {
    e.preventDefault();
    const next = username.trim();
    if (!profile || next === profile.username) return;
    const nameError = validateUsername(next);
    if (nameError) {
      setUsernameMsg({ text: nameError, error: true });
      return;
    }
    if (isEmailName(next, user.email)) {
      setUsernameMsg({ text: 'Please don\u2019t use the first part of your email as your username.', error: true });
      return;
    }
    if (!(await isUsernameAvailable(next))) {
      setUsernameMsg({ text: 'That username is taken.', error: true });
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
        {profile?.founding && (
          <div className="founding-row">
            <FoundingBadge size="large" />
            <p>Thank you for being here at the start. You helped build this.</p>
            <label className="badge-toggle">
              <input
                type="checkbox"
                checked={Boolean(profile.badgeVisible)}
                onChange={(e) => void toggleBadge(e.target.checked)}
              />
              <span>Show my badge next to my ratings and comments</span>
            </label>
          </div>
        )}
        <div className="avatar-row" role="radiogroup" aria-label="Avatar">
          {AVATAR_DEFS.map((def) => {
            const open = isUnlocked(def, referrals);
            return (
              <button
                key={def.id}
                type="button"
                role="radio"
                aria-checked={avatar === def.id}
                aria-label={open ? def.label : `${def.label} (locked)`}
                title={open ? def.label : `Unlocks at ${TIER_UNLOCK[def.tier]} referrals`}
                disabled={!open}
                className={`avatar-opt${avatar === def.id ? ' on' : ''}${open ? '' : ' locked'}`}
                onClick={() => void pickAvatar(def.id)}
              >
                <Avatar id={def.id} size={40} />
                {!open && <span className="avatar-lock" aria-hidden="true">🔒</span>}
              </button>
            );
          })}
        </div>
        <p className="account-note avatar-note">
          {founding
            ? `Share your referral code to unlock more avatars: ${TIER_UNLOCK[1]} referrals unlocks the glow set, ${TIER_UNLOCK[2]} the rings and night sky, and ${TIER_UNLOCK[3]} a one-of-a-kind gold star.`
            : 'Founding Members can unlock more avatars by sharing their referral code.'}
        </p>
        <form onSubmit={submitUsername}>
          <div className="fg">
            <label className="fl" htmlFor="acct-username">
              Username
            </label>
            <input
              id="acct-username"
              className="fi"
              value={username}
              maxLength={20}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {usernameMsg && <div className={`fmsg${usernameMsg.error ? ' error' : ''}`}>{usernameMsg.text}</div>}
          <button type="submit" className="btn btn-primary">
            Save username
          </button>
        </form>
        <p className="account-note">
          Your username is shown publicly next to your ratings and comments. {USERNAME_HINT}
        </p>
      </article>

      {founding && <ImpactCard impact={impact} error={impactError} onToast={onToast} />}

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
