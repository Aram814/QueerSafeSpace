import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { FEEDBACK_HREF, TESTER_HREF } from '../config';
import type { Profile } from '../lib/types';
import { setTheme, type ThemeChoice } from '../theme';
import Icon, { type IconName } from './Icon';
import ShieldLogo from './ShieldLogo';

interface Props {
  user: User | null;
  profile: Profile | null;
  theme: ThemeChoice;
  onThemeChange: (t: ThemeChoice) => void;
  onClose: () => void;
  onOpenPage: (page: 'crisis' | 'contact') => void;
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
          <ShieldLogo className="menu-shield" />
          <div className="menu-id">
            <div className="menu-uname">{user ? (profile?.username ?? 'Member') : 'Guest'}</div>
            <div className="menu-email">{user?.email ?? 'Not signed in'}</div>
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
          <button className="menu-item" onClick={() => onOpenPage('crisis')}>
            <Icon name="sos" />
            Crisis resources
          </button>
          <button className="menu-item" onClick={() => onOpenPage('contact')}>
            <Icon name="mail" />
            Contact us
          </button>

          <div className="menu-sep" />

          <div className="menu-label">
            Help us build this <span className="beta-tag">Beta</span>
          </div>
          <a className="menu-item" href={FEEDBACK_HREF}>
            <Icon name="message" />
            Send feedback
          </a>
          <a className="menu-item" href={TESTER_HREF}>
            <Icon name="flask" />
            Become a tester
          </a>

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

        <div className="menu-foot">QueerSafeSpace &middot; Because safety shouldn&apos;t be a privilege</div>
      </aside>
    </div>
  );
}
