-- Seed data aligned with current mock dataset

-- Zones
insert into public.zones (id, name, description, address, delivery_days, delivery_time, next_delivery)
values
  (1, 'Zona Centro', 'Centro de la ciudad', 'Plaza Mayor, Madrid', array['Lunes','Miércoles','Viernes'], '08:00 - 11:00', now() + interval '2 days'),
  (2, 'Zona Norte', 'Área norte de la ciudad', 'Avenida Reina, Madrid', array['Martes','Jueves'], '09:00 - 12:00', now() + interval '3 days'),
  (3, 'Zona Sur', 'Área sur de la ciudad', 'Avenida del Sur, Madrid', array['Lunes','Miércoles','Viernes'], '10:00 - 13:00', now() + interval '1 day')
on conflict (id) do nothing;

-- Users (admin + clients + delivery)
insert into public.users (id, email, password, name, role, zone_id, phone, address, gps_lat, gps_lng, created_at)
values
  (1, 'admin@empresa.com', 'admin123', 'administrador', 'admin', null, null, null, null, null, '2024-01-01T00:00:00Z'),
  (101, 'cliente1@empresa.com', 'cliente123', 'Cliente 1 Ltda', 'client', 1, '+34 912 345 678', 'Calle Mayor 123, 28001 Madrid', 40.416800, -3.703800, '2024-02-01T00:00:00Z'),
  (102, 'cliente2@empresa.com', 'cliente123', 'Cliente 2 SL', 'client', 2, '+34 913 456 789', 'Avenida Reina 456, 28002 Madrid', 40.456500, -3.667400, '2024-02-15T00:00:00Z'),
  (103, 'cliente3@empresa.com', 'cliente123', 'Cliente 3 SA', 'client', 1, '+34 914 567 890', 'Plaza Mayor 789, 28003 Madrid', 40.415500, -3.707400, '2024-03-01T00:00:00Z'),
  (201, 'repartidor201@empresa.com', 'repartidor201', 'Juan García', 'delivery', 1, '+34 600 111 222', null, null, null, now()),
  (202, 'repartidor202@empresa.com', 'repartidor202', 'María López', 'delivery', 2, '+34 600 222 333', null, null, null, now()),
  (203, 'repartidor203@empresa.com', 'repartidor203', 'Carlos Martínez', 'delivery', 1, '+34 600 333 444', null, null, null, now()),
  (204, 'repartidor204@empresa.com', 'repartidor204', 'Ana Rodríguez', 'delivery', null, '+34 600 444 555', null, null, null, now()),
  (205, 'repartidor205@empresa.com', 'repartidor205', 'David Fernández', 'delivery', null, '+34 600 555 666', null, null, null, now()),
  (206, 'repartidor206@empresa.com', 'repartidor206', 'Elena Gutiérrez', 'delivery', null, '+34 600 666 777', null, null, null, now())
on conflict (id) do nothing;

-- Delivery profiles
insert into public.delivery_staff_profiles (user_id, vehicle, status)
values
  (201, 'Furgoneta Blanca', 'active'),
  (202, 'Furgoneta Verde', 'active'),
  (203, 'Furgoneta Roja', 'active'),
  (204, 'Furgoneta Amarilla', 'active'),
  (205, 'Moto Roja', 'active'),
  (206, 'Bicicleta Eléctrica', 'active')
on conflict (user_id) do nothing;

-- Products
insert into public.products (id, name, category, unit, stock, min_stock, price, description)
values
  (1, 'Pan Integral', 'Pan', 'unidad', 50, 10, 1.50, 'Pan integral de centeno'),
  (2, 'Leche Entera', 'Lácteos', 'litro', 100, 20, 0.99, 'Leche entera fresca'),
  (3, 'Queso Manchego', 'Lácteos', 'kg', 15, 3, 12.50, 'Queso Manchego curado'),
  (4, 'Yogur Natural', 'Lácteos', 'pack x6', 80, 15, 2.99, 'Pack de 6 yogures naturales'),
  (5, 'Verduras Frescas Surtidas', 'Verduras', 'caja', 40, 8, 8.50, 'Caja con variedad de verduras'),
  (6, 'Frutas de Temporada', 'Frutas', 'caja', 30, 5, 7.00, 'Caja con frutas frescas de temporada')
on conflict (id) do nothing;

-- Orders
insert into public.orders (
  id, client_id, status, created_at, scheduled_delivery, delivered_at, total_amount, notes,
  cancel_request_status, cancel_requested_at, cancel_decision_at, cancel_source
)
values
  (1001, 101, 'pending', now() - interval '1 day', now() + interval '2 days', null, 19.95, 'Entrega urgente', null, null, null, null),
  (1002, 102, 'pending', now() - interval '2 days', now() + interval '3 days', null, 33.97, '', null, null, null, null),
  (1003, 101, 'delivered', now() - interval '5 days', now() - interval '3 days', now() - interval '3 days', 24.00, 'Entrega completada', null, null, null, null)
on conflict (id) do nothing;

-- Order items
insert into public.order_items (order_id, product_id, quantity, unit_price)
values
  (1001, 1, 10, 1.50),
  (1001, 2, 5, 0.99),
  (1002, 3, 2, 12.50),
  (1002, 4, 3, 2.99),
  (1003, 5, 2, 8.50),
  (1003, 6, 1, 7.00)
on conflict (order_id, product_id) do nothing;

-- Incidents
insert into public.incidents (id, order_id, client_id, type, status, description, reported_at, resolved_at, priority)
values
  (301, 1001, 101, 'damaged', 'open', 'Producto llegó dañado', now() - interval '1 day', null, 'high'),
  (302, 1002, 102, 'delayed', 'resolved', 'Retraso en la entrega', now() - interval '4 days', now() - interval '3 days', 'medium')
on conflict (id) do nothing;

-- Delivery history
insert into public.delivery_history (id, staff_id, zone_id, date, items_count, distance_km, time_spent)
values
  (501, 201, 1, now() - interval '3 days', 3, 12.50, '2 horas')
on conflict (id) do nothing;

-- Keep identity sequences above seeded IDs
select setval(pg_get_serial_sequence('public.zones', 'id'), greatest((select coalesce(max(id), 1) from public.zones), 1), true);
select setval(pg_get_serial_sequence('public.users', 'id'), greatest((select coalesce(max(id), 1) from public.users), 1), true);
select setval(pg_get_serial_sequence('public.products', 'id'), greatest((select coalesce(max(id), 1) from public.products), 1), true);
select setval(pg_get_serial_sequence('public.orders', 'id'), greatest((select coalesce(max(id), 1) from public.orders), 1), true);
select setval(pg_get_serial_sequence('public.order_items', 'id'), greatest((select coalesce(max(id), 1) from public.order_items), 1), true);
select setval(pg_get_serial_sequence('public.incidents', 'id'), greatest((select coalesce(max(id), 1) from public.incidents), 1), true);
select setval(pg_get_serial_sequence('public.delivery_history', 'id'), greatest((select coalesce(max(id), 1) from public.delivery_history), 1), true);
