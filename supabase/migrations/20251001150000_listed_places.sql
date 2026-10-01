-- "Listed" places: businesses and organizations that OpenStreetMap volunteers tag as LGBTQ+
-- friendly. They are NOT safety ratings. They appear on the map as unrated places (grey) with a
-- notice saying where the listing came from, until the community rates them.

alter table public.locations
  add column if not exists source text not null default 'community',
  add column if not exists source_id text;

alter table public.locations
  drop constraint if exists locations_source_check;
alter table public.locations
  add constraint locations_source_check check (source in ('community', 'osm'));

-- One row per imported place, so re-running the import never duplicates it.
create unique index if not exists locations_source_id_key
  on public.locations (source, source_id) where source_id is not null;

-- Expose the source (and nothing about authors) through the public view.
create or replace view public.public_locations as
  select
    id,
    created_at,
    name,
    address,
    category,
    safety_rating,
    tags,
    notes,
    latitude,
    longitude,
    source
  from public.locations;

alter view public.public_locations set (security_invoker = off);
grant select on public.public_locations to anon, authenticated;

comment on view public.public_locations is
  'Anonymous-safe projection of locations: no user_id. Do not add author columns.';
