-- Delete accounts that never confirmed their email within 7 days.
--
-- Unconfirmed accounts cannot sign in, so they have no ratings, places or profile worth keeping.
-- Deleting the auth user removes everything attached to it. The person can simply sign up again.
-- A daily job runs this at 09:17 UTC. It needs the pg_cron extension (Supabase: Database >
-- Extensions), which this script turns on if it can.

create or replace function public.delete_unverified_accounts(p_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n integer;
begin
  with gone as (
    delete from auth.users u
    where u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and u.created_at < now() - make_interval(days => greatest(coalesce(p_days, 7), 1))
    returning 1
  )
  select count(*) into n from gone;
  return n;
end;
$$;

-- Only the database itself (the scheduled job, or you in the SQL Editor) may run it.
revoke all on function public.delete_unverified_accounts(integer) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Replace the job if it already exists, so this script is safe to run twice.
    perform cron.unschedule(jobid) from cron.job where jobname = 'delete-unverified-accounts';
    perform cron.schedule(
      'delete-unverified-accounts',
      '17 9 * * *',
      'select public.delete_unverified_accounts(7)'
    );
  else
    raise notice 'pg_cron is not available: turn it on under Database > Extensions, then run this script again.';
  end if;
end;
$$;
