-- Confirm existing auth users linked to domain users to allow password login in current setup.

update auth.users a
set
  email_confirmed_at = coalesce(a.email_confirmed_at, now()),
  updated_at = now()
where exists (
  select 1
  from public.users u
  where lower(trim(u.email)) = lower(trim(a.email))
)
  and a.email_confirmed_at is null;
