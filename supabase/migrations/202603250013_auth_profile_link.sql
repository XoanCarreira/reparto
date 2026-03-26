-- Link domain users with Supabase Auth users and expose profile lookup by auth user id.

alter table public.users
add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);

-- Backfill links by email for users that already exist in auth.users.
update public.users u
set auth_user_id = a.id
from auth.users a
where lower(trim(u.email)) = lower(trim(a.email))
  and u.auth_user_id is null;

create or replace function public.link_domain_user_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.users u
  set auth_user_id = new.id
  where lower(trim(u.email)) = lower(trim(new.email))
    and u.auth_user_id is null;

  return new;
end;
$$;

drop trigger if exists auth_users_link_domain_user on auth.users;

create trigger auth_users_link_domain_user
after insert or update of email on auth.users
for each row execute function public.link_domain_user_to_auth_user();

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
  limit 1;
$$;

grant execute on function public.app_profile_by_auth_user(uuid) to authenticated, anon;
