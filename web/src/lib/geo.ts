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
  cafe: [['amenity', 'cafe'], ['cuisine', '~coffee']],
  coffee: [['amenity', 'cafe'], ['cuisine', '~coffee'], ['shop', 'coffee']],
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
  smoke: [['shop', 'tobacco'], ['shop', 'e-cigarette']],
  vape: [['shop', 'e-cigarette'], ['shop', 'tobacco']],
  tobacco: [['shop', 'tobacco']],
  cbd: [['shop', 'cannabis'], ['shop', 'e-cigarette']],
  liquor: [['shop', 'alcohol']],
  pizza: [['cuisine', 'pizza']],
  burger: [['cuisine', 'burger']],
  'ice cream': [['cuisine', 'ice_cream'], ['amenity', 'ice_cream']],
  brewery: [['craft', 'brewery'], ['microbrewery', 'yes']],
  pet: [['shop', 'pet']],
  florist: [['shop', 'florist']],
  flowers: [['shop', 'florist']],
  hardware: [['shop', 'doityourself'], ['shop', 'hardware']],
  tattoo: [['shop', 'tattoo']],
  nails: [['shop', 'beauty']],
  spa: [['leisure', 'spa'], ['shop', 'beauty']],
  'car wash': [['amenity', 'car_wash']],
  carwash: [['amenity', 'car_wash']],
  mechanic: [['shop', 'car_repair']],
  'convenience store': [['shop', 'convenience']],
  bookshop: [['shop', 'books']],
  museum: [['tourism', 'museum']],
  beach: [['natural', 'beach']],
  playground: [['leisure', 'playground']],
  'thrift store': [['shop', 'second_hand']],
  shopping: [['shop', 'mall'], ['shop', 'department_store'], ['shop', 'clothes']],
};

const hasTag = (k: string): boolean => Object.prototype.hasOwnProperty.call(PLACE_TAGS, k);

/** Words that may accompany a category ("coffee shop", "churches near me"). */
const FILLER_WORDS = new Set(['near', 'me', 'nearby', 'shop', 'shops', 'store', 'stores', 'the', 'a', 'in', 'around', 'and']);

export interface ParsedQuery {
  /** OSM tag pairs for the category words ("coffee" -> amenity=cafe, ...). */
  pairs: [string, string][];
  categoryWords: string[];
  /** Everything else: a business name, a city, or both. */
  restWords: string[];
  /** All meaningful words in order (filler such as "near me" removed). */
  words: string[];
}

/**
 * Splits a query into category words and the rest, so "coffee" is a category,
 * "First Love Church" is a name plus a category, and "Dunnellon coffee" is a
 * place plus a category.
 */
export function parseQuery(q: string): ParsedQuery {
  const tokens = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const pairs: [string, string][] = [];
  const categoryWords: string[] = [];
  const restWords: string[] = [];
  const words: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const two = tokens[i + 1] ? `${w} ${tokens[i + 1]}` : '';
    if (two && hasTag(two)) {
      pairs.push(...PLACE_TAGS[two]);
      categoryWords.push(w, tokens[i + 1]);
      words.push(w, tokens[i + 1]);
      i++;
      continue;
    }
    if (FILLER_WORDS.has(w)) continue;
    words.push(w);
    const key = [w, w.replace(/es$/, ''), w.replace(/s$/, '')].find((k) => hasTag(k));
    if (key) {
      pairs.push(...PLACE_TAGS[key]);
      categoryWords.push(w);
    } else {
      restWords.push(w);
    }
  }
  return { pairs: dedupePairs(pairs), categoryWords, restWords, words };
}

function dedupePairs(pairs: [string, string][]): [string, string][] {
  const seen = new Set<string>();
  return pairs.filter(([k, v]) => !seen.has(`${k}=${v}`) && seen.add(`${k}=${v}`));
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

// Our own /api/overpass proxy (web/api/overpass.js) goes first: the public servers reject or
// drop many direct browser requests (overpass-api.de answers a header-less 406 that browsers
// report as a CORS error, so it is only used by the proxy), and the proxy sends a proper
// User-Agent and caches answers. The direct mirrors are the fallback for local `vite dev`,
// where there are no server functions.
const OVERPASS_ENDPOINTS = [
  '/api/overpass',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** A later mirror is only tried if the earlier ones are still silent after this long. */
const HEDGE_MS = 2500;

const PLACES_ENDPOINT = '/api/places';

/** Shown in the console log so a report says which version of the search ran. */
const SEARCH_BUILD = 'places-1';

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  outer?: AbortSignal,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onOuterAbort = () => ctrl.abort();
  outer?.addEventListener('abort', onOuterAbort);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${new URL(url, 'http://local').host} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

/**
 * Runs an Overpass query against the public mirrors, "hedged": the first mirror
 * goes out immediately, the next only if the first fails or stays silent for
 * HEDGE_MS. That keeps latency low without hammering the shared servers (firing
 * every mirror on every keystroke gets the client rate-limited, which then
 * looks like "no results"). A server-side timeout arrives as HTTP 200 + `remark`
 * + no elements; that counts as a failed mirror, not as "no results".
 */
function overpass(query: string, timeoutMs = 9000, signal?: AbortSignal): Promise<OverpassElement[]> {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const errors: unknown[] = [];
    let next = 0;
    let pending = 0;
    let done = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      ctrl.abort();
      fn();
    };
    signal?.addEventListener('abort', () => finish(() => reject(new DOMException('aborted', 'AbortError'))));

    const launch = () => {
      if (done || next >= OVERPASS_ENDPOINTS.length) return;
      const endpoint = OVERPASS_ENDPOINTS[next++];
      pending++;
      const hedge = setTimeout(launch, HEDGE_MS);
      timers.add(hedge);
      // Our proxy may itself need a few tries across the public servers, so it gets longer than a direct call.
      const limit = endpoint.startsWith('/') ? Math.max(timeoutMs, 22000) : timeoutMs;
      // A plain GET is a CORS "simple request": no preflight and no Content-Type for a mirror to reject.
      fetchJson<{ elements?: OverpassElement[]; remark?: string }>(
        `${endpoint}?data=${encodeURIComponent(query)}`,
        {},
        limit,
        ctrl.signal,
      )
        .then((data) => {
          if (!data.elements?.length && data.remark) throw new Error(data.remark);
          finish(() => resolve(data.elements ?? []));
        })
        .catch((err) => {
          errors.push(err);
          pending--;
          clearTimeout(hedge);
          if (next < OVERPASS_ENDPOINTS.length) launch();
          else if (pending === 0) finish(() => reject(errors[0]));
        });
    };
    launch();
  });
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

/** Named places matching any of the tag pairs within `radius` metres of a point. */
/** ~110 m grid: identical searches from nearby points then share one cached proxy response. */
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

export async function overpassNearby(
  tagPairs: [string, string][],
  lat: number,
  lon: number,
  radius: number,
  limit = 25,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const lines = tagPairs
    // A value starting with "~" is a regex ("~coffee" also matches "coffee_shop;donut", "coffee;tea").
    .map(([k, v]) => `  nwr["${k}"${v.startsWith('~') ? `~"${v.slice(1)}",i` : `="${v}"`}]["name"](around:${radius},${r3(lat)},${r3(lon)});`)
    .join('\n');
  const elements = await overpass(`[out:json][timeout:8];\n(\n${lines}\n);\nout center 150;`, 9000, signal);
  return elements
    .map((el) => toPlace(el, lat, lon))
    .filter((r): r is PlaceResult => r !== null)
    .sort(byDistance)
    .slice(0, limit);
}

/**
 * Named places whose name (or brand) contains EVERY word, in any order, so
 * "first love" finds "First Love Christian Church" and "Love First Ministries".
 */
export async function overpassNameSearch(
  words: string[],
  lat: number,
  lon: number,
  radius: number,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const clean = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter((w) => w.length >= 2);
  if (!clean.length) return [];
  const around = `(around:${radius},${r3(lat)},${r3(lon)})`;
  const chain = (key: string) => clean.map((w) => `["${key}"~"${w}",i]`).join('');
  const elements = await overpass(
    `[out:json][timeout:10];\n(\n  nwr${chain('name')}${around};\n  nwr${chain('brand')}${around};\n);\nout center 60;`,
    10000,
    signal,
  );
  return elements
    .map((el) => toPlace(el, lat, lon))
    .filter((r): r is PlaceResult => r !== null)
    .sort(byDistance)
    .slice(0, 20);
}

interface ApiPlace {
  name: string;
  address: string;
  lat: number;
  lon: number;
  category?: string;
}

/**
 * Foursquare Places via our /api/places proxy (web/api/places.js): far better coverage of small
 * businesses than OpenStreetMap ("Ellianos Coffee", "Dunnellon Coffee Co"). The key never reaches
 * the browser. It rejects (503) where the proxy or key is not configured, and the search then
 * simply relies on the free OpenStreetMap sources.
 */
export async function placesSearch(
  q: string,
  lat: number,
  lon: number,
  radiusM: number,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const url = `${PLACES_ENDPOINT}?q=${encodeURIComponent(q)}&lat=${r3(lat)}&lon=${r3(lon)}&radius=${radiusM}&limit=30`;
  const data = await fetchJson<{ results?: ApiPlace[] }>(url, {}, 9000, signal);
  return (data.results ?? []).map(
    (p) =>
      ({
        name: p.name,
        address: p.address,
        lat: p.lat,
        lon: p.lon,
        display_name: p.address ? `${p.name}, ${p.address}` : p.name,
        dist: getDistKm(lat, lon, p.lat, p.lon),
        source: 'foursquare',
      }) satisfies PlaceResult,
  );
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
    osm_key?: string;
    osm_value?: string;
  };
}

interface PhotonOptions {
  /** Restrict results to a box this many degrees around the point. */
  bboxDeg?: number;
  /** Photon osm_tag filters, e.g. "amenity:cafe" or "place". */
  osmTag?: string;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Photon (Komoot's OSM search) is built for search-as-you-type: fast, typo
 * tolerant, and indexes the city with the place. lat/lon bias the ranking; a
 * bbox hard-limits it, which is what keeps "First Love Church" from returning
 * churches in other states.
 */
export async function photonSearch(
  q: string,
  lat: number,
  lon: number,
  opts: PhotonOptions = {},
): Promise<PlaceResult[]> {
  const { bboxDeg, osmTag, limit = 10, signal } = opts;
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=en&lat=${lat}&lon=${lon}`;
  if (bboxDeg) {
    url += `&bbox=${lon - bboxDeg},${lat - bboxDeg},${lon + bboxDeg},${lat + bboxDeg}`;
  }
  if (osmTag) url += `&osm_tag=${encodeURIComponent(osmTag)}`;
  const data = await fetchJson<{ features?: PhotonFeature[] }>(url, {}, 8000, signal);
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
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const viewbox = `${lon - 0.5},${lat + 0.4},${lon + 0.5},${lat - 0.4}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q,
  )}&limit=8&addressdetails=1&viewbox=${viewbox}&bounded=${bounded ? 1 : 0}`;
  const data = await fetchJson<NominatimResult[]>(url, { headers: { 'Accept-Language': 'en' } }, 10000, signal);
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
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const local = await nominatimQuery(q, lat, lon, true, signal);
  if (local.length) return local.sort(byDistance);
  return nominatimQuery(q, lat, lon, false, signal);
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

/**
 * "11223 N Williams St # A, Dunnellon, FL 34432" -> unit designators removed ("# A", "Apt 4",
 * "Suite 200"), which geocoders match against nothing and which sink the whole lookup.
 */
export function normalizeAddress(q: string): string {
  return q
    .replace(/#\s*[\w-]+/g, ' ')
    .replace(/\b(apt|apartment|suite|ste|unit|bldg)\b\.?\s*[\w-]+/gi, ' ')
    .replace(/\s*,\s*(,\s*)+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

/** Words of 1-2 letters ("co", "of", "a") match nearly every name, so they never drive a search. */
const significant = (words: string[]): string[] => words.filter((w) => w.length >= 3);

/** Results containing every query word (in name or address) outrank partial matches. */
function matchesAllWords(r: PlaceResult, words: string[]): boolean {
  const hay = `${r.name} ${r.address}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * "Dunnellon coffee" / "First Love Church Ocala": look for a city among the
 * words at either edge of the query. Only an exact name match on a Photon place
 * (city/town/village...) counts, so ordinary name words are never mistaken for
 * a location.
 */
async function resolvePlace(
  words: string[],
  restWords: string[],
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number; words: string[] } | null> {
  const candidates: string[][] = [];
  for (const len of [2, 1]) {
    const head = words.slice(0, len);
    const tail = words.slice(-len);
    for (const c of [tail, head]) {
      if (c.length === len && c.every((w) => restWords.includes(w))) candidates.push(c);
    }
  }
  const unique = candidates.filter(
    (c, i) => candidates.findIndex((o) => o.join(' ') === c.join(' ')) === i,
  );
  const settled = await Promise.allSettled(
    unique.map((c) =>
      photonSearch(c.join(' '), lat, lon, { osmTag: 'place', limit: 5, signal }).then((r) => ({
        c,
        hit: r.find((p) => normName(p.name) === c.join(' ')),
      })),
    ),
  );
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value.hit) {
      return { lat: s.value.hit.lat, lon: s.value.hit.lon, words: s.value.c };
    }
  }
  return null;
}

/** Beyond this from the search centre a name match is another town/state, not "nearby". */
const LOCAL_KM = 80;

type Emit = (results: PlaceResult[]) => void;
type Source = (emit: Emit) => Promise<void>;

/**
 * Search anything: a category ("coffee", "smoke shop"), a business name
 * ("First Love Church"), a place plus either ("Dunnellon coffee",
 * "First Love Church Ocala") or an address.
 *
 * Results are local by default (near the map / GPS, or near a city named in the
 * query); a worldwide lookup runs only when nothing local is found, and never
 * for category searches (where it returns counties and shops that merely have
 * the word in their name). `onUpdate` fires as each source lands.
 */
export async function smartSearch(
  q: string,
  lat: number,
  lon: number,
  onUpdate?: (results: PlaceResult[]) => void,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const query = q.trim();
  // Deliberately no result cache: Foursquare's usage guidelines allow no caching of place attributes.

  const parsed = parseQuery(query);
  const isAddress = looksLikeAddress(query);
  const hasCategory = !isAddress && parsed.pairs.length > 0;

  // A city named in the query becomes the search centre.
  let center = { lat, lon };
  let nameWords = significant(parsed.restWords);
  let inPlace = false;
  if (hasCategory && parsed.restWords.length) {
    const place = await resolvePlace(parsed.words, parsed.restWords, lat, lon, signal);
    if (place) {
      center = place;
      inPlace = true;
      nameWords = significant(parsed.restWords.filter((w) => !place.words.includes(w)));
    }
  }
  const sortKm = (r: PlaceResult): number => getDistKm(center.lat, center.lon, r.lat, r.lon);

  const sources: Source[] = [];
  if (isAddress) {
    // Unit numbers ("# A") and ZIP codes trip up phrase matching; Nominatim is strongest on
    // structured addresses. Several spellings of the same address run together.
    const addr = normalizeAddress(query);
    const noZip = addr.replace(/\b\d{5}(-\d{4})?\b/g, ' ').replace(/\s+/g, ' ').trim();
    sources.push(async (emit) => emit(await photonSearch(addr.replace(/,/g, ' '), lat, lon, { signal })));
    sources.push(async (emit) => emit(await photonSearch(noZip.replace(/,/g, ' '), lat, lon, { signal })));
    sources.push(async (emit) => emit(await nominatimBiased(addr, lat, lon, signal)));
  } else if (hasCategory && nameWords.length === 0) {
    // Pure category: coffee, grocery, smoke shop, "Dunnellon coffee".
    // Three independent radii, run together: the small one is guaranteed to include the nearest
    // places (Overpass caps results in id order, not distance), the larger ones fill out the list
    // for towns and rural areas, and one of them failing cannot wipe out the others.
    for (const [radius, limit] of [[3000, 25], [12000, 40], [30000, 60]] as const) {
      sources.push(async (emit) =>
        emit(await overpassNearby(parsed.pairs, center.lat, center.lon, radius, limit, signal)),
      );
    }
    for (const [k, v] of parsed.pairs.filter(([, val]) => !val.startsWith('~')).slice(0, 3)) {
      sources.push(async (emit) =>
        emit(
          await photonSearch(parsed.categoryWords.join(' '), center.lat, center.lon, {
            bboxDeg: 0.35,
            osmTag: `${k}:${v}`,
            limit: 20,
            signal,
          }),
        ),
      );
    }
    // Commercial place database (see placesSearch): the main source for small businesses.
    sources.push(async (emit) =>
      emit(await placesSearch(parsed.categoryWords.join(' '), center.lat, center.lon, 20000, signal)),
    );
    // Businesses that just have the words in their name ("Smoke Shop LLC").
    sources.push(async (emit) =>
      emit(await photonSearch(parsed.categoryWords.join(' '), center.lat, center.lon, { bboxDeg: 0.25, signal })),
    );
    // Anything with the category word in its name, whatever it is tagged as ("Ellianos Coffee"
    // may be fast_food, not cafe).
    if (significant(parsed.categoryWords).length) {
      sources.push(async (emit) =>
        emit(await overpassNameSearch(significant(parsed.categoryWords), center.lat, center.lon, 12000, signal)),
      );
    }
    // The whole query may itself be a business name: "Dunnellon Coffee Co" is a category
    // word plus a city as far as the parser can tell, but also just the shop's name.
    const phrase = significant(parsed.words);
    if (phrase.length >= 2) {
      sources.push(async (emit) => emit(await placesSearch(phrase.join(' '), center.lat, center.lon, 20000, signal)));
      sources.push(async (emit) =>
        emit(await photonSearch(phrase.join(' '), center.lat, center.lon, { bboxDeg: 0.4, signal })),
      );
      sources.push(async (emit) =>
        emit(await overpassNameSearch(phrase, center.lat, center.lon, 15000, signal)),
      );
    }
  } else {
    // A named business, optionally with a category and/or city: "First Love Church (Ocala)".
    const nameQuery = [...nameWords, ...parsed.categoryWords].join(' ');
    sources.push(async (emit) => emit(await placesSearch(nameQuery || query, center.lat, center.lon, 40000, signal)));
    sources.push(async (emit) =>
      emit(await photonSearch(nameQuery || query, center.lat, center.lon, { bboxDeg: inPlace ? 0.3 : 0.4, signal })),
    );
    sources.push(async (emit) =>
      emit(await overpassNameSearch(nameWords.length ? nameWords : significant(parsed.words), center.lat, center.lon, 15000, signal)),
    );
  }

  const parts: PlaceResult[][] = sources.map(() => []);
  const errors: unknown[] = [];
  // Words a result must contain to count as a match: the business-name words (not the
  // category, which OSM names often omit, and not the city, which is in the address).
  const matchWords = nameWords.length ? nameWords : parsed.words.length ? parsed.words : [query.toLowerCase()];
  const filterByName = !isAddress && !(hasCategory && nameWords.length === 0);

  const snapshot = (): PlaceResult[] => {
    let all = parts.flat();
    if (!isAddress) {
      const local = all.filter((r) => sortKm(r) <= LOCAL_KM);
      if (local.length || inPlace || hasCategory) all = local;
    }
    // Drop partial name matches ("other churches in Ocala") whenever a real match exists...
    if (filterByName && all.some((r) => matchesAllWords(r, matchWords))) {
      all = all.filter((r) => matchesAllWords(r, matchWords));
    }
    // ...then ALWAYS nearest first.
    const sorted = all
      .map((r) => ({ ...r, dist: getDistKm(lat, lon, r.lat, r.lon) }))
      .sort(byDistance);
    return dedupe(sorted).slice(0, 25);
  };

  await Promise.all(
    sources.map((source, i) =>
      source((r) => {
        parts[i] = r;
        onUpdate?.(snapshot());
      }).catch((e) => {
        errors.push(e);
      }),
    ),
  );
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

  // Handy when a search looks short: per-source result counts and any errors.
  // One plain string so it can be copied and pasted whole from the console.
  console.info(
    '[QSS search]',
    JSON.stringify({
      query,
      build: SEARCH_BUILD,
      center: { lat: r3(center.lat), lon: r3(center.lon) },
      perSource: parts.map((r) => r.length),
      errors: errors.map(String),
    }),
  );

  let results = snapshot();

  // Nothing local for a *name* or address: look worldwide (never for categories).
  if (!results.length && !hasCategory) {
    try {
      const wide = await photonSearch(query.replace(/,/g, ' '), lat, lon, { signal });
      parts.push(wide);
      const fallback = wide
        .map((r) => ({ ...r, dist: getDistKm(lat, lon, r.lat, r.lon) }))
        .sort(byDistance);
      results = dedupe(fallback).slice(0, 25);
      if (!results.length) {
        results = dedupe(await nominatimBiased(query, lat, lon, signal)).slice(0, 15);
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (!results.length && errors.length >= sources.length) throw errors[0];
  return results;
}

export function formatDistance(dist: number | null): string {
  if (dist == null) return '';
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
}
