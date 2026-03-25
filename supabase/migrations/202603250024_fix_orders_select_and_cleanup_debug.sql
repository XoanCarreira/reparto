-- Fix: inserts worked, but return=representation failed due orders SELECT policy.
-- Also remove temporary debug policy/functions used during diagnosis.

drop policy if exists orders_select_accessible on public.orders;
create policy orders_select_accessible
on public.orders
for select
to authenticated
using (
  public.app_is_admin()
  or client_id = public.app_current_user_id()
  or (
    public.app_current_user_role() = 'delivery'
    and exists (
      select 1
      from public.users c
      where c.id = client_id
        and c.role = 'client'
        and c.zone_id = public.app_current_user_zone_id()
    )
  )
);

drop policy if exists orders_insert_debug_allow_all on public.orders;

drop function if exists public.app_request_context();
drop function if exists public.app_debug_orders_rls_state();
