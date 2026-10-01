// Looks up a street/city for places whose OpenStreetMap tags have no full address, using the free
// Nominatim reverse-geocoding service. Policy: identify the app, at most one request per second.

const URL_BASE = 'https://nominatim.openstreetmap.org/reverse';
const UA = 'QueerSafeSpace-import/1.0 (QueerSafeSpace.LGBT@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Returns Nominatim's `address` object for a point, or null if it could not be found. */
export async function reverseGeocode(lat, lon) {
  const url = `${URL_BASE}?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.address ?? null;
    } catch {
      await sleep(5000 * (attempt + 1));
    }
  }
  return null;
}

export const GEOCODE_DELAY_MS = 1100;
