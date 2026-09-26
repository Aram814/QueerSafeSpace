-- Schema hardening for locations/ratings.
-- Idempotent: safe to re-run against a project where it has already been applied.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- locations.category: standardise, then constrain
-- ---------------------------------------------------------------------------
update public.locations
set category = case lower(trim(category))
  when 'cafe'              then 'cafe'
  when 'coffee'            then 'cafe'
  when 'coffee_shop'       then 'cafe'
  when 'restaurant'        then 'restaurant'
  when 'food'              then 'restaurant'
  when 'bar'               then 'bar'
  when 'pub'               then 'bar'
  when 'nightclub'         then 'bar'
  when 'club'              then 'bar'
  when 'retail'            then 'retail'
  when 'shop'              then 'retail'
  when 'store'             then 'retail'
  when 'place_of_worship'  then 'place_of_worship'
  when 'worship'           then 'place_of_worship'
  when 'church'            then 'place_of_worship'
  when 'healthcare'        then 'healthcare'
  when 'health'            then 'healthcare'
  when 'clinic'            then 'healthcare'
  when 'hospital'          then 'healthcare'
  when 'community'         then 'community'
  when 'community_center'  then 'community'
  else 'other'
end;

alter table public.locations
  drop constraint if exists locations_category_check;

alter table public.locations
  add constraint locations_category_check
  check (category in (
    'cafe', 'restaurant', 'bar', 'retail',
    'place_of_worship', 'healthcare', 'community', 'other'
  )) not valid;

alter table public.locations validate constraint locations_category_check;

alter table public.locations alter column category set default 'other';

-- ---------------------------------------------------------------------------
-- locations.safety_rating: mirror the check already on ratings.rating
-- ---------------------------------------------------------------------------
update public.locations
set safety_rating = 'unknown'
where safety_rating is null
   or safety_rating not in ('safe', 'mixed', 'not_safe', 'unknown');

alter table public.locations
  drop constraint if exists locations_safety_rating_check;

alter table public.locations
  add constraint locations_safety_rating_check
  check (safety_rating in ('safe', 'mixed', 'not_safe', 'unknown')) not valid;

alter table public.locations validate constraint locations_safety_rating_check;

-- ---------------------------------------------------------------------------
-- locations.tags: text (holding a stringified JSON array) -> text[]
-- ---------------------------------------------------------------------------
-- A USING expression may not contain a subquery, so the JSON parsing lives in a
-- throwaway helper function.
create or replace function public.__tags_text_to_array(raw text)
returns text[]
language sql
immutable
as $$
  select case
    when raw is null or btrim(raw) in ('', '[]') then '{}'::text[]
    when btrim(raw) like '[%' then coalesce(
      (select array_agg(value) from jsonb_array_elements_text(btrim(raw)::jsonb) as value),
      '{}'::text[]
    )
    else string_to_array(btrim(raw), ',')
  end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations'
      and column_name = 'tags' and data_type = 'text'
  ) then
    alter table public.locations alter column tags drop default;

    alter table public.locations
      alter column tags type text[]
      using public.__tags_text_to_array(tags);

    alter table public.locations alter column tags set default '{}'::text[];
    update public.locations set tags = '{}'::text[] where tags is null;
  end if;
end
$$;

drop function if exists public.__tags_text_to_array(text);

-- ---------------------------------------------------------------------------
-- locations.geog: PostGIS point generated from latitude/longitude + GiST index
-- ---------------------------------------------------------------------------
alter table public.locations
  add column if not exists geog extensions.geography(Point, 4326)
  generated always as (
    case
      when latitude is null or longitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
    end
  ) stored;

create index if not exists locations_geog_gix on public.locations using gist (geog);
create index if not exists locations_user_id_idx on public.locations (user_id);

-- ---------------------------------------------------------------------------
-- ratings.safety_tags
-- ---------------------------------------------------------------------------
alter table public.ratings
  add column if not exists safety_tags text[] not null default '{}'::text[];

alter table public.ratings
  drop constraint if exists ratings_safety_tags_check;

alter table public.ratings
  add constraint ratings_safety_tags_check
  check (safety_tags <@ array[
    'gender_neutral_restrooms',
    'trans_friendly_staff',
    'wheelchair_accessible',
    'incident_reported',
    'gender_neutral_signage',
    'lgbtq_owned',
    'pride_displayed',
    'staff_used_correct_pronouns',
    'hostile_clientele',
    'discriminatory_service',
    'unsafe_neighborhood'
  ]::text[]) not valid;

alter table public.ratings validate constraint ratings_safety_tags_check;

create index if not exists ratings_safety_tags_gin on public.ratings using gin (safety_tags);
create index if not exists ratings_space_id_idx on public.ratings (space_id);

-- ratings_space_id_user_id_key (one rating per user per space) is intentionally
-- left as-is: submitRating() upserts on conflict (space_id, user_id).
