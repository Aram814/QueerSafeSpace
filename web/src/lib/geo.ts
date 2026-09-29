import type { PlaceResult } from './types';

/** Haversine great-circle distance in kilometres. Ported from getDistKm(). */
export function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Colloquial search term -> OpenStreetMap tag pairs. Ported from PLACE_TAGS. */
export const PLACE_TAGS: Record<string, [string, string][]> = {
  cafe: [['amenity', 'cafe']],
  coffee: [['amenity', 'cafe']],
  restaurant: [['amenity', 'restaurant']],
  food: [['amenity', 'restaurant'], ['amenity', 'fast_food']],
  'fast food': [['amenity', 'fast_food']],
  bar: [['amenity', 'bar']],
  pub: [['amenity', 'pub']],
  club: [['amenity', 'nightclub']],
  nightclub: [['amenity', 'nightclub']],
  pharmacy: [['amenity', 'pharmacy'], ['shop', 'chemist']],
  hospital: [['amenity', 'hospital']],
  clinic: [['amenity', 'clinic'], ['amenity', 'doctors']],
  doctor: [['amenity', 'doctors'], ['amenity', 'clinic']],
  gym: [['leisure', 'fitness_centre'], ['amenity', 'gym']],
  fitness: [['leisure', 'fitness_centre']],
  yoga: [['leisure', 'fitness_centre']],
  park: [['leisure', 'park']],
  garden: [['leisure', 'garden']],
  library: [['amenity', 'library']],
  hotel: [['tourism', 'hotel']],
  hostel: [['tourism', 'hostel']],
  motel: [['tourism', 'motel']],
  bank: [['amenity', 'bank']],
  atm: [['amenity', 'atm']],
  supermarket: [['shop', 'supermarket']],
  grocery: [['shop', 'supermarket'], ['shop', 'convenience'], ['shop', 'grocery']],
  mall: [['shop', 'mall'], ['amenity', 'marketplace']],
  theater: [['amenity', 'theatre']],
  theatre: [['amenity', 'theatre']],
  cinema: [['amenity', 'cinema']],
  movie: [['amenity', 'cinema']],
  school: [['amenity', 'school']],
  university: [['amenity', 'university']],
  college: [['amenity', 'college'], ['amenity', 'university']],
  church: [['amenity', 'place_of_worship']],
  mosque: [['amenity', 'place_of_worship']],
  temple: [['amenity', 'place_of_worship']],
  worship: [['amenity', 'place_of_worship']],
  salon: [['shop', 'hairdresser'], ['shop', 'beauty']],
  barbershop: [['shop', 'hairdresser']],
  laundry: [['shop', 'laundry'], ['amenity', 'laundry']],
  gas: [['amenity', 'fuel']],
  parking: [['amenity', 'parking']],
  bakery: [['shop', 'bakery']],
  bookstore: [['shop', 'books']],
  book: [['shop', 'books']],
  dentist: [['amenity', 'dentist']],
  vet: [['amenity', 'veterinary']],
  'post office': [['amenity', 'post_office']],
  thrift: [['shop', 'second_hand']],
  clothing: [['shop', 'clothes']],
  shopping: [['shop', 'mall'], ['shop', 'department_store'], ['shop', 'clothes']],
  store: [['shop', 'department_store'], ['shop', 'supermarket'], ['shop', 'convenience']],
};

const hasTag = (k: string): boolean => Object.prototype.hasOwnProperty.call(PLACE_TAGS, k);

/** Words that may accompany a category ("coffee shop", "churches near me"). */
const FILLER_WORDS = new Set(['near', 'me', 'nearby', 'shop', 'shops', 'the', 'a', 'in', 'around', 'and']);

/**
 * Maps a query to OSM tag pairs only when it is *purely* a category
 * ("cafe", "coffee shop", "churches near me"). A brand or address such as
 * "walmart pharmacy" or "12 Main St" is not, and goes through name/address search.
 */
export function tagPairsFor(q: string): [string, string][] | undefined {
  const lower = q.toLowerCase().trim();
  if (hasTag(lower)) return PLACE_TAGS[lower];
  const pairs: [string, string][] = [];
  let matched = 0;
  for (const word of lower.split(/\s+/)) {
    if (FILLER_WORDS.has(word)) continue;
    const key = [word, word.replace(/es$/, ''), word.replace(/s$/, '')].find((k) => hasTag(k),
    );
    if (!key) return undefined;
    pairs.push(...PLACE_TAGS[key]);
    matched++;
  }
  return matched ? pairs : undefined;
}

type OsmTags = Record<string, string | undefined>;

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

/** Ported from formatOsmAddress(). */
export function formatOsmAddress(tags: OsmTags): string {
  const parts: string[] = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:state']) parts.push(tags['addr:state']);
  return (
    parts.join(', ') || tags.amenity || tags.shop || tags.leisure || tags.tourism || ''
  );
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs an Overpass query, falling through to a mirror on HTTP errors,
 * non-JSON bodies and server-side timeouts (which arrive as HTTP 200 with a
 * `remark` and no elements — indistinguishable from "no results" otherwise).
 */
async function overpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await fetchJson<{ elements?: OverpassElement[]; remark?: string }>(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        },
        15000,
      );
      if (!data.elements?.length && data.remark) throw new Error(data.remark);
      return data.elements ?? [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function toPlace(
  el: OverpassElement,
  lat: number,
  lon: number,
  fallbackName?: string,
): PlaceResult | null {
  const eLat = el.lat ?? el.center?.lat;
  const eLon = el.lon ?? el.center?.lon;
  const name = el.tags?.name ?? fallbackName;
  if (eLat == null || eLon == null || !name) return null;
  return {
    name,
    address: formatOsmAddress(el.tags ?? {}),
    lat: eLat,
    lon: eLon,
    display_name: name,
    dist: getDistKm(lat, lon, eLat, eLon),
  };
}

function byDistance(a: PlaceResult, b: PlaceResult): number {
  return (a.dist ?? 0) - (b.dist ?? 0);
}

export async function overpassNearby(
  tagPairs: [string, string][],
  lat: number,
  lon: number,
  radius: number,
  limit = 20,
): Promise<PlaceResult[]> {
  const lines = tagPairs
    .map(
      ([k, v]) =>
        `  node["${k}"="${v}"](around:${radius},${lat},${lon});\n  way["${k}"="${v}"](around:${radius},${lat},${lon});`,
    )
    .join('\n');
  // Fetch more than `limit` so the distance sort below picks the truly closest.
  const elements = await overpass(`[out:json][timeout:15];\n(\n${lines}\n);\nout center 100;`);

  return elements
    .map((el) => toPlace(el, lat, lon))
    .filter((r): r is PlaceResult => r !== null)
    .sort(byDistance)
    .slice(0, limit);
}

/** Matches on `name` or `brand`, so "walmart" finds "Walmart Supercenter". */
export async function overpassNameSearch(
  q: string,
  lat: number,
  lon: number,
  radius: number,
): Promise<PlaceResult[]> {
  const safeQ = q.replace(/['"\\[\]()|.*+?^${}]/g, '').trim();
  if (!safeQ) return [];
  const around = `(around:${radius},${lat},${lon})`;
  const elements = await overpass(
    `[out:json][timeout:12];\n(\n  nwr["name"~"${safeQ}",i]${around};\n  nwr["brand"~"${safeQ}",i]${around};\n);\nout center 60;`,
  );

  return elements
    .map((el) => toPlace(el, lat, lon, q))
    .filter((r): r is PlaceResult => r !== null)
    .sort(byDistance)
    .slice(0, 15);
}

interface NominatimResult {
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
}

async function nominatimQuery(
  q: string,
  lat: number,
  lon: number,
  bounded: boolean,
): Promise<PlaceResult[]> {
  const viewbox = `${lon - 0.5},${lat + 0.4},${lon + 0.5},${lat - 0.4}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q,
  )}&limit=8&addressdetails=1&viewbox=${viewbox}&bounded=${bounded ? 1 : 0}`;
  const data = await fetchJson<NominatimResult[]>(
    url,
    { headers: { 'Accept-Language': 'en' } },
    10000,
  );
  return data.map((r) => {
    const rLat = parseFloat(r.lat);
    const rLon = parseFloat(r.lon);
    return {
      name: r.name || (r.display_name ?? '').split(',')[0],
      address: r.display_name ?? '',
      lat: rLat,
      lon: rLon,
      display_name: r.display_name ?? '',
      dist: getDistKm(lat, lon, rLat, rLon),
    } satisfies PlaceResult;
  });
}

/**
 * Nominatim search biased to the area around (lat, lon): local matches only
 * first, widening to a global search just when nothing local exists (e.g. the
 * user typed a distant address).
 */
export async function nominatimBiased(
  q: string,
  lat: number,
  lon: number,
): Promise<PlaceResult[]> {
  const local = await nominatimQuery(q, lat, lon, true);
  if (local.length) return local.sort(byDistance);
  return nominatimQuery(q, lat, lon, false);
}

export const DEFAULT_CENTER = { lat: 39.5, lon: -98.35 };

/** Same place = same name (case/space-insensitive) within 150 m. */
function dedupe(results: PlaceResult[]): PlaceResult[] {
  const out: PlaceResult[] = [];
  for (const r of results) {
    const key = r.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const dup = out.some(
      (o) =>
        o.name.toLowerCase().replace(/\s+/g, ' ').trim() === key &&
        getDistKm(o.lat, o.lon, r.lat, r.lon) < 0.15,
    );
    if (!dup) out.push(r);
  }
  return out;
}

/** Street addresses ("123 Main St") and comma-separated places go straight to geocoding. */
export function looksLikeAddress(q: string): boolean {
  return /^\d+\s+\S/.test(q.trim()) || q.includes(',');
}

/**
 * Search anything — a category ("cafe"), a chain or venue name ("Walmart"),
 * or an address — around (lat, lon). Categories use an Overpass tag search;
 * names run an Overpass name/brand search and Nominatim in parallel so one
 * slow or failing service can't blank the results. Rejects only when every
 * service that was tried failed.
 */
export async function smartSearch(
  q: string,
  lat: number,
  lon: number,
): Promise<PlaceResult[]> {
  const query = q.trim();
  const tagPairs = tagPairsFor(query);

  const tasks: Promise<PlaceResult[]>[] = [];
  if (tagPairs) {
    tasks.push(overpassNearby(tagPairs, lat, lon, 8000, 20));
  } else {
    if (!looksLikeAddress(query)) tasks.push(overpassNameSearch(query, lat, lon, 15000));
    tasks.push(nominatimBiased(query, lat, lon));
  }

  let settled = await Promise.allSettled(tasks);
  let results = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

  // A category with no nearby hits: retry as a plain name/address search.
  if (tagPairs && results.length === 0) {
    settled = [...settled, ...(await Promise.allSettled([nominatimBiased(query, lat, lon)]))];
    results = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
  }

  if (results.length === 0 && settled.every((s) => s.status === 'rejected')) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
  return dedupe(results.sort(byDistance)).slice(0, 15);
}

export function formatDistance(dist: number | null): string {
  if (dist == null) return '';
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
}
