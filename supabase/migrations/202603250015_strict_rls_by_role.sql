-- Strict RLS by role using Supabase Auth identity mapped in public.users.auth_user_id.

create or replace function public.app_current_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.app_current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.app_current_user_zone_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.zone_id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_current_user_role() = 'admin', false);
$$;

create or replace function public.app_can_access_order(p_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    left join public.users c on c.id = o.client_id
    where o.id = p_order_id
      and (
        public.app_is_admin()
        or o.client_id = public.app_current_user_id()
        or (
          public.app_current_user_role() = 'delivery'
          and c.role = 'client'
          and c.zone_id = public.app_current_user_zone_id()
        )
      )
  );
$$;

grant execute on function public.app_current_user_id() to authenticated;
grant execute on function public.app_current_user_role() to authenticated;
grant execute on function public.app_current_user_zone_id() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_can_access_order(bigint) to authenticated;

-- Lock profile RPC to authenticated only.
revoke execute on function public.app_profile_by_auth_user(uuid) from anon;
grant execute on function public.app_profile_by_auth_user(uuid) to authenticated;

-- users
alter table public.users enable row level security;

drop policy if exists users_select_self_or_admin_or_delivery_clients on public.users;
create policy users_select_self_or_admin_or_delivery_clients
on public.users
for select
to authenticated
using (
  public.app_is_admin()
  or id = public.app_current_user_id()
  or (
    public.app_current_user_role() = 'delivery'
    and role = 'client'
    and zone_id = public.app_current_user_zone_id()
  )
);

drop policy if exists users_insert_admin_only on public.users;
create policy users_insert_admin_only
on public.users
for insert
to authenticated
with check (public.app_is_admin());

drop policy if exists users_update_admin_only on public.users;
create policy users_update_admin_only
on public.users
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists users_delete_admin_only on public.users;
create policy users_delete_admin_only
on public.users
for delete
to authenticated
using (public.app_is_admin());

-- products
alter table public.products enable row level security;

drop policy if exists products_all_access on public.products;
drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated
on public.products
for select
to authenticated
using (true);

drop policy if exists products_insert_admin_only on public.products;
create policy products_insert_admin_only
on public.products
for insert
to authenticated
with check (public.app_is_admin());

drop policy if exists products_update_admin_only on public.products;
create policy products_update_admin_only
on public.products
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists products_delete_admin_only on public.products;
create policy products_delete_admin_only
on public.products
for delete
to authenticated
using (public.app_is_admin());

-- zones
alter table public.zones enable row level security;

drop policy if exists zones_select_public on public.zones;
drop policy if exists zones_select_authenticated on public.zones;
create policy zones_select_authenticated
on public.zones
for select
to authenticated
using (true);

drop policy if exists zones_insert_admin_only on public.zones;
create policy zones_insert_admin_only
on public.zones
for insert
to authenticated
with check (public.app_is_admin());

drop policy if exists zones_update_admin_only on public.zones;
create policy zones_update_admin_only
on public.zones
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists zones_delete_admin_only on public.zones;
create policy zones_delete_admin_only
on public.zones
for delete
to authenticated
using (public.app_is_admin());

-- orders
alter table public.orders enable row level security;

drop policy if exists orders_all_access on public.orders;
drop policy if exists orders_select_accessible on public.orders;
create policy orders_select_accessible
on public.orders
for select
to authenticated
using (public.app_can_access_order(id));

drop policy if exists orders_insert_client_or_admin on public.orders;
create policy orders_insert_client_or_admin
on public.orders
for insert
to authenticated
with check (
  public.app_is_admin()
  or (
    public.app_current_user_role() = 'client'
    and client_id = public.app_current_user_id()
  )
);

drop policy if exists orders_update_accessible on public.orders;
create policy orders_update_accessible
on public.orders
for update
to authenticated
using (public.app_can_access_order(id))
with check (public.app_can_access_order(id));

drop policy if exists orders_delete_admin_only on public.orders;
create policy orders_delete_admin_only
on public.orders
for delete
to authenticated
using (public.app_is_admin());

-- order_items
alter table public.order_items enable row level security;

drop policy if exists order_items_all_access on public.order_items;
drop policy if exists order_items_select_accessible on public.order_items;
create policy order_items_select_accessible
on public.order_items
for select
to authenticated
using (public.app_can_access_order(order_id));

drop policy if exists order_items_insert_accessible on public.order_items;
create policy order_items_insert_accessible
on public.order_items
for insert
to authenticated
with check (public.app_can_access_order(order_id));

drop policy if exists order_items_update_admin_only on public.order_items;
create policy order_items_update_admin_only
on public.order_items
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists order_items_delete_admin_only on public.order_items;
create policy order_items_delete_admin_only
on public.order_items
for delete
to authenticated
using (public.app_is_admin());

-- incidents
alter table public.incidents enable row level security;

drop policy if exists incidents_all_access on public.incidents;
drop policy if exists incidents_select_accessible on public.incidents;
create policy incidents_select_accessible
on public.incidents
for select
to authenticated
using (
  public.app_is_admin()
  or client_id = public.app_current_user_id()
  or (
    public.app_current_user_role() = 'delivery'
    and exists (
      select 1
      from public.orders o
      join public.users c on c.id = o.client_id
      where o.id = incidents.order_id
        and c.zone_id = public.app_current_user_zone_id()
    )
  )
);

drop policy if exists incidents_insert_admin_or_delivery on public.incidents;
create policy incidents_insert_admin_or_delivery
on public.incidents
for insert
to authenticated
with check (
  public.app_is_admin()
  or public.app_current_user_role() = 'delivery'
);

drop policy if exists incidents_update_admin_only on public.incidents;
create policy incidents_update_admin_only
on public.incidents
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists incidents_delete_admin_only on public.incidents;
create policy incidents_delete_admin_only
on public.incidents
for delete
to authenticated
using (public.app_is_admin());

-- delivery_staff_profiles
alter table public.delivery_staff_profiles enable row level security;

drop policy if exists delivery_staff_profiles_all_access on public.delivery_staff_profiles;
drop policy if exists delivery_staff_profiles_select_admin_or_self on public.delivery_staff_profiles;
create policy delivery_staff_profiles_select_admin_or_self
on public.delivery_staff_profiles
for select
to authenticated
using (public.app_is_admin() or user_id = public.app_current_user_id());

drop policy if exists delivery_staff_profiles_insert_admin_only on public.delivery_staff_profiles;
create policy delivery_staff_profiles_insert_admin_only
on public.delivery_staff_profiles
for insert
to authenticated
with check (public.app_is_admin());

drop policy if exists delivery_staff_profiles_update_admin_only on public.delivery_staff_profiles;
create policy delivery_staff_profiles_update_admin_only
on public.delivery_staff_profiles
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists delivery_staff_profiles_delete_admin_only on public.delivery_staff_profiles;
create policy delivery_staff_profiles_delete_admin_only
on public.delivery_staff_profiles
for delete
to authenticated
using (public.app_is_admin());

-- delivery_history
alter table public.delivery_history enable row level security;

drop policy if exists delivery_history_all_access on public.delivery_history;
drop policy if exists delivery_history_select_admin_or_self on public.delivery_history;
create policy delivery_history_select_admin_or_self
on public.delivery_history
for select
to authenticated
using (public.app_is_admin() or staff_id = public.app_current_user_id());

drop policy if exists delivery_history_insert_admin_or_self on public.delivery_history;
create policy delivery_history_insert_admin_or_self
on public.delivery_history
for insert
to authenticated
with check (public.app_is_admin() or staff_id = public.app_current_user_id());

drop policy if exists delivery_history_update_admin_only on public.delivery_history;
create policy delivery_history_update_admin_only
on public.delivery_history
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists delivery_history_delete_admin_only on public.delivery_history;
create policy delivery_history_delete_admin_only
on public.delivery_history
for delete
to authenticated
using (public.app_is_admin());
