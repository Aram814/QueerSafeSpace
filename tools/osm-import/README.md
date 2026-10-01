# OpenStreetMap listings import

Builds SQL files of places that OpenStreetMap volunteers tag as LGBTQ+ friendly, one per US state.
These are **listings, not safety ratings**: they are imported as `unknown` (grey pins) with
`source = 'osm'`, and the app labels them as OpenStreetMap listings. Data © OpenStreetMap
contributors, ODbL.

## Run it

GitHub → **Actions** → **Import OSM listings** → **Run workflow**. Leave `states` empty for all
states, or enter codes like `FL,GA`. When it finishes, download the `osm-listings` artifact.

Or locally (Node 20+): `node tools/osm-import/import.mjs --states=FL --out=out`

## Load it into Supabase

1. Make sure these migrations have been run: `20251001150000_listed_places.sql`,
   `20251001160000_spaces_in_view.sql`.
2. In the Supabase SQL Editor, paste one state's `.sql` file and run it. Re-running is safe.
3. `summary.json` lists how many places were found/listed per state and why others were skipped.

## What is left out

Private or members-only venues, adult venues, nudist/kink venues, chains whose tag has no recorded
source, unnamed elements, and anything that is not a shop/venue/office. See `transform.mjs`.

## Tests

`node --test tools/osm-import` (no network needed).
