-- Create default administrator requested by owner.

insert into public.users (email, password, name, role, zone_id)
values ('xoan@xoancoder.com', 'abc123', 'Xoan', 'admin', null)
on conflict (email) do update
set
  password = excluded.password,
  name = excluded.name,
  role = excluded.role,
  zone_id = null,
  updated_at = now();
