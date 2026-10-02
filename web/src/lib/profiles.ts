import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

import { DEFAULT_AVATAR } from './avatars';

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

/** The part of an email before the @ must not be used as a public name. */
export function isEmailName(username: string, email: string | undefined): boolean {
  const name = (email ?? '').split('@')[0].toLowerCase();
  return !!name && username.trim().toLowerCase() === name;
}

/** True if nobody has this username. If the check cannot run, allow it: the database enforces uniqueness. */
export async function isUsernameAvailable(name: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { name });
  if (error) return true;
  return data !== false;
}

function emailName(user: User): string {
  return (user.email ?? '').split('@')[0].toLowerCase();
}

/**
 * Usernames are public, and the database may create a profile named after the email (a sign-up
 * trigger does this). If the profile still carries that email name, swap it for the name chosen
 * at sign-up, or for a random one if none was chosen.
 */
const repairAttempted = new Set<string>();

async function repairUsername(user: User, profile: Profile, chosen: string): Promise<Profile> {
  const email = emailName(user);
  if (!email || profile.username.toLowerCase() !== email) return profile;
  // Updating the account fires another auth event, so only ever try once per user per page load.
  if (repairAttempted.has(user.id)) return profile;
  repairAttempted.add(user.id);

  const valid = chosen && !validateUsername(chosen) && chosen.toLowerCase() !== email;
  const candidates = valid ? [chosen, fallbackUsername()] : [fallbackUsername()];
  for (const username of candidates) {
    const { error } = await supabase.from('profiles').update({ username }).eq('user_id', user.id);
    if (!error) {
      if (valid && username === chosen) {
        // The chosen name has been applied; stop it overriding later edits.
        void supabase.auth.updateUser({ data: { username: null } });
      }
      return { ...profile, username };
    }
  }
  return profile;
}

/**
 * Ported from loadProfile(): read the profile, creating it on first sign-in.
 * A concurrent insert (duplicate key) falls back to re-reading the row.
 *
 * profiles is readable only by its owner, so this is the one and only path that
 * ever touches the table — nothing else may join a profile to a rating.
 */
/** The member's badge status, or nulls if they have none (or we cannot tell). */
async function foundingStatus(userId: string): Promise<{ founding: boolean; badgeVisible: boolean }> {
  try {
    const { data } = await supabase
      .from('founding_members')
      .select('user_id, show_badge')
      .eq('user_id', userId)
      .maybeSingle();
    return { founding: Boolean(data), badgeVisible: Boolean(data?.show_badge) };
  } catch {
    return { founding: false, badgeVisible: false };
  }
}

const referralAttempted = new Set<string>();

/** A new member who arrived through a referral link tells the database once, then forgets the code. */
async function claimReferral(user: User): Promise<void> {
  const ref = String(user.user_metadata?.ref ?? '').trim();
  if (!ref || referralAttempted.has(user.id)) return;
  referralAttempted.add(user.id);
  try {
    const { error } = await supabase.rpc('claim_referral', { p_code: ref });
    if (error) {
      // Keep the code so the next sign-in can try again.
      referralAttempted.delete(user.id);
      console.error('claim_referral error:', error.message);
      return;
    }
    void supabase.auth.updateUser({ data: { ref: null } });
  } catch {
    /* referrals are a nice-to-have; never block sign-in */
  }
}

export async function loadProfile(user: User): Promise<Profile> {
  void claimReferral(user);
  const profile = await loadProfileRow(user);
  return { ...profile, ...(await foundingStatus(user.id)) };
}

async function loadProfileRow(user: User): Promise<Profile> {
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
    if (data) return await repairUsername(user, data as Profile, chosen);

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

export async function setBadgeVisibility(show: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_badge_visibility', { p_show: show });
  if (error) throw new Error(error.message);
}
