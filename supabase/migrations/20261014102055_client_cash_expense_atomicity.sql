-- Candidate only: deploy together with the new expense forms, not independently.
-- Invoker privileges preserve the existing table RLS and multi-office access rules.
CREATE OR REPLACE FUNCTION public.finans_kasa_islemi(
  p_buro_id uuid,
  p_islem text,
  p_hareket jsonb,
  p_kaynak text DEFAULT 'kasa',
  p_dosya_tur text DEFAULT NULL,
  p_dosya_id text DEFAULT NULL,
  p_beklenen jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_id text := p_hareket->>'id';
  v_tur text := p_dosya_tur;
  v_dosya_id text := p_dosya_id;
  v_table text;
  v_dosya jsonb;
  v_muv text;
  v_harcamalar jsonb;
  v_eski jsonb;
  v_yeni jsonb;
  v_kasa jsonb;
  v_kasa_yeni jsonb;
  v_count integer;
  v_rows integer;
  v_tutar numeric;
  v_tarih text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.uyelikler u
    WHERE u.auth_id = auth.uid() AND u.buro_id = p_buro_id AND u.durum = 'aktif'
  ) THEN
    RAISE EXCEPTION 'Bu buro icin aktif uyelik gerekli' USING ERRCODE = '42501';
  END IF;
  IF p_islem IS NULL OR p_islem NOT IN ('kaydet', 'sil')
    OR p_kaynak IS NULL OR p_kaynak NOT IN ('kasa', 'dosya')
    OR jsonb_typeof(p_hareket) IS DISTINCT FROM 'object'
    OR coalesce(v_id, '') = '' OR length(v_id) > 200 THEN
    RAISE EXCEPTION 'Gecersiz kasa islemi' USING ERRCODE = '22023';
  END IF;

  -- Serialize retries of the same movement before locking its case/cash rows.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_buro_id::text || ':' || v_id, 0));
  IF p_kaynak = 'kasa' THEN
    v_tur := NULL;
    v_dosya_id := NULL;
    IF p_hareket->>'tip' IS NULL OR p_hareket->>'tip' NOT IN ('alim', 'masraf', 'iade') THEN
      RAISE EXCEPTION 'Gecersiz hareket tipi' USING ERRCODE = '22023';
    END IF;
    v_muv := p_hareket->>'muvId';
    IF p_hareket->>'tip' = 'masraf' THEN
      v_tur := nullif(p_hareket->>'dosyaTur', '');
      v_dosya_id := nullif(p_hareket->>'dosyaId', '');
      IF (v_tur IS NULL) <> (v_dosya_id IS NULL) THEN
        RAISE EXCEPTION 'Eksik dosya baglantisi' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  IF p_kaynak = 'dosya' OR v_dosya_id IS NOT NULL THEN
    v_table := CASE v_tur WHEN 'Dava' THEN 'davalar' WHEN 'İcra' THEN 'icra'
      WHEN 'Arabuluculuk' THEN 'arabuluculuk' WHEN 'İhtarname' THEN 'ihtarnameler' END;
    IF v_table IS NULL OR coalesce(v_dosya_id, '') = '' THEN
      RAISE EXCEPTION 'Desteklenmeyen dosya turu' USING ERRCODE = '22023';
    END IF;
    EXECUTE format('SELECT data FROM public.%I WHERE id = $1 AND buro_id = $2 FOR UPDATE', v_table)
      INTO v_dosya USING v_dosya_id, p_buro_id;
    IF v_dosya IS NULL OR coalesce(v_dosya->>'_silindi', '') <> '' THEN
      RAISE EXCEPTION 'Dosya bulunamadi veya silinmis' USING ERRCODE = 'P0002';
    END IF;
    IF p_kaynak = 'kasa' AND v_muv IS DISTINCT FROM v_dosya->>'muvId' THEN
      RAISE EXCEPTION 'Dosya ve kasa muvekkili uyusmuyor' USING ERRCODE = '22023';
    END IF;
    v_muv := v_dosya->>'muvId';
    v_harcamalar := coalesce(nullif(v_dosya->'harcamalar', 'null'::jsonb), '[]'::jsonb);
    IF jsonb_typeof(v_harcamalar) <> 'array' THEN
      RAISE EXCEPTION 'Dosya masraf verisi gecersiz' USING ERRCODE = '22023';
    END IF;
    SELECT count(*), (jsonb_agg(h))->0 INTO v_count, v_eski
      FROM jsonb_array_elements(v_harcamalar) h WHERE h->>'id' = v_id;
    IF v_count > 1 THEN
      RAISE EXCEPTION 'Tekrarlanan masraf kimligi; uzlastirma gerekli' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF coalesce(v_muv, '') = '' OR NOT EXISTS (
    SELECT 1 FROM public.muvekkillar m WHERE m.id = v_muv AND m.buro_id = p_buro_id
      AND coalesce(m.data->>'_silindi', '') = ''
  ) THEN
    RAISE EXCEPTION 'Muvekkil bulunamadi' USING ERRCODE = 'P0002';
  END IF;
  SELECT data INTO v_kasa FROM public.avans_hareketleri
    WHERE id = v_id AND buro_id = p_buro_id FOR UPDATE;

  IF p_kaynak = 'dosya' THEN
    IF v_eski IS DISTINCT FROM p_beklenen THEN
      RAISE EXCEPTION 'Masraf baska bir oturumda degisti; yenileyin' USING ERRCODE = '40001';
    END IF;
    IF p_islem = 'sil' AND v_eski IS NULL THEN
      RAISE EXCEPTION 'Masraf bulunamadi' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    IF p_islem = 'sil' THEN
      IF v_kasa IS NULL THEN RAISE EXCEPTION 'Kasa hareketi bulunamadi' USING ERRCODE = 'P0002'; END IF;
      IF v_kasa IS DISTINCT FROM (p_beklenen - 'id') THEN
        RAISE EXCEPTION 'Kasa hareketi degisti; yenileyin' USING ERRCODE = '40001';
      END IF;
    ELSIF v_kasa IS NOT NULL THEN
      IF coalesce(v_kasa->>'_silindi', '') = '' AND v_kasa @> ((p_hareket - 'id') - 'dosyaNo')
        AND (v_dosya IS NULL OR (v_eski IS NOT NULL AND coalesce(v_eski->>'masrafSahibi', 'muvekkil') = 'muvekkil'
          AND (v_eski->>'tutar')::numeric = (v_kasa->>'tutar')::numeric
          AND v_eski->>'tarih' = v_kasa->>'tarih')) THEN
        RETURN jsonb_build_object('id', v_id);
      END IF;
      RAISE EXCEPTION 'Kasa kimligi zaten kullaniliyor' USING ERRCODE = '40001';
    END IF;
    IF v_dosya IS NOT NULL AND ((p_islem = 'kaydet' AND v_eski IS NOT NULL)
      OR (p_islem = 'sil' AND v_eski IS NULL)) THEN
      RAISE EXCEPTION 'Dosya-kasa baglantisi tutarsiz; uzlastirma gerekli' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_kasa IS NOT NULL AND v_dosya IS NOT NULL THEN
    IF v_kasa->>'tip' IS DISTINCT FROM 'masraf' OR v_kasa->>'muvId' IS DISTINCT FROM v_muv
      OR v_kasa->>'dosyaId' IS DISTINCT FROM v_dosya_id OR v_kasa->>'dosyaTur' IS DISTINCT FROM v_tur
      OR (coalesce(v_kasa->>'_silindi', '') = '' AND (
        v_eski IS NULL OR v_eski->>'masrafSahibi' = 'buro'
        OR (v_kasa->>'tutar')::numeric IS DISTINCT FROM (v_eski->>'tutar')::numeric
        OR v_kasa->>'tarih' IS DISTINCT FROM v_eski->>'tarih')) THEN
      RAISE EXCEPTION 'Dosya-kasa hareketi uyusmuyor; uzlastirma gerekli' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_islem = 'kaydet' THEN
    IF coalesce(p_hareket->>'tutar', '') !~ '^[0-9]+([.][0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Tutar pozitif ve en fazla iki ondalikli olmali' USING ERRCODE = '22023';
    END IF;
    v_tutar := (p_hareket->>'tutar')::numeric;
    IF v_tutar <= 0 OR v_tutar >= 1000000000000 THEN
      RAISE EXCEPTION 'Tutar gecersiz' USING ERRCODE = '22023';
    END IF;
    v_tarih := p_hareket->>'tarih';
    IF v_tarih IS NULL OR v_tarih !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      OR to_char(v_tarih::date, 'YYYY-MM-DD') <> v_tarih THEN
      RAISE EXCEPTION 'Tarih gecersiz' USING ERRCODE = '22023';
    END IF;
    IF p_kaynak = 'dosya' AND coalesce(p_hareket->>'masrafSahibi', 'muvekkil') NOT IN ('muvekkil', 'buro') THEN
      RAISE EXCEPTION 'Masraf sahibi gecersiz' USING ERRCODE = '22023';
    END IF;
    v_yeni := coalesce(v_eski, '{}'::jsonb) || jsonb_build_object('id', v_id, 'tutar', v_tutar,
      'tarih', v_tarih, 'kat', coalesce(p_hareket->>'kat', p_hareket->>'kategori', ''),
      'acik', coalesce(p_hareket->>'acik', p_hareket->>'aciklama', ''),
      'masrafSahibi', CASE WHEN p_kaynak = 'dosya' THEN coalesce(p_hareket->>'masrafSahibi', 'muvekkil') ELSE 'muvekkil' END);
    IF v_dosya IS NULL THEN
      v_kasa_yeni := p_hareket - 'id';
    ELSE
      v_kasa_yeni := coalesce(v_kasa, CASE WHEN p_kaynak = 'kasa' THEN p_hareket - 'id' ELSE '{}'::jsonb END)
        - '_silindi' || jsonb_build_object('muvId', v_muv, 'dosyaId', v_dosya_id, 'dosyaTur', v_tur,
          'dosyaNo', coalesce(v_dosya->>'no', v_dosya->>'dosyaNo', v_dosya->>'esasNo', ''),
          'tip', 'masraf', 'tutar', v_tutar, 'tarih', v_tarih, 'kategori', v_yeni->>'kat', 'aciklama', v_yeni->>'acik');
    END IF;
  END IF;

  IF v_dosya IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(CASE WHEN h->>'id' = v_id THEN v_yeni ELSE h END ORDER BY ord), '[]'::jsonb)
      INTO v_harcamalar FROM jsonb_array_elements(v_harcamalar) WITH ORDINALITY a(h, ord)
      WHERE p_islem <> 'sil' OR h->>'id' IS DISTINCT FROM v_id;
    IF p_islem = 'kaydet' AND v_eski IS NULL THEN v_harcamalar := v_harcamalar || jsonb_build_array(v_yeni); END IF;
    EXECUTE format('UPDATE public.%I SET data = jsonb_set(data, ''{harcamalar}'', $1) WHERE id = $2 AND buro_id = $3', v_table)
      USING v_harcamalar, v_dosya_id, p_buro_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'Dosya guncellenemedi' USING ERRCODE = '42501'; END IF;
  END IF;

  IF p_islem = 'sil' OR v_yeni->>'masrafSahibi' = 'buro' THEN
    IF v_kasa IS NOT NULL THEN
      UPDATE public.avans_hareketleri SET data = data || jsonb_build_object('_silindi', clock_timestamp()::text)
        WHERE id = v_id AND buro_id = p_buro_id;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows <> 1 THEN RAISE EXCEPTION 'Kasa guncellenemedi' USING ERRCODE = '42501'; END IF;
    END IF;
  ELSE
    INSERT INTO public.avans_hareketleri(id, buro_id, data) VALUES(v_id, p_buro_id, v_kasa_yeni)
      ON CONFLICT (id) DO UPDATE SET data = excluded.data WHERE avans_hareketleri.buro_id = p_buro_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'Kasa kimligi kullanilamiyor' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN jsonb_build_object('id', v_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.finans_kasa_islemi(uuid,text,jsonb,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finans_kasa_islemi(uuid,text,jsonb,text,text,text,jsonb) TO authenticated;

-- General case edits must not restore stale expense arrays after an atomic cash edit.
CREATE OR REPLACE FUNCTION public.finans_dosya_kaydet(
  p_buro_id uuid, p_dosya_tur text, p_id text, p_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_table text;
  v_eski jsonb;
  v_yeni jsonb;
  v_rows integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.uyelikler u
    WHERE u.auth_id = auth.uid() AND u.buro_id = p_buro_id AND u.durum = 'aktif') THEN
    RAISE EXCEPTION 'Aktif buro uyeligi gerekli' USING ERRCODE = '42501';
  END IF;
  v_table := CASE p_dosya_tur WHEN 'Dava' THEN 'davalar' WHEN 'İcra' THEN 'icra'
    WHEN 'Arabuluculuk' THEN 'arabuluculuk' WHEN 'İhtarname' THEN 'ihtarnameler' END;
  IF v_table IS NULL OR coalesce(p_id, '') = '' OR length(p_id) > 200
    OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Gecersiz dosya' USING ERRCODE = '22023';
  END IF;
  EXECUTE format('SELECT data FROM public.%I WHERE id = $1 AND buro_id = $2 FOR UPDATE', v_table)
    INTO v_eski USING p_id, p_buro_id;
  IF v_eski IS NULL THEN
    IF coalesce(nullif(p_data->'harcamalar', 'null'::jsonb), '[]'::jsonb) <> '[]'::jsonb THEN
      RAISE EXCEPTION 'Masraflar guvenli kasa islemi ile eklenmeli' USING ERRCODE = '22023';
    END IF;
    EXECUTE format('INSERT INTO public.%I(id, buro_id, data) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING', v_table)
      USING p_id, p_buro_id, p_data - 'id';
  ELSE
    IF coalesce(nullif(v_eski->'harcamalar', 'null'::jsonb), '[]'::jsonb) <> '[]'::jsonb
      AND (p_data ? 'muvId') AND (p_data->>'muvId' IS DISTINCT FROM v_eski->>'muvId') THEN
      RAISE EXCEPTION 'Masrafli dosyanin muvekkili uzlastirma olmadan degistirilemez' USING ERRCODE = '22023';
    END IF;
    v_yeni := (v_eski || p_data) - 'id' - 'harcamalar';
    IF v_eski ? 'harcamalar' THEN v_yeni := v_yeni || jsonb_build_object('harcamalar',v_eski->'harcamalar'); END IF;
    EXECUTE format('UPDATE public.%I SET data = $1 WHERE id = $2 AND buro_id = $3',v_table)
      USING v_yeni, p_id, p_buro_id;
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Dosya kaydedilemedi' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id',p_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.finans_dosya_kaydet(uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finans_dosya_kaydet(uuid,text,text,jsonb) TO authenticated;
