-- Security candidate: preserve existing admins, stop self-provisioning.
DO $guard$
DECLARE body text;
BEGIN
  SELECT regexp_replace(prosrc,'\s','','g') INTO body FROM pg_catalog.pg_proc
  WHERE oid=to_regprocedure('public.is_platform_admin()');
  IF body IS NULL OR body NOT IN ('SELECTauth.uid()ISNOTNULL;',
    'SELECTlexbase_security.platform_admin_mi();') THEN
    RAISE EXCEPTION 'Platform admin predicate changed; review before applying';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='platform_adminler' AND c.relrowsecurity)
    OR (SELECT count(*) FROM pg_catalog.pg_policies WHERE schemaname='public'
      AND tablename='platform_adminler')<>4
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public'
      AND tablename='platform_adminler' AND policyname NOT IN
      ('platform_adminler_select','platform_adminler_insert','platform_adminler_update','platform_adminler_delete')) THEN
    RAISE EXCEPTION 'Platform admin RLS/policy inventory changed; review before applying';
  END IF;
END;
$guard$;

CREATE SCHEMA IF NOT EXISTS lexbase_security;
REVOKE ALL ON SCHEMA lexbase_security FROM PUBLIC;
REVOKE CREATE ON SCHEMA lexbase_security FROM anon,authenticated,service_role;
GRANT USAGE ON SCHEMA lexbase_security TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION lexbase_security.platform_admin_mi()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.platform_adminler
    WHERE auth_id=auth.uid() AND yetki_seviye IN ('admin','super'));
$function$;
CREATE OR REPLACE FUNCTION lexbase_security.super_admin_mi()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.platform_adminler
    WHERE auth_id=auth.uid() AND yetki_seviye='super');
$function$;
REVOKE ALL ON FUNCTION lexbase_security.platform_admin_mi() FROM PUBLIC;
REVOKE ALL ON FUNCTION lexbase_security.super_admin_mi() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lexbase_security.platform_admin_mi() TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION lexbase_security.super_admin_mi() TO anon,authenticated,service_role;

-- Existing RLS keeps public names; privileged lookups stay in a private schema.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $function$ SELECT lexbase_security.platform_admin_mi(); $function$;
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $function$ SELECT lexbase_security.super_admin_mi(); $function$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.admin_bootstrap(p_auth_id uuid,p_email text,p_ad text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_auth_id IS DISTINCT FROM auth.uid()
    OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrators must be provisioned by an authorized administrator'
      USING ERRCODE='42501';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_bootstrap(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_bootstrap(uuid,text,text) TO authenticated;

DROP POLICY platform_adminler_select ON public.platform_adminler;
DROP POLICY platform_adminler_insert ON public.platform_adminler;
DROP POLICY platform_adminler_update ON public.platform_adminler;
DROP POLICY platform_adminler_delete ON public.platform_adminler;
CREATE POLICY platform_adminler_select ON public.platform_adminler FOR SELECT TO authenticated
  USING(auth_id=auth.uid() OR public.is_platform_admin());
CREATE POLICY platform_adminler_insert ON public.platform_adminler FOR INSERT TO authenticated
  WITH CHECK(public.is_super_admin());
CREATE POLICY platform_adminler_update ON public.platform_adminler FOR UPDATE TO authenticated
  USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY platform_adminler_delete ON public.platform_adminler FOR DELETE TO authenticated
  USING(public.is_super_admin() AND auth_id<>auth.uid());
REVOKE ALL PRIVILEGES ON TABLE public.platform_adminler FROM PUBLIC,anon;
REVOKE TRUNCATE,REFERENCES,TRIGGER ON TABLE public.platform_adminler FROM authenticated;
