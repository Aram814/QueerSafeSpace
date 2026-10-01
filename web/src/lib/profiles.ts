import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

export const DEFAULT_AVATAR = '🏳️‍🌈';

export const AVATARS = [
  '🏳️‍🌈', '🏳️‍⚧️', '👩', '👨', '🧑', '❤️', '🧡', '💛',
  '💚', '💙', '💜', '🩵', '🩷', '🤍', '🖤',
];

/** Usernames are public, so the default must not reveal anything about the person's email. */
function fallbackUsername(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `friend-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export const USERNAME_HINT =
  'Please don\u2019t use your real name. This protects everyone\u2019s identity and safety, including yours.';

/** Returns an error message, or null if the username is acceptable. */
export function validateUsername(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 3 || name.length > 20) return 'Usernames are 3 to 20 characters.';
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    return 'Use only letters, numbers, dots, dashes and underscores.';
  }
  return null;
}

/** True if nobody has this username. If the check cannot run, allow it: the database enforces uniqueness. */
export async function isUsernameAvailable(name: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { name });
  if (error) return true;
  return data !== false;
}

/**
 * Ported from loadProfile(): read the profile, creating it on first sign-in.
 * A concurrent insert (duplicate key) falls back to re-reading the row.
 *
 * profiles is readable only by its owner, so this is the one and only path that
 * ever touches the table — nothing else may join a profile to a rating.
 */
export async function loadProfile(user: User): Promise<Profile> {
  // The name picked on the sign-up form travels in the account's metadata.
  const chosen = String(user.user_metadata?.username ?? '').trim();
  const fallback: Profile = {
    user_id: user.id,
    username: chosen && !validateUsername(chosen) ? chosen : fallbackUsername(),
    avatar_url: DEFAULT_AVATAR,
    sign_up_date: null,
  };

  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) return data as Profile;

    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, username: fallback.username, avatar_url: DEFAULT_AVATAR })
      .select()
      .single();
    if (created) return created as Profile;

    console.warn('Profile insert error (may be duplicate):', insertError?.message);
    const { data: retry } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (retry) return retry as Profile;

    // The chosen name was taken in the meantime: fall back to a random one rather than fail.
    const random = fallbackUsername();
    const { data: second } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, username: random, avatar_url: DEFAULT_AVATAR })
      .select()
      .single();
    return (second as Profile | null) ?? { ...fallback, username: random };
  } catch (err) {
    console.error('loadProfile error:', err);
    return fallback;
  }
}

export async function saveAvatar(userId: string, avatar: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatar })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function saveUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('user_id', userId);
  if (error) {
    // 23505 = unique_violation: profiles.username is UNIQUE.
    throw new Error(error.code === '23505' ? 'That username is taken.' : error.message);
  }
}
