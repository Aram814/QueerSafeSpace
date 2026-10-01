import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Ported from withTimeout() in index.html. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([Promise.resolve(promise), timer]);
}

const TIMEOUT_MS = 12000;
const TIMEOUT_MSG = 'Connection timed out. Please try again in a moment.';

export async function signUp(email: string, password: string, username: string): Promise<void> {
  const { error } = await withTimeout(
    // The username is kept in the account's metadata until the profile is created at first sign-in.
    supabase.auth.signUp({ email, password, options: { data: { username } } }),
    TIMEOUT_MS,
    TIMEOUT_MSG,
  );
  if (error) throw new Error(error.message);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password }),
    TIMEOUT_MS,
    TIMEOUT_MSG,
  );
  if (error) throw new Error(error.message);
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await withTimeout(
    // The link lands on the app itself; onAuthStateChange then reports PASSWORD_RECOVERY.
    supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
    TIMEOUT_MS,
    'Connection timed out. Please try again.',
  );
  if (error) throw new Error(error.message);
}

/** Used by the reset-password screen and by Account settings. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await withTimeout(
    supabase.auth.updateUser({ password }),
    TIMEOUT_MS,
    TIMEOUT_MSG,
  );
  if (error) throw new Error(error.message);
}

/** Deletes the signed-in user via the delete_my_account() database function, then signs out. */
export async function deleteAccount(): Promise<void> {
  const { error } = await withTimeout(
    supabase.rpc('delete_my_account'),
    TIMEOUT_MS,
    TIMEOUT_MSG,
  );
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  handler: (user: User | null, event: AuthChangeEvent) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handler(session?.user ?? null, event);
  });
  return () => data.subscription.unsubscribe();
}

export type OAuthProvider = 'google' | 'apple';

/**
 * TODO: Google and Apple sign-in are not usable until the providers are enabled
 * and given client credentials in the Supabase dashboard
 * (Authentication -> Providers). Until then this call returns a
 * "provider is not enabled" error. See web/README.md.
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}
