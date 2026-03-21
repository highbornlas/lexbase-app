-- ================================================================
-- LEXBASE — BİLDİRİM SİSTEMİ GENİŞLETME
-- 025_bildirim_sistemi.sql
--
-- 1. bildirimler tablosuna eksik sütunlar (hedef_auth_id, ilgili_id, ilgili_tur)
-- 2. bildirim_tercihleri tablosu (localStorage → DB taşıma)
-- 3. bildirim_olustur() RPC fonksiyonu
-- ================================================================

-- ════════════════════════════════════════════════════════════════
-- 1. BİLDİRİMLER TABLOSUNA EKSİK SÜTUNLAR
-- ════════════════════════════════════════════════════════════════

-- hedef_auth_id: kişisel bildirimler için (null = tüm büro)
DO $$ BEGIN
  ALTER TABLE bildirimler ADD COLUMN hedef_auth_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ilgili_id: ilişkili kayıt ID'si (dava, icra, görev vs.)
DO $$ BEGIN
  ALTER TABLE bildirimler ADD COLUMN ilgili_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ilgili_tur: ilişkili kayıt türü (dava, icra, gorev, muvekkil)
DO $$ BEGIN
  ALTER TABLE bildirimler ADD COLUMN ilgili_tur text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bildirimler_hedef
  ON bildirimler(hedef_auth_id) WHERE hedef_auth_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════════
-- 2. BİLDİRİM TERCİHLERİ TABLOSU
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bildirim_tercihleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buro_id uuid NOT NULL,
  -- Bildirim türleri
  durusma_hatirlatma boolean DEFAULT true,
  sure_uyari boolean DEFAULT true,
  gorev_atama boolean DEFAULT true,
  gorev_yaklasan boolean DEFAULT true,
  onay_talebi boolean DEFAULT true,
  finans_uyari boolean DEFAULT true,
  -- Kanallar
  uygulama_ici boolean DEFAULT true,
  eposta boolean DEFAULT false,
  -- Zamanlama
  durusma_gun_once integer DEFAULT 1,
  sure_gun_once integer DEFAULT 3,
  -- Sessiz saatler
  sessiz_baslangic time DEFAULT '22:00',
  sessiz_bitis time DEFAULT '07:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(kullanici_auth_id)
);

ALTER TABLE bildirim_tercihleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY bt_sel ON bildirim_tercihleri FOR SELECT
  USING (kullanici_auth_id = auth.uid());
CREATE POLICY bt_ins ON bildirim_tercihleri FOR INSERT
  WITH CHECK (kullanici_auth_id = auth.uid());
CREATE POLICY bt_upd ON bildirim_tercihleri FOR UPDATE
  USING (kullanici_auth_id = auth.uid());


-- ════════════════════════════════════════════════════════════════
-- 3. BİLDİRİM OLUŞTURMA FONKSİYONU (RPC)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION bildirim_olustur(
  p_buro_id uuid,
  p_hedef_auth_id uuid,
  p_baslik text,
  p_mesaj text,
  p_tur text DEFAULT 'bilgi',
  p_link text DEFAULT NULL,
  p_ilgili_id text DEFAULT NULL,
  p_ilgili_tur text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id text;
BEGIN
  INSERT INTO bildirimler (buro_id, hedef_auth_id, tip, baslik, mesaj, link, ilgili_id, ilgili_tur, okundu)
  VALUES (p_buro_id, p_hedef_auth_id, p_tur, p_baslik, p_mesaj, p_link, p_ilgili_id, p_ilgili_tur, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION bildirim_olustur TO authenticated;
