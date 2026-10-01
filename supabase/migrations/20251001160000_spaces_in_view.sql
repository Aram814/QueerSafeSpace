-- Load only the places in (and around) the visible map area, with their rating counts.
--
-- Why: the app used to read every place at once. Supabase returns at most 1,000 rows per request,
-- so once the map holds more than that (e.g. after a nationwide import of listings) places would
-- silently go missing. This returns the nearest places to the map centre inside the box, and
-- never exposes who added a place or who wrote a rating.

-- A plain unique index (NULL source_ids are never equal, so community rows are unaffected). Unlike
-- the earlier partial index, it also works with ON CONFLICT (source, source_id).
drop index if exists public.locations_source_id_key;
create unique index if not exists locations_source_id_key
  on public.locations (source, source_id);

create or replace function public.spaces_in_view(
  min_lat double precision,
  max_lat double precision,
  min_lon double precision,
  max_lon double precision,
  center_lat double precision,
  center_lon double precision,
  max_rows integer default 800
)
returns table (
  id uuid,
  created_at timestamptz,
  name text,
  address text,
  category text,
  safety_rating text,
  tags text[],
  notes text,
  latitude double precision,
  longitude double precision,
  source text,
  safe_count integer,
  mixed_count integer,
  not_safe_count integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.id, l.created_at, l.name, l.address, l.category, l.safety_rating, l.tags, l.notes,
    l.latitude, l.longitude, l.source,
    coalesce(r.safe, 0)::integer,
    coalesce(r.mixed, 0)::integer,
    coalesce(r.not_safe, 0)::integer
  from public.locations l
  left join lateral (
    select
      count(*) filter (where rt.rating = 'safe')     as safe,
      count(*) filter (where rt.rating = 'mixed')    as mixed,
      count(*) filter (where rt.rating = 'not_safe') as not_safe
    from public.ratings rt
    where rt.space_id = l.id
  ) r on true
  where l.latitude  between min_lat and max_lat
    and l.longitude between min_lon and max_lon
  order by power(l.latitude - center_lat, 2) + power(l.longitude - center_lon, 2)
  limit least(greatest(max_rows, 1), 1500);
$$;

revoke all on function public.spaces_in_view(
  double precision, double precision, double precision, double precision,
  double precision, double precision, integer
) from public;
grant execute on function public.spaces_in_view(
  double precision, double precision, double precision, double precision,
  double precision, double precision, integer
) to anon, authenticated;
