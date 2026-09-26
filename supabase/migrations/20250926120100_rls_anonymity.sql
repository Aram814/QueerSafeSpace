-- RLS rewrite. Anonymity is a hard product requirement: no path available to a
-- client may join a rating back to a profile or to auth data.
--
-- Permissive policies are OR'd together, so the legacy broad policies are
-- dropped rather than left alongside the new ones.

alter table public.locations enable row level security;
alter table public.ratings   enable row level security;
alter table public.profiles  enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('locations', 'ratings', 'profiles')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- locations: any signed-in user reads; authors write their own rows
-- ---------------------------------------------------------------------------
create policy locations_select on public.locations
  for select to authenticated
  using (true);

create policy locations_insert on public.locations
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy locations_update on public.locations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy locations_delete on public.locations
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ratings: any signed-in user reads; authors write their own rows
-- ---------------------------------------------------------------------------
create policy ratings_select on public.ratings
  for select to authenticated
  using (true);

create policy ratings_insert on public.ratings
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy ratings_update on public.ratings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy ratings_delete on public.ratings
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- profiles: owner only, in every direction. This is what keeps ratings
-- anonymous -- ratings.user_id cannot be resolved to a username by any client.
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy profiles_update on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (auth.uid() = user_id);

-- Defence in depth: the anon role keeps no table privileges, so an accidental
-- future policy cannot re-open these tables to unauthenticated callers.
revoke all on public.locations from anon;
revoke all on public.ratings   from anon;
revoke all on public.profiles  from anon;

grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.ratings   to authenticated;
grant select, insert, update, delete on public.profiles  to authenticated;
