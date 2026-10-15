-- Candidate only. No historical rows are rewritten by applying this migration.
-- Preserve the legacy projection until source/cash reconciliation is complete.
DO $migration$
DECLARE
  target_name text;
  old_hash text;
  body text;
  current_body text;
BEGIN
  FOR target_name, old_hash, body IN SELECT * FROM (VALUES
    ('auto_icra_harcama_sync', '0361ca447bdd984099fdf0c6785d2d29', $icra$
DECLARE harc jsonb; harc_item jsonb; muv_id text; dosya_no text;
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(OLD.data->'harcamalar', OLD.data->>'muvId', OLD.data->>'no')
    IS NOT DISTINCT FROM ROW(NEW.data->'harcamalar', NEW.data->>'muvId', NEW.data->>'no') THEN
    RETURN NEW;
  END IF;
  muv_id := nullif(NEW.data->>'muvId', '');
  dosya_no := COALESCE(NEW.data->>'no', '');
  DELETE FROM public.avanslar WHERE buro_id = NEW.buro_id
    AND data->>'_icraId' = NEW.id AND data->>'_otoHarcama' = 'true';
  IF muv_id IS NULL THEN RETURN NEW; END IF;
  harc := COALESCE(nullif(NEW.data->'harcamalar', 'null'::jsonb), '[]'::jsonb);
  FOR harc_item IN SELECT * FROM jsonb_array_elements(harc) LOOP
    -- Only client-owned costs belong in the legacy client expense projection.
    IF (harc_item->>'tutar')::numeric > 0
      AND coalesce(harc_item->>'masrafSahibi', 'muvekkil') = 'muvekkil' THEN
      INSERT INTO public.avanslar (id, buro_id, data) VALUES (
        gen_random_uuid()::text, NEW.buro_id,
        jsonb_build_object('muvId', muv_id, 'tur', 'Masraf', 'tutar', (harc_item->>'tutar')::numeric,
          'acik', dosya_no || ' İcra — ' || COALESCE(harc_item->>'kat', 'Harcama'),
          'tarih', COALESCE(harc_item->>'tarih', to_char(now(), 'YYYY-MM-DD')),
          'durum', 'Bekliyor', 'odeme', '', '_icraId', NEW.id, '_otoHarcama', true));
    END IF;
  END LOOP;
  RETURN NEW;
END;
$icra$),
    ('auto_ihtar_masraf', '40136f53abe8c83241f831525cddd2f4', $ihtar$
DECLARE
  masraf_tutar numeric; masraf_yansit boolean; muv_id text;
  ihtar_no text; ihtar_tur text; ihtar_tarih text;
BEGIN
  -- Unrelated saves must not replace the ID/status of a settled projection.
  IF TG_OP = 'UPDATE' AND ROW(OLD.data->'masrafTutar', OLD.data->'masrafYansit',
    OLD.data->'muvId', OLD.data->'no', OLD.data->'tur', OLD.data->'tarih')
    IS NOT DISTINCT FROM ROW(NEW.data->'masrafTutar', NEW.data->'masrafYansit',
    NEW.data->'muvId', NEW.data->'no', NEW.data->'tur', NEW.data->'tarih') THEN
    RETURN NEW;
  END IF;
  masraf_tutar := COALESCE((NEW.data->>'masrafTutar')::numeric, 0);
  masraf_yansit := COALESCE((NEW.data->>'masrafYansit')::boolean, true);
  muv_id := nullif(NEW.data->>'muvId', '');
  ihtar_no := COALESCE(NEW.data->>'no', '');
  ihtar_tur := COALESCE(NEW.data->>'tur', 'İhtarname');
  ihtar_tarih := COALESCE(NEW.data->>'tarih', to_char(now(), 'YYYY-MM-DD'));
  -- Match the legacy link/type convention; never touch unlinked/manual advances.
  DELETE FROM public.avanslar WHERE buro_id = NEW.buro_id
    AND data->>'_ihtarId' = NEW.id AND data->>'tur' = 'Masraf';
  IF masraf_tutar > 0 AND masraf_yansit AND muv_id IS NOT NULL THEN
    INSERT INTO public.avanslar (id, buro_id, data) VALUES (
      gen_random_uuid()::text, NEW.buro_id,
      jsonb_build_object('muvId', muv_id, 'tur', 'Masraf', 'tutar', masraf_tutar,
        'acik', ihtar_no || ' numaralı ' || ihtar_tur || ' masrafı',
        'tarih', ihtar_tarih, 'durum', 'Bekliyor', 'odeme', '', '_ihtarId', NEW.id));
  END IF;
  RETURN NEW;
END;
$ihtar$)
  ) AS candidates(name, hash, source) LOOP
    SELECT p.prosrc INTO current_body FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=target_name AND p.pronargs=0;
    IF current_body IS NULL OR md5(current_body) NOT IN (old_hash, md5(body)) THEN
      RAISE EXCEPTION 'Unreviewed legacy expense trigger: %', target_name;
    END IF;
    EXECUTE format('CREATE OR REPLACE FUNCTION public.%I() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = %L AS %L',
      target_name, '', body);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', target_name);
  END LOOP;
END;
$migration$;
