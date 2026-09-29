# QueerSafeSpace — web (React 18 + Vite + TypeScript)

A port of the live single-file app at the repo root (`index.html`, deployed to GitHub Pages)
into a React/Vite app backed by the same Supabase project. The root `index.html` is unchanged
and remains the reference implementation.

## Environment setup

```bash
cd web
cp .env.example .env.local   # fill in your Supabase URL + anon/publishable key
npm install
npm run dev                  # http://localhost:5173
```

`.env.local` is gitignored. Only the anon/publishable key belongs in it — never the
service-role key or the Management API token, since Vite inlines `VITE_*` into the browser
bundle.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon JWT or `sb_publishable_…` key |

Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`.

## Structure

Split so the data layer can be reused by a future React Native (Expo) client — nothing in
`src/lib/` imports React or DOM APIs.

```
src/lib/         Supabase client, types, queries, rating aggregation, geocoding (portable)
src/components/  UI: map, sheets, auth overlay, search, toast
src/screens/     Splash and map screens
```

Behaviour ported 1:1 from `index.html`: `overallRating` majority-vote tally, `PIN_COLORS`,
`loadSpaces`, marker rendering (now react-leaflet), `submitSpace` (location insert + seed
rating), `submitRating` (upsert on `space_id,user_id`), email auth, and the
splash → auth → map flow.

## Search proxy (`api/overpass.js`)

Category and name search use the public Overpass API, which rejects or drops many direct
browser requests. `api/overpass.js` is a Vercel Function that forwards those queries
server-side (proper User-Agent, mirror fallback, edge caching) and only accepts
`[out:json]` queries. The client tries `/api/overpass` first and falls back to the public
mirrors, which is what happens under plain `npm run dev` (no server functions locally; use
`vercel dev` to exercise the proxy). Vercel project settings: Root Directory `web`.

## Place search (`api/places.js`)

OpenStreetMap is missing many small businesses, so name and category search also asks
Foursquare Places. `api/places.js` is a Vercel Function that calls it server-side so the key
never reaches the browser; results are passed through, not stored.

Setup (Vercel -> Project Settings -> Environment Variables, for Production **and** Preview):

| Variable | Value |
| --- | --- |
| `FOURSQUARE_API_KEY` | A Places API service key from developer.foursquare.com. Server-only: do **not** prefix it with `VITE_`. |
| `FOURSQUARE_API_BASE` | Optional. Defaults to `https://places-api.foursquare.com/places/search`. |
| `FOURSQUARE_API_VERSION` | Optional. Sent as `X-Places-Api-Version` (default `2025-06-17`). |

Redeploy after adding them. Without the key `/api/places` answers 503 and search falls back to
the free OpenStreetMap sources. Check Foursquare's current terms for attribution and for how
long results may be stored before publishing.

## Anonymity

Ratings are never joined to `profiles` or auth data. The detail sheet renders a rating's date,
colour, tags and comment only. `profiles` is readable by its owner alone at the RLS level, so
there is no client path from a rating to a username.

Signed-out visitors read through the `public_locations` / `public_ratings` views, which omit
`user_id` entirely; the base tables are revoked from `anon`. Writing always requires a session.

## Manual Supabase dashboard checklist

Migrations in `supabase/migrations/` have already been applied to project
`sgvxsyvqluhivohypkkg` via the Management API. On a fresh project, or to verify:

1. **Verify migrations** — Database → Tables:
   - `locations`: `category` check constraint (cafe, restaurant, bar, retail,
     place_of_worship, healthcare, community, other), `tags text[]`, generated
     `geog geography(Point,4326)` with GiST index `locations_geog_gix`.
   - `ratings`: `safety_tags text[]`, unique `ratings_space_id_user_id_key`.
2. **Confirm RLS policies** — Authentication → Policies: RLS enabled on `locations`,
   `ratings`, `profiles`; read for `authenticated` on locations/ratings; insert/update/delete
   restricted to `auth.uid() = user_id`; `profiles` owner-only; `anon` has no privileges on the
   base tables, only SELECT on the `public_locations` / `public_ratings` views.
3. **Enable OAuth providers** — Authentication → Providers: enable Google and Apple, add the
   client ID/secret, and add `http://localhost:5173` plus the deployed origin to the redirect
   allow-list. The Google/Apple buttons in `AuthOverlay` call `signInWithOAuth` and are marked
   TODO until this is done.
4. **Email settings** — Authentication → Providers → Email: confirm whether email confirmation
   is required; the sign-up flow shows a "check your email" message when it is.

See `../supabase/SCHEMA_NOTES.md` for the pre/post-migration schema and the anonymity analysis.
