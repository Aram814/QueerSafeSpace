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
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
/** A later mirror is only tried if the earlier ones fail or stay silent this long. */
const HEDGE_MS = 3000;
const MIRROR_TIMEOUT_MS = 12000;
const USER_AGENT = 'QueerSafeSpace/1.0 (https://www.queersafespace.org; QueerSafeSpace.lgbt@gmail.com)';
const ALLOWED_ORIGIN = /^(https:\/\/(www\.)?queersafespace\.org|https:\/\/[a-z0-9-]+\.vercel\.app|http:\/\/localhost(:\d+)?)$/;
// Only Overpass JSON queries of a sane size: this must not become an open proxy.
const QUERY_SHAPE = /^\[out:json\]\[timeout:\d{1,2}\];/;
const MAX_QUERY_LENGTH = 4000;

/** The readable part of an Overpass error page (they are XHTML; the reason follows "Error"). */
function errorText(body) {
  const plain = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const at = plain.search(/error/i);
  return plain.slice(at >= 0 ? at : 0, (at >= 0 ? at : 0) + 300);
}

async function tryMirror(endpoint, query, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MIRROR_TIMEOUT_MS);
  signal.addEventListener('abort', () => ctrl.abort());
  try {
    // The canonical way to call Overpass: a form-encoded POST. Accept */* because some
    // instances answer 406 to narrower Accept headers.
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const host = new URL(endpoint).host;
    if (!res.ok) throw new Error(`${host} responded ${res.status}: ${errorText(text)}`);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${host} returned non-JSON: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
    }
    // A server-side timeout is HTTP 200 + `remark` + no elements: treat it as a failed mirror.
    if (!data.elements?.length && data.remark) throw new Error(`${host}: ${data.remark}`);
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`${new URL(endpoint).host} timed out or was cancelled`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Hedged: mirrors start one after another (on failure, or after HEDGE_MS of silence); first success wins. */
function raceMirrors(query) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const errors = [];
    const timers = [];
    let next = 0;
    let pending = 0;
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      ctrl.abort();
      fn();
    };
    const launch = () => {
      if (done || next >= MIRRORS.length) return;
      const endpoint = MIRRORS[next++];
      pending++;
      const hedge = setTimeout(launch, HEDGE_MS);
      timers.push(hedge);
      tryMirror(endpoint, query, ctrl.signal).then(
        (data) => finish(() => resolve(data)),
        (err) => {
          errors.push(String(err.message ?? err));
          pending--;
          clearTimeout(hedge);
          if (next < MIRRORS.length) launch();
          else if (pending === 0) finish(() => reject(errors));
        },
      );
    };
    launch();
  });
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

  try {
    const data = await raceMirrors(query);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (errors) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'All Overpass mirrors failed', details: errors, received: query.slice(0, 400) });
  }
}
