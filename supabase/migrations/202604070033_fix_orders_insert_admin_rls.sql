-- Fix false negatives on orders INSERT RLS for admin sessions.

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
      and (
        u.auth_user_id = auth.uid()
        or lower(trim(u.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

grant execute on function public.app_is_admin() to authenticated;

create or replace function public.app_can_insert_order(p_client_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_is_admin()
      or (p_client_id is not null and p_client_id = public.app_current_user_id());
$$;

grant execute on function public.app_can_insert_order(bigint) to authenticated;

drop policy if exists orders_insert_client_or_admin on public.orders;
create policy orders_insert_client_or_admin
on public.orders
for insert
to authenticated
with check (public.app_can_insert_order(client_id));
