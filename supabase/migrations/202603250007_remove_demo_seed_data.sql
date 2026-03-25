-- Remove demo seed data created during bootstrap.

-- Child rows first
delete from public.order_items where order_id in (1001, 1002, 1003);
delete from public.incidents where id in (301, 302);
delete from public.delivery_history where id in (501);

-- Parent rows
delete from public.orders where id in (1001, 1002, 1003);
delete from public.delivery_staff_profiles where user_id in (201, 202, 203, 204, 205, 206);
delete from public.users where id in (1, 101, 102, 103, 201, 202, 203, 204, 205, 206);
delete from public.products where id in (1, 2, 3, 4, 5, 6);
delete from public.zones where id in (1, 2, 3);
