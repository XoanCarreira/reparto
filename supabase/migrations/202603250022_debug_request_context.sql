-- Debug helper: inspect effective DB/JWT context seen by PostgREST requests.

create or replace function public.app_request_context()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'current_user', current_user,
    'current_role', current_role,
    'jwt_role', auth.jwt() ->> 'role',
    'jwt_sub', auth.jwt() ->> 'sub',
    'auth_uid', auth.uid()::text
  );
$$;

grant execute on function public.app_request_context() to anon, authenticated;
