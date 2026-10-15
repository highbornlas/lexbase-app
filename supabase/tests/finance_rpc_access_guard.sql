BEGIN;
DO $tests$
DECLARE
  fn record;
  actor record;
  denied boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  FOR fn IN SELECT * FROM (VALUES
    ('finans_muvekkil_ozet', ', NULL::text'),
    ('finans_buro_kar_zarar', ', NULL::int, NULL::int'),
    ('finans_dosya_karlilik', ', ''{}''::jsonb'),
    ('finans_beklenen_gelir', ''),
    ('finans_uyarilar', ''),
    ('finans_dosya_ozet', ', ''invalid''::text, ''invalid''::text')
  ) AS endpoints(name, suffix)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=fn.name
        AND has_function_privilege('anon',p.oid,'EXECUTE')
    ) THEN
      RAISE EXCEPTION 'Anonymous EXECUTE remains enabled for %', fn.name;
    END IF;
    denied := false;
    BEGIN
      EXECUTE format('SELECT public.%I(''00000000-0000-0000-0000-000000000000''::uuid%s)', fn.name, fn.suffix);
    EXCEPTION WHEN insufficient_privilege THEN
      denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Anonymous body access allowed for %', fn.name; END IF;
  END LOOP;

  SELECT auth_id,buro_id INTO actor FROM public.uyelikler
  WHERE durum='aktif' ORDER BY created_at LIMIT 1;
  IF actor.auth_id IS NULL THEN RAISE EXCEPTION 'No active member available for access checks'; END IF;
  PERFORM set_config('request.jwt.claim.sub', actor.auth_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',actor.auth_id)::text, true);
  -- Check authorization without reading client data.
  PERFORM public.finans_dosya_ozet(actor.buro_id,'invalid','invalid');
  denied := false;
  BEGIN
    PERFORM public.finans_dosya_ozet('00000000-0000-0000-0000-000000000000','invalid','invalid');
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-bureau access allowed'; END IF;
END;
$tests$;
ROLLBACK;
