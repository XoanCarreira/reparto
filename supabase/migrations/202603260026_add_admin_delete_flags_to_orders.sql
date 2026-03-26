-- Support admin soft-delete of orders while preserving traceability for clients.

alter table public.orders
add column if not exists admin_deleted boolean not null default false,
add column if not exists admin_deleted_at timestamptz;

create index if not exists orders_admin_deleted_idx on public.orders(admin_deleted);
