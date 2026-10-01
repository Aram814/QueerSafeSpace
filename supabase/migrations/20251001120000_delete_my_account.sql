-- In-app account deletion (required by the App Store and Google Play).
-- Callable only by a signed-in user, and only ever deletes the caller.
--
-- What happens to their data:
--   * auth user and profile (username, avatar)  -> deleted (profiles cascades)
--   * ratings                                   -> kept, but unlinked (ratings.user_id is ON DELETE SET NULL)
--   * spaces they added                         -> kept, but unlinked (locations.user_id set to null here)
-- Ratings and spaces are community content and were already anonymous to every other user.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- user_permissions references auth.users without a delete rule, so it must go first.
  delete from public.user_permissions where user_id = uid;
  update public.locations set user_id = null where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
