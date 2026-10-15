-- Read-only metadata checks; no customer rows or token values are returned.
SELECT c.relrowsecurity AS membership_rls_enabled,
  p.roles AS service_policy_roles, p.cmd, p.qual, p.with_check
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_policies p ON p.schemaname=n.nspname
  AND p.tablename=c.relname AND p.policyname='service_role_full_access'
WHERE n.nspname='public' AND c.relname='uyelikler';

SELECT role_name,
  has_table_privilege(role_name,'public.uyelikler','SELECT') AS can_select,
  has_table_privilege(role_name,'public.uyelikler','INSERT') AS can_insert,
  has_table_privilege(role_name,'public.uyelikler','TRUNCATE') AS can_truncate
FROM (VALUES ('anon'),('authenticated'),('service_role')) AS roles(role_name);

-- Inventory, not a blanket vulnerability verdict: public reference data may be intentional.
SELECT tablename,policyname,roles,cmd,qual,with_check
FROM pg_catalog.pg_policies
WHERE schemaname='public' AND (qual='true' OR with_check='true')
ORDER BY tablename,policyname;
