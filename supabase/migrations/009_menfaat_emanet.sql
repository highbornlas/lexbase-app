-- ================================================================
-- LEXBASE — Faz 3: Menfaat Kontrolü RPC + Emanet Kasa
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 3A. pg_trgm extension (fuzzy ad eşleşmesi için)
-- ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ────────────────────────────────────────────────────────────────
-- 3B. menfaat_kontrol — Menfaat çakışması tespit RPC
--
-- Bir kişi/kurum adı ve opsiyonel TC ile tüm müvekkiller,
-- karşı taraflar, dava tarafları, icra borçluları arasında
-- çakışma kontrolü yapar.
--
-- Kullanım: sb.rpc('menfaat_kontrol', {
--   p_buro_id: '...', p_ad: 'Ahmet Yılmaz',
--   p_tc: '12345678901', p_yon: 'muvekkil'
-- })
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION menfaat_kontrol(
  p_buro_id uuid,
  p_ad text,
  p_tc text DEFAULT NULL,
  p_yon text DEFAULT 'muvekkil'  -- 'muvekkil' veya 'karsiTaraf'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sonuclar jsonb := '[]'::jsonb;
  v_ad_norm text;
  rec record;
  v_hedef_ad text;
  v_skor numeric;
  v_eslesmeler jsonb;
  v_kesin boolean;
BEGIN
  IF p_ad IS NULL OR length(trim(p_ad)) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  v_ad_norm := lower(trim(p_ad));

  IF p_yon = 'muvekkil' THEN
    -- Müvekkil ekleniyor → karşı taraflarla kontrol et

    -- 1. Kayıtlı karşı taraflar (karsi_taraflar tablosu)
    FOR rec IN
      SELECT id, data FROM karsi_taraflar WHERE buro_id = p_buro_id
    LOOP
      v_hedef_ad := COALESCE(rec.data->>'ad', '');
      v_skor := 0;
      v_eslesmeler := '[]'::jsonb;
      v_kesin := false;

      -- TC eşleşmesi (kesin)
      IF p_tc IS NOT NULL AND length(p_tc) = 11
         AND rec.data->>'tc' IS NOT NULL AND p_tc = rec.data->>'tc' THEN
        v_skor := 100;
        v_kesin := true;
        v_eslesmeler := v_eslesmeler || jsonb_build_object(
          'alan', 'TC Kimlik No', 'deger', p_tc, 'kesin', true
        );
      END IF;

      -- Ad benzerliği (pg_trgm)
      IF v_hedef_ad != '' THEN
        DECLARE
          v_sim numeric;
        BEGIN
          v_sim := similarity(v_ad_norm, lower(v_hedef_ad));
          IF v_sim >= 0.4 THEN
            v_eslesmeler := v_eslesmeler || jsonb_build_object(
              'alan', 'Ad/Unvan',
              'deger', '"' || p_ad || '" ↔ "' || v_hedef_ad || '" (%' || round(v_sim * 100)::text || ')',
              'kesin', false
            );
            v_skor := GREATEST(v_skor, round(v_sim * 100));
          END IF;
        END;
      END IF;

      IF v_skor >= 50 THEN
        v_sonuclar := v_sonuclar || jsonb_build_object(
          'hedefId', rec.id, 'hedefAd', v_hedef_ad,
          'hedefKaynak', 'Karşı Taraf',
          'skor', v_skor, 'kesin', v_kesin OR v_skor >= 80,
          'eslesmeler', v_eslesmeler
        );
      END IF;
    END LOOP;

    -- 2. Dava karşı tarafları (davalar.data->>'karsi')
    FOR rec IN
      SELECT id, data FROM davalar
      WHERE buro_id = p_buro_id AND data->>'karsi' IS NOT NULL
    LOOP
      v_hedef_ad := COALESCE(rec.data->>'karsi', '');
      IF v_hedef_ad = '' THEN CONTINUE; END IF;

      v_skor := 0;
      v_eslesmeler := '[]'::jsonb;

      DECLARE
        v_sim numeric;
      BEGIN
        v_sim := similarity(v_ad_norm, lower(v_hedef_ad));
        IF v_sim >= 0.4 THEN
          v_eslesmeler := v_eslesmeler || jsonb_build_object(
            'alan', 'Ad/Unvan',
            'deger', '"' || p_ad || '" ↔ "' || v_hedef_ad || '" (%' || round(v_sim * 100)::text || ')',
            'kesin', false
          );
          v_skor := round(v_sim * 100);
        END IF;
      END;

      IF v_skor >= 50 THEN
        v_sonuclar := v_sonuclar || jsonb_build_object(
          'hedefId', rec.id, 'hedefAd', v_hedef_ad,
          'hedefKaynak', 'Dava Karşı Tarafı',
          'dosyaNo', COALESCE(rec.data->>'no', ''),
          'skor', v_skor, 'kesin', v_skor >= 80,
          'eslesmeler', v_eslesmeler
        );
      END IF;
    END LOOP;

    -- 3. İcra borçluları (icra.data->>'borclu')
    FOR rec IN
      SELECT id, data FROM icra
      WHERE buro_id = p_buro_id AND data->>'borclu' IS NOT NULL
    LOOP
      v_hedef_ad := COALESCE(rec.data->>'borclu', '');
      IF v_hedef_ad = '' THEN CONTINUE; END IF;

      v_skor := 0;
      v_eslesmeler := '[]'::jsonb;

      -- TC eşleşmesi
      IF p_tc IS NOT NULL AND length(p_tc) = 11
         AND rec.data->>'btc' IS NOT NULL AND p_tc = rec.data->>'btc' THEN
        v_skor := 100;
        v_eslesmeler := v_eslesmeler || jsonb_build_object(
          'alan', 'TC Kimlik No', 'deger', p_tc, 'kesin', true
        );
      END IF;

      DECLARE
        v_sim numeric;
      BEGIN
        v_sim := similarity(v_ad_norm, lower(v_hedef_ad));
        IF v_sim >= 0.4 THEN
          v_eslesmeler := v_eslesmeler || jsonb_build_object(
            'alan', 'Ad/Unvan',
            'deger', '"' || p_ad || '" ↔ "' || v_hedef_ad || '" (%' || round(v_sim * 100)::text || ')',
            'kesin', false
          );
          v_skor := GREATEST(v_skor, round(v_sim * 100));
        END IF;
      END;

      IF v_skor >= 50 THEN
        v_sonuclar := v_sonuclar || jsonb_build_object(
          'hedefId', rec.id, 'hedefAd', v_hedef_ad,
          'hedefKaynak', 'İcra Borçlusu',
          'dosyaNo', COALESCE(rec.data->>'no', ''),
          'skor', v_skor, 'kesin', v_skor >= 80,
          'eslesmeler', v_eslesmeler
        );
      END IF;
    END LOOP;

  ELSE
    -- Karşı taraf ekleniyor → müvekkillerle kontrol et
    FOR rec IN
      SELECT id, data FROM muvekkillar WHERE buro_id = p_buro_id
    LOOP
      v_hedef_ad := COALESCE(rec.data->>'ad', '');
      v_skor := 0;
      v_eslesmeler := '[]'::jsonb;
      v_kesin := false;

      -- TC eşleşmesi
      IF p_tc IS NOT NULL AND length(p_tc) = 11
         AND rec.data->>'tc' IS NOT NULL AND p_tc = rec.data->>'tc' THEN
        v_skor := 100;
        v_kesin := true;
        v_eslesmeler := v_eslesmeler || jsonb_build_object(
          'alan', 'TC Kimlik No', 'deger', p_tc, 'kesin', true
        );
      END IF;

      IF v_hedef_ad != '' THEN
        DECLARE
          v_sim numeric;
        BEGIN
          v_sim := similarity(v_ad_norm, lower(v_hedef_ad));
          IF v_sim >= 0.4 THEN
            v_eslesmeler := v_eslesmeler || jsonb_build_object(
              'alan', 'Ad/Unvan',
              'deger', '"' || p_ad || '" ↔ "' || v_hedef_ad || '" (%' || round(v_sim * 100)::text || ')',
              'kesin', false
            );
            v_skor := GREATEST(v_skor, round(v_sim * 100));
          END IF;
        END;
      END IF;

      IF v_skor >= 50 THEN
        v_sonuclar := v_sonuclar || jsonb_build_object(
          'hedefId', rec.id, 'hedefAd', v_hedef_ad,
          'hedefKaynak', 'Müvekkil',
          'skor', v_skor, 'kesin', v_kesin OR v_skor >= 80,
          'eslesmeler', v_eslesmeler
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_sonuclar;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3C. Emanet Kasa Tablosu + RPC
-- İki cüzdan: müvekkil emanet hesabı (emanet olarak tutulan para)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emanet_hareketler (
  id text PRIMARY KEY,
  buro_id uuid NOT NULL REFERENCES burolar(id),
  muvekkil_id text NOT NULL,
  tur text NOT NULL CHECK (tur IN ('giris','cikis')),
  tutar numeric(14,2) NOT NULL CHECK (tutar > 0),
  aciklama text,
  dosya_tur text,   -- 'dava', 'icra', NULL
  dosya_id text,
  tarih timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE emanet_hareketler ENABLE ROW LEVEL SECURITY;

CREATE POLICY emanet_hareketler_select ON emanet_hareketler
  FOR SELECT TO authenticated
  USING (buro_id = (SELECT (auth.jwt()->'app_metadata'->>'buro_id')::uuid));

CREATE POLICY emanet_hareketler_insert ON emanet_hareketler
  FOR INSERT TO authenticated
  WITH CHECK (buro_id = (SELECT (auth.jwt()->'app_metadata'->>'buro_id')::uuid));

CREATE POLICY emanet_hareketler_update ON emanet_hareketler
  FOR UPDATE TO authenticated
  USING (buro_id = (SELECT (auth.jwt()->'app_metadata'->>'buro_id')::uuid));

CREATE POLICY emanet_hareketler_delete ON emanet_hareketler
  FOR DELETE TO authenticated
  USING (buro_id = (SELECT (auth.jwt()->'app_metadata'->>'buro_id')::uuid));

-- Index
CREATE INDEX IF NOT EXISTS idx_emanet_buro_muv ON emanet_hareketler(buro_id, muvekkil_id);


-- ────────────────────────────────────────────────────────────────
-- 3D. emanet_bakiye — Müvekkil emanet hesap bakiyesi
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION emanet_bakiye(p_buro_id uuid, p_muvekkil_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giris numeric := 0;
  v_cikis numeric := 0;
  v_hareket_sayisi int := 0;
  v_son_hareket timestamptz;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN tur = 'giris' THEN tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tur = 'cikis' THEN tutar ELSE 0 END), 0),
    COUNT(*),
    MAX(tarih)
  INTO v_giris, v_cikis, v_hareket_sayisi, v_son_hareket
  FROM emanet_hareketler
  WHERE buro_id = p_buro_id AND muvekkil_id = p_muvekkil_id;

  RETURN jsonb_build_object(
    'giris', v_giris,
    'cikis', v_cikis,
    'bakiye', v_giris - v_cikis,
    'hareketSayisi', v_hareket_sayisi,
    'sonHareket', v_son_hareket
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3E. emanet_hareket_ekle — Emanet giriş/çıkış işlemi (tek transaction)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION emanet_hareket_ekle(
  p_buro_id uuid,
  p_muvekkil_id text,
  p_tur text,          -- 'giris' veya 'cikis'
  p_tutar numeric,
  p_aciklama text DEFAULT NULL,
  p_dosya_tur text DEFAULT NULL,
  p_dosya_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
  v_bakiye numeric;
BEGIN
  -- Çıkış yapılıyorsa bakiye kontrolü
  IF p_tur = 'cikis' THEN
    SELECT COALESCE(SUM(CASE WHEN tur = 'giris' THEN tutar ELSE -tutar END), 0)
      INTO v_bakiye
      FROM emanet_hareketler
      WHERE buro_id = p_buro_id AND muvekkil_id = p_muvekkil_id;

    IF v_bakiye < p_tutar THEN
      RETURN jsonb_build_object(
        'ok', false,
        'hata', 'yetersiz_bakiye',
        'bakiye', v_bakiye,
        'talep', p_tutar
      );
    END IF;
  END IF;

  -- ID oluştur
  v_id := 'em_' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO emanet_hareketler (id, buro_id, muvekkil_id, tur, tutar, aciklama, dosya_tur, dosya_id)
  VALUES (v_id, p_buro_id, p_muvekkil_id, p_tur, p_tutar, p_aciklama, p_dosya_tur, p_dosya_id);

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'bakiye', (SELECT COALESCE(SUM(CASE WHEN tur = 'giris' THEN tutar ELSE -tutar END), 0)
               FROM emanet_hareketler
               WHERE buro_id = p_buro_id AND muvekkil_id = p_muvekkil_id)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- GRANT'lar
-- ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION menfaat_kontrol(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION emanet_bakiye(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION emanet_hareket_ekle(uuid, text, text, numeric, text, text, text) TO authenticated;
