-- Preferential delivery order for both normal routes and special deliveries.

alter table public.orders
add column if not exists delivery_order integer;

create index if not exists orders_delivery_order_idx on public.orders(delivery_order);

-- Backfill existing orders so current routes start with a stable delivery order.
with special_ordered as (
  select
    o.id,
    row_number() over (
      partition by o.special_delivery_id
      order by o.created_at asc, o.id asc
    ) as delivery_order
  from public.orders o
  where o.special_delivery_id is not null
), normal_ordered as (
  select
    o.id,
    row_number() over (
      partition by coalesce(c.zone_id, 0)
      order by o.created_at asc, o.id asc
    ) as delivery_order
  from public.orders o
  join public.users c on c.id = o.client_id
  where o.special_delivery_id is null
)
update public.orders o
set delivery_order = so.delivery_order
from special_ordered so
where o.id = so.id;

with normal_ordered as (
  select
    o.id,
    row_number() over (
      partition by coalesce(c.zone_id, 0)
      order by o.created_at asc, o.id asc
    ) as delivery_order
  from public.orders o
  join public.users c on c.id = o.client_id
  where o.special_delivery_id is null
)
update public.orders o
set delivery_order = no.delivery_order
from normal_ordered no
where o.id = no.id
  and o.special_delivery_id is null;

create or replace function public.app_admin_reorder_delivery_orders(p_order_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_order_ids is null then
    return;
  end if;

  if coalesce(array_length(p_order_ids, 1), 0) = 0 then
    return;
  end if;

  with ordered_ids as (
    select distinct on (order_id)
      order_id,
      ordinality as delivery_order
    from unnest(p_order_ids) with ordinality as t(order_id, ordinality)
    where order_id is not null
    order by order_id, ordinality
  )
  update public.orders o
  set delivery_order = ordered_ids.delivery_order
  from ordered_ids
  where o.id = ordered_ids.order_id;
end;
$$;

grant execute on function public.app_admin_reorder_delivery_orders(bigint[]) to authenticated;