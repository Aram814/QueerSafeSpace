-- "Your impact" for Founding Members: personal counts, community counts, and referrals.
--
-- Everything goes through functions that check who is asking. Nobody can read these tables
-- directly. Members see only counts, never who referred whom.

-- A private referral code per member, created the first time they open "Your impact".
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now()
);

-- Who joined through whose code. One row per new member, written only by claim_referral().
create table if not exists public.referral_signups (
  referred_user_id uuid primary key references auth.users (id) on delete cascade,
  referrer_id      uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now()
);

alter table public.referral_codes   enable row level security;
alter table public.referral_signups enable row level security;
revoke all on public.referral_codes   from anon, authenticated;
revoke all on public.referral_signups from anon, authenticated;

-- ---------------------------------------------------------------------------
-- my_impact(): the signed-in Founding Member's own numbers and referral code.
-- ---------------------------------------------------------------------------
create or replace function public.my_impact()
returns table (
  my_ratings       integer,
  my_places_added  integer,
  referral_code    text,
  referrals        integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  v_code text;
begin
  if uid is null or not exists (select 1 from public.founding_members f where f.user_id = uid) then
    raise exception 'Not available';
  end if;

  select c.code into v_code from public.referral_codes c where c.user_id = uid;
  if v_code is null then
    loop
      v_code := substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8);
      begin
        insert into public.referral_codes (user_id, code) values (uid, v_code);
        exit;
      exception when unique_violation then
        -- Either this member just got a code from another request, or the code collided.
        select c.code into v_code from public.referral_codes c where c.user_id = uid;
        exit when v_code is not null;
      end;
    end loop;
  end if;

  return query
  select
    (select count(*) from public.ratings   r where r.user_id = uid)::integer,
    (select count(*) from public.locations l where l.user_id = uid)::integer,
    v_code,
    (select count(*) from public.referral_signups s where s.referrer_id = uid)::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- site_stats(): community totals, and the same counts within a radius of a point.
-- Aggregates only; reveals nothing about any person.
-- ---------------------------------------------------------------------------
create or replace function public.site_stats(
  p_lat       double precision default null,
  p_lon       double precision default null,
  p_radius_km double precision default 40
)
returns table (
  total_places      integer,
  rated_places      integer,
  total_ratings     integer,
  area_places       integer,
  area_rated_places integer,
  area_ratings      integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  dlat double precision := p_radius_km / 111.0;
  dlon double precision;
begin
  if p_lat is not null and p_lon is not null then
    dlon := p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.01));
  end if;

  return query
  select
    (select count(*) from public.locations)::integer,
    (select count(distinct r.space_id) from public.ratings r)::integer,
    (select count(*) from public.ratings)::integer,
    case when dlon is null then null else (
      select count(*) from public.locations l
      where l.latitude between p_lat - dlat and p_lat + dlat
        and l.longitude between p_lon - dlon and p_lon + dlon)::integer end,
    case when dlon is null then null else (
      select count(distinct r.space_id) from public.ratings r
      join public.locations l on l.id = r.space_id
      where l.latitude between p_lat - dlat and p_lat + dlat
        and l.longitude between p_lon - dlon and p_lon + dlon)::integer end,
    case when dlon is null then null else (
      select count(*) from public.ratings r
      join public.locations l on l.id = r.space_id
      where l.latitude between p_lat - dlat and p_lat + dlat
        and l.longitude between p_lon - dlon and p_lon + dlon)::integer end;
end;
$$;

-- ---------------------------------------------------------------------------
-- claim_referral(code): called once by a brand-new member who arrived through a link.
-- Only counts accounts created in the last 7 days, never your own code, and only once.
-- ---------------------------------------------------------------------------
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid        uuid := auth.uid();
  v_referrer uuid;
  v_created  timestamptz;
begin
  if uid is null then
    return false;
  end if;

  select c.user_id into v_referrer
  from public.referral_codes c
  where c.code = lower(btrim(coalesce(p_code, '')));
  if v_referrer is null or v_referrer = uid then
    return false;
  end if;

  select u.created_at into v_created from auth.users u where u.id = uid;
  if v_created is null or v_created < now() - interval '7 days' then
    return false;
  end if;

  insert into public.referral_signups (referred_user_id, referrer_id)
  values (uid, v_referrer)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.my_impact()                                 from public, anon;
revoke all on function public.site_stats(double precision, double precision, double precision) from public, anon;
revoke all on function public.claim_referral(text)                        from public, anon;
grant execute on function public.my_impact()                                 to authenticated;
grant execute on function public.site_stats(double precision, double precision, double precision) to authenticated;
grant execute on function public.claim_referral(text)                        to authenticated;
