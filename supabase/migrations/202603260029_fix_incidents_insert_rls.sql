-- Fix incidents insert RLS: clients can create incidents for their own orders.

drop policy if exists incidents_insert_admin_or_delivery on public.incidents;

create policy incidents_insert_by_role
on public.incidents
for insert
to authenticated
with check (
  public.app_is_admin()
  or (
    public.app_current_user_role() = 'client'
    and client_id = public.app_current_user_id()
    and exists (
      select 1
      from public.orders o
      where o.id = incidents.order_id
        and o.client_id = public.app_current_user_id()
    )
  )
  or (
    public.app_current_user_role() = 'delivery'
    and exists (
      select 1
      from public.orders o
      join public.users c on c.id = o.client_id
      where o.id = incidents.order_id
        and c.zone_id = public.app_current_user_zone_id()
        and o.client_id = incidents.client_id
    )
  )
);