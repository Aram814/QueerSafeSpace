-- Founding Member badge.
--
-- Only you can grant it (from the SQL Editor, which bypasses these rules). People can read just
-- their own row, so the app can show their badge, but nobody can give themselves one: there is no
-- insert/update/delete policy and no write grant for app users.

create table if not exists public.founding_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.founding_members enable row level security;

drop policy if exists founding_members_select_own on public.founding_members;
create policy founding_members_select_own on public.founding_members
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.founding_members from anon, authenticated;
grant select on public.founding_members to authenticated;

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
