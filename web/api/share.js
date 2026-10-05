/**
 * Share page for one place (Vercel Function), reached as /p/<place id>.
 *
 * Link previews (iMessage, WhatsApp, Facebook, Slack, Instagram DMs...) read a page's <meta> tags
 * without running JavaScript, and the map itself is a JavaScript app. This returns a tiny page
 * with the place's name and rating summary in its tags, then sends real visitors on to the app
 * with ?place=<id>, which opens that place.
 *
 * Only public information is used: the same public_locations and public_ratings views the app reads
 * with the public (anon) key. Never user ids, emails or usernames.
 *
 * Environment: SUPABASE_URL / SUPABASE_ANON_KEY, or the VITE_ versions the build already uses.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function verdict(counts) {
  const total = counts.safe + counts.mixed + counts.not_safe;
  if (!total) return 'No ratings yet. Be the first to rate it';
  const max = Math.max(counts.safe, counts.mixed, counts.not_safe);
  let label = 'Mixed reports';
  if (counts.safe === max) label = 'Mostly safe';
  else if (counts.not_safe === max) label = 'Reported not safe';
  return `${label}, based on ${total} rating${total === 1 ? '' : 's'}`;
}

async function rest(base, key, path) {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  const id = String(req.query.id ?? '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.queersafespace.org';
  const origin = `https://${host}`;
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let title = 'QueerSafeSpace';
  let description = 'A community map of places that are safe for LGBTQ+ people. Because Safety Shouldn\'t Be A Privilege.';
  let target = '/';

  if (UUID.test(id) && base && key) {
    target = `/?place=${id}`;
    try {
      const [places, ratings] = await Promise.all([
        rest(base, key, `public_locations?id=eq.${id}&select=name,address&limit=1`),
        rest(base, key, `public_ratings?space_id=eq.${id}&select=rating`),
      ]);
      const place = places[0];
      if (place?.name) {
        const counts = { safe: 0, mixed: 0, not_safe: 0 };
        for (const r of ratings) if (counts[r.rating] !== undefined) counts[r.rating]++;
        title = `${place.name} on QueerSafeSpace`;
        description = `${verdict(counts)}. ${place.address ? place.address + '. ' : ''}See what the community says.`;
      }
    } catch {
      /* fall back to the generic card; visitors still land on the place */
    }
  }

  const url = `${origin}/p/${esc(id)}`;
  const image = `${origin}/og-image.png`;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="QueerSafeSpace">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body><p><a href="${esc(target)}">Open ${esc(title)}</a></p></body></html>`;

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
}
