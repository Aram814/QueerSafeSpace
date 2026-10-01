import { supabase } from './supabase';
import type {
  LocationCategory,
  PublicLocation,
  PublicRating,
  Rating,
  RatingVote,
  SafetyRating,
  SafetyTag,
  Space,
  SpaceDetail,
} from './types';

/**
 * Signed-out reads go through public_locations / public_ratings, which project
 * away user_id. The base tables are unreadable by `anon` on purpose, so this is
 * the only anonymous path and it cannot expose an author.
 */
function asSpace(location: PublicLocation, ratings: RatingVote[]): Space {
  return { ...location, user_id: null, identity: null, ratings };
}

async function loadSpacesAnonymously(): Promise<Space[]> {
  const [locations, ratings] = await Promise.all([
    supabase.from('public_locations').select('*'),
    supabase.from('public_ratings').select('space_id, rating'),
  ]);
  if (locations.error) {
    console.warn('Could not load spaces:', locations.error.message);
    return [];
  }

  // The views have no FK metadata to embed through, so the votes are grouped
  // client-side instead of with a nested select.
  const votesBySpace = new Map<string, RatingVote[]>();
  for (const row of (ratings.data ?? []) as Pick<PublicRating, 'space_id' | 'rating'>[]) {
    const votes = votesBySpace.get(row.space_id) ?? [];
    votes.push({ rating: row.rating });
    votesBySpace.set(row.space_id, votes);
  }

  return ((locations.data ?? []) as PublicLocation[]).map((loc) =>
    asSpace(loc, votesBySpace.get(loc.id) ?? []),
  );
}

/** Ported from loadSpaces() in index.html. */
export async function loadSpaces(signedIn: boolean): Promise<Space[]> {
  if (!signedIn) return loadSpacesAnonymously();

  const { data, error } = await supabase.from('locations').select('*, ratings(rating)');
  if (error) {
    console.warn('Could not load spaces:', error.message);
    return [];
  }
  return (data ?? []) as Space[];
}

async function loadSpaceDetailAnonymously(spaceId: string): Promise<SpaceDetail | null> {
  const [location, ratings] = await Promise.all([
    supabase.from('public_locations').select('*').eq('id', spaceId).single(),
    supabase.from('public_ratings').select('*').eq('space_id', spaceId),
  ]);
  if (!location.data) return null;

  const reviews: Rating[] = ((ratings.data ?? []) as PublicRating[]).map((r) => ({
    ...r,
    user_id: null,
  }));
  return { ...(location.data as PublicLocation), user_id: null, identity: null, ratings: reviews };
}

/**
 * Signed-in and signed-out visitors read the same public views, so a rating always shows its
 * author's chosen username (never user_id or email).
 */
export async function loadSpaceDetail(spaceId: string): Promise<SpaceDetail | null> {
  return loadSpaceDetailAnonymously(spaceId);
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
