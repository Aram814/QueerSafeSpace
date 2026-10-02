import { supabase } from './supabase';

export type TesterDevice = 'iphone' | 'android' | 'computer' | 'other';
export type TesterRole = 'tester' | 'rater' | 'ambassador' | 'feedback';

export interface TesterSignup {
  name: string;
  email: string;
  location: string;
  device: TesterDevice | '';
  roles: TesterRole[];
  note: string;
}

export const TESTER_ROLES: { value: TesterRole; label: string; hint: string }[] = [
  {
    value: 'rater',
    label: 'Data collector',
    hint: 'Rate and add places you have been to or know firsthand, in the areas you know',
  },
  {
    value: 'tester',
    label: 'Tester',
    hint: 'Use the app like anyone would, try features, and tell us what breaks or confuses you',
  },
  {
    value: 'ambassador',
    label: 'Brand ambassador',
    hint: 'Share QueerSafeSpace with friends, groups and local businesses',
  },
  { value: 'feedback', label: 'Feedback', hint: 'Ideas, wishes and honest opinions, whenever you have them' },
];

export const TESTER_DEVICES: { value: TesterDevice; label: string }[] = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'android', label: 'Android phone' },
  { value: 'computer', label: 'Computer' },
  { value: 'other', label: 'Something else' },
];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Returns an error message, or null if the form is fine. */
export function validateSignup(s: TesterSignup): string | null {
  if (!s.name.trim()) return 'Please enter your name (a first name is fine).';
  if (!EMAIL.test(s.email.trim())) return 'Please enter a valid email address.';
  if (!s.roles.length) return 'Pick at least one way you would like to help.';
  return null;
}

export async function submitTesterSignup(s: TesterSignup): Promise<void> {
  const { error } = await supabase.rpc('submit_tester_signup', {
    p_name: s.name.trim(),
    p_email: s.email.trim(),
    p_location: s.location.trim() || null,
    p_device: s.device || null,
    p_roles: s.roles,
    p_note: s.note.trim() || null,
  });
  if (error) throw new Error(error.message);
}
