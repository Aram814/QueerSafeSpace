import { useState, type FormEvent } from 'react';
import { OAUTH_ENABLED } from '../config';
import { storedReferral } from '../lib/referral';
import { checkReferralCode, displayCode } from '../lib/impact';
import { isTextAllowed } from '../lib/moderation';
import { isEmailName, isUsernameAvailable, USERNAME_HINT, validateUsername } from '../lib/profiles';
import { resetPassword, signIn, signInWithOAuth, signUp } from '../lib/auth';

export type AuthMode = 'signin' | 'signup';

interface Props {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onToast: (message: string) => void;
  onOpenPage: (page: 'privacy' | 'terms') => void;
}

interface Message {
  text: string;
  isError: boolean;
}

export default function AuthOverlay({ mode, onModeChange, onClose, onToast, onOpenPage }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [refCode, setRefCode] = useState(() => {
    const saved = storedReferral();
    return saved ? displayCode(saved) : '';
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  // Ported from handleAuth(): validation order and copy are unchanged.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage({ text: 'Processing…', isError: false });

    try {
      if (mode === 'signup') {
        const nameError = validateUsername(username);
        if (nameError) {
          setMessage({ text: nameError, isError: true });
          return;
        }
        if (isEmailName(username, email)) {
          setMessage({
            text: 'Please don\u2019t use the first part of your email as your username.',
            isError: true,
          });
          return;
        }
        const cleanRef = refCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleanRef && (await checkReferralCode(cleanRef)) === false) {
          setMessage({ text: 'We could not find that referral code. Check it, or clear the box to continue without one.', isError: true });
          return;
        }
        if (!(await isTextAllowed(username.trim()))) {
          setMessage({ text: 'That username isn\u2019t allowed. Please pick another.', isError: true });
          return;
        }
        if (!(await isUsernameAvailable(username.trim()))) {
          setMessage({ text: 'That username is taken. Please pick another.', isError: true });
          return;
        }
        if (password !== confirmPassword) {
          setMessage({ text: 'Passwords do not match.', isError: true });
          return;
        }
        if (password.length < 8) {
          setMessage({ text: 'Password must be at least 8 characters.', isError: true });
          return;
        }
        if (!agreedTerms || !agreedPrivacy) {
          setMessage({ text: 'Please agree to Terms & Privacy Policy.', isError: true });
          return;
        }
        await signUp(email.trim(), password, username.trim(), cleanRef || undefined);
        setMessage({ text: '✅ Check your email to confirm your account!', isError: false });
      } else {
        await signIn(email.trim(), password);
        // onAuthStateChange handles navigation.
        onClose();
      }
    } catch (err) {
      console.error('handleAuth error:', err);
      setMessage({
        text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        isError: true,
      });
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      onToast('Enter your email first');
      return;
    }
    try {
      await resetPassword(email.trim());
      onToast('Password reset email sent!');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  // TODO: Google/Apple sign-in stays disabled until the providers are
  // configured in the Supabase dashboard. See web/README.md.
  async function handleOAuth(provider: 'google' | 'apple') {
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      onToast(err instanceof Error ? err.message : `${provider} sign-in is not available yet`);
    }
  }

  return (
    <div className="overlay center" role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="sheet-header">
          <div>
            <span className="sheet-brand wordmark">QueerSafeSpace</span>
            <span className="sheet-title">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
          </div>
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'signin' ? ' active' : ''}`}
            onClick={() => onModeChange('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => onModeChange('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl" htmlFor="a-email">
              Email
            </label>
            <input
              id="a-email"
              type="email"
              className="fi"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="fg">
            <label className="fl" htmlFor="a-pw">
              Password
            </label>
            <input
              id="a-pw"
              type="password"
              className="fi"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="fg">
                <label className="fl" htmlFor="a-username">
                  Choose a username
                </label>
                <input
                  id="a-username"
                  className="fi"
                  placeholder="e.g. rainbow_otter"
                  autoComplete="off"
                  autoCapitalize="none"
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="field-hint">
                  Shown next to your ratings and comments. {USERNAME_HINT}
                </p>
              </div>
              <div className="fg">
                <label className="fl" htmlFor="a-ref">
                  Referral code (optional)
                </label>
                <input
                  id="a-ref"
                  className="fi"
                  placeholder="QSS-XXXXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={12}
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                />
                <p className="field-hint">Do you have a referral code? Enter it here so the person who shared it gets credit.</p>
              </div>
              <div className="fg">
                <label className="fl" htmlFor="a-cpw">
                  Confirm Password
                </label>
                <input
                  id="a-cpw"
                  type="password"
                  className="fi"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="chk-wrap">
                <label className="chk-row">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                  />
                  <span>
                    I agree to the{' '}
                    <button type="button" className="link-btn" onClick={() => onOpenPage('terms')}>
                      Terms &amp; Conditions
                    </button>
                  </span>
                </label>
                <label className="chk-row">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  />
                  <span>
                    I agree to the{' '}
                    <button type="button" className="link-btn" onClick={() => onOpenPage('privacy')}>
                      Privacy Policy
                    </button>
                  </span>
                </label>
              </div>
            </>
          )}

          {message && (
            <div className={`fmsg${message.isError ? ' error' : ''}`}>{message.text}</div>
          )}

          <button type="submit" className="btn btn-primary">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>

          {mode === 'signin' && (
            <div className="forgot">
              <button type="button" className="link-btn" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </div>
          )}
        </form>

        {OAUTH_ENABLED && (
          <>
            <div className="oauth-divider">or continue with</div>
            <div className="oauth-row">
              <button className="btn btn-oauth" onClick={() => handleOAuth('google')}>
                Continue with Google
              </button>
              <button className="btn btn-oauth" onClick={() => handleOAuth('apple')}>
                Continue with Apple
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
