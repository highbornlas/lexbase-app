-- Read-only metadata verification for DB-SEC-2026.10.15.1.
-- No emails, authentication IDs, credentials or customer rows are returned.
SELECT check_name, passed
FROM (VALUES
  ('admin migration source matches reviewed file', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version='20261014143113'
      AND md5(statements[1])='bfdb29e1166096252eb9782a97975037')),
  ('membership migration source matches reviewed file', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version='20261014140314'
      AND md5(statements[1])='85d7252a05ee4e8be6c192f5d5a8aaf5')),
  ('three confirmed super administrators preserved',
    (SELECT count(*)=3 AND count(*) FILTER (WHERE yetki_seviye='super')=3
      FROM public.platform_adminler)),
  ('membership service policy is service-role only', EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND tablename='uyelikler'
      AND policyname='service_role_full_access'
      AND roles=ARRAY['service_role']::name[])),
  ('anonymous membership read/write/truncate denied',
    NOT has_table_privilege('anon','public.uyelikler','SELECT')
    AND NOT has_table_privilege('anon','public.uyelikler','INSERT')
    AND NOT has_table_privilege('anon','public.uyelikler','TRUNCATE')),
  ('authenticated membership truncate denied',
    NOT has_table_privilege('authenticated','public.uyelikler','TRUNCATE')),
  ('server membership writes retained',
    has_table_privilege('service_role','public.uyelikler','INSERT')),
  ('anonymous admin registry access denied',
    NOT has_table_privilege('anon','public.platform_adminler','SELECT')),
  ('authenticated admin registry truncate denied',
    NOT has_table_privilege('authenticated','public.platform_adminler','TRUNCATE')),
  ('anonymous bootstrap execution denied',
    NOT has_function_privilege('anon','public.admin_bootstrap(uuid,text,text)','EXECUTE')),
  ('admin predicates are invoker functions',
    (SELECT count(*)=2 AND bool_and(NOT prosecdef) FROM pg_catalog.pg_proc
      WHERE oid IN ('public.is_platform_admin()'::regprocedure,
        'public.is_super_admin()'::regprocedure)))
) AS checks(check_name,passed)
ORDER BY check_name;
