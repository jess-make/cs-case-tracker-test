-- service_role 需有 table-level 權限（Auth Admin API 與 PostgREST 分開）
-- 否則 createAdminClient().from('users') 會出現 permission denied for table users

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
