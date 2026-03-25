-- Harden delivery staff view permissions and remove sensitive fields.

drop view if exists public.delivery_staff_v;

create or replace view public.delivery_staff_v
with (security_invoker = true) as
select
  u.id,
  u.name,
  u.zone_id as "zoneId",
  u.email,
  u.phone,
  p.vehicle,
  p.status,
  u.created_at
from public.users u
join public.delivery_staff_profiles p on p.user_id = u.id
where u.role = 'delivery';
