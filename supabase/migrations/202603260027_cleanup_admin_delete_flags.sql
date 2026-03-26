-- Cleanup: remove obsolete soft-delete fields now that admin deletion is hard delete for pending orders.

drop index if exists public.orders_admin_deleted_idx;

alter table public.orders
drop column if exists admin_deleted_at,
drop column if exists admin_deleted;
