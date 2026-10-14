-- Preserve the deployed calculation bodies while restricting their entry points.
DO $migration$
DECLARE
  fn record;
  definition text;
  changed integer := 0;
  guard text := $guard$
  -- lexbase-finance-access-guard
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role'
     AND (
       auth.uid() IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.uyelikler membership
         WHERE membership.auth_id = auth.uid()
           AND membership.buro_id = p_buro_id
           AND membership.durum = 'aktif'
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Bu buronun finans verilerine erisim yetkiniz yok';
  END IF;
$guard$;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, p.prosrc, p.proargnames, l.lanname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'finans_muvekkil_ozet', 'finans_buro_kar_zarar',
        'finans_dosya_karlilik', 'finans_beklenen_gelir',
        'finans_uyarilar', 'finans_dosya_ozet'
      )
  LOOP
    IF fn.lanname <> 'plpgsql' OR fn.proargnames[1] <> 'p_buro_id' THEN
      RAISE EXCEPTION 'Unexpected finance function signature: %', fn.proname;
    END IF;
    IF position('-- lexbase-finance-access-guard' in fn.prosrc) = 0 THEN
      definition := pg_get_functiondef(fn.oid);
      IF definition !~* '\mBEGIN\M' THEN
        RAISE EXCEPTION 'Missing finance function entry block: %', fn.proname;
      END IF;
      EXECUTE regexp_replace(definition, '\mBEGIN\M', 'BEGIN' || chr(10) || guard, 'i');
    END IF;
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path TO public, pg_temp', fn.proname, fn.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', fn.proname, fn.args);
    changed := changed + 1;
  END LOOP;
  IF changed <> 6 THEN
    RAISE EXCEPTION 'Expected six finance functions, found %', changed;
  END IF;
END;
$migration$;
