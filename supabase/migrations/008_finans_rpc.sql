-- ================================================================
-- EMD HUKUK — Faz 2: FinansMotoru → Supabase RPC
-- Client-side 771 satır hesaplama → Server-side PostgreSQL
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 2A. finans_dosya_ozet — Tek dosya finansal özet
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_dosya_ozet(
  p_buro_id uuid,
  p_dosya_tur text,   -- 'dava' veya 'icra'
  p_dosya_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;


-- ────────────────────────────────────────────────────────────────
-- 2B. finans_muvekkil_ozet — Müvekkil bazlı tam finansal özet
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_muvekkil_ozet(p_buro_id uuid, p_muv_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_dan_gelir numeric := 0;
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
BEGIN
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

    -- Tahsilat
    v_th_karsi := 0; v_th_akdi := 0; v_th_hak := 0; v_th_akt := 0; v_th_iade := 0;
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        CASE t->>'tur'
          WHEN 'tahsilat'     THEN v_th_karsi := v_th_karsi + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'akdi_vekalet' THEN v_th_akdi  := v_th_akdi  + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'hakediş'      THEN v_th_hak   := v_th_hak   + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'aktarim'      THEN v_th_akt   := v_th_akt   + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'iade'         THEN v_th_iade  := v_th_iade  + COALESCE((t->>'tutar')::numeric, 0);
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;
    v_top_karsi   := v_top_karsi   + v_th_karsi;
    v_top_akdi    := v_top_akdi    + v_th_akdi;
    v_top_hakedis := v_top_hakedis + v_th_hak;
    v_top_aktarim := v_top_aktarim + v_th_akt;
    v_top_iade    := v_top_iade    + v_th_iade;

    -- Anlaşma
    v_anlasma := rec.data->'anlasma';
    v_an_tur := COALESCE(v_anlasma->>'tur', '');
    v_an_toplam := 0;
    IF v_an_tur IN ('pesin','taksit') THEN
      v_an_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);
      v_anl_akdi_toplam := v_anl_akdi_toplam + v_an_toplam;
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

    v_dosyalar := v_dosyalar || jsonb_build_object(
      'dosyaId', rec.id, 'dosyaTur', rec.tur,
      'dosyaNo', COALESCE(rec.data->>'no',''),
      'masraf', v_m,
      'karsiTaraf', v_th_karsi, 'akdiVekalet', v_th_akdi,
      'hakedis', v_th_hak, 'aktarim', v_th_akt, 'iade', v_th_iade,
      'anlasma', jsonb_build_object('tur', v_an_tur, 'anlasilanToplam', v_an_toplam)
    );
  END LOOP;

  -- ── Avanslar ──
  SELECT
    COALESCE(SUM(CASE WHEN data->>'tur' = 'Avans Alındı' AND data->>'durum' != 'Bekliyor'
                      THEN (data->>'tutar')::numeric ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN data->>'durum' = 'Bekliyor'
                      THEN (data->>'tutar')::numeric ELSE 0 END), 0)
  INTO v_avans_alinan, v_avans_bekleyen
  FROM avanslar
  WHERE buro_id = p_buro_id
    AND data->>'muvId' = p_muv_id
    AND (data->>'_otoHarcama') IS DISTINCT FROM 'true';

  -- ── Danışmanlık gelirleri ──
  SELECT COALESCE(SUM((data->>'tahsilEdildi')::numeric), 0) INTO v_dan_gelir
  FROM danismanlik
  WHERE buro_id = p_buro_id AND data->>'muvId' = p_muv_id;

  -- ── Bakiyeler ──
  v_masraf_bakiye   := v_avans_alinan - v_masraf_toplam;
  v_tahsilat_bakiye := v_top_karsi - v_top_hakedis - v_top_aktarim - v_top_iade;
  v_vekalet_bakiye  := v_anl_akdi_toplam - v_top_akdi;
  v_genel_bakiye    := (v_top_akdi + v_top_hakedis + v_avans_alinan + v_dan_gelir)
                     - (v_masraf_toplam + v_top_aktarim + v_top_iade);

  RETURN jsonb_build_object(
    'muvId', p_muv_id,
    'masraflar', jsonb_build_object('toplam', v_masraf_toplam, 'detay', v_masraf_detay),
    'avanslar', jsonb_build_object('alinan', v_avans_alinan, 'bekleyen', v_avans_bekleyen, 'kalan', v_masraf_bakiye),
    'tahsilatlar', jsonb_build_object('karsiTaraf', v_top_karsi, 'toplam', v_top_karsi + v_top_akdi + v_top_hakedis),
    'vekaletUcreti', jsonb_build_object(
      'akdi', jsonb_build_object('anlasilanToplam', v_anl_akdi_toplam, 'tahsilEdilen', v_top_akdi, 'kalan', v_vekalet_bakiye),
      'hakedis', jsonb_build_object('toplam', v_top_hakedis)
    ),
    'aktarimlar', jsonb_build_object('toplam', v_top_aktarim),
    'iadeler', jsonb_build_object('toplam', v_top_iade),
    'danismanlik', jsonb_build_object('gelir', v_dan_gelir),
    'bakiye', jsonb_build_object(
      'masrafBakiye', v_masraf_bakiye,
      'tahsilatBakiye', v_tahsilat_bakiye,
      'vekaletBakiye', v_vekalet_bakiye,
      'genelBakiye', v_genel_bakiye
    ),
    'dosyalar', v_dosyalar
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 2C. finans_buro_kar_zarar — Büro kâr/zarar hesaplama
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_buro_kar_zarar(
  p_buro_id uuid,
  p_yil int DEFAULT NULL,
  p_ay int DEFAULT NULL  -- 0-indexed (Ocak=0)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := '';
  v_akdi numeric := 0;
  v_hakedis numeric := 0;
  v_dan_gelir numeric := 0;
  v_arab_gelir numeric := 0;
  v_diger_gelir numeric := 0;
  v_toplam_gelir numeric;
  v_buro_gider_toplam numeric := 0;
  v_buro_kat jsonb;
  v_toplam_gider numeric;
  v_net numeric;
  rec record;
  t jsonb;
  toplanti jsonb;
  v_tutar numeric;
BEGIN
  -- Tarih prefix oluştur
  IF p_yil IS NOT NULL AND p_ay IS NOT NULL AND p_ay >= 0 THEN
    v_prefix := p_yil::text || '-' || lpad((p_ay + 1)::text, 2, '0');
  ELSIF p_yil IS NOT NULL THEN
    v_prefix := p_yil::text;
  END IF;

  -- ── GELİRLER: Dava + İcra tahsilatları ──
  FOR rec IN
    SELECT data FROM davalar WHERE buro_id = p_buro_id
    UNION ALL
    SELECT data FROM icra WHERE buro_id = p_buro_id
  LOOP
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        IF v_prefix != '' AND NOT starts_with(COALESCE(t->>'tarih',''), v_prefix) THEN
          CONTINUE;
        END IF;
        v_tutar := COALESCE((t->>'tutar')::numeric, 0);
        CASE t->>'tur'
          WHEN 'akdi_vekalet' THEN v_akdi    := v_akdi    + v_tutar;
          WHEN 'hakediş'      THEN v_hakedis := v_hakedis + v_tutar;
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;
  END LOOP;

  -- ── GELİRLER: Danışmanlık ──
  FOR rec IN
    SELECT data FROM danismanlik WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    v_dan_gelir := v_dan_gelir + COALESCE((rec.data->>'tahsilEdildi')::numeric, 0);
  END LOOP;

  -- ── GELİRLER: Arabuluculuk toplantı ücretleri ──
  FOR rec IN
    SELECT data FROM arabuluculuk WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    IF rec.data->'toplanti' IS NOT NULL THEN
      FOR toplanti IN SELECT * FROM jsonb_array_elements(rec.data->'toplanti')
      LOOP
        v_tutar := COALESCE((toplanti->>'tutar')::numeric, 0);
        IF v_tutar > 0 THEN v_arab_gelir := v_arab_gelir + v_tutar; END IF;
      END LOOP;
    END IF;
  END LOOP;

  v_toplam_gelir := v_akdi + v_hakedis + v_dan_gelir + v_arab_gelir + v_diger_gelir;

  -- ── GİDERLER: Büro giderleri (kategoriye göre) ──
  v_buro_kat := '{
    "Kira & Aidat": 0, "Stopaj & Vergi": 0,
    "Muhasebeci / Mali Müşavir": 0, "Çalışan Ücretleri": 0,
    "Temizlik & Bakım": 0, "Kırtasiye & Sarf Malzeme": 0,
    "Teknoloji": 0, "Ulaşım & Araç": 0,
    "Sigorta": 0, "Mesleki Gelişim": 0,
    "Diğer Genel Gider": 0
  }'::jsonb;

  FOR rec IN
    SELECT data FROM buro_giderleri WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    v_tutar := COALESCE((rec.data->>'tutar')::numeric, 0);
    v_buro_gider_toplam := v_buro_gider_toplam + v_tutar;

    DECLARE
      v_kat text := COALESCE(rec.data->>'kategori', 'Diğer Genel Gider');
      v_mevcut numeric;
    BEGIN
      IF v_buro_kat ? v_kat THEN
        v_mevcut := (v_buro_kat->>v_kat)::numeric;
        v_buro_kat := jsonb_set(v_buro_kat, ARRAY[v_kat], to_jsonb(v_mevcut + v_tutar));
      ELSE
        v_mevcut := (v_buro_kat->>'Diğer Genel Gider')::numeric;
        v_buro_kat := jsonb_set(v_buro_kat, ARRAY['Diğer Genel Gider'], to_jsonb(v_mevcut + v_tutar));
      END IF;
    END;
  END LOOP;

  v_toplam_gider := v_buro_gider_toplam;
  v_net := v_toplam_gelir - v_toplam_gider;

  RETURN jsonb_build_object(
    'gelirler', jsonb_build_object(
      'akdiVekaletUcreti', v_akdi,
      'karsiVekaletHakedis', v_hakedis,
      'danismanlikGeliri', v_dan_gelir,
      'arabuluculukGeliri', v_arab_gelir,
      'digerGelir', v_diger_gelir,
      'toplam', v_toplam_gelir
    ),
    'giderler', jsonb_build_object(
      'buroGiderleri', v_buro_kat,
      'buroGiderToplam', v_buro_gider_toplam,
      'toplam', v_toplam_gider
    ),
    'net', v_net,
    'karZararOrani', CASE WHEN v_toplam_gelir > 0
      THEN round((v_net / v_toplam_gelir) * 100)
      ELSE 0 END
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 2D. finans_dosya_karlilik — Dosya kârlılık analizi
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_dosya_karlilik(
  p_buro_id uuid,
  p_filtre jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dosya_tur_filtre text;
  v_durum_filtre text;
  v_sonuclar jsonb := '[]'::jsonb;
  v_top_masraf numeric := 0;
  v_top_gelir numeric := 0;
  v_top_net numeric := 0;
  v_dosya_sayisi int := 0;
  rec record;
  v_masraf numeric;
  v_akdi numeric;
  v_hakedis numeric;
  v_gelir numeric;
  v_net numeric;
  v_karlilik int;
  t jsonb;
  v_muv_ad text;
BEGIN
  v_dosya_tur_filtre := p_filtre->>'dosyaTur';
  v_durum_filtre := p_filtre->>'durum';

  FOR rec IN
    SELECT id, data, 'dava' AS tur FROM davalar WHERE buro_id = p_buro_id
    UNION ALL
    SELECT id, data, 'icra' AS tur FROM icra WHERE buro_id = p_buro_id
  LOOP
    -- Dosya türü filtresi
    IF v_dosya_tur_filtre IS NOT NULL AND v_dosya_tur_filtre != rec.tur THEN CONTINUE; END IF;

    -- Durum filtresi
    IF v_durum_filtre = 'aktif' AND rec.data->>'durum' NOT IN ('Aktif', 'derdest') THEN CONTINUE; END IF;
    IF v_durum_filtre = 'tamamlanan' AND rec.data->>'durum' NOT IN ('Kapandı', 'kapandi', 'Kazanıldı', 'Kaybedildi') THEN CONTINUE; END IF;

    -- Masraf
    v_masraf := 0;
    IF rec.data->'harcamalar' IS NOT NULL THEN
      SELECT COALESCE(SUM((e->>'tutar')::numeric), 0) INTO v_masraf
        FROM jsonb_array_elements(rec.data->'harcamalar') e;
    END IF;

    -- Tahsilat (gelir = akdi_vekalet + hakediş)
    v_akdi := 0; v_hakedis := 0;
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        CASE t->>'tur'
          WHEN 'akdi_vekalet' THEN v_akdi    := v_akdi    + COALESCE((t->>'tutar')::numeric, 0);
          WHEN 'hakediş'      THEN v_hakedis := v_hakedis + COALESCE((t->>'tutar')::numeric, 0);
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;

    v_gelir := v_akdi + v_hakedis;
    v_net := v_gelir - v_masraf;
    IF v_gelir > 0 THEN
      v_karlilik := round(((v_gelir - v_masraf)::numeric / v_gelir) * 100)::int;
    ELSIF v_masraf > 0 THEN
      v_karlilik := -100;
    ELSE
      v_karlilik := 0;
    END IF;

    -- Müvekkil adı
    SELECT COALESCE(data->>'ad', '') INTO v_muv_ad
      FROM muvekkillar WHERE buro_id = p_buro_id AND id = rec.data->>'muvId';

    v_sonuclar := v_sonuclar || jsonb_build_object(
      'dosyaId', rec.id, 'dosyaTur', rec.tur,
      'dosyaNo', COALESCE(rec.data->>'no',''),
      'muvId', COALESCE(rec.data->>'muvId',''),
      'muvAd', COALESCE(v_muv_ad,''),
      'konu', COALESCE(rec.data->>'konu', rec.data->>'borclu', ''),
      'masraf', v_masraf, 'gelir', v_gelir, 'net', v_net,
      'karlilikOrani', v_karlilik,
      'durum', COALESCE(rec.data->>'durum','')
    );

    v_top_masraf := v_top_masraf + v_masraf;
    v_top_gelir  := v_top_gelir  + v_gelir;
    v_top_net    := v_top_net    + v_net;
    v_dosya_sayisi := v_dosya_sayisi + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'dosyalar', v_sonuclar,
    'ozet', jsonb_build_object(
      'topMasraf', v_top_masraf,
      'topGelir', v_top_gelir,
      'topNet', v_top_net,
      'ortKarlilik', CASE WHEN v_top_gelir > 0
        THEN round(((v_top_gelir - v_top_masraf)::numeric / v_top_gelir) * 100)::int
        ELSE 0 END,
      'dosyaSayisi', v_dosya_sayisi
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 2E. finans_beklenen_gelir — Beklenen gelir takvimi
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_beklenen_gelir(p_buro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_beklenenler jsonb := '[]'::jsonb;
  v_bugun text;
  v_uc_ay text;
  rec record;
  v_anlasma jsonb;
  v_toplam numeric;
  v_odenen numeric;
  v_kalan numeric;
  v_taksit_sayisi int;
  v_taksit_tutar numeric;
  v_son_odeme text;
  v_tahmini_tarih text;
  v_odeme_sira int;
  v_muv_ad text;
  v_top_tutar numeric := 0;
  v_gecikmi_tutar numeric := 0;
  v_gecikmi_adet int := 0;
  v_uc_ay_toplam numeric := 0;
  t jsonb;
  v_tutar numeric;
BEGIN
  v_bugun := to_char(now(), 'YYYY-MM-DD');
  v_uc_ay := to_char(now() + interval '3 months', 'YYYY-MM-DD');

  -- 1. Taksitli vekalet ücretleri
  FOR rec IN
    SELECT id, data, 'dava' AS tur FROM davalar WHERE buro_id = p_buro_id
    UNION ALL
    SELECT id, data, 'icra' AS tur FROM icra WHERE buro_id = p_buro_id
  LOOP
    v_anlasma := rec.data->'anlasma';
    IF v_anlasma IS NULL OR v_anlasma->>'tur' != 'taksit' OR v_anlasma->>'ucret' IS NULL THEN
      CONTINUE;
    END IF;

    v_toplam := COALESCE((v_anlasma->>'ucret')::numeric, 0);

    -- Ödenen akdi_vekalet tahsilatları
    v_odenen := 0;
    v_son_odeme := NULL;
    v_odeme_sira := 0;
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        IF t->>'tur' = 'akdi_vekalet' THEN
          v_odenen := v_odenen + COALESCE((t->>'tutar')::numeric, 0);
          v_odeme_sira := v_odeme_sira + 1;
          IF v_son_odeme IS NULL OR (t->>'tarih') > v_son_odeme THEN
            v_son_odeme := t->>'tarih';
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_kalan := v_toplam - v_odenen;
    IF v_kalan <= 0 THEN CONTINUE; END IF;

    v_taksit_sayisi := COALESCE((v_anlasma->>'taksitSayisi')::int, 6);
    v_taksit_tutar := v_toplam / v_taksit_sayisi;
    IF v_son_odeme IS NULL THEN v_son_odeme := COALESCE(rec.data->>'tarih', v_bugun); END IF;

    -- +30 gün
    v_tahmini_tarih := to_char((v_son_odeme::date + 30), 'YYYY-MM-DD');

    -- Müvekkil adı
    SELECT COALESCE(data->>'ad','') INTO v_muv_ad
      FROM muvekkillar WHERE buro_id = p_buro_id AND id = rec.data->>'muvId';

    v_beklenenler := v_beklenenler || jsonb_build_object(
      'tur', 'vekalet_taksit',
      'tarih', v_tahmini_tarih,
      'tutar', LEAST(v_taksit_tutar, v_kalan),
      'acik', COALESCE(v_muv_ad,'') || ' — Vekâlet taksiti (' || (v_odeme_sira+1)::text || '/' || v_taksit_sayisi::text || ')',
      'dosyaNo', COALESCE(rec.data->>'no',''),
      'muvId', COALESCE(rec.data->>'muvId',''),
      'kesinlik', 'tahmini',
      'gecikmisMi', v_tahmini_tarih < v_bugun
    );
  END LOOP;

  -- 2. Bekleyen avanslar
  FOR rec IN
    SELECT id, data FROM avanslar
    WHERE buro_id = p_buro_id
      AND data->>'durum' = 'Bekliyor'
      AND (data->>'_otoHarcama') IS DISTINCT FROM 'true'
  LOOP
    SELECT COALESCE(data->>'ad','') INTO v_muv_ad
      FROM muvekkillar WHERE buro_id = p_buro_id AND id = rec.data->>'muvId';

    v_tutar := COALESCE((rec.data->>'tutar')::numeric, 0);
    v_beklenenler := v_beklenenler || jsonb_build_object(
      'tur', 'avans',
      'tarih', COALESCE(rec.data->>'odeme',''),
      'tutar', v_tutar,
      'acik', COALESCE(v_muv_ad,'') || ' — ' || COALESCE(rec.data->>'tur','Avans'),
      'dosyaNo', COALESCE(rec.data->>'dosyaNo',''),
      'muvId', COALESCE(rec.data->>'muvId',''),
      'kesinlik', 'tahmini',
      'gecikmisMi', CASE WHEN rec.data->>'odeme' IS NOT NULL
        THEN rec.data->>'odeme' < v_bugun ELSE false END
    );
  END LOOP;

  -- Özetler
  SELECT
    COALESCE(SUM((e->>'tutar')::numeric), 0),
    COALESCE(SUM(CASE WHEN (e->>'gecikmisMi')::boolean THEN (e->>'tutar')::numeric ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE (e->>'gecikmisMi')::boolean),
    COALESCE(SUM(CASE WHEN e->>'tarih' >= v_bugun AND e->>'tarih' <= v_uc_ay
                      THEN (e->>'tutar')::numeric ELSE 0 END), 0)
  INTO v_top_tutar, v_gecikmi_tutar, v_gecikmi_adet, v_uc_ay_toplam
  FROM jsonb_array_elements(v_beklenenler) e;

  RETURN jsonb_build_object(
    'beklenenler', v_beklenenler,
    'ozet', jsonb_build_object(
      'topTutar', v_top_tutar,
      'gecikmisTutar', v_gecikmi_tutar,
      'gecikmisAdet', v_gecikmi_adet,
      'ucAyToplam', v_uc_ay_toplam
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 2F. finans_uyarilar — Finansal uyarılar (masraf, vekalet, aktarım)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_uyarilar(p_buro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uyarilar jsonb := '[]'::jsonb;
  v_bugun text;
  rec record;
  v_ozet jsonb;
  v_masraf_bak numeric;
  v_vekalet_bak numeric;
  v_tahsilat_bak numeric;
  v_son_odeme text;
  v_gun_fark int;
  v_muv_ad text;
  t jsonb;
  d record;
BEGIN
  v_bugun := to_char(now(), 'YYYY-MM-DD');

  -- Müvekkil bazlı uyarılar
  FOR rec IN
    SELECT id, data FROM muvekkillar WHERE buro_id = p_buro_id
  LOOP
    v_muv_ad := COALESCE(rec.data->>'ad', '');
    v_ozet := finans_muvekkil_ozet(p_buro_id, rec.id);
    IF v_ozet IS NULL THEN CONTINUE; END IF;

    v_masraf_bak  := (v_ozet->'bakiye'->>'masrafBakiye')::numeric;
    v_vekalet_bak := (v_ozet->'bakiye'->>'vekaletBakiye')::numeric;
    v_tahsilat_bak := (v_ozet->'bakiye'->>'tahsilatBakiye')::numeric;

    -- 1. Masraf avansı tükendi
    IF v_masraf_bak < -100 THEN
      v_uyarilar := v_uyarilar || jsonb_build_object(
        'tur', 'masraf_avans', 'oncelik', 'yuksek',
        'muvId', rec.id, 'muvAd', v_muv_ad,
        'mesaj', v_muv_ad || ' — Masraf avansı tükendi. Alacağınız var.',
        'tutar', abs(v_masraf_bak), 'icon', '⚠️'
      );
    END IF;

    -- 2. Vekalet ücreti gecikme
    IF v_vekalet_bak > 100 THEN
      v_son_odeme := NULL;
      -- Tüm dosyalardan son akdi_vekalet ödeme tarihini bul
      FOR d IN
        SELECT data FROM davalar WHERE buro_id = p_buro_id AND data->>'muvId' = rec.id
        UNION ALL
        SELECT data FROM icra WHERE buro_id = p_buro_id AND data->>'muvId' = rec.id
      LOOP
        IF d.data->'tahsilatlar' IS NOT NULL THEN
          FOR t IN SELECT * FROM jsonb_array_elements(d.data->'tahsilatlar')
          LOOP
            IF t->>'tur' = 'akdi_vekalet' THEN
              IF v_son_odeme IS NULL OR (t->>'tarih') > v_son_odeme THEN
                v_son_odeme := t->>'tarih';
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;

      IF v_son_odeme IS NOT NULL THEN
        v_gun_fark := (v_bugun::date - v_son_odeme::date);
        IF v_gun_fark > 30 THEN
          v_uyarilar := v_uyarilar || jsonb_build_object(
            'tur', 'vekalet_gecikme', 'oncelik', 'yuksek',
            'muvId', rec.id, 'muvAd', v_muv_ad,
            'mesaj', v_muv_ad || ' — Vekalet ücreti bakiyesi ' || v_gun_fark || ' gündür ödenmedi.',
            'tutar', v_vekalet_bak, 'icon', '⏰'
          );
        END IF;
      END IF;
    END IF;

    -- 3. Aktarım bekleyen tutar
    IF v_tahsilat_bak > 100 THEN
      v_uyarilar := v_uyarilar || jsonb_build_object(
        'tur', 'aktarim_bekliyor', 'oncelik', 'orta',
        'muvId', rec.id, 'muvAd', v_muv_ad,
        'mesaj', v_muv_ad || ' — Aktarım bekliyor.',
        'tutar', v_tahsilat_bak, 'icon', '📤'
      );
    END IF;
  END LOOP;

  -- 4. Yüksek masraf uyarısı (dosya bazlı, eşik: 10000)
  FOR rec IN
    SELECT id, data FROM davalar WHERE buro_id = p_buro_id
  LOOP
    IF rec.data->'harcamalar' IS NOT NULL THEN
      DECLARE
        v_m numeric;
      BEGIN
        SELECT COALESCE(SUM((e->>'tutar')::numeric), 0) INTO v_m
          FROM jsonb_array_elements(rec.data->'harcamalar') e;
        IF v_m > 10000 THEN
          SELECT COALESCE(data->>'ad','') INTO v_muv_ad
            FROM muvekkillar WHERE buro_id = p_buro_id AND id = rec.data->>'muvId';
          v_uyarilar := v_uyarilar || jsonb_build_object(
            'tur', 'yuksek_masraf', 'oncelik', 'bilgi',
            'muvId', COALESCE(rec.data->>'muvId',''), 'muvAd', COALESCE(v_muv_ad,''),
            'mesaj', 'Dava ' || COALESCE(rec.data->>'no','') || ' — Masraflar 10.000₺ eşiğini aştı.',
            'tutar', v_m, 'icon', '💸'
          );
        END IF;
      END;
    END IF;
  END LOOP;

  RETURN v_uyarilar;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- GRANT'lar
-- ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION finans_dosya_ozet(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_muvekkil_ozet(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_buro_kar_zarar(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_dosya_karlilik(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_beklenen_gelir(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_uyarilar(uuid) TO authenticated;
