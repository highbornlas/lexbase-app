-- Metadata/counts only. Never return administrator emails, auth IDs or tokens.
SELECT p.proname,p.prosecdef,p.proconfig,
  md5(pg_get_functiondef(p.oid)) AS definition_fingerprint,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('is_platform_admin','is_super_admin','admin_bootstrap');
SELECT policyname,roles,cmd,qual,with_check FROM pg_catalog.pg_policies
WHERE schemaname='public' AND tablename='platform_adminler' ORDER BY policyname;
SELECT yetki_seviye,count(*)::int AS administrator_count
FROM public.platform_adminler GROUP BY yetki_seviye ORDER BY yetki_seviye;
SELECT role_name,
  has_table_privilege(role_name,'public.platform_adminler','SELECT') AS can_select,
  has_table_privilege(role_name,'public.platform_adminler','TRUNCATE') AS can_truncate
FROM (VALUES('anon'),('authenticated'),('service_role')) AS roles(role_name);
