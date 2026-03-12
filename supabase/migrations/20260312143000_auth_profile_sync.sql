create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set auth_user_id = new.id
  where lower(email) = lower(new.email)
    and auth_user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
after insert on auth.users
for each row execute procedure public.sync_user_profile_from_auth();

update public.user_profiles up
set auth_user_id = au.id
from auth.users au
where lower(up.email) = lower(au.email)
  and up.auth_user_id is null;
