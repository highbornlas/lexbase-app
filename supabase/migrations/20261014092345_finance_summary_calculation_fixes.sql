-- Forward-only, guarded patches against the inspected production definitions.
-- Do not deploy separately from the client accounting compatibility review.
DO $migration$
DECLARE
  target_schema name := 'public';
  function_name text;
  definition text;
  patches jsonb;
  patch jsonb;
  occurrences integer;
BEGIN
  FOREACH function_name IN ARRAY ARRAY['finans_dosya_ozet', 'finans_muvekkil_ozet'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = target_schema AND p.proname = function_name
      AND p.prosecdef AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql');
    definition := replace(definition, E'\r\n', E'\n');
    IF position('lexbase-finance-access-guard' IN definition) = 0 THEN
      RAISE EXCEPTION 'Missing bureau guard in %', function_name;
    END IF;
    IF position('lexbase-finance-summary-v1' IN definition) > 0 THEN CONTINUE; END IF;

    IF function_name = 'finans_dosya_ozet' THEN
      patches := jsonb_build_array(
        jsonb_build_array('v_aktarim numeric := 0;', 'v_icra_vekalet numeric := 0; v_aktarim numeric := 0;', 1),
        jsonb_build_array(
          $old$WHEN 'akdi_vekalet' THEN v_akdi_vekalet := v_akdi_vekalet + COALESCE((t->>'tutar')::numeric, 0);$old$,
          $new$WHEN 'akdi_vekalet' THEN v_akdi_vekalet := v_akdi_vekalet + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'icra_vekalet' THEN v_icra_vekalet := v_icra_vekalet + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'borclu_odeme' THEN v_karsi_taraf := v_karsi_taraf + COALESCE((t->>'tutar')::numeric, 0);$new$, 1),
        jsonb_build_array(
          $old$IF v_an_tur IN ('pesin','taksit') THEN$old$,
          $new$IF COALESCE((v_anlasma->>'toplam')::numeric, 0) > 0 THEN
    v_anlasilan_toplam := (v_anlasma->>'toplam')::numeric;
  ELSIF v_an_tur IN ('pesin','taksit') THEN$new$, 1),
        jsonb_build_array(
          $old$IF v_data IS NULL THEN RETURN NULL; END IF;$old$,
          $new$IF v_data IS NULL OR COALESCE(v_data->'_silindi', 'null'::jsonb)
    NOT IN ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb) THEN RETURN NULL; END IF;$new$, 1)
      );
      -- Additional patches are separated to keep literal body anchors readable.
      patches := patches || jsonb_build_array(
        jsonb_build_array(
          '  -- Anlaşma',
          $new$  IF (CASE jsonb_typeof(v_data->'tahsilatlar') WHEN 'array'
    THEN jsonb_array_length(v_data->'tahsilatlar') = 0 ELSE true END) THEN
    v_karsi_taraf := COALESCE((v_data->>'tahsil')::numeric, 0);
    v_akdi_vekalet := COALESCE((v_data->>'tahsilEdildi')::numeric, 0);
  END IF;

  -- Anlaşma$new$, 1),
        jsonb_build_array(
          '  RETURN jsonb_build_object(',
          $new$  IF v_an_tur NOT IN ('pesin','taksit','basari','tahsilat','karma')
    AND COALESCE((v_anlasma->>'toplam')::numeric, 0) <= 0 THEN
    v_anlasilan_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);
  END IF;
  IF v_anlasilan_toplam = 0 THEN
    v_anlasilan_toplam := COALESCE((v_data->>'ucret')::numeric, 0);
  END IF;

  v_anlasilan_toplam := round(v_anlasilan_toplam, 2);
  RETURN jsonb_build_object($new$, 1),
        jsonb_build_array($old$'hakedis', v_hakedis,$old$,
          $new$'hakedis', v_hakedis, 'icraVekalet', v_icra_vekalet,$new$, 1),
        jsonb_build_array('v_hakedis + v_akdi_vekalet',
          'v_hakedis + v_akdi_vekalet + v_icra_vekalet', 2)
      );
    ELSE
      patches := jsonb_build_array(
        jsonb_build_array('v_top_akdi numeric := 0;',
          'v_top_icra numeric := 0; v_ucret_toplam numeric := 0; v_top_akdi numeric := 0;', 1),
        jsonb_build_array('v_th_karsi numeric;', 'v_th_icra numeric; v_th_karsi numeric;', 1),
        jsonb_build_array('v_th_karsi := 0;', 'v_th_icra := 0; v_th_karsi := 0;', 1),
        jsonb_build_array(
          $old$WHEN 'icra_vekalet'  THEN v_th_akdi  := v_th_akdi  + COALESCE((t->>'tutar')::numeric, 0);$old$,
          $new$WHEN 'icra_vekalet'  THEN v_th_icra  := v_th_icra  + COALESCE((t->>'tutar')::numeric, 0);$new$, 1),
        jsonb_build_array(
          'v_dosya_tahsil := v_th_karsi + v_th_akdi + v_th_hak;',
          $new$IF (CASE jsonb_typeof(rec.data->'tahsilatlar') WHEN 'array'
      THEN jsonb_array_length(rec.data->'tahsilatlar') = 0 ELSE true END) THEN
      v_th_karsi := COALESCE((rec.data->>'tahsil')::numeric, 0);
      v_th_akdi := COALESCE((rec.data->>'tahsilEdildi')::numeric, 0);
    END IF;
    v_top_icra := v_top_icra + v_th_icra;
    v_dosya_tahsil := v_th_karsi + v_th_akdi + v_th_hak + v_th_icra;$new$, 1),
        jsonb_build_array(
          $old$WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id$old$,
          $new$WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id
      AND COALESCE(data->'_silindi', 'null'::jsonb) IN ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)$new$, 5),
        jsonb_build_array('v_masraf_bakiye   := v_avans_alinan - v_masraf_toplam;',
          $new$v_ucret_toplam := v_top_akdi + v_dan_gelir + v_arab_gelir + v_iht_gelir;
  v_masraf_bakiye   := v_avans_alinan - v_masraf_toplam;$new$, 1),
        jsonb_build_array($old$'tahsilEdilen', v_tahsil_toplam,$old$,
          $new$'tahsilEdilen', v_ucret_toplam,$new$, 1),
        jsonb_build_array($old$'kalan', v_anlasilan_toplam - v_tahsil_toplam$old$,
          $new$'kalan', v_anlasilan_toplam - v_ucret_toplam$new$, 1),
        jsonb_build_array($old$'hakedis', v_th_hak, 'aktarim'$old$,
          $new$'hakedis', v_th_hak, 'icraVekalet', v_th_icra, 'aktarim'$new$, 1),
        jsonb_build_array($old$'toplam', v_top_karsi + v_top_akdi + v_top_hakedis,$old$,
          $new$'toplam', v_top_karsi + v_top_akdi + v_top_hakedis + v_top_icra,
      'icraVekalet', v_top_icra,$new$, 1),
        jsonb_build_array(
          '  -- Anlaşma yoksa ama ucret field',
          $new$  IF v_an_tur NOT IN ('pesin','taksit','basari','tahsilat','karma')
      AND COALESCE((v_anlasma->>'toplam')::numeric, 0) <= 0 THEN
      v_an_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);
    END IF;
    -- Anlaşma yoksa ama ucret field$new$, 1),
        jsonb_build_array(
          $old$    IF v_an_tur IN ('pesin','taksit') THEN$old$,
          $new$    v_an_toplam := round(v_an_toplam, 2);
    IF v_an_tur IN ('pesin','taksit') THEN$new$, 1),
        jsonb_build_array(
          $old$COALESCE(SUM(COALESCE((data->>'tahsilEdildi')::numeric, 0)), 0)$old$,
          $new$COALESCE(SUM(CASE WHEN (CASE jsonb_typeof(data->'tahsilatlar') WHEN 'array'
        THEN jsonb_array_length(data->'tahsilatlar') > 0 ELSE false END) THEN
      (SELECT COALESCE(SUM(COALESCE((movement->>'tutar')::numeric, 0)), 0)
       FROM jsonb_array_elements(data->'tahsilatlar') movement
       WHERE COALESCE(movement->>'tur', '') IN ('', 'akdi_vekalet', 'hakediş', 'icra_vekalet'))
      ELSE COALESCE((data->>'tahsilEdildi')::numeric, 0) END), 0)$new$, 3),
        jsonb_build_array(
          $old$COALESCE(SUM(COALESCE((data->>'ucret')::numeric, 0)), 0)
  INTO v_dan_gelir, v_dan_anlasilan$old$,
          $new$COALESCE(SUM(COALESCE(NULLIF((data->>'ucret')::numeric, 0), (data->>'aylikUcret')::numeric, 0)), 0)
  INTO v_dan_gelir, v_dan_anlasilan$new$, 1)
      );
    END IF;

    FOR patch IN SELECT value FROM jsonb_array_elements(patches) LOOP
      occurrences := cardinality(string_to_array(definition, patch->>0)) - 1;
      IF occurrences <> (patch->>2)::integer THEN
        RAISE EXCEPTION 'Unexpected source drift in %, anchor %, expected %, found %',
          function_name, patch->>0, patch->>2, occurrences;
      END IF;
      definition := replace(definition, patch->>0, patch->>1);
    END LOOP;
    definition := regexp_replace(definition, E'\nBEGIN\n', E'\nBEGIN\n  -- lexbase-finance-summary-v1\n');
    IF position('lexbase-finance-summary-v1' IN definition) = 0 THEN
      RAISE EXCEPTION 'Unable to mark patched %', function_name;
    END IF;
    EXECUTE definition;
  END LOOP;
END;
$migration$;

-- Access grants are unchanged; keep this block when deploying, not in clones.
REVOKE ALL ON FUNCTION public.finans_dosya_ozet(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finans_muvekkil_ozet(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finans_dosya_ozet(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finans_muvekkil_ozet(uuid,text) TO authenticated, service_role;
