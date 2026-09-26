import type { Session, User } from '@supabase/supabase-js';
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

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await withTimeout(
    supabase.auth.signUp({ email, password }),
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
    supabase.auth.resetPasswordForEmail(email),
    TIMEOUT_MS,
    'Connection timed out. Please try again.',
  );
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(handler: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session?.user ?? null);
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
