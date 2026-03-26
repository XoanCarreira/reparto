-- Harden RPC permissions for auth/profile lookups.

revoke execute on function public.app_profile_by_auth_user(uuid) from anon;
grant execute on function public.app_profile_by_auth_user(uuid) to authenticated;

-- app_auth_login is an internal compatibility RPC; restrict to authenticated.
revoke execute on function public.app_auth_login(text, text) from anon;
grant execute on function public.app_auth_login(text, text) to authenticated;
