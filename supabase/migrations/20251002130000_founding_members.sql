-- Founding Member badge.
--
-- Only you can grant it (from the SQL Editor, which bypasses these rules). People can read just
-- their own row, so the app can show their badge, but nobody can give themselves one: there is no
-- insert/update/delete policy and no write grant for app users.

create table if not exists public.founding_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text,
  -- Off by default. The member can turn it on to show the badge next to their ratings and comments.
  show_badge boolean not null default false
);

alter table public.founding_members enable row level security;

drop policy if exists founding_members_select_own on public.founding_members;
create policy founding_members_select_own on public.founding_members
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.founding_members from anon, authenticated;
grant select on public.founding_members to authenticated;

-- Members can only flip their own show_badge switch (never grant themselves a badge).
create or replace function public.set_badge_visibility(p_show boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.founding_members set show_badge = coalesce(p_show, false) where user_id = auth.uid();
$$;

revoke all on function public.set_badge_visibility(boolean) from public, anon;
grant execute on function public.set_badge_visibility(boolean) to authenticated;

-- Ratings are shown with the author's username (see public_usernames). When the author has chosen to
-- show their badge, `founding` is true. It is false for everyone else, and reveals nothing more.
create or replace view public.public_ratings as
  select
    r.id,
    r.space_id,
    r.rating,
    r.comment,
    r.safety_tags,
    r.created_at,
    p.username,
    coalesce(f.show_badge, false) as founding
  from public.ratings r
  left join public.profiles p on p.user_id = r.user_id
  left join public.founding_members f on f.user_id = r.user_id;

alter view public.public_ratings set (security_invoker = off);
grant select on public.public_ratings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- How to grant the badge (run these yourself when you decide someone has earned it)
-- ---------------------------------------------------------------------------
-- One person, by the email on their account:
--   insert into public.founding_members (user_id, note)
--   select id, 'beta data collector' from auth.users where lower(email) = lower('them@example.com')
--   on conflict do nothing;
--
-- Everyone who filled in the tester form AND has an account:
--   insert into public.founding_members (user_id, note)
--   select u.id, 'tester sign-up' from auth.users u
--   join public.tester_signups t on lower(t.email) = lower(u.email)
--   on conflict do nothing;
--
-- Take it away:
--   delete from public.founding_members where user_id = (
--     select id from auth.users where lower(email) = lower('them@example.com'));
