-- Friendlier referral codes: QSS-XXXXXX (letters and numbers, no look-alikes like 0/O or 1/I).
--
-- Existing codes are cleared and regenerated the next time a member opens "Your impact".
-- Past referral counts (referral_signups) are kept.

delete from public.referral_codes;

-- Turns whatever someone typed ("qss-ab3 k9m", "AB3K9M", ...) into the stored form.
create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
as $$
  select case
    when length(c) = 9 and left(c, 3) = 'QSS' then substr(c, 4)
    else c
  end
  from (select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) as c) s;
$$;

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
  uid      uuid := auth.uid();
  v_code   text;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if uid is null or not exists (select 1 from public.founding_members f where f.user_id = uid) then
    raise exception 'Not available';
  end if;

  select c.code into v_code from public.referral_codes c where c.user_id = uid;
  if v_code is null then
    loop
      v_code := '';
      for i in 1..6 loop
        v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
      end loop;
      begin
        insert into public.referral_codes (user_id, code) values (uid, v_code);
        exit;
      exception when unique_violation then
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
  where c.code = public.normalize_referral_code(p_code);
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

-- Lets the sign-up form say "that code doesn't exist" before the account is made.
create or replace function public.referral_code_valid(p_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.referral_codes c where c.code = public.normalize_referral_code(p_code)
  );
$$;

revoke all on function public.normalize_referral_code(text) from public, anon, authenticated;
revoke all on function public.my_impact()                   from public, anon;
revoke all on function public.claim_referral(text)          from public, anon;
revoke all on function public.referral_code_valid(text)     from public;
grant execute on function public.my_impact()                to authenticated;
grant execute on function public.claim_referral(text)       to authenticated;
grant execute on function public.referral_code_valid(text)  to anon, authenticated;
