-- Harden password handling: keep only hash at rest and remove plaintext fallback.

alter table public.users
alter column password drop not null;

-- Ensure every existing plaintext password is hashed before cleanup.
update public.users
set password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
where password is not null
  and coalesce(password_hash, '') = '';

create or replace function public.users_set_password_hash()
returns trigger
language plpgsql
as $$
begin
  if new.password is not null and length(trim(new.password)) > 0 then
    new.password_hash = extensions.crypt(new.password, extensions.gen_salt('bf'));
    -- Do not keep plaintext password after hashing.
    new.password = null;
  end if;

  return new;
end;
$$;

-- Purge any remaining plaintext passwords at rest.
update public.users
set password = null
where password is not null;

create or replace function public.app_auth_login(p_email text, p_password text)
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
  select
    u.id,
    u.email,
    u.name,
    u.role,
    u.zone_id
  from public.users u
  where lower(trim(u.email)) = lower(trim(p_email))
    and u.password_hash is not null
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;
$$;
