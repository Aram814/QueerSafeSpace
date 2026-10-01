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

export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

interface SpaceRow {
  id: string;
  created_at: string;
  name: string;
  address: string;
  category: LocationCategory;
  safety_rating: Space['safety_rating'];
  tags: string[] | null;
  notes: string | null;
  latitude: number;
  longitude: number;
  source: 'community' | 'osm';
  safe_count: number;
  mixed_count: number;
  not_safe_count: number;
}

/** Rebuilds the vote list the rest of the app tallies from the counts the database sends. */
function votes(row: SpaceRow): RatingVote[] {
  const list: RatingVote[] = [];
  for (let i = 0; i < row.safe_count; i++) list.push({ rating: 'safe' });
  for (let i = 0; i < row.mixed_count; i++) list.push({ rating: 'mixed' });
  for (let i = 0; i < row.not_safe_count; i++) list.push({ rating: 'not_safe' });
  return list;
}

/**
 * Places in (and around) the visible map, nearest to `center` first, with rating counts. One
 * path for signed-in and signed-out visitors: it never exposes who added a place.
 */
export async function loadSpacesInView(
  bounds: MapBounds,
  center: { lat: number; lon: number },
): Promise<Space[]> {
  const { data, error } = await supabase.rpc('spaces_in_view', {
    min_lat: bounds.south,
    max_lat: bounds.north,
    min_lon: bounds.west,
    max_lon: bounds.east,
    center_lat: center.lat,
    center_lon: center.lon,
  });
  if (error) {
    console.warn('Could not load spaces:', error.message);
    return [];
  }
  return ((data ?? []) as SpaceRow[]).map((row) => {
    const { safe_count, mixed_count, not_safe_count, ...location } = row;
    void safe_count;
    void mixed_count;
    void not_safe_count;
    return { ...location, user_id: null, identity: null, ratings: votes(row) } as Space;
  });
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
