-- Hard reset orders RLS policies after manual orders rollout.
-- Removes any hidden/conflicting legacy policy and recreates the canonical set.

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
