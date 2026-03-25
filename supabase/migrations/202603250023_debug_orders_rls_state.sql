-- Debug helper: expose effective RLS state and policies for public.orders.

create or replace function public.app_debug_orders_rls_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rowsecurity_enabled', c.relrowsecurity,
    'rowsecurity_forced', c.relforcerowsecurity,
    'policies', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', p.policyname,
          'command', p.cmd,
          'permissive', p.permissive,
          'roles', p.roles,
          'using', p.qual,
          'with_check', p.with_check
        ) order by p.policyname
      )
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = 'orders'
    ), '[]'::jsonb)
  )
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'orders';
$$;

grant execute on function public.app_debug_orders_rls_state() to authenticated;
