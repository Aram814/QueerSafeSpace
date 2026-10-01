-- Show the author's chosen username next to their rating.
--
-- Usernames are chosen by each person and are not tied to their identity (the app tells them
-- not to use their real name). The view still never exposes user_id or email: it only adds the
-- username text, resolved through a join the client cannot perform itself (profiles is
-- owner-only under RLS).

create or replace view public.public_ratings as
  select
    r.id,
    r.space_id,
    r.rating,
    r.comment,
    r.safety_tags,
    r.created_at,
    p.username
  from public.ratings r
  left join public.profiles p on p.user_id = r.user_id;

alter view public.public_ratings set (security_invoker = off);
grant select on public.public_ratings to anon, authenticated;

comment on view public.public_ratings is
  'Public projection of ratings: author shown only by chosen username. Never add user_id or email.';

-- Before this change usernames were never shown, and new profiles defaulted to the part of
-- the email before the @. Replace any such default with a random handle so nobody's email
-- name becomes public by accident. People who already chose their own name are untouched.
update public.profiles p
set username = 'friend-' || substr(md5(random()::text || p.user_id::text), 1, 6)
from auth.users u
where u.id = p.user_id
  and lower(p.username) = lower(split_part(u.email, '@', 1));
