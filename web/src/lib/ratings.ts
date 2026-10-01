import type { LocationCategory, OverallRating, RatingVote, SafetyRating } from './types';

/**
 * Majority-vote tally, ported from overallRating() in index.html.
 * Ties resolve safe > not_safe > mixed, and no votes means 'unknown'.
 */
export function overallRating(ratings: RatingVote[] | null | undefined): OverallRating {
  if (!ratings || !ratings.length) return 'unknown';
  const c = countRatings(ratings);
  const max = Math.max(c.safe, c.mixed, c.not_safe);
  if (c.safe === max && c.safe > 0) return 'safe';
  if (c.not_safe === max && c.not_safe > 0) return 'not_safe';
  if (c.mixed > 0) return 'mixed';
  return 'unknown';
}

export function countRatings(
  ratings: RatingVote[] | null | undefined,
): Record<SafetyRating, number> {
  const c: Record<SafetyRating, number> = { safe: 0, mixed: 0, not_safe: 0 };
  (ratings ?? []).forEach((r) => {
    if (c[r.rating] !== undefined) c[r.rating]++;
  });
  return c;
}

export const PIN_COLORS: Record<OverallRating, string> = {
  safe: '#2F9E5B',
  mixed: '#E0A010',
  not_safe: '#D64545',
  unknown: '#8A94A3',
};

export const RATING_LABELS: Record<OverallRating, string> = {
  safe: '✅ Safe',
  mixed: '⚠️ Mixed',
  not_safe: '❌ Not Safe',
  unknown: '❓ Unknown',
};

export type SpaceFilter = 'all' | 'safe' | 'mixed' | 'unsafe';

/** The filter chips use 'unsafe' while the stored value is 'not_safe'. */
export const FILTER_TO_RATING: Record<Exclude<SpaceFilter, 'all'>, SafetyRating> = {
  safe: 'safe',
  mixed: 'mixed',
  unsafe: 'not_safe',
};

export function matchesFilter(rating: OverallRating, filter: SpaceFilter): boolean {
  return filter === 'all' || rating === FILTER_TO_RATING[filter];
}

export const CATEGORY_LABELS: Record<LocationCategory, string> = {
  cafe: 'Café',
  restaurant: 'Restaurant',
  bar: 'Bar',
  retail: 'Shopping',
  place_of_worship: 'Place of worship',
  healthcare: 'Healthcare',
  community: 'Community',
  other: 'Place',
};

/** Icon name (see components/Icon.tsx) for each kind of place. */
export const CATEGORY_ICONS: Record<LocationCategory, string> = {
  cafe: 'cup',
  restaurant: 'fork',
  bar: 'glass',
  retail: 'bag',
  place_of_worship: 'church',
  healthcare: 'cross',
  community: 'users',
  other: 'pin',
};

/** Tags that describe a problem; the rest describe something good. Matches SAFETY_TAGS. */
export const NEGATIVE_TAGS: ReadonlySet<string> = new Set([
  'incident_reported',
  'hostile_clientele',
  'discriminatory_service',
  'unsafe_neighborhood',
]);

export function tagLabel(tag: string): string {
  const text = tag.replaceAll('_', ' ').replace('lgbtq', 'LGBTQ+');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const VERDICTS: Record<OverallRating, string> = {
  safe: 'Mostly safe',
  mixed: 'Mixed reports',
  not_safe: 'Reported not safe',
  unknown: 'No ratings yet',
};
