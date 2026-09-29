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

Anonymity is a core design goal. Ratings and comments are never linked to a username: `profiles`
is readable only by its owner, and signed-out visitors read through `public_locations` /
`public_ratings` views that omit `user_id` entirely. See
[`supabase/SCHEMA_NOTES.md`](supabase/SCHEMA_NOTES.md) for the analysis of the gaps this closed.

## Repository layout

| Path | Description |
| --- | --- |
| `index.html` | The live production app: a single-file vanilla JS app using Leaflet and Supabase, served by GitHub Pages (`CNAME` sets the domain). Reference implementation. |
| `web/` | React 18 + Vite + TypeScript port of the same app on the same Supabase backend. `src/lib/` is framework-free so a future React Native (Expo) client can reuse it. See [`web/README.md`](web/README.md). |
| `supabase/migrations/` | SQL migrations: schema hardening (`text[]` tags, category check, PostGIS `geog` column and GiST index), RLS/anonymity rewrite, and the `user_id`-free public read views. |
| `supabase/SCHEMA_NOTES.md` | Introspected pre-/post-migration schema and anonymity analysis. |
| `tests/map.test.js` | Plain Node tests for pure utility functions extracted from `index.html`. |
| `logo*.png` | Branding assets. |

## Getting started

**Live app (`index.html`):** open it in a browser or serve the repo root with any static server.

**React app:**

```bash
cd web
cp .env.example .env.local   # add your Supabase URL + anon/publishable key
npm install
npm run dev                  # http://localhost:5173
```

Only the anon/publishable key belongs in `.env.local`. Never use the service-role key or the
Management API token, since Vite inlines `VITE_*` variables into the browser bundle.

**Tests:**

```bash
node tests/map.test.js
```

## Status

The project is moving from the single-file app to the React port. Until the port fully replaces
`index.html`, changes to shared behavior should be made in both. Open items: OAuth providers,
and a build/deploy workflow for `web/`.
