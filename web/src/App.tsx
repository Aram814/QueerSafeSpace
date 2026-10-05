import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from './lib/auth';
import { captureReferral } from './lib/referral';
import { loadProfile } from './lib/profiles';
import type { Profile } from './lib/types';
import AuthOverlay, { type AuthMode } from './components/AuthOverlay';
import Toast from './components/Toast';
import SplashScreen from './screens/SplashScreen';
import MapScreen from './screens/MapScreen';
import AccountPage from './screens/AccountPage';
import TesterPage from './screens/TesterPage';
import AdminPage from './screens/AdminPage';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import { ContactPage, CrisisPage, PrivacyPage, SupportPage, TermsPage, type InfoPage } from './screens/InfoPages';

type Screen = 'splash' | 'main';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  // Set when the user opens a password-reset link from their email.
  const [recovering, setRecovering] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Crisis resources and Contact open over the map so its state (search, position) is kept.
  // Opening /?join (for QR codes and flyers) goes straight to the tester form.
  const [page, setPage] = useState<InfoPage | null>(() =>
    new URLSearchParams(window.location.search).has('join') ? 'tester' : null,
  );

  const showToast = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    captureReferral();
  }, []);

  useEffect(() => {
    let active = true;

    // Mirrors onAuthStateChange in index.html: a session sends you to the map.
    const handle = (nextUser: User | null, event?: string) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      setScreen('main');
      setAuthMode(null);
      loadProfile(nextUser)
        .then((p) => active && setProfile(p))
        .catch((err) => console.error('loadProfile error:', err));
    };

    getSession().then((session) => handle(session?.user ?? null));
    const unsubscribe = onAuthStateChange(handle);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <>
      {screen === 'splash' ? (
        <SplashScreen
          onSignUp={() => setAuthMode('signup')}
          onSignIn={() => setAuthMode('signin')}
          onBrowseAnonymously={() => setScreen('main')}
          onOpenPage={setPage}
        />
      ) : (
        <MapScreen
          user={user}
          profile={profile}
          onRequestAuth={() => setAuthMode('signin')}
          onSignedOut={() => setScreen('splash')}
          onToast={showToast}
          onOpenPage={setPage}
        />
      )}

      {page === 'crisis' && <CrisisPage onBack={() => setPage(null)} />}
      {page === 'contact' && <ContactPage onBack={() => setPage(null)} onOpenPage={setPage} />}
      {page === 'support' && <SupportPage onBack={() => setPage(null)} onOpenPage={setPage} />}
      {page === 'privacy' && <PrivacyPage onBack={() => setPage(null)} />}
      {page === 'terms' && <TermsPage onBack={() => setPage(null)} />}

      {page === 'tester' && (
        <TesterPage
          onBack={() => {
            setPage(null);
            if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
          }}
          onOpenPage={setPage}
          signedIn={!!user}
          onCreateAccount={() => {
            setPage(null);
            if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
            setAuthMode('signup');
          }}
        />
      )}

      {page === 'account' && user && (
        <AccountPage
          user={user}
          profile={profile}
          onBack={() => setPage(null)}
          onProfileChange={setProfile}
          onSignedOut={() => {
            setPage(null);
            setScreen('splash');
          }}
          onToast={showToast}
        />
      )}

      {page === 'admin' && profile?.admin && (
        <AdminPage onBack={() => setPage(null)} onToast={showToast} />
      )}

      {recovering && (
        <ResetPasswordScreen
          onDone={(message) => {
            setRecovering(false);
            showToast(message);
          }}
        />
      )}

      {authMode && (
        <AuthOverlay
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
          onToast={showToast}
          onOpenPage={setPage}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
