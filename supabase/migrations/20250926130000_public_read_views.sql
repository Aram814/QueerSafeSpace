-- Anonymous read path.
--
-- Hardening RLS to `authenticated` closed the "Browse Map Anonymously" flow:
-- anon has no privileges on the base tables, so a signed-out visitor saw an
-- empty map. These views restore read-only browsing without reopening the
-- identity leak — they never select user_id, so there is no column an anon
-- client could join back to profiles or auth.users.
--
-- The views are security definer (the PostgreSQL default, security_invoker
-- off): they run as the owner and therefore bypass RLS on the base tables.
-- That is the point — the column list, not RLS, is what protects anonymity
-- here. Keep user_id out of them.

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
    longitude
  from public.locations;

create or replace view public.public_ratings as
  select
    id,
    space_id,
    rating,
    comment,
    safety_tags,
    created_at
  from public.ratings;

alter view public.public_locations set (security_invoker = off);
alter view public.public_ratings   set (security_invoker = off);

-- Read-only: no insert/update/delete grants, so writing still requires a
-- session and goes through the RLS-protected base tables.
grant select on public.public_locations to anon, authenticated;
grant select on public.public_ratings   to anon, authenticated;

revoke insert, update, delete on public.public_locations from anon, authenticated;
revoke insert, update, delete on public.public_ratings   from anon, authenticated;

comment on view public.public_locations is
  'Anonymous-safe projection of locations: no user_id. Do not add author columns.';
comment on view public.public_ratings is
  'Anonymous-safe projection of ratings: no user_id. Do not add author columns.';
