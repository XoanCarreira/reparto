-- Auto-confirm and link auth.users created from known domain users.

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

  -- If this auth account matches a pre-existing domain user, confirm email automatically.
  if exists (
    select 1
    from public.users u
    where lower(trim(u.email)) = lower(trim(new.email))
  ) then
    update auth.users a
    set email_confirmed_at = coalesce(a.email_confirmed_at, now()),
        updated_at = now()
    where a.id = new.id;
  end if;

  return new;
end;
$$;
