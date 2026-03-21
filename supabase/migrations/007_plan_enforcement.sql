-- ================================================================
-- LEXBASE — Faz 1: Backend Güvenlik Temeli
-- Plan Enforcement + Oto-Numaralama + TC Doğrulama
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1A. Plan limitleri referans tablosu
-- Client-side PLANLAR objesi DB'ye taşınıyor
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limitleri (
  plan_id text PRIMARY KEY,
  ad text NOT NULL,
  muvekkil_limit integer NOT NULL DEFAULT 0,
  dava_limit integer NOT NULL DEFAULT 0,
  icra_limit integer NOT NULL DEFAULT 0,
  personel_limit integer NOT NULL DEFAULT 0
);

INSERT INTO plan_limitleri (plan_id, ad, muvekkil_limit, dava_limit, icra_limit, personel_limit)
VALUES
  ('deneme',      'Başlangıç',    25,       30,       15,       0),
  ('profesyonel', 'Profesyonel',  150,      200,      100,      0),
  ('buro',        'Büro',         500,      750,      400,      5),
  ('kurumsal',    'Kurumsal',     999999,   999999,   999999,   999999)
ON CONFLICT (plan_id) DO UPDATE SET
  muvekkil_limit = EXCLUDED.muvekkil_limit,
  dava_limit = EXCLUDED.dava_limit,
  icra_limit = EXCLUDED.icra_limit,
  personel_limit = EXCLUDED.personel_limit;


-- ────────────────────────────────────────────────────────────────
-- 1B. check_plan_limit — Plan Limiti Kontrol RPC
-- Frontend çağırır: sb.rpc('check_plan_limit', {p_buro_id, p_tip})
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_plan_limit(p_buro_id uuid, p_tip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_mevcut integer;
  v_limit integer;
  v_tablo text;
  v_limit_col text;
BEGIN
  -- 1. Büronun planını oku
  SELECT COALESCE(plan, 'deneme') INTO v_plan_id
    FROM burolar WHERE id = p_buro_id;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('izin', false, 'hata', 'buro_bulunamadi');
  END IF;

  -- 2. Tip → tablo ve limit sütunu eşlemesi
  v_tablo := CASE p_tip
    WHEN 'muvekkil' THEN 'muvekkillar'
    WHEN 'dava'     THEN 'davalar'
    WHEN 'icra'     THEN 'icra'
    WHEN 'personel' THEN 'personel'
    ELSE NULL
  END;

  v_limit_col := CASE p_tip
    WHEN 'muvekkil' THEN 'muvekkil_limit'
    WHEN 'dava'     THEN 'dava_limit'
    WHEN 'icra'     THEN 'icra_limit'
    WHEN 'personel' THEN 'personel_limit'
    ELSE NULL
  END;

  IF v_tablo IS NULL THEN
    RETURN jsonb_build_object('izin', false, 'hata', 'gecersiz_tip');
  END IF;

  -- 3. Plan limitini plan_limitleri tablosundan al
  EXECUTE format('SELECT %I FROM plan_limitleri WHERE plan_id = $1', v_limit_col)
    INTO v_limit USING v_plan_id;

  IF v_limit IS NULL THEN
    v_limit := 0; -- Bilinmeyen plan → 0 limit
  END IF;

  -- 4. Mevcut sayıyı DB'den al (client'a güvenme)
  EXECUTE format('SELECT count(*)::int FROM %I WHERE buro_id = $1', v_tablo)
    INTO v_mevcut USING p_buro_id;

  -- 5. Sonuç
  RETURN jsonb_build_object(
    'izin', v_mevcut < v_limit,
    'mevcut', v_mevcut,
    'limit', v_limit,
    'plan_id', v_plan_id
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 1C. fn_enforce_plan_limit — INSERT Trigger
-- Her INSERT'te otomatik plan limiti kontrolü
-- Limit aşılırsa: RAISE EXCEPTION (INSERT engellenir)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_enforce_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_mevcut integer;
  v_limit integer;
  v_tip text;
  v_limit_col text;
BEGIN
  -- Tablo adından tip ve limit sütunu belirle
  v_tip := CASE TG_TABLE_NAME
    WHEN 'muvekkillar' THEN 'muvekkil'
    WHEN 'davalar'     THEN 'dava'
    WHEN 'icra'        THEN 'icra'
    WHEN 'personel'    THEN 'personel'
  END;

  v_limit_col := v_tip || '_limit';

  -- Büronun planını oku
  SELECT COALESCE(plan, 'deneme') INTO v_plan_id
    FROM burolar WHERE id = NEW.buro_id;

  -- Plan limitini al
  EXECUTE format('SELECT %I FROM plan_limitleri WHERE plan_id = $1', v_limit_col)
    INTO v_limit USING v_plan_id;

  IF v_limit IS NULL THEN
    v_limit := 0;
  END IF;

  -- Mevcut sayıyı al
  EXECUTE format('SELECT count(*)::int FROM %I WHERE buro_id = $1', TG_TABLE_NAME)
    INTO v_mevcut USING NEW.buro_id;

  -- Limit kontrolü
  IF v_mevcut >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_exceeded: % limiti doldu (mevcut: %, limit: %, plan: %)',
      v_tip, v_mevcut, v_limit, v_plan_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger'ları oluştur (IF NOT EXISTS ile güvenli)
DROP TRIGGER IF EXISTS trg_plan_limit ON muvekkillar;
CREATE TRIGGER trg_plan_limit
  BEFORE INSERT ON muvekkillar
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_plan_limit();

DROP TRIGGER IF EXISTS trg_plan_limit ON davalar;
CREATE TRIGGER trg_plan_limit
  BEFORE INSERT ON davalar
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_plan_limit();

DROP TRIGGER IF EXISTS trg_plan_limit ON icra;
CREATE TRIGGER trg_plan_limit
  BEFORE INSERT ON icra
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_plan_limit();

DROP TRIGGER IF EXISTS trg_plan_limit ON personel;
CREATE TRIGGER trg_plan_limit
  BEFORE INSERT ON personel
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_plan_limit();


-- ────────────────────────────────────────────────────────────────
-- 1D. generate_dosya_no — Atomic Oto-Numaralama
-- Advisory lock ile race condition önlenir
-- Format: D-2026-001, I-2026-001, IHT-2026-001
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_dosya_no(p_buro_id uuid, p_tur text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_yil text;
  v_tablo text;
  v_max_no text;
  v_sira integer;
BEGIN
  -- Advisory lock: büro + tip bazında eşzamanlılık kontrolü
  PERFORM pg_advisory_xact_lock(hashtext(p_buro_id::text || p_tur));

  v_yil := extract(year FROM now())::text;

  -- Tip → prefix + tablo eşlemesi
  v_prefix := CASE p_tur
    WHEN 'dava'        THEN 'D'
    WHEN 'icra'        THEN 'I'
    WHEN 'ihtarname'   THEN 'IHT'
    WHEN 'arabuluculuk' THEN 'AR'
    WHEN 'danismanlik' THEN 'DN'
    ELSE 'X'
  END;

  v_tablo := CASE p_tur
    WHEN 'dava'        THEN 'davalar'
    WHEN 'icra'        THEN 'icra'
    WHEN 'ihtarname'   THEN 'ihtarnameler'
    WHEN 'arabuluculuk' THEN 'arabuluculuk'
    WHEN 'danismanlik' THEN 'danismanlik'
    ELSE NULL
  END;

  IF v_tablo IS NULL THEN
    RETURN 'X-' || v_yil || '-001';
  END IF;

  -- Mevcut en yüksek numarayı bul (data jsonb içindeki 'no' alanı)
  EXECUTE format(
    $q$SELECT data->>'no' FROM %I
       WHERE buro_id = $1
         AND data->>'no' LIKE $2
       ORDER BY data->>'no' DESC
       LIMIT 1$q$,
    v_tablo
  ) INTO v_max_no USING p_buro_id, v_prefix || '-' || v_yil || '-%';

  IF v_max_no IS NULL THEN
    v_sira := 1;
  ELSE
    v_sira := COALESCE(
      (regexp_match(v_max_no, '(\d+)$'))[1]::int, 0
    ) + 1;
  END IF;

  -- Format: D-2026-001
  RETURN v_prefix || '-' || v_yil || '-' || lpad(v_sira::text, 3, '0');
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 1E. validate_tckn — TC Kimlik No Doğrulama
-- IMMUTABLE: her zaman aynı input → aynı output (cacheable)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_tckn(p_tc text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits int[];
  v_tek integer := 0;
  v_cift integer := 0;
  v_toplam integer := 0;
  i integer;
BEGIN
  -- Temel kontroller
  IF p_tc IS NULL OR length(p_tc) != 11 THEN RETURN false; END IF;
  IF p_tc ~ '[^0-9]' THEN RETURN false; END IF;
  IF substr(p_tc, 1, 1) = '0' THEN RETURN false; END IF;

  -- Rakamlara ayır
  FOR i IN 1..11 LOOP
    v_digits[i] := substr(p_tc, i, 1)::int;
  END LOOP;

  -- 10. hane kontrolü: ((tek_toplam * 7) - cift_toplam) mod 10
  FOR i IN 1..9 BY 2 LOOP v_tek := v_tek + v_digits[i]; END LOOP;
  FOR i IN 2..8 BY 2 LOOP v_cift := v_cift + v_digits[i]; END LOOP;

  IF ((v_tek * 7 - v_cift) % 10 + 10) % 10 != v_digits[10] THEN
    RETURN false;
  END IF;

  -- 11. hane kontrolü: ilk 10 hanenin toplamı mod 10
  FOR i IN 1..10 LOOP v_toplam := v_toplam + v_digits[i]; END LOOP;
  IF v_toplam % 10 != v_digits[11] THEN RETURN false; END IF;

  RETURN true;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- RPC'lere anon kullanıcı erişimi (frontend sb.rpc() çağrıları için)
-- ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION check_plan_limit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_dosya_no(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_tckn(text) TO authenticated;

-- plan_limitleri tablosu: sadece okuma (authenticated)
ALTER TABLE plan_limitleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_limitleri_read ON plan_limitleri
  FOR SELECT TO authenticated USING (true);
