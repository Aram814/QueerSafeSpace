-- Lets the sign-up form check a username before the account exists.
-- profiles is owner-only under RLS, so this is a security definer function that returns
-- only true/false -- it never reveals who owns a name.

create or replace function public.username_available(name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(trim(name))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
