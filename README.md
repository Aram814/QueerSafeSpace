# QueerSafeSpace

A community-driven map of places that are safe, or not safe, for LGBTQ+ people. Live at
**[www.queersafespace.org](https://www.queersafespace.org)**.

## What it does

- Browse a map of venues: cafés, restaurants, bars, retail, places of worship, healthcare and
  community spaces.
- Search for places (location-aware search using Nominatim and the Overpass API for categories
  and brands) and add new ones.
- Rate a place **safe / mixed / not safe**, with safety tags and a comment. A place's pin color is
  the majority vote of its ratings.
- Sign in with email. Google and Apple sign-in are planned (see `web/README.md`).

## Anonymity

Safety and pseudonymity are core design goals. Ratings and comments are shown with the author's
chosen username, and the app tells people not to use their real name. Nothing else identifies an
author: `profiles` is readable only by its owner, and everyone reads ratings through the
`public_ratings` view, which exposes the username text but never `user_id` or email. Default
usernames are random (`friend-xxxxxx`), not derived from the email. See
[`supabase/SCHEMA_NOTES.md`](supabase/SCHEMA_NOTES.md) for the analysis of the gaps this closed.

## Repository layout

| Path | Description |
| --- | --- |
| `web/` | The app: React 18 + Vite + TypeScript on Supabase, deployed on Vercel at www.queersafespace.org. `src/lib/` is framework-free so a future mobile client can reuse it. See [`web/README.md`](web/README.md). |
| `tools/osm-import/` | Builds SQL files of OpenStreetMap places tagged as LGBTQ+ friendly, run from GitHub Actions. See its README. |
| `.github/workflows/` | The on-demand "Import OSM listings" workflow. |
| `supabase/migrations/` | SQL migrations: schema hardening (`text[]` tags, category check, PostGIS `geog` column and GiST index), RLS/anonymity rewrite, and the `user_id`-free public read views. |
| `supabase/SCHEMA_NOTES.md` | Introspected pre-/post-migration schema and anonymity analysis. |
| `brand/` | Original logo and brand images, kept for reference. The app uses its own copies in `web/public/`. |

## Getting started

```bash
cd web
cp .env.example .env.local   # add your Supabase URL + anon/publishable key
npm install
npm run dev                  # http://localhost:5173
```

Only the anon/publishable key belongs in `.env.local`. Never use the service-role key or the
Management API token, since Vite inlines `VITE_*` variables into the browser bundle.

**Tests:** `node --test tools/osm-import/transform.test.mjs` (importer), and `npm run lint` / `npx tsc -b` in `web/`.

## History

The project started as a single-file vanilla JS app (`index.html`) on GitHub Pages. It was replaced
by the React app in `web/` and removed from the repository; the last commit that contains it is
`c116581` (`git show c116581:index.html`).

## Status

Beta. Open items: Google/Apple sign-in, a production map tile provider, and app store packaging.
