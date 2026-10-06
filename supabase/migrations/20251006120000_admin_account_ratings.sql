-- Admin page: for each account, how many places they have rated and in which states.
-- Only the admin can call it, and it shows counts and states, never comments or exact places.

-- Best guess at the US state in a free-text address: a "PA" or "PA 18301" part, or a part that is
-- the state's full name. The last matching part wins, so "Washington, Pennsylvania" is PA.
create or replace function public.state_from_address(p_address text)
returns text
language sql
immutable
as $$
  with states(code, name) as (values
    ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),
    ('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),
    ('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),
    ('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),
    ('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),
    ('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),
    ('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),
    ('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),
    ('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),
    ('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),
    ('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming')),
  parts as (
    select btrim(regexp_replace(x.part, '\s+\d{5}(-\d{4})?$', '')) as part, x.n
    from regexp_split_to_table(coalesce(p_address, ''), ',') with ordinality as x(part, n)
  )
  select s.code
  from parts p
  join states s on lower(p.part) = lower(s.name) or upper(p.part) = s.code
  order by p.n desc
  limit 1
$$;

create or replace function public.admin_account_ratings()
returns table (
  email        text,
  rating_count integer,
  states       text[]
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not available';
  end if;
  return query
  select
    u.email::text,
    count(r.*)::integer,
    coalesce(
      array_agg(distinct public.state_from_address(l.address))
        filter (where public.state_from_address(l.address) is not null),
      '{}'::text[])
  from public.ratings r
  join auth.users u on u.id = r.user_id
  left join public.locations l on l.id = r.space_id
  group by u.email;
end;
$$;

revoke all on function public.admin_account_ratings() from public, anon;
grant execute on function public.admin_account_ratings() to authenticated;
