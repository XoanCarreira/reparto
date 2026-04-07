-- Harden auth resolution: remove email fallbacks and rely only on auth_user_id.

-- Backfill any missing auth_user_id links from existing auth users by email.
update public.users u
set auth_user_id = a.id
from auth.users a
where lower(trim(u.email)) = lower(trim(a.email))
  and u.auth_user_id is null;

create or replace function public.app_current_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.app_current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = public.app_current_user_id()
  limit 1;
$$;

create or replace function public.app_current_user_zone_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.zone_id
  from public.users u
  where u.id = public.app_current_user_id()
  limit 1;
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.role = 'admin'
      and u.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.app_current_user_id() to authenticated;
grant execute on function public.app_current_user_role() to authenticated;
grant execute on function public.app_current_user_zone_id() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
