-- Fix orders INSERT policy false negatives for authenticated clients.

create or replace function public.app_can_insert_order(p_client_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_is_admin(), false)
      or (p_client_id is not null and p_client_id = public.app_current_user_id());
$$;

grant execute on function public.app_can_insert_order(bigint) to authenticated;

drop policy if exists orders_insert_client_or_admin on public.orders;
create policy orders_insert_client_or_admin
on public.orders
for insert
to authenticated
with check (public.app_can_insert_order(client_id));
