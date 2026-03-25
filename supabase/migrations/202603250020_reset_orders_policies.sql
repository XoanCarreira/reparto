-- Reset all orders policies to avoid hidden/conflicting RLS rules.

do $$
declare
  pol record;
begin
  for pol in
    select p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'orders'
  loop
    execute format('drop policy if exists %I on public.orders', pol.policyname);
  end loop;
end;
$$;

create policy orders_select_accessible
on public.orders
for select
to authenticated
using (public.app_can_access_order(id));

create policy orders_insert_client_or_admin
on public.orders
for insert
to authenticated
with check (public.app_can_insert_order(client_id));

create policy orders_update_accessible
on public.orders
for update
to authenticated
using (public.app_can_access_order(id))
with check (public.app_can_access_order(id));

create policy orders_delete_admin_only
on public.orders
for delete
to authenticated
using (public.app_is_admin());
