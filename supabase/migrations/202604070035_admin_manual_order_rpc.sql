-- Admin-only RPC to create manual orders, bypassing client-side INSERT RLS edge cases safely.

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
      and u.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.app_is_admin() to authenticated;

create or replace function public.app_admin_create_manual_order(
  p_client_id bigint,
  p_notes text,
  p_special_delivery_id bigint,
  p_items jsonb
)
returns table (order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
  v_total numeric(12,2) := 0;
  v_items_count integer := 0;
begin
  if not public.app_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_client_id is null then
    raise exception 'client_id required' using errcode = '22023';
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
    raise exception 'manual order requires at least one valid item' using errcode = '22023';
  end if;

  insert into public.orders (
    client_id,
    status,
    total_amount,
    notes,
    created_by,
    is_manual,
    special_delivery_id
  )
  values (
    p_client_id,
    'pending',
    v_total,
    nullif(trim(coalesce(p_notes, '')), ''),
    public.app_current_user_id(),
    true,
    p_special_delivery_id
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

  return query select v_order_id;
end;
$$;

grant execute on function public.app_admin_create_manual_order(bigint, text, bigint, jsonb) to authenticated;
