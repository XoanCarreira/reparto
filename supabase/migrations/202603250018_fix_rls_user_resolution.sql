-- Fix user resolution in RLS helpers to avoid false negatives on client inserts.
-- Adds fallback by JWT email when auth_user_id linkage is delayed/missing.

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
     or lower(trim(u.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by (u.auth_user_id = auth.uid()) desc
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

grant execute on function public.app_current_user_id() to authenticated;
grant execute on function public.app_current_user_role() to authenticated;
grant execute on function public.app_current_user_zone_id() to authenticated;
