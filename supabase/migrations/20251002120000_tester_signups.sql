-- Tester / volunteer sign-ups from the in-app form.
--
-- Nobody can read or write this table directly (RLS on, no policies, no grants). The only way in
-- is submit_tester_signup(), which validates the input. You read the sign-ups in the Supabase
-- Table Editor. Signing up again with the same email updates the earlier entry instead of
-- creating a duplicate.

create table if not exists public.tester_signups (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 80),
  email      text not null check (char_length(email) between 5 and 200),
  location   text check (char_length(location) <= 120),
  device     text check (device in ('iphone', 'android', 'computer', 'other')),
  roles      text[] not null default '{}',
  note       text check (char_length(note) <= 1000),
  contacted  boolean not null default false
);

create unique index if not exists tester_signups_email_key
  on public.tester_signups (lower(email));

alter table public.tester_signups enable row level security;
revoke all on public.tester_signups from anon, authenticated;

create or replace function public.submit_tester_signup(
  p_name text,
  p_email text,
  p_location text default null,
  p_device text default null,
  p_roles text[] default '{}',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'Please enter your name.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then
    raise exception 'Please enter a valid email address.';
  end if;
  if p_device is not null and p_device not in ('iphone', 'android', 'computer', 'other') then
    raise exception 'Unknown device.';
  end if;
  if p_roles is not null and not (p_roles <@ array['tester', 'rater', 'ambassador', 'feedback']) then
    raise exception 'Unknown role.';
  end if;

  insert into public.tester_signups (name, email, location, device, roles, note)
  values (
    v_name,
    v_email,
    nullif(left(btrim(coalesce(p_location, '')), 120), ''),
    p_device,
    coalesce(p_roles, '{}'),
    nullif(left(btrim(coalesce(p_note, '')), 1000), '')
  )
  on conflict (lower(email)) do update
    set name = excluded.name,
        location = excluded.location,
        device = excluded.device,
        roles = excluded.roles,
        note = excluded.note,
        updated_at = now();
end;
$$;

revoke all on function public.submit_tester_signup(text, text, text, text, text[], text) from public;
grant execute on function public.submit_tester_signup(text, text, text, text, text[], text)
  to anon, authenticated;
