import { DONATE_URL } from '../config';
import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { FEEDBACK_HREF } from '../config';
import Avatar from './Avatar';
import type { Profile } from '../lib/types';
import type { InfoPage } from '../screens/InfoPages';
import { setTheme, type ThemeChoice } from '../theme';
import FoundingBadge from './FoundingBadge';
import Icon, { type IconName } from './Icon';
import ShieldLogo from './ShieldLogo';

interface Props {
  user: User | null;
  profile: Profile | null;
  theme: ThemeChoice;
  onThemeChange: (t: ThemeChoice) => void;
  onClose: () => void;
  onOpenPage: (page: InfoPage) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const THEMES: { value: ThemeChoice; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Auto', icon: 'auto' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

export default function MenuDrawer({
  user,
  profile,
  theme,
  onThemeChange,
  onClose,
  onOpenPage,
  onSignIn,
  onSignOut,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="menu-veil" onClick={onClose}>
      <aside
        className="side-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-head">
          {user ? (
            <span className="menu-avatar" aria-hidden="true">
              <Avatar id={profile?.avatar_url} size={44} />
            </span>
          ) : (
            <ShieldLogo className="menu-shield" />
          )}
          <div className="menu-id">
            <div className="menu-uname">{user ? (profile?.username ?? 'Member') : 'Guest'}</div>
            <div className="menu-email">{user?.email ?? 'Not signed in'}</div>
            {profile?.founding && <FoundingBadge />}
          </div>
          <button className="menu-close" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="menu-nav">
          <button className="menu-item" onClick={onClose}>
            <Icon name="map" />
            Map
          </button>
          {user && (
            <button className="menu-item" onClick={() => onOpenPage('account')}>
              <Icon name="user" />
              Account settings
            </button>
          )}
          {profile?.admin && (
            <button className="menu-item" onClick={() => onOpenPage('admin')}>
              <Icon name="flask" />
              Admin
            </button>
          )}
          <button className="menu-item" onClick={() => onOpenPage('crisis')}>
            <Icon name="sos" />
            Crisis resources
          </button>
          {DONATE_URL && (
            <button className="menu-item" onClick={() => onOpenPage('support')}>
              <Icon name="heart" />
              Support QueerSafeSpace
            </button>
          )}
          <button className="menu-item" onClick={() => onOpenPage('contact')}>
            <Icon name="mail" />
            Contact us
          </button>
          <button className="menu-item" onClick={() => onOpenPage('privacy')}>
            <Icon name="lock" />
            Privacy policy
          </button>
          <button className="menu-item" onClick={() => onOpenPage('terms')}>
            <Icon name="file" />
            Terms &amp; conditions
          </button>

          <div className="menu-sep" />

          <div className="menu-label">
            Help us build this <span className="beta-tag">Beta</span>
          </div>
          <a className="menu-item" href={FEEDBACK_HREF}>
            <Icon name="message" />
            Send feedback
          </a>
          <button className="menu-item" onClick={() => onOpenPage('tester')}>
            <Icon name="flask" />
            Become a tester
          </button>

          <div className="menu-sep" />

          <div className="menu-label">Appearance</div>
          <div className="theme-seg" role="radiogroup" aria-label="Appearance">
            {THEMES.map((t) => (
              <button
                key={t.value}
                role="radio"
                aria-checked={theme === t.value}
                className={`theme-opt${theme === t.value ? ' on' : ''}`}
                onClick={() => {
                  setTheme(t.value);
                  onThemeChange(t.value);
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="menu-sep" />

          {user ? (
            <button className="menu-item" onClick={onSignOut}>
              <Icon name="logout" />
              Sign out
            </button>
          ) : (
            <button className="menu-item" onClick={onSignIn}>
              <Icon name="login" />
              Sign in
            </button>
          )}
        </nav>

        <div className="menu-foot">QueerSafeSpace &middot; Because Safety Shouldn&apos;t Be A Privilege</div>
      </aside>
    </div>
  );
}
