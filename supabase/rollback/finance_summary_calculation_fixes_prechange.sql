-- Guarded pre-calculation-change snapshot, captured 2026-10-14.
-- Restore only after checking for subsequent changes. Restores functions only,
-- not historical data, and retains the established bureau access guards.
BEGIN;

-- finans_dosya_ozet fingerprint b3166e9e6f9f5ef8567639a659bb035b
CREATE OR REPLACE FUNCTION public.finans_dosya_ozet(p_buro_id uuid, p_dosya_tur text, p_dosya_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tablo text;
  v_data jsonb;
  v_masraf numeric := 0;
  v_karsi_taraf numeric := 0;
  v_akdi_vekalet numeric := 0;
  v_hakedis numeric := 0;
  v_aktarim numeric := 0;
  v_iade numeric := 0;
  v_hareket_sayisi int := 0;
  v_anlasma jsonb;
  v_anlasilan_toplam numeric := 0;
  v_an_tur text;
  v_baz numeric;
  h jsonb;
  t jsonb;
BEGIN

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

  v_tablo := CASE p_dosya_tur
    WHEN 'dava' THEN 'davalar'
    WHEN 'icra'  THEN 'icra'
    ELSE NULL
  END;
  IF v_tablo IS NULL THEN RETURN NULL; END IF;

  EXECUTE format('SELECT data FROM %I WHERE buro_id = $1 AND id = $2', v_tablo)
    INTO v_data USING p_buro_id, p_dosya_id;
  IF v_data IS NULL THEN RETURN NULL; END IF;

  -- Masraflar
  IF v_data->'harcamalar' IS NOT NULL THEN
    FOR h IN SELECT * FROM jsonb_array_elements(v_data->'harcamalar')
    LOOP
      v_masraf := v_masraf + COALESCE((h->>'tutar')::numeric, 0);
    END LOOP;
  END IF;

  -- Tahsilatlar
  IF v_data->'tahsilatlar' IS NOT NULL THEN
    FOR t IN SELECT * FROM jsonb_array_elements(v_data->'tahsilatlar')
    LOOP
      v_hareket_sayisi := v_hareket_sayisi + 1;
      CASE t->>'tur'
        WHEN 'tahsilat'     THEN v_karsi_taraf  := v_karsi_taraf  + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'akdi_vekalet' THEN v_akdi_vekalet := v_akdi_vekalet + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'hakediş'      THEN v_hakedis      := v_hakedis      + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'aktarim'      THEN v_aktarim      := v_aktarim      + COALESCE((t->>'tutar')::numeric, 0);
        WHEN 'iade'         THEN v_iade         := v_iade         + COALESCE((t->>'tutar')::numeric, 0);
        ELSE NULL;
      END CASE;
    END LOOP;
  END IF;

  -- Anlaşma
  v_anlasma := v_data->'anlasma';
  v_an_tur := COALESCE(v_anlasma->>'tur', '');
  IF v_an_tur IN ('pesin','taksit') THEN
    v_anlasilan_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);
  ELSIF v_an_tur IN ('basari','tahsilat') THEN
    v_baz := COALESCE((v_anlasma->>'baz')::numeric,
                       (v_data->>'alacak')::numeric,
                       (v_data->>'deger')::numeric, 0);
    v_anlasilan_toplam := v_baz * COALESCE((v_anlasma->>'yuzde')::numeric, 0) / 100;
  ELSIF v_an_tur = 'karma' THEN
    v_baz := COALESCE((v_anlasma->>'baz')::numeric,
                       (v_data->>'alacak')::numeric,
                       (v_data->>'deger')::numeric, 0);
    v_anlasilan_toplam := COALESCE((v_anlasma->>'karmaP')::numeric, 0)
                        + (v_baz * COALESCE((v_anlasma->>'karmaYuzde')::numeric, 0) / 100);
  END IF;

  RETURN jsonb_build_object(
    'dosyaId', p_dosya_id,
    'dosyaTur', p_dosya_tur,
    'dosyaNo', COALESCE(v_data->>'no', ''),
    'muvId', COALESCE(v_data->>'muvId', ''),
    'masraf', v_masraf,
    'tahsilat', jsonb_build_object(
      'karsiTaraf', v_karsi_taraf,
      'akdiVekalet', v_akdi_vekalet,
      'hakedis', v_hakedis,
      'aktarim', v_aktarim,
      'iade', v_iade,
      'hareketSayisi', v_hareket_sayisi
    ),
    'anlasma', jsonb_build_object(
      'tur', v_an_tur,
      'anlasilanToplam', v_anlasilan_toplam,
      'yuzde', COALESCE((v_anlasma->>'yuzde')::numeric,
                         (v_anlasma->>'karmaYuzde')::numeric, 0)
    ),
    'buroGelir', v_hakedis + v_akdi_vekalet,
    'buroNet', v_hakedis + v_akdi_vekalet - v_masraf
  );
END;
$function$;

-- finans_muvekkil_ozet fingerprint c59814a340ccaf24302e13ce19a6cec8
CREATE OR REPLACE FUNCTION public.finans_muvekkil_ozet(p_buro_id uuid, p_muv_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_masraf_toplam numeric := 0;
  v_masraf_detay jsonb := '[]'::jsonb;
  v_avans_alinan numeric := 0;
  v_avans_bekleyen numeric := 0;
  v_top_karsi numeric := 0;
  v_top_akdi numeric := 0;
  v_top_hakedis numeric := 0;
  v_top_aktarim numeric := 0;
  v_top_iade numeric := 0;
  v_dosyalar jsonb := '[]'::jsonb;
  v_anl_akdi_toplam numeric := 0;
  -- Yeni: Tüm kaynaklar dahil toplam anlaşılan ve tahsil edilen
  v_anlasilan_toplam numeric := 0;
  v_tahsil_toplam numeric := 0;
  v_dan_gelir numeric := 0;
  v_dan_anlasilan numeric := 0;
  v_arab_gelir numeric := 0;
  v_arab_anlasilan numeric := 0;
  v_iht_gelir numeric := 0;
  v_iht_anlasilan numeric := 0;
  v_masraf_bakiye numeric;
  v_tahsilat_bakiye numeric;
  v_vekalet_bakiye numeric;
  v_genel_bakiye numeric;
  rec record;
  h jsonb;
  t jsonb;
  v_m numeric;
  v_th_karsi numeric; v_th_akdi numeric; v_th_hak numeric; v_th_akt numeric; v_th_iade numeric;
  v_an_tur text; v_an_toplam numeric; v_baz numeric;
  v_anlasma jsonb;
  v_dosya_tahsil numeric;
BEGIN

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

  -- ── Davalar + İcra dosyaları ──
  FOR rec IN
    SELECT id, data, 'dava' AS tur FROM davalar WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id
    UNION ALL
    SELECT id, data, 'icra' AS tur FROM icra WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id
  LOOP
    -- Masraf
    v_m := 0;
    IF rec.data->'harcamalar' IS NOT NULL THEN
      SELECT COALESCE(SUM((e->>'tutar')::numeric), 0) INTO v_m
        FROM jsonb_array_elements(rec.data->'harcamalar') e;
    END IF;
    v_masraf_toplam := v_masraf_toplam + v_m;
    IF v_m > 0 THEN
      v_masraf_detay := v_masraf_detay || jsonb_build_object(
        'dosyaId', rec.id, 'dosyaTur', rec.tur,
        'dosyaNo', COALESCE(rec.data->>'no',''), 'tutar', v_m
      );
    END IF;

    -- Tahsilat (türlere göre ayır)
    v_th_karsi := 0; v_th_akdi := 0; v_th_hak := 0; v_th_akt := 0; v_th_iade := 0;
    v_dosya_tahsil := 0;
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        CASE COALESCE(t->>'tur', 'tahsilat')
          WHEN 'tahsilat'      THEN v_th_karsi := v_th_karsi + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'borclu_odeme'  THEN v_th_karsi := v_th_karsi + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'akdi_vekalet'  THEN v_th_akdi  := v_th_akdi  + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'hakediş'       THEN v_th_hak   := v_th_hak   + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'icra_vekalet'  THEN v_th_akdi  := v_th_akdi  + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'aktarim'       THEN v_th_akt   := v_th_akt   + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'iade'          THEN v_th_iade  := v_th_iade  + COALESCE((t->>'tutar')::numeric, 0);
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;
    -- Dosya bazlı tahsilat toplamı (aktarım/iade hariç)
    v_dosya_tahsil := v_th_karsi + v_th_akdi + v_th_hak;

    v_top_karsi   := v_top_karsi   + v_th_karsi;
    v_top_akdi    := v_top_akdi    + v_th_akdi;
    v_top_hakedis := v_top_hakedis + v_th_hak;
    v_top_aktarim := v_top_aktarim + v_th_akt;
    v_top_iade    := v_top_iade    + v_th_iade;

    -- Anlaşma tutarı hesapla
    v_anlasma := rec.data->'anlasma';
    v_an_tur := COALESCE(v_anlasma->>'tur', '');
    v_an_toplam := 0;

    -- Önce anlasma.toplam varsa onu kullan (MuvAlacak ile aynı mantık)
    IF (v_anlasma->>'toplam') IS NOT NULL AND (v_anlasma->>'toplam')::numeric > 0 THEN
      v_an_toplam := (v_anlasma->>'toplam')::numeric;
    ELSIF v_an_tur IN ('pesin','taksit') THEN
      v_an_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);
    ELSIF v_an_tur IN ('basari','tahsilat') THEN
      v_baz := COALESCE((v_anlasma->>'baz')::numeric,
                         (rec.data->>'alacak')::numeric,
                         (rec.data->>'deger')::numeric, 0);
      v_an_toplam := v_baz * COALESCE((v_anlasma->>'yuzde')::numeric, 0) / 100;
    ELSIF v_an_tur = 'karma' THEN
      v_baz := COALESCE((v_anlasma->>'baz')::numeric,
                         (rec.data->>'alacak')::numeric,
                         (rec.data->>'deger')::numeric, 0);
      v_an_toplam := COALESCE((v_anlasma->>'karmaP')::numeric, 0)
                   + (v_baz * COALESCE((v_anlasma->>'karmaYuzde')::numeric, 0) / 100);
    END IF;

    -- Anlaşma yoksa ama ucret field'ı varsa (eski yapı uyumluluğu)
    IF v_an_toplam = 0 AND (rec.data->>'ucret') IS NOT NULL THEN
      v_an_toplam := COALESCE((rec.data->>'ucret')::numeric, 0);
    END IF;

    IF v_an_tur IN ('pesin','taksit') THEN
      v_anl_akdi_toplam := v_anl_akdi_toplam + v_an_toplam;
    END IF;

    -- Toplam anlaşılan ve tahsil edilen (tüm dosya türleri için)
    v_anlasilan_toplam := v_anlasilan_toplam + v_an_toplam;
    v_tahsil_toplam := v_tahsil_toplam + v_dosya_tahsil;

    v_dosyalar := v_dosyalar || jsonb_build_object(
      'dosyaId', rec.id, 'dosyaTur', rec.tur,
      'dosyaNo', COALESCE(rec.data->>'no', rec.data->>'esasNo', rec.data->>'dosyaNo', ''),
      'masraf', v_m,
      'karsiTaraf', v_th_karsi, 'akdiVekalet', v_th_akdi,
      'hakedis', v_th_hak, 'aktarim', v_th_akt, 'iade', v_th_iade,
      'anlasma', jsonb_build_object('tur', v_an_tur, 'anlasilanToplam', v_an_toplam),
      'tahsilToplam', v_dosya_tahsil
    );
  END LOOP;

  -- ── Avanslar (avans_hareketleri tablosundan) ──
  SELECT
    COALESCE(SUM(CASE WHEN data->>'tip' = 'alim' THEN (data->>'tutar')::numeric ELSE 0 END), 0),
    0
  INTO v_avans_alinan, v_avans_bekleyen
  FROM avans_hareketleri
  WHERE buro_id = p_buro_id
    AND data->>'muvId' = p_muv_id
    AND data->>'_silindi' IS NULL;

  -- Eski avanslar tablosu da kontrol et (varsa)
  BEGIN
    SELECT
      v_avans_alinan + COALESCE(SUM(CASE WHEN data->>'tur' = 'Avans Alındı' AND data->>'durum' != 'Bekliyor'
                        THEN (data->>'tutar')::numeric ELSE 0 END), 0),
      v_avans_bekleyen + COALESCE(SUM(CASE WHEN data->>'durum' = 'Bekliyor'
                        THEN (data->>'tutar')::numeric ELSE 0 END), 0)
    INTO v_avans_alinan, v_avans_bekleyen
    FROM avanslar
    WHERE buro_id = p_buro_id
      AND data->>'muvId' = p_muv_id
      AND (data->>'_otoHarcama') IS DISTINCT FROM 'true';
  EXCEPTION WHEN undefined_table THEN
    -- avanslar tablosu yoksa devam et
    NULL;
  END;

  -- ── Danışmanlık ──
  SELECT
    COALESCE(SUM(COALESCE((data->>'tahsilEdildi')::numeric, 0)), 0),
    COALESCE(SUM(COALESCE((data->>'ucret')::numeric, 0)), 0)
  INTO v_dan_gelir, v_dan_anlasilan
  FROM danismanlik
  WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id;

  v_anlasilan_toplam := v_anlasilan_toplam + v_dan_anlasilan;
  v_tahsil_toplam := v_tahsil_toplam + v_dan_gelir;

  -- ── Arabuluculuk ──
  BEGIN
    SELECT
      COALESCE(SUM(COALESCE((data->>'tahsilEdildi')::numeric, 0)), 0),
      COALESCE(SUM(COALESCE((data->>'ucret')::numeric, 0)), 0)
    INTO v_arab_gelir, v_arab_anlasilan
    FROM arabuluculuk
    WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id;

    v_anlasilan_toplam := v_anlasilan_toplam + v_arab_anlasilan;
    v_tahsil_toplam := v_tahsil_toplam + v_arab_gelir;
  EXCEPTION WHEN undefined_table THEN
    v_arab_gelir := 0; v_arab_anlasilan := 0;
  END;

  -- ── İhtarname ──
  SELECT
    COALESCE(SUM(COALESCE((data->>'tahsilEdildi')::numeric, 0)), 0),
    COALESCE(SUM(COALESCE((data->>'ucret')::numeric, 0)), 0)
  INTO v_iht_gelir, v_iht_anlasilan
  FROM ihtarnameler
  WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id;

  v_anlasilan_toplam := v_anlasilan_toplam + v_iht_anlasilan;
  v_tahsil_toplam := v_tahsil_toplam + v_iht_gelir;

  -- ── Bakiyeler ──
  v_masraf_bakiye   := v_avans_alinan - v_masraf_toplam;
  v_tahsilat_bakiye := v_top_karsi - v_top_hakedis - v_top_aktarim - v_top_iade;
  v_vekalet_bakiye  := v_anl_akdi_toplam - v_top_akdi;
  v_genel_bakiye    := v_tahsil_toplam - v_masraf_toplam + v_avans_alinan - v_top_aktarim - v_top_iade;

  RETURN jsonb_build_object(
    'muvId', p_muv_id,
    'masraflar', jsonb_build_object('toplam', v_masraf_toplam, 'detay', v_masraf_detay),
    'avanslar', jsonb_build_object('alinan', v_avans_alinan, 'bekleyen', v_avans_bekleyen, 'kalan', v_masraf_bakiye),
    'alacak', jsonb_build_object(
      'anlasilanToplam', v_anlasilan_toplam,
      'tahsilEdilen', v_tahsil_toplam,
      'kalan', v_anlasilan_toplam - v_tahsil_toplam
    ),
    'tahsilatlar', jsonb_build_object(
      'karsiTaraf', v_top_karsi,
      'toplam', v_top_karsi + v_top_akdi + v_top_hakedis,
      'danismanlik', v_dan_gelir,
      'arabuluculuk', v_arab_gelir,
      'ihtarname', v_iht_gelir
    ),
    'vekaletUcreti', jsonb_build_object(
      'akdi', jsonb_build_object('anlasilanToplam', v_anl_akdi_toplam, 'tahsilEdilen', v_top_akdi, 'kalan', v_vekalet_bakiye),
      'hakedis', jsonb_build_object('toplam', v_top_hakedis)
    ),
    'aktarimlar', jsonb_build_object('toplam', v_top_aktarim),
    'iadeler', jsonb_build_object('toplam', v_top_iade),
    'danismanlik', jsonb_build_object('gelir', v_dan_gelir, 'anlasilan', v_dan_anlasilan),
    'arabuluculuk', jsonb_build_object('gelir', v_arab_gelir, 'anlasilan', v_arab_anlasilan),
    'ihtarname', jsonb_build_object('gelir', v_iht_gelir, 'anlasilan', v_iht_anlasilan),
    'bakiye', jsonb_build_object(
      'masrafBakiye', v_masraf_bakiye,
      'tahsilatBakiye', v_tahsilat_bakiye,
      'vekaletBakiye', v_vekalet_bakiye,
      'genelBakiye', v_genel_bakiye
    ),
    'dosyalar', v_dosyalar
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finans_dosya_ozet(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finans_muvekkil_ozet(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finans_dosya_ozet(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finans_muvekkil_ozet(uuid,text) TO authenticated, service_role;
COMMIT;

