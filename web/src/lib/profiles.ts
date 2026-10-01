import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

export const DEFAULT_AVATAR = '🏳️‍🌈';

export const AVATARS = [
  '🏳️‍🌈', '🏳️‍⚧️', '👩', '👨', '🧑', '❤️', '🧡', '💛',
  '💚', '💙', '💜', '🩵', '🩷', '🤍', '🖤',
];

function fallbackUsername(user: User): string {
  return (user.email ?? '').split('@')[0] || 'friend';
}

/**
 * Ported from loadProfile(): read the profile, creating it on first sign-in.
 * A concurrent insert (duplicate key) falls back to re-reading the row.
 *
 * profiles is readable only by its owner, so this is the one and only path that
 * ever touches the table — nothing else may join a profile to a rating.
 */
export async function loadProfile(user: User): Promise<Profile> {
  const fallback: Profile = {
    user_id: user.id,
    username: fallbackUsername(user),
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
    return (retry as Profile | null) ?? fallback;
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
