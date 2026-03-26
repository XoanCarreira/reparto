-- Soft deactivation support for users (especially clients).

alter table public.users
add column if not exists is_active boolean not null default true;

update public.users
set is_active = true
where is_active is null;

drop view if exists public.clients_v;

create view public.clients_v
with (security_invoker = true) as
select
  u.id,
  u.email,
  u.name,
  u.role,
  u.zone_id as zone,
  u.phone,
  u.address,
  u.gps_lat as "gpsLat",
  u.gps_lng as "gpsLng",
  u.is_active as "isActive",
  u.created_at
from public.users u
where u.role = 'client';

create or replace function public.app_auth_login(p_email text, p_password text)
returns table (
  id bigint,
  email text,
  name text,
  role public.user_role,
  zone_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_attempt public.auth_login_attempts%rowtype;
begin
  select a.*
  into v_attempt
  from public.auth_login_attempts as a
  where a.email = v_email;

  if found and v_attempt.locked_until is not null and v_attempt.locked_until > now() then
    return;
  end if;

  return query
  select u.id, u.email, u.name, u.role, u.zone_id
  from public.users as u
  where lower(trim(u.email)) = v_email
    and coalesce(u.is_active, true) = true
    and u.password_hash is not null
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;

  if found then
    delete from public.auth_login_attempts as a
    where a.email = v_email;
    return;
  end if;

  insert into public.auth_login_attempts
    (email, failed_count, last_failed_at, locked_until, updated_at)
  values
    (v_email, 1, now(), null, now())
  on conflict on constraint auth_login_attempts_pkey
  do update set
    failed_count = public.auth_login_attempts.failed_count + 1,
    last_failed_at = now(),
    locked_until = case
      when public.auth_login_attempts.failed_count + 1 >= 5 then now() + interval '15 minutes'
      else null
    end,
    updated_at = now();

  return;
end;
$$;

grant execute on function public.app_auth_login(text, text) to anon, authenticated;

create or replace function public.app_profile_by_auth_user(p_auth_user_id uuid)
returns table (
  id bigint,
  email text,
  name text,
  role public.user_role,
  zone_id bigint
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email, u.name, u.role, u.zone_id
  from public.users u
  where u.auth_user_id = p_auth_user_id
    and coalesce(u.is_active, true) = true
  limit 1;
$$;

grant execute on function public.app_profile_by_auth_user(uuid) to authenticated, anon;
