/** Framework-agnostic domain types. Shared with the future Expo client. */

export const SAFETY_RATINGS = ['safe', 'mixed', 'not_safe'] as const;
export type SafetyRating = (typeof SAFETY_RATINGS)[number];

/** `unknown` is never stored — it is what a space with no ratings resolves to. */
export type OverallRating = SafetyRating | 'unknown';

export const LOCATION_CATEGORIES = [
  'cafe',
  'restaurant',
  'bar',
  'retail',
  'place_of_worship',
  'healthcare',
  'community',
  'other',
] as const;
export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

/** Matches ratings_safety_tags_check in supabase/migrations. */
export const SAFETY_TAGS = [
  'gender_neutral_restrooms',
  'trans_friendly_staff',
  'wheelchair_accessible',
  'incident_reported',
  'gender_neutral_signage',
  'lgbtq_owned',
  'pride_displayed',
  'staff_used_correct_pronouns',
  'hostile_clientele',
  'discriminatory_service',
  'unsafe_neighborhood',
] as const;
export type SafetyTag = (typeof SAFETY_TAGS)[number];

export interface Rating {
  id: string;
  space_id: string;
  user_id: string | null;
  rating: SafetyRating;
  comment: string | null;
  safety_tags: SafetyTag[];
  created_at: string | null;
}

/** The shape loadSpaces() reads: only the rating value is needed for the tally. */
export type RatingVote = Pick<Rating, 'rating'>;

export interface Location {
  id: string;
  created_at: string;
  name: string;
  address: string;
  category: LocationCategory;
  safety_rating: OverallRating;
  tags: string[] | null;
  identity: string | null;
  notes: string | null;
  user_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** public_locations / public_ratings: the anonymous read views, minus user_id. */
export type PublicLocation = Omit<Location, 'user_id' | 'identity'>;
export type PublicRating = Omit<Rating, 'user_id'>;

export type Space = Location & { ratings: RatingVote[] | null };
export type SpaceDetail = Location & { ratings: Rating[] | null };

export interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  sign_up_date: string | null;
}

/** A place returned by Overpass or Nominatim, before it becomes a location. */
export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
  display_name: string;
  dist: number | null;
  /** Set for Foursquare results, which must be credited where they are shown. */
  source?: 'foursquare';
}
