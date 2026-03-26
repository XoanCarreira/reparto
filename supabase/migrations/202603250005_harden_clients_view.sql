-- Harden clients view permissions and remove sensitive fields.

drop view if exists public.clients_v;

create view public.clients_v
with (security_invoker = true) as
select
  u.id,
  u.email,
  u.name,
  u.role,
  u.zone_id as zone,
  u.phone,
  u.address,
  u.gps_lat as "gpsLat",
  u.gps_lng as "gpsLng",
  u.created_at
from public.users u
where u.role = 'client';
