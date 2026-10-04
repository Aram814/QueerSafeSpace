import { supabase } from './supabase';

export type ReportReason = 'harassing' | 'vulgar' | 'false' | 'private' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassing', label: 'Harassing or hateful' },
  { value: 'vulgar', label: 'Vulgar or offensive language' },
  { value: 'false', label: 'False or misleading' },
  { value: 'private', label: 'Shares private information' },
  { value: 'other', label: 'Something else' },
];

/**
 * Asks the database whether text (for example a username) uses language we block.
 * If the check cannot run, the answer is "fine": the database enforces the rule again on save.
 */
export async function isTextAllowed(text: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('text_allowed', { p_text: text });
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

export async function reportComment(ratingId: string, reason: ReportReason, note: string): Promise<void> {
  const { error } = await supabase.rpc('report_comment', {
    p_rating_id: ratingId,
    p_reason: reason,
    p_note: note.trim() || null,
  });
  if (error) throw new Error(error.message);
}
