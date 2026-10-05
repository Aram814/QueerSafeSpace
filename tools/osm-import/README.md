# OpenStreetMap listings import

Builds SQL files of places that OpenStreetMap volunteers tag as LGBTQ+ friendly, one per US state.
These are **listings, not safety ratings**: they are imported as `unknown` (grey pins) with
`source = 'osm'`, and the app labels them as OpenStreetMap listings. Data © OpenStreetMap
contributors, ODbL.

## Run it

GitHub → **Actions** → **Import OSM listings** → **Run workflow**. Leave `states` empty for all
states, or enter codes like `FL,GA`. When it finishes, download the `osm-listings` artifact. It has one file per state, and also a few
combined files (`all-part-01.sql`, `all-part-02.sql`, ...) of up to 250 places each, which are quicker to load.

Or locally (Node 20+): `node tools/osm-import/import.mjs --states=FL --out=out`

## Load it into Supabase

1. Make sure these migrations have been run: `20251001150000_listed_places.sql`,
   `20251001160000_spaces_in_view.sql`.
2. In the Supabase SQL Editor, paste one `.sql` file at a time (the combined `all-part-NN.sql` files, or
   a single state's file) and run it. Re-running is safe: places already loaded are skipped, so you
   can load everything again without creating duplicates.
3. `summary.json` lists how many places were found/listed per state and why others were skipped.

## Addresses

OpenStreetMap often has no city or street for a place. For those, the importer asks the free
Nominatim service (one request per second, as its policy requires) for the city and street from the
coordinates. A full run can therefore take a few hours. `--no-geocode` skips it.

## Refreshing places you already loaded

Re-running a state file never changes rows that already exist. To replace earlier listings with
better data, first delete the *unrated* ones (rated places are kept), then load the new files:

```sql
delete from public.locations l
where l.source = 'osm'
  and not exists (select 1 from public.ratings r where r.space_id = l.id);
```

## What is left out

Private or members-only venues, adult venues, nudist/kink venues, chains whose tag has no recorded
source, unnamed elements, and anything that is not a shop/venue/office. See `transform.mjs`.

## Tests

`node --test tools/osm-import/transform.test.mjs` (no network needed).
