/**
 * Server-side proxy for Overpass API queries (Vercel Function).
 *
 * The public Overpass servers reject or drop many direct browser requests (a
 * header-less 406 on overpass-api.de that browsers report as a CORS error, empty
 * responses from the mirrors). From a server we can send a proper User-Agent, try
 * each mirror in turn, and let Vercel's edge cache answer repeat searches so we
 * put far less load on the shared servers.
 *
 * GET /api/overpass?data=<url-encoded Overpass QL, starting with [out:json]>
 */
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const USER_AGENT = 'QueerSafeSpace/1.0 (https://www.queersafespace.org; QueerSafeSpace.lgbt@gmail.com)';
const ALLOWED_ORIGIN = /^(https:\/\/(www\.)?queersafespace\.org|https:\/\/[a-z0-9-]+\.vercel\.app|http:\/\/localhost(:\d+)?)$/;
// Only Overpass JSON queries of a sane size: this must not become an open proxy.
const QUERY_SHAPE = /^\[out:json\]\[timeout:\d{1,2}\];/;
const MAX_QUERY_LENGTH = 4000;

async function tryMirror(endpoint, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${new URL(endpoint).host} responded ${res.status}`);
    const data = await res.json();
    // A server-side timeout is HTTP 200 + `remark` + no elements: treat it as a failed mirror.
    if (!data.elements?.length && data.remark) throw new Error(data.remark);
    return data;
  } finally {
    clearTimeout(timer);
  }
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

  const query = typeof req.query?.data === 'string' ? req.query.data : '';
  if (!query || query.length > MAX_QUERY_LENGTH || !QUERY_SHAPE.test(query)) {
    return res.status(400).json({ error: 'Expected an Overpass JSON query in ?data=' });
  }

  const errors = [];
  for (const endpoint of MIRRORS) {
    try {
      const data = await tryMirror(endpoint, query);
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(data);
    } catch (err) {
      errors.push(String(err.message ?? err));
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({ error: 'All Overpass mirrors failed', details: errors });
}
