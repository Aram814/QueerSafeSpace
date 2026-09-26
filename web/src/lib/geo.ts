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
};

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

async function overpass(query: string): Promise<OverpassElement[]> {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  });
  const { elements } = (await res.json()) as { elements: OverpassElement[] };
  return elements ?? [];
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
  const elements = await overpass(`[out:json][timeout:15];\n(\n${lines}\n);\nout center ${limit};`);

  return elements
    .map((el): PlaceResult | null => {
      const eLat = el.lat ?? el.center?.lat;
      const eLon = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (!eLat || !eLon || !name) return null;
      return {
        name,
        address: formatOsmAddress(el.tags ?? {}),
        lat: eLat,
        lon: eLon,
        display_name: name,
        dist: getDistKm(lat, lon, eLat, eLon),
      };
    })
    .filter((r): r is PlaceResult => r !== null)
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
    .slice(0, limit);
}

export async function overpassNameSearch(
  q: string,
  lat: number,
  lon: number,
  radius: number,
): Promise<PlaceResult[]> {
  const safeQ = q.replace(/['"\\[\]()]/g, '');
  const elements = await overpass(
    `[out:json][timeout:10];\n(\n  node["name"~"${safeQ}",i](around:${radius},${lat},${lon});\n  way["name"~"${safeQ}",i](around:${radius},${lat},${lon});\n);\nout center 15;`,
  );

  return elements
    .map((el): PlaceResult | null => {
      const eLat = el.lat ?? el.center?.lat;
      const eLon = el.lon ?? el.center?.lon;
      if (!eLat || !eLon) return null;
      const name = el.tags?.name ?? q;
      return {
        name,
        address: formatOsmAddress(el.tags ?? {}),
        lat: eLat,
        lon: eLon,
        display_name: name,
        dist: getDistKm(lat, lon, eLat, eLon),
      };
    })
    .filter((r): r is PlaceResult => r !== null)
    .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
    .slice(0, 15);
}

interface NominatimResult {
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
}

export async function nominatimBiased(
  q: string,
  lat: number,
  lon: number,
): Promise<PlaceResult[]> {
  const viewbox = `${lon - 0.8},${lat + 0.6},${lon + 0.8},${lat - 0.6}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q,
  )}&limit=8&addressdetails=1&viewbox=${viewbox}&bounded=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = (await res.json()) as NominatimResult[];
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

export const DEFAULT_CENTER = { lat: 39.5, lon: -98.35 };

/**
 * Ported from smartSearch(): tag lookup first, then a name search, then
 * Nominatim — each biased towards the given centre.
 */
export async function smartSearch(
  q: string,
  lat: number,
  lon: number,
): Promise<PlaceResult[]> {
  const lower = q.toLowerCase().trim();
  const tagPairs =
    PLACE_TAGS[lower] ??
    Object.entries(PLACE_TAGS).find(([k]) => lower.includes(k) || k.includes(lower))?.[1];

  if (tagPairs) {
    const nearby = await overpassNearby(tagPairs, lat, lon, 8000, 20);
    if (nearby.length) return nearby;
  }
  const byName = await overpassNameSearch(q, lat, lon, 12000);
  if (byName.length) return byName;
  return nominatimBiased(q, lat, lon);
}

export function formatDistance(dist: number | null): string {
  if (dist == null) return '';
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
}
