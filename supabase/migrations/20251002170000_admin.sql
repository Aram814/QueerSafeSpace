-- Owner/admin tools.
--
-- Who is an admin is a row in public.admins. Nobody can read or write that table from the app,
-- and every admin_* function checks it first, so the restriction is enforced by the database.
-- The page in the app is only a window onto these functions.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- The owner account. (If it does not exist yet, create it in the app, then run this insert again.)
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'queersafespace.lgbt@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- Counts for the top of the admin page.
create or replace function public.admin_overview()
returns table (
  accounts           integer,
  confirmed          integer,
  new_7d             integer,
  new_30d            integer,
  founding_members   integer,
  referrals          integer,
  tester_signups     integer,
  testers_with_acct  integer,
  places_total       integer,
  places_community   integer,
  places_rated       integer,
  ratings_total      integer,
  ratings_7d         integer
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select
    (select count(*) from auth.users)::integer,
    (select count(*) from auth.users u where u.email_confirmed_at is not null)::integer,
    (select count(*) from auth.users u where u.created_at > now() - interval '7 days')::integer,
    (select count(*) from auth.users u where u.created_at > now() - interval '30 days')::integer,
    (select count(*) from public.founding_members)::integer,
    (select count(*) from public.referral_signups)::integer,
    (select count(*) from public.tester_signups)::integer,
    (select count(*) from public.tester_signups t
       where exists (select 1 from auth.users u where lower(u.email) = lower(t.email)))::integer,
    (select count(*) from public.locations)::integer,
    (select count(*) from public.locations l where l.source = 'community')::integer,
    (select count(distinct r.space_id) from public.ratings r)::integer,
    (select count(*) from public.ratings)::integer,
    (select count(*) from public.ratings r where r.created_at > now() - interval '7 days')::integer;
end;
$$;

-- New accounts per day, oldest first, with zero-filled days.
create or replace function public.admin_daily_signups(p_days integer default 14)
returns table (day date, accounts integer)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select d::date,
         (select count(*) from auth.users u where u.created_at::date = d::date)::integer
  from generate_series(
         (current_date - (greatest(least(coalesce(p_days, 14), 90), 1) - 1))::timestamp,
         current_date::timestamp,
         interval '1 day') as d
  order by 1;
end;
$$;

-- Newest accounts first.
create or replace function public.admin_recent_accounts(p_limit integer default 25)
returns table (
  created_at      timestamptz,
  email           text,
  username        text,
  confirmed       boolean,
  last_sign_in_at timestamptz,
  founding        boolean,
  tester_signup   boolean,
  via_referral    boolean
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select
    u.created_at,
    u.email::text,
    coalesce(p.username, u.raw_user_meta_data->>'username')::text,
    u.email_confirmed_at is not null,
    u.last_sign_in_at,
    exists (select 1 from public.founding_members f where f.user_id = u.id),
    exists (select 1 from public.tester_signups t where lower(t.email) = lower(u.email)),
    exists (select 1 from public.referral_signups s where s.referred_user_id = u.id)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc
  limit greatest(least(coalesce(p_limit, 25), 200), 1);
end;
$$;

-- Everyone who filled in the tester form, newest first.
create or replace function public.admin_tester_signups()
returns table (
  id          uuid,
  created_at  timestamptz,
  name        text,
  email       text,
  location    text,
  device      text,
  roles       text[],
  note        text,
  contacted   boolean,
  has_account boolean,
  founding    boolean
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select
    t.id, t.created_at, t.name, t.email, t.location, t.device, t.roles, t.note, t.contacted,
    exists (select 1 from auth.users u where lower(u.email) = lower(t.email)),
    exists (select 1 from auth.users u
              join public.founding_members f on f.user_id = u.id
             where lower(u.email) = lower(t.email))
  from public.tester_signups t
  order by t.created_at desc;
end;
$$;

create or replace function public.admin_set_contacted(p_id uuid, p_contacted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  update public.tester_signups set contacted = coalesce(p_contacted, false) where id = p_id;
end;
$$;

-- The weekly "give testers the Founding Member badge" step, as a button.
-- Returns how many new Founding Members were added.
create or replace function public.admin_grant_founding()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  with ins as (
    insert into public.founding_members (user_id, note)
    select u.id, 'tester sign-up'
    from auth.users u
    join public.tester_signups t on lower(t.email) = lower(u.email)
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

revoke all on function public.is_admin()                           from public, anon;
revoke all on function public.admin_overview()                     from public, anon;
revoke all on function public.admin_daily_signups(integer)         from public, anon;
revoke all on function public.admin_recent_accounts(integer)       from public, anon;
revoke all on function public.admin_tester_signups()               from public, anon;
revoke all on function public.admin_set_contacted(uuid, boolean)   from public, anon;
revoke all on function public.admin_grant_founding()               from public, anon;
grant execute on function public.is_admin()                           to authenticated;
grant execute on function public.admin_overview()                     to authenticated;
grant execute on function public.admin_daily_signups(integer)         to authenticated;
grant execute on function public.admin_recent_accounts(integer)       to authenticated;
grant execute on function public.admin_tester_signups()               to authenticated;
grant execute on function public.admin_set_contacted(uuid, boolean)   to authenticated;
grant execute on function public.admin_grant_founding()               to authenticated;
