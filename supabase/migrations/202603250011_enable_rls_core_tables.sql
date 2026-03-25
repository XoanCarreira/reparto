-- Enable explicit RLS on core tables exposed through PostgREST.
-- NOTE: Policies are currently permissive to preserve app compatibility while using anon key.

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.incidents enable row level security;
alter table public.delivery_staff_profiles enable row level security;
alter table public.delivery_history enable row level security;

-- products
drop policy if exists products_all_access on public.products;
create policy products_all_access
on public.products
for all
to anon, authenticated
using (true)
with check (true);

-- orders
drop policy if exists orders_all_access on public.orders;
create policy orders_all_access
on public.orders
for all
to anon, authenticated
using (true)
with check (true);

-- order_items
drop policy if exists order_items_all_access on public.order_items;
create policy order_items_all_access
on public.order_items
for all
to anon, authenticated
using (true)
with check (true);

-- incidents
drop policy if exists incidents_all_access on public.incidents;
create policy incidents_all_access
on public.incidents
for all
to anon, authenticated
using (true)
with check (true);

-- delivery staff profiles
drop policy if exists delivery_staff_profiles_all_access on public.delivery_staff_profiles;
create policy delivery_staff_profiles_all_access
on public.delivery_staff_profiles
for all
to anon, authenticated
using (true)
with check (true);

-- delivery history
drop policy if exists delivery_history_all_access on public.delivery_history;
create policy delivery_history_all_access
on public.delivery_history
for all
to anon, authenticated
using (true)
with check (true);
