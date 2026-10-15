-- Narrow the existing server policy without changing manager/self-read rules.
-- Fail closed on source drift; this must run before membership-based finance RPCs.
DO $migration$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'uyelikler'
    AND policyname = 'service_role_full_access';
  IF NOT FOUND OR p.cmd IS DISTINCT FROM 'ALL' OR p.qual IS DISTINCT FROM 'true'
     OR p.with_check IS DISTINCT FROM 'true'
     OR p.roles NOT IN (ARRAY['public']::name[], ARRAY['service_role']::name[]) THEN
    RAISE EXCEPTION 'Membership service policy missing or changed; review before applying';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'uyelikler' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'Membership RLS must be enabled';
  END IF;
  ALTER POLICY service_role_full_access ON public.uyelikler TO service_role;
END;
$migration$;

REVOKE ALL PRIVILEGES ON TABLE public.uyelikler FROM PUBLIC, anon;
-- TRUNCATE bypasses RLS; browser clients need only ordinary row operations.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.uyelikler FROM authenticated;
