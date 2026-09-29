/**
 * Server-side proxy for Foursquare Places search (Vercel Function).
 *
 * OpenStreetMap is missing many small businesses, so name and category search also asks
 * Foursquare. The API key stays on the server (FOURSQUARE_API_KEY); results are passed
 * through and never stored here.
 *
 * Foursquare's usage guidelines (Pay as You Go / Sandbox) forbid caching any Places attribute
 * other than fsq_place_id, so responses must not be cached by Vercel's edge or by browsers:
 * keep `Cache-Control: no-store` below. https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines
 *
 * GET /api/places?q=coffee&lat=29.05&lon=-82.46&radius=20000&limit=30
 *
 * Environment (Vercel -> Project Settings -> Environment Variables):
 *   FOURSQUARE_API_KEY   required. A Places API "service key" from developer.foursquare.com.
 *   FOURSQUARE_API_BASE  optional. Defaults to the current Places API search endpoint.
 *   FOURSQUARE_API_VERSION optional. Sent as X-Places-Api-Version (current API only).
 */
const DEFAULT_BASE = 'https://places-api.foursquare.com/places/search';
const DEFAULT_VERSION = '2025-06-17';
const ALLOWED_ORIGIN = /^(https:\/\/(www\.)?queersafespace\.org|https:\/\/[a-z0-9-]+\.vercel\.app|http:\/\/localhost(:\d+)?)$/;

const num = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round3 = (n) => Math.round(n * 1000) / 1000;

/** Accepts both the current response shape and the legacy v3 shape. */
function toPlace(r) {
  const lat = r.latitude ?? r.geocodes?.main?.latitude;
  const lon = r.longitude ?? r.geocodes?.main?.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !r.name) return null;
  const loc = r.location ?? {};
  const address =
    loc.formatted_address ||
    [loc.address, loc.locality ?? loc.city, loc.region ?? loc.state].filter(Boolean).join(', ');
  return {
    name: r.name,
    address,
    lat,
    lon,
    category: r.categories?.[0]?.name ?? '',
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) return res.status(503).json({ error: 'FOURSQUARE_API_KEY is not set on this deployment' });

  const q = typeof req.query?.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const lat = num(req.query?.lat);
  const lon = num(req.query?.lon);
  if (q.length < 2 || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) {
    return res.status(400).json({ error: 'Expected q (2+ chars), lat and lon' });
  }
  const radius = clamp(Math.round(num(req.query?.radius)) || 20000, 500, 50000);
  const limit = clamp(Math.round(num(req.query?.limit)) || 30, 1, 50);

  const base = process.env.FOURSQUARE_API_BASE || DEFAULT_BASE;
  const legacy = /api\.foursquare\.com\/v3/.test(base);
  const url =
    `${base}?query=${encodeURIComponent(q)}&ll=${round3(lat)},${round3(lon)}` +
    `&radius=${radius}&limit=${limit}&sort=DISTANCE`;
  const headers = legacy
    ? { Authorization: key, Accept: 'application/json' }
    : {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'X-Places-Api-Version': process.env.FOURSQUARE_API_VERSION || DEFAULT_VERSION,
      };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const upstream = await fetch(url, { headers, signal: ctrl.signal });
    const text = await upstream.text();
    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res
        .status(502)
        .json({ error: `Foursquare responded ${upstream.status}`, detail: text.slice(0, 300) });
    }
    const data = JSON.parse(text);
    const results = (data.results ?? []).map(toPlace).filter(Boolean);
    // No caching of Foursquare data (see the note at the top of this file).
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Foursquare request failed', detail: String(err?.message ?? err) });
  } finally {
    clearTimeout(timer);
  }
}
