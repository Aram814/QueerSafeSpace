// Turns raw OpenStreetMap elements into rows for public.locations.
// Pure functions only (no network), so they can be tested with fixtures.

const PLACE_KEYS = ['amenity', 'shop', 'office', 'leisure', 'tourism', 'club', 'healthcare', 'craft'];

/** Why an element is left out, or null if it should be listed. */
export function skipReason(tags) {
  if (!tags.name) return 'no name';
  if (!PLACE_KEYS.some((k) => tags[k])) return 'not a place';

  // Not open to the general public, or adult venues.
  if (['private', 'members', 'no'].includes(tags.access)) return 'private';
  if (tags.nudism || tags.kinky === 'yes' || tags.fetish === 'yes') return 'adult venue';
  if (['stripclub', 'brothel', 'swingerclub'].includes(tags.amenity)) return 'adult venue';
  if (tags.shop === 'erotic') return 'adult venue';
  if (tags.club === 'nudism') return 'adult venue';

  // A chain's LGBTQ+ tag only counts when a mapper recorded how they know.
  const isChain = Boolean(tags.brand || tags['brand:wikidata'] || tags.operator_type === 'chain');
  const supported = tags['lgbtq:signed'] === 'yes' || Boolean(tags['source:lgbtq']);
  const level = tags.lgbtq ?? (tags['lgbtq:welcome'] === 'yes' ? 'welcome' : '');
  if (isChain && !supported) return 'chain without a source';

  if (!['primary', 'only', 'welcome', 'yes'].includes(level)) return 'unclear tag';
  return null;
}

export function category(tags) {
  const a = tags.amenity;
  if (['bar', 'pub', 'nightclub', 'biergarten', 'social_club'].includes(a) || tags.club === 'social') return 'bar';
  if (a === 'cafe' || a === 'ice_cream') return 'cafe';
  if (['restaurant', 'fast_food', 'food_court'].includes(a)) return 'restaurant';
  if (tags.shop || a === 'fuel' || a === 'marketplace') return 'retail';
  if (a === 'place_of_worship') return 'place_of_worship';
  if (['clinic', 'doctors', 'hospital', 'pharmacy', 'dentist'].includes(a) || tags.healthcare) return 'healthcare';
  if (['community_centre', 'social_facility', 'social_centre', 'library', 'townhall'].includes(a)) return 'community';
  if (tags.office === 'ngo' || tags.office === 'association' || tags.office === 'charity') return 'community';
  return 'other';
}

function address(tags, state) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const city = tags['addr:city'];
  const st = tags['addr:state'] || state;
  const zip = tags['addr:postcode'];
  if (street) {
    const tail = [city, [st, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return `${street}, ${tail}`;
  }
  // No street in the data: the name stands in so the address column is never empty.
  return [tags.name, city, st].filter(Boolean).join(', ');
}

const LEVEL_TEXT = {
  primary: 'Tagged as primarily LGBTQ+',
  only: 'Tagged as LGBTQ+ only',
  welcome: 'Tagged as LGBTQ+ welcome',
  yes: 'Tagged as LGBTQ+ friendly',
};

/** One element -> a location row, or { skipped: reason }. */
export function toRow(el, state) {
  const tags = el.tags ?? {};
  const reason = skipReason(tags);
  if (reason) return { skipped: reason };
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return { skipped: 'no position' };
  const level = tags.lgbtq ?? 'welcome';
  return {
    row: {
      name: tags.name.trim(),
      address: address(tags, state),
      category: category(tags),
      latitude: Math.round(lat * 1e7) / 1e7,
      longitude: Math.round(lon * 1e7) / 1e7,
      notes: `${LEVEL_TEXT[level] ?? LEVEL_TEXT.yes}. Listing from OpenStreetMap; not yet rated by the community.`,
      source_id: `${el.type}/${el.id}`,
    },
  };
}

function metres(a, b) {
  const k = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * 111_320;
  const dLon = (b.longitude - a.longitude) * 111_320 * Math.cos(a.latitude * k);
  return Math.hypot(dLat, dLon);
}

/** Drops listings of the same name within ~150 m (e.g. a store and its fuel canopy). */
export function dedupe(rows) {
  const kept = [];
  for (const r of rows) {
    const twin = kept.some(
      (k) => k.name.toLowerCase() === r.name.toLowerCase() && metres(k, r) < 150,
    );
    if (!twin) kept.push(r);
  }
  return kept;
}

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export function toSql(rows, label) {
  const values = rows
    .map(
      (r) =>
        `  (${q(r.name)}, ${q(r.address)}, ${q(r.category)}, 'unknown', ${r.latitude}, ${r.longitude}, ${q(r.notes)}, 'osm', ${q(r.source_id)})`,
    )
    .join(',\n');
  return `-- Listed places for ${label}, from OpenStreetMap contributors (ODbL, https://www.openstreetmap.org/copyright).
-- Imported as 'unknown' (no safety rating) with source = 'osm'. Safe to re-run: anything already
-- listed, or sharing an address with an existing place, is skipped.
-- Run supabase/migrations/20251001150000_listed_places.sql and 20251001160000_spaces_in_view.sql first.

insert into public.locations
  (name, address, category, safety_rating, latitude, longitude, notes, source, source_id)
values
${values}
on conflict do nothing;
`;
}
