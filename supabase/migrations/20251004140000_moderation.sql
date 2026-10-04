-- Moderation: a language filter, a Report button for comments, and a review queue for the admin.
--
--   * moderation_words   Words you control. 'block' words are refused when someone posts. 'flag'
--                        words are allowed but land in your review queue (for slurs, because people
--                        also need to quote them when reporting harassment).
--   * reports            One row per report. Members only ever write them through report_comment().
--   * ratings.comment_hidden   Lets you hide a comment without deleting the person's safety vote.
--
-- Nobody can read or write these tables from the app. Everything goes through the functions below.

-- ---------------------------------------------------------------------------
-- Word list
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_words (
  word     text primary key check (word = lower(word) and word ~ '^[a-z]+$'),
  action   text not null check (action in ('block', 'flag')),
  added_at timestamptz not null default now()
);

alter table public.moderation_words enable row level security;
revoke all on public.moderation_words from anon, authenticated;

-- A starter list of ordinary profanity (blocked). Add or remove words any time in the SQL Editor:
--   insert into public.moderation_words (word, action) values ('someword', 'block') on conflict do nothing;
--   delete from public.moderation_words where word = 'someword';
-- Lower-case letters only. Endings like -s, -ed, -ing are matched automatically.
insert into public.moderation_words (word, action) values
  ('fuck', 'block'), ('motherfucker', 'block'), ('shit', 'block'), ('bullshit', 'block'),
  ('bitch', 'block'), ('asshole', 'block'), ('ass', 'block'), ('dumbass', 'block'),
  ('jackass', 'block'), ('cunt', 'block'), ('pussy', 'block'), ('cock', 'block'),
  ('dickhead', 'block'), ('whore', 'block'), ('slut', 'block'), ('bastard', 'block'),
  ('twat', 'block'), ('wanker', 'block'),
-- Allowed, but sent to your review queue.
  ('fag', 'flag'), ('faggot', 'flag'), ('tranny', 'flag'), ('trannies', 'flag'), ('shemale', 'flag')
on conflict do nothing;

-- Returns the first listed word of the given kind found in the text, or null.
-- Matches whole words only (so "class" and "assume" are fine), ignores capital letters, stretched
-- letters ("fuuuck") and common number or symbol swaps ("sh1t", "a$$"). Numbers, dots and
-- underscores count as breaks between words, so "fuck_you" and "shit99" are caught.
create or replace function public.moderation_match(p_text text, p_action text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select w.word
  from public.moderation_words w,
       lateral (select regexp_replace(lower(translate(coalesce(p_text, ''), '013457@$', 'oieastas')), '[^a-z]+', ' ', 'g') as t) n
  where w.action = p_action
    and n.t ~ ('\m' || regexp_replace(w.word, '(.)', '\1+', 'g') || '(s|es|ed|er|ers|ing|y|ty)?\M')
  limit 1;
$$;

revoke all on function public.moderation_match(text, text) from public, anon, authenticated;

-- For the app: is this text OK to use (for example as a username)?
create or replace function public.text_allowed(p_text text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.moderation_match(p_text, 'block') is null;
$$;

revoke all on function public.text_allowed(text) from public;
grant execute on function public.text_allowed(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
alter table public.ratings
  add column if not exists comment_hidden boolean not null default false;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  rating_id   uuid not null references public.ratings (id) on delete cascade,
  -- null for reports the system makes itself (a flagged word)
  reporter_id uuid references auth.users (id) on delete set null,
  reason      text not null check (reason in ('harassing', 'vulgar', 'false', 'private', 'other', 'auto')),
  note        text check (char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'hidden', 'dismissed')),
  reviewed_at timestamptz
);

create unique index if not exists reports_one_per_reporter
  on public.reports (rating_id, reporter_id) where reporter_id is not null;
create unique index if not exists reports_one_automatic
  on public.reports (rating_id) where reporter_id is null;
create index if not exists reports_open_idx on public.reports (status, created_at);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- A hidden comment disappears from the public view. The safety vote still counts.
create or replace view public.public_ratings as
  select
    r.id,
    r.space_id,
    r.rating,
    case when r.comment_hidden then null else r.comment end as comment,
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
-- Enforcement on what people post
-- ---------------------------------------------------------------------------
create or replace function public.moderate_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.comment is not null
     and (tg_op = 'INSERT' or new.comment is distinct from old.comment) then
    if public.moderation_match(new.comment, 'block') is not null then
      raise exception 'Please keep your comment respectful. It contains language we don''t allow here.';
    end if;
    -- An edited comment has not been reviewed yet, so it starts out visible again.
    new.comment_hidden := false;
  end if;
  return new;
end;
$$;

drop trigger if exists moderate_rating on public.ratings;
create trigger moderate_rating
  before insert or update on public.ratings
  for each row execute function public.moderate_rating();

create or replace function public.flag_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.comment is not null
     and (tg_op = 'INSERT' or new.comment is distinct from old.comment)
     and public.moderation_match(new.comment, 'flag') is not null then
    insert into public.reports (rating_id, reason)
    values (new.id, 'auto')
    on conflict (rating_id) where reporter_id is null
    do update set status = 'open', reviewed_at = null, created_at = now();
  end if;
  return null;
end;
$$;

drop trigger if exists flag_rating on public.ratings;
create trigger flag_rating
  after insert or update on public.ratings
  for each row execute function public.flag_rating();

-- Places and usernames: refuse blocked words. Places imported from public map data are not checked.
create or replace function public.moderate_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'community'
     and (public.moderation_match(new.name, 'block') is not null
          or public.moderation_match(new.address, 'block') is not null
          or public.moderation_match(new.notes, 'block') is not null) then
    raise exception 'Please keep it respectful. The name, address or notes contain language we don''t allow here.';
  end if;
  return new;
end;
$$;

drop trigger if exists moderate_location on public.locations;
create trigger moderate_location
  before insert or update on public.locations
  for each row execute function public.moderate_location();

create or replace function public.moderate_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.moderation_match(new.username, 'block') is not null then
    raise exception 'That username isn''t allowed. Please choose another.';
  end if;
  return new;
end;
$$;

drop trigger if exists moderate_profile on public.profiles;
create trigger moderate_profile
  before insert or update of username on public.profiles
  for each row execute function public.moderate_profile();

-- Anything already posted that matches either list goes to your review queue.
insert into public.reports (rating_id, reason)
select r.id, 'auto'
from public.ratings r
where r.comment is not null
  and (public.moderation_match(r.comment, 'block') is not null
       or public.moderation_match(r.comment, 'flag') is not null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Report button
-- ---------------------------------------------------------------------------
create or replace function public.report_comment(p_rating_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_owner uuid;
begin
  if uid is null then
    raise exception 'Please sign in to report a comment.';
  end if;
  if p_reason is null or p_reason not in ('harassing', 'vulgar', 'false', 'private', 'other') then
    raise exception 'Please choose a reason.';
  end if;

  select r.user_id into v_owner from public.ratings r where r.id = p_rating_id and r.comment is not null;
  if not found then
    raise exception 'That comment is no longer there.';
  end if;
  if v_owner = uid then
    raise exception 'You can''t report your own comment. You can edit it by rating the place again.';
  end if;

  if (select count(*) from public.reports x
       where x.reporter_id = uid and x.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'You''ve sent a lot of reports today. Please try again tomorrow.';
  end if;

  insert into public.reports (rating_id, reporter_id, reason, note)
  values (p_rating_id, uid, p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  on conflict do nothing;
end;
$$;

revoke all on function public.report_comment(uuid, text, text) from public, anon;
grant execute on function public.report_comment(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: the review queue
-- ---------------------------------------------------------------------------
create or replace function public.admin_reports()
returns table (
  rating_id      uuid,
  place          text,
  author         text,
  rating         text,
  comment        text,
  hidden         boolean,
  reasons        text[],
  report_count   integer,
  auto_flagged   boolean,
  first_reported timestamptz,
  notes          text[]
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select
    g.id,
    l.name::text,
    coalesce(p.username, 'Former member')::text,
    g.rating::text,
    g.comment::text,
    g.comment_hidden,
    array_agg(distinct r.reason::text),
    count(*)::integer,
    bool_or(r.reporter_id is null),
    min(r.created_at),
    coalesce(array_agg(r.note::text) filter (where r.note is not null), '{}'::text[])
  from public.reports r
  join public.ratings g on g.id = r.rating_id
  join public.locations l on l.id = g.space_id
  left join public.profiles p on p.user_id = g.user_id
  where r.status = 'open'
  group by g.id, l.name, p.username, g.rating, g.comment, g.comment_hidden
  order by min(r.created_at);
end;
$$;

-- p_action: 'hide' hides the comment and closes its reports; 'dismiss' keeps it and closes them;
-- 'restore' shows a hidden comment again.
create or replace function public.admin_resolve_report(p_rating_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  if p_action = 'hide' then
    update public.ratings set comment_hidden = true where id = p_rating_id;
    update public.reports set status = 'hidden', reviewed_at = now()
     where rating_id = p_rating_id and status = 'open';
  elsif p_action = 'dismiss' then
    update public.reports set status = 'dismissed', reviewed_at = now()
     where rating_id = p_rating_id and status = 'open';
  elsif p_action = 'restore' then
    update public.ratings set comment_hidden = false where id = p_rating_id;
  else
    raise exception 'Unknown action';
  end if;
end;
$$;

revoke all on function public.admin_reports()                     from public, anon;
revoke all on function public.admin_resolve_report(uuid, text)    from public, anon;
grant execute on function public.admin_reports()                  to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
