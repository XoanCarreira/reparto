-- Client-safe RPC to create orders without relying on direct INSERT RLS checks.

create or replace function public.app_client_create_order(
  p_notes text,
  p_items jsonb
)
returns table (
  order_id bigint,
  total_amount numeric,
  scheduled_delivery timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_client_id bigint;
  v_client_role public.user_role;
  v_zone_id bigint;
  v_total numeric(12,2) := 0;
  v_items_count integer := 0;
  v_order_id bigint;
  v_scheduled_delivery timestamptz;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Ensure domain user link exists for current auth user.
  update public.users u
  set auth_user_id = auth.uid()
  where u.auth_user_id is null
    and lower(trim(u.email)) = lower(coalesce((select au.email from auth.users au where au.id = auth.uid()), ''));

  select u.id, u.role, u.zone_id
  into v_client_id, v_client_role, v_zone_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and coalesce(u.is_active, true) = true
  limit 1;

  if v_client_id is null then
    raise exception 'client-profile-not-found' using errcode = '42501';
  end if;

  if v_client_role <> 'client' then
    raise exception 'forbidden-role' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a JSON array' using errcode = '22023';
  end if;

  with parsed_items as (
    select
      (item ->> 'productId')::bigint as product_id,
      (item ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as item
  ), valid_items as (
    select pi.product_id, pi.quantity, p.price
    from parsed_items pi
    join public.products p on p.id = pi.product_id
    where pi.quantity > 0
  )
  select coalesce(sum((vi.quantity * vi.price)::numeric), 0), count(*)
  into v_total, v_items_count
  from valid_items vi;

  if v_items_count = 0 then
    raise exception 'client order requires at least one valid item' using errcode = '22023';
  end if;

  select z.next_delivery
  into v_scheduled_delivery
  from public.zones z
  where z.id = v_zone_id
  limit 1;

  insert into public.orders (
    client_id,
    status,
    total_amount,
    notes,
    created_by,
    scheduled_delivery,
    is_manual,
    special_delivery_id
  )
  values (
    v_client_id,
    'pending',
    v_total,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_client_id,
    v_scheduled_delivery,
    false,
    null
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select
    v_order_id,
    pi.product_id,
    pi.quantity,
    p.price
  from (
    select
      (item ->> 'productId')::bigint as product_id,
      (item ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as item
  ) pi
  join public.products p on p.id = pi.product_id
  where pi.quantity > 0;

  return query select v_order_id, v_total, v_scheduled_delivery;
end;
$$;

grant execute on function public.app_client_create_order(text, jsonb) to authenticated;
