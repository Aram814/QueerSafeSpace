import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from './lib/auth';
import { loadProfile } from './lib/profiles';
import type { Profile } from './lib/types';
import AuthOverlay, { type AuthMode } from './components/AuthOverlay';
import Toast from './components/Toast';
import SplashScreen from './screens/SplashScreen';
import MapScreen from './screens/MapScreen';
import { ContactPage, CrisisPage } from './screens/InfoPages';

type Screen = 'splash' | 'main';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Crisis resources and Contact open over the map so its state (search, position) is kept.
  const [page, setPage] = useState<'crisis' | 'contact' | null>(null);

  const showToast = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    let active = true;

    // Mirrors onAuthStateChange in index.html: a session sends you to the map.
    const handle = (nextUser: User | null) => {
      if (!active) return;
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
      {page === 'contact' && <ContactPage onBack={() => setPage(null)} />}

      {authMode && (
        <AuthOverlay
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
          onToast={showToast}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
