-- Temporary diagnostic policy: allow all inserts to isolate RLS context issues.

create policy orders_insert_debug_allow_all
on public.orders
for insert
to authenticated, anon
with check (true);
