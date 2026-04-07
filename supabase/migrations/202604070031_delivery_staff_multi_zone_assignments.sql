-- Allow assigning multiple delivery routes (zones) to the same delivery staff member.

create table if not exists public.delivery_staff_zones (
  staff_id bigint not null references public.users(id) on delete cascade,
  zone_id bigint not null references public.zones(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_id, zone_id)
);

create index if not exists delivery_staff_zones_staff_id_idx
  on public.delivery_staff_zones(staff_id);

create index if not exists delivery_staff_zones_zone_id_idx
  on public.delivery_staff_zones(zone_id);

-- Backfill existing single-zone assignments for delivery users.
insert into public.delivery_staff_zones (staff_id, zone_id)
select u.id, u.zone_id
from public.users u
where u.role = 'delivery'
  and u.zone_id is not null
on conflict (staff_id, zone_id) do nothing;

alter table public.delivery_staff_zones enable row level security;

drop policy if exists delivery_staff_zones_select_admin_or_self on public.delivery_staff_zones;
create policy delivery_staff_zones_select_admin_or_self
on public.delivery_staff_zones
for select
to authenticated
using (public.app_is_admin() or staff_id = public.app_current_user_id());

drop policy if exists delivery_staff_zones_insert_admin_only on public.delivery_staff_zones;
create policy delivery_staff_zones_insert_admin_only
on public.delivery_staff_zones
for insert
to authenticated
with check (public.app_is_admin());

drop policy if exists delivery_staff_zones_update_admin_only on public.delivery_staff_zones;
create policy delivery_staff_zones_update_admin_only
on public.delivery_staff_zones
for update
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

drop policy if exists delivery_staff_zones_delete_admin_only on public.delivery_staff_zones;
create policy delivery_staff_zones_delete_admin_only
on public.delivery_staff_zones
for delete
to authenticated
using (public.app_is_admin());

create or replace function public.app_delivery_has_zone_access(p_zone_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.app_current_user_role() = 'delivery'
    and p_zone_id is not null
    and (
      exists (
        select 1
        from public.delivery_staff_zones dsz
        where dsz.staff_id = public.app_current_user_id()
          and dsz.zone_id = p_zone_id
      )
      or p_zone_id = public.app_current_user_zone_id()
    )
  );
$$;

grant execute on function public.app_delivery_has_zone_access(bigint) to authenticated;

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
          and public.app_delivery_has_zone_access(c.zone_id)
        )
      )
  );
$$;

grant execute on function public.app_can_access_order(bigint) to authenticated;

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
    and public.app_delivery_has_zone_access(zone_id)
  )
);

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
      where c.id = orders.client_id
        and c.role = 'client'
        and public.app_delivery_has_zone_access(c.zone_id)
    )
  )
);

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
        and public.app_delivery_has_zone_access(c.zone_id)
    )
  )
);

drop policy if exists incidents_insert_by_role on public.incidents;
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
        and public.app_delivery_has_zone_access(c.zone_id)
        and o.client_id = incidents.client_id
    )
  )
);

drop view if exists public.delivery_staff_v;

create or replace view public.delivery_staff_v
with (security_invoker = true) as
select
  u.id,
  u.name,
  coalesce(min(dsz.zone_id), u.zone_id) as "zoneId",
  coalesce(
    array_agg(dsz.zone_id order by dsz.zone_id) filter (where dsz.zone_id is not null),
    case when u.zone_id is null then '{}'::bigint[] else array[u.zone_id] end
  ) as "zoneIds",
  u.email,
  u.phone,
  p.vehicle,
  p.status,
  u.created_at
from public.users u
join public.delivery_staff_profiles p on p.user_id = u.id
left join public.delivery_staff_zones dsz on dsz.staff_id = u.id
where u.role = 'delivery'
group by u.id, u.name, u.zone_id, u.email, u.phone, p.vehicle, p.status, u.created_at;
