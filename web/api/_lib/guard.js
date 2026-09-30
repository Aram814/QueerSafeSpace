/**
 * Shared protection for the /api proxies: which websites may call them from a browser,
 * a per-visitor rate limit, and an optional sitewide daily cap.
 *
 * Counters live in Upstash Redis (add the Upstash integration in Vercel -> Storage; it sets
 * KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 * Without them the limits are skipped ("fail open"), so a missing or unavailable store never
 * takes search down.
 *
 * Files starting with "_" inside /api are not deployed as routes.
 */

// Our own sites and this project's Vercel URLs only (production alias, branch and deployment previews).
// The team suffix is required for previews: without it, anyone could register a matching
// queer-safe-space-*.vercel.app project name.
const ALLOWED_ORIGIN =
  /^(https:\/\/(www\.)?queersafespace\.org|https:\/\/(queer-safe-space|queer-safe-space-[a-z0-9-]+-amandas-projects-2ba13eff)\.vercel\.app|http:\/\/localhost(:\d+)?)$/;

/** Sets CORS headers for allowed browser origins. Returns true for a preflight (already answered). */
export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(204).end();
    return true;
  }
  return false;
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  return first || req.headers['x-real-ip'] || 'unknown';
}

const storeUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const storeToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

/** Runs Redis commands in one round trip. Returns the results, or null if the store is unusable. */
async function redis(commands) {
  const url = storeUrl();
  const token = storeToken();
  if (!url || !token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const out = await res.json();
    return out.map((r) => r.result);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const intEnv = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Per-visitor limit: at most `limit` requests per `windowSec` seconds (fixed window).
 * Returns { ok: true } or { ok: false, retryAfter } (seconds).
 */
export async function rateLimit(req, { name, limit, windowSec = 60 }) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const key = `rl:${name}:${clientIp(req)}:${bucket}`;
  const out = await redis([
    ['INCR', key],
    ['EXPIRE', key, windowSec * 2],
  ]);
  if (!out) return { ok: true, degraded: true };
  if (out[0] > limit) {
    return { ok: false, retryAfter: Math.max(1, windowSec - Math.floor((now / 1000) % windowSec)) };
  }
  return { ok: true };
}

/** Sitewide daily budget, e.g. for paid upstream calls. A cap of 0 (or less) disables it. */
export async function dailyCap(name, cap) {
  if (!(cap > 0)) return { ok: true };
  const day = new Date().toISOString().slice(0, 10);
  const key = `cap:${name}:${day}`;
  const out = await redis([
    ['INCR', key],
    ['EXPIRE', key, 60 * 60 * 48],
  ]);
  if (!out) return { ok: true, degraded: true };
  return out[0] > cap ? { ok: false } : { ok: true };
}

/** Limits configurable from Vercel environment variables, with defaults. */
export const limits = {
  placesPerMin: () => intEnv('RATE_LIMIT_PLACES_PER_MIN', 60),
  overpassPerMin: () => intEnv('RATE_LIMIT_OVERPASS_PER_MIN', 120),
  foursquareDaily: () => intEnv('FOURSQUARE_DAILY_CAP', 5000),
};

export function tooManyRequests(res, retryAfter) {
  res.setHeader('Retry-After', String(retryAfter));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(429).json({ error: 'Too many requests. Please slow down.', retryAfter });
}
