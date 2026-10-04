-- Count new accounts per day in the admin's own time zone instead of UTC, so an account made at
-- 8pm Eastern lands on that day's bar, not the next day's.

drop function if exists public.admin_daily_signups(integer);

create or replace function public.admin_daily_signups(p_days integer default 14, p_tz text default 'UTC')
returns table (day date, accounts integer)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_tz    text := case when exists (select 1 from pg_timezone_names n where n.name = p_tz) then p_tz else 'UTC' end;
  v_today date := (now() at time zone v_tz)::date;
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select d::date,
         (select count(*) from auth.users u where (u.created_at at time zone v_tz)::date = d::date)::integer
  from generate_series(
         (v_today - (greatest(least(coalesce(p_days, 14), 90), 1) - 1))::timestamp,
         v_today::timestamp,
         interval '1 day') as d
  order by 1;
end;
$$;

revoke all on function public.admin_daily_signups(integer, text) from public, anon;
grant execute on function public.admin_daily_signups(integer, text) to authenticated;
