-- Enable RLS on zones table exposed via PostgREST.

alter table public.zones enable row level security;

drop policy if exists zones_select_public on public.zones;

create policy zones_select_public
on public.zones
for select
to anon, authenticated
using (true);
