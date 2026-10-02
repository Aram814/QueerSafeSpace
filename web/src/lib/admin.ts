import { supabase } from './supabase';

/** Asks the database whether this account is the owner/admin. Any failure means "no". */
export async function checkAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export interface AdminOverview {
  accounts: number;
  confirmed: number;
  new7d: number;
  new30d: number;
  foundingMembers: number;
  referrals: number;
  testerSignups: number;
  testersWithAccount: number;
  placesTotal: number;
  placesCommunity: number;
  placesRated: number;
  ratingsTotal: number;
  ratings7d: number;
}

export interface AdminAccount {
  createdAt: string;
  email: string;
  username: string | null;
  confirmed: boolean;
  lastSignInAt: string | null;
  founding: boolean;
  testerSignup: boolean;
  viaReferral: boolean;
}

export interface AdminTester {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  location: string | null;
  device: string | null;
  roles: string[];
  note: string | null;
  contacted: boolean;
  hasAccount: boolean;
  founding: boolean;
}

function first<T>(data: unknown): T {
  return (Array.isArray(data) ? data[0] : data) as T;
}

export async function loadOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw new Error(error.message);
  const r = first<Record<string, number>>(data);
  return {
    accounts: r.accounts,
    confirmed: r.confirmed,
    new7d: r.new_7d,
    new30d: r.new_30d,
    foundingMembers: r.founding_members,
    referrals: r.referrals,
    testerSignups: r.tester_signups,
    testersWithAccount: r.testers_with_acct,
    placesTotal: r.places_total,
    placesCommunity: r.places_community,
    placesRated: r.places_rated,
    ratingsTotal: r.ratings_total,
    ratings7d: r.ratings_7d,
  };
}

export async function loadDailySignups(days = 14): Promise<{ day: string; accounts: number }[]> {
  const { data, error } = await supabase.rpc('admin_daily_signups', { p_days: days });
  if (error) throw new Error(error.message);
  return (data ?? []) as { day: string; accounts: number }[];
}

export async function loadRecentAccounts(limit = 25): Promise<AdminAccount[]> {
  const { data, error } = await supabase.rpc('admin_recent_accounts', { p_limit: limit });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    createdAt: r.created_at as string,
    email: r.email as string,
    username: (r.username as string | null) ?? null,
    confirmed: Boolean(r.confirmed),
    lastSignInAt: (r.last_sign_in_at as string | null) ?? null,
    founding: Boolean(r.founding),
    testerSignup: Boolean(r.tester_signup),
    viaReferral: Boolean(r.via_referral),
  }));
}

export async function loadTesters(): Promise<AdminTester[]> {
  const { data, error } = await supabase.rpc('admin_tester_signups');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    name: r.name as string,
    email: r.email as string,
    location: (r.location as string | null) ?? null,
    device: (r.device as string | null) ?? null,
    roles: (r.roles as string[]) ?? [],
    note: (r.note as string | null) ?? null,
    contacted: Boolean(r.contacted),
    hasAccount: Boolean(r.has_account),
    founding: Boolean(r.founding),
  }));
}

export async function setContacted(id: string, contacted: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_contacted', { p_id: id, p_contacted: contacted });
  if (error) throw new Error(error.message);
}

/** Gives the Founding Member badge to every tester sign-up that has an account. Returns how many are new. */
export async function grantFounding(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_grant_founding');
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
