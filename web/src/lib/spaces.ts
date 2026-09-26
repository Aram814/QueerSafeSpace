import { supabase } from './supabase';
import type { LocationCategory, SafetyRating, SafetyTag, Space, SpaceDetail } from './types';

/** Ported from loadSpaces() in index.html. */
export async function loadSpaces(): Promise<Space[]> {
  const { data, error } = await supabase.from('locations').select('*, ratings(rating)');
  if (error) {
    console.warn('Could not load spaces:', error.message);
    return [];
  }
  return (data ?? []) as Space[];
}

/** Ported from the detail query in openDetail(). */
export async function loadSpaceDetail(spaceId: string): Promise<SpaceDetail | null> {
  const { data } = await supabase
    .from('locations')
    .select('*, ratings(*)')
    .eq('id', spaceId)
    .single();
  return (data as SpaceDetail | null) ?? null;
}

export interface NewSpaceInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string;
  tags: string[];
  userId: string;
  safetyRating: SafetyRating;
  category?: LocationCategory;
}

/**
 * Ported from submitSpace(): insert the location, then seed it with the
 * submitter's own rating so the space starts with one vote.
 */
export async function submitSpace(input: NewSpaceInput): Promise<Space> {
  const { data: space, error } = await supabase
    .from('locations')
    .insert({
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      tags: input.tags,
      user_id: input.userId,
      category: input.category ?? 'community',
      safety_rating: input.safetyRating,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: ratingError } = await supabase
    .from('ratings')
    .insert({ space_id: space.id, user_id: input.userId, rating: input.safetyRating });
  if (ratingError) throw new Error(ratingError.message);

  return { ...(space as Space), ratings: [{ rating: input.safetyRating }] };
}

export interface RatingInput {
  spaceId: string;
  userId: string;
  rating: SafetyRating;
  comment?: string | null;
  safetyTags?: SafetyTag[];
}

/**
 * Ported from submitRating(). The upsert relies on the
 * ratings_space_id_user_id_key unique constraint: one rating per user per space,
 * re-rating overwrites the previous vote.
 */
export async function submitRating(input: RatingInput): Promise<void> {
  const { error } = await supabase.from('ratings').upsert(
    {
      space_id: input.spaceId,
      user_id: input.userId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      safety_tags: input.safetyTags ?? [],
    },
    { onConflict: 'space_id,user_id' },
  );
  if (error) throw new Error(error.message);
}
