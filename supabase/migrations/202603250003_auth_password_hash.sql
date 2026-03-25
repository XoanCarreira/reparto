-- Password hashing and secure auth RPC (incremental migration)
-- Keeps legacy password column during transition while moving login checks to bcrypt hashes.

-- Ensure pgcrypto is available
create extension if not exists pgcrypto;

alter table public.users
add column if not exists password_hash text;

-- Backfill hash from current plaintext passwords (one-time migration).
update public.users
set password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
where password is not null
  and coalesce(password_hash, '') = '';

create or replace function public.users_set_password_hash()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.password is distinct from old.password then
    if new.password is not null and length(trim(new.password)) > 0 then
      new.password_hash = extensions.crypt(new.password, extensions.gen_salt('bf'));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_set_password_hash_trigger on public.users;

create trigger users_set_password_hash_trigger
before insert or update of password on public.users
for each row execute function public.users_set_password_hash();

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
    and (
      (u.password_hash is not null and u.password_hash = extensions.crypt(p_password, u.password_hash))
      or
      (u.password_hash is null and u.password = p_password)
    )
  limit 1;
$$;

grant execute on function public.app_auth_login(text, text) to anon, authenticated;
