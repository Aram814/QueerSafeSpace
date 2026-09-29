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
  cafe: [['amenity', 'cafe'], ['cuisine', 'coffee_shop']],
  coffee: [['amenity', 'cafe'], ['cuisine', 'coffee_shop'], ['shop', 'coffee']],
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
  grocery: [['shop', 'supermarket'], ['shop', 'grocery'], ['shop', 'greengrocer']],
  convenience: [['shop', 'convenience']],
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
};

const hasTag = (k: string): boolean => Object.prototype.hasOwnProperty.call(PLACE_TAGS, k);

/** Words that may accompany a category ("coffee shop", "churches near me"). */
const FILLER_WORDS = new Set(['near', 'me', 'nearby', 'shop', 'shops', 'store', 'stores', 'the', 'a', 'in', 'around', 'and']);

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
  'https://overpass.private.coffee/api/interpreter',
];

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  outer?: AbortSignal,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  outer?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Races every Overpass mirror and takes the first good answer, then aborts the
 * rest — public instances are individually slow or rate-limited, so trying them
 * one after another (or waiting on a single one) is what made search feel dead.
 * A server-side timeout arrives as HTTP 200 + `remark` + no elements; that counts
 * as a failure for that mirror, not as "no results".
 */
async function overpass(query: string, timeoutMs = 9000): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const data = await fetchJson<{ elements?: OverpassElement[]; remark?: string }>(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      },
      timeoutMs,
      ctrl.signal,
    );
    if (!data.elements?.length && data.remark) throw new Error(data.remark);
    return data.elements ?? [];
  });
  try {
    return await Promise.any(attempts);
  } finally {
    ctrl.abort();
  }
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

/**
 * Named places matching any of the tag pairs within `radius` metres. Overpass
 * returns elements in id order, not by distance, so a large radius in a dense
 * area can cap out before reaching the nearest ones — callers run a small radius
 * (guaranteed to include the closest) alongside a larger one.
 */
export async function overpassNearby(
  tagPairs: [string, string][],
  lat: number,
  lon: number,
  radius: number,
  limit = 20,
): Promise<PlaceResult[]> {
  const lines = tagPairs
    .map(([k, v]) => `  nwr["${k}"="${v}"]["name"](around:${radius},${lat},${lon});`)
    .join('\n');
  const elements = await overpass(`[out:json][timeout:8];\n(\n${lines}\n);\nout center 80;`);

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
    `[out:json][timeout:10];\n(\n  nwr["name"~"${safeQ}",i]${around};\n  nwr["brand"~"${safeQ}",i]${around};\n);\nout center 60;`,
    10000,
  );

  return elements
    .map((el) => toPlace(el, lat, lon, q))
    .filter((r): r is PlaceResult => r !== null)
    .sort(byDistance)
    .slice(0, 15);
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

/**
 * Photon (Komoot's OSM search) is built for search-as-you-type: fast, typo
 * tolerant, and indexes the city with the place, so "First Love Church ocala"
 * works as one phrase. lat/lon bias the ranking; `bboxDeg` (optional) restricts
 * results to a box that many degrees around the point.
 */
export async function photonSearch(
  q: string,
  lat: number,
  lon: number,
  bboxDeg?: number,
): Promise<PlaceResult[]> {
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=en&lat=${lat}&lon=${lon}`;
  if (bboxDeg) {
    url += `&bbox=${lon - bboxDeg},${lat - bboxDeg},${lon + bboxDeg},${lat + bboxDeg}`;
  }
  const data = await fetchJson<{ features?: PhotonFeature[] }>(url, {}, 8000);
  return (data.features ?? []).map((f) => {
    const p = f.properties;
    const [fLon, fLat] = f.geometry.coordinates;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const address = [street, p.city, p.state].filter(Boolean).join(', ');
    const name = p.name || street || address;
    return {
      name,
      address,
      lat: fLat,
      lon: fLon,
      display_name: address ? `${name}, ${address}` : name,
      dist: getDistKm(lat, lon, fLat, fLon),
    } satisfies PlaceResult;
  });
}

interface NominatimResult {
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
  address?: { house_number?: string; road?: string };
}

/** Street-address hits have no `name`; use "2529 North Magnolia Avenue", not the first comma chunk ("2529"). */
function nominatimName(r: NominatimResult): string {
  if (r.name) return r.name;
  if (r.address?.house_number && r.address.road) return `${r.address.house_number} ${r.address.road}`;
  return (r.display_name ?? '').split(',')[0];
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
      name: nominatimName(r),
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

const normName = (n: string): string => n.toLowerCase().replace(/\s+/g, ' ').trim();

/** Same place = same name (case/space-insensitive) within 150 m. */
function dedupe(results: PlaceResult[]): PlaceResult[] {
  const out: PlaceResult[] = [];
  for (const r of results) {
    const key = normName(r.name);
    const dup = out.some(
      (o) => normName(o.name) === key && getDistKm(o.lat, o.lon, r.lat, r.lon) < 0.15,
    );
    if (!dup) out.push(r);
  }
  return out;
}

/** Street addresses ("123 Main St") and comma-separated places go straight to geocoding. */
export function looksLikeAddress(q: string): boolean {
  return /^\d+\s+\S/.test(q.trim()) || q.includes(',');
}

/** Results containing every query word (in name or address) outrank partial matches. */
function matchesAllWords(r: PlaceResult, words: string[]): boolean {
  const hay = `${r.name} ${r.address}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

const cache = new Map<string, { at: number; results: PlaceResult[] }>();
const CACHE_MS = 5 * 60 * 1000;

/**
 * Search anything — a category ("cafe"), a chain or venue name ("Walmart",
 * "First Love Church ocala"), or an address — around (lat, lon).
 *
 * Every source runs in parallel and `onUpdate` fires as each one lands, so the
 * first results show as soon as the fastest service answers instead of after the
 * slowest. Rejects only when every service that was tried failed.
 */
export async function smartSearch(
  q: string,
  lat: number,
  lon: number,
  onUpdate?: (results: PlaceResult[]) => void,
): Promise<PlaceResult[]> {
  const query = q.trim();
  const cacheKey = `${query.toLowerCase()}|${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    onUpdate?.(hit.results);
    return hit.results;
  }

  const tagPairs = tagPairsFor(query);
  const words = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const tasks: Promise<PlaceResult[]>[] = [];
  if (tagPairs) {
    // A small radius is guaranteed to include the closest places; the larger one fills out the list.
    tasks.push(overpassNearby(tagPairs, lat, lon, 2000, 20));
    tasks.push(overpassNearby(tagPairs, lat, lon, 8000, 40));
  } else {
    tasks.push(photonSearch(query, lat, lon, 0.3));
    tasks.push(photonSearch(query, lat, lon));
    if (looksLikeAddress(query)) {
      // Commas and "FL 34475" trip up Photon's phrase matching; Nominatim is strongest on
      // structured addresses, so it runs alongside rather than only as a fallback.
      tasks.push(photonSearch(query.replace(/,/g, ' '), lat, lon));
      tasks.push(nominatimBiased(query, lat, lon));
    } else {
      tasks.push(overpassNameSearch(query, lat, lon, 10000));
    }
  }

  const all: PlaceResult[] = [];
  const errors: unknown[] = [];
  const snapshot = (): PlaceResult[] => {
    const sorted = [...all].sort(byDistance);
    const ranked = tagPairs
      ? sorted
      : [
          ...sorted.filter((r) => matchesAllWords(r, words)),
          ...sorted.filter((r) => !matchesAllWords(r, words)),
        ];
    return dedupe(ranked).slice(0, 15);
  };
  const run = (p: Promise<PlaceResult[]>) =>
    p.then(
      (r) => {
        all.push(...r);
        onUpdate?.(snapshot());
      },
      (e) => {
        errors.push(e);
      },
    );

  await Promise.all(tasks.map(run));

  // Nothing usable from the primary services: fall back to Nominatim.
  if (all.length === 0) {
    await run(nominatimBiased(query, lat, lon));
  }
  if (all.length === 0 && errors.length >= tasks.length) throw errors[0];

  const results = snapshot();
  if (results.length) cache.set(cacheKey, { at: Date.now(), results });
  return results;
}

export function formatDistance(dist: number | null): string {
  if (dist == null) return '';
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
}
