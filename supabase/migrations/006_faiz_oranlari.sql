-- ================================================================
-- LEXBASE — FAİZ ORANLARI TABLOSU (v2 — Çoklu Tür Destekli)
-- 006_faiz_oranlari.sql
--
-- Her faiz türü ayrı satırlarda, tarih bazlı.
-- Admin panelinden TCMB/Resmi Gazete verileriyle güncellenir.
-- Tüm kullanıcılar bu tabloyu okur.
-- ================================================================

DROP TABLE IF EXISTS faiz_oranlari;

CREATE TABLE faiz_oranlari (
  id          serial PRIMARY KEY,
  tur         text NOT NULL,
  baslangic   date NOT NULL,
  oran        numeric(8,4) NOT NULL,
  kaynak      text DEFAULT '',
  notlar      text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(tur, baslangic)
);

CREATE INDEX IF NOT EXISTS idx_fo_tur_tarih ON faiz_oranlari(tur, baslangic DESC);

ALTER TABLE faiz_oranlari ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY fo_read ON faiz_oranlari FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY fo_write ON faiz_oranlari FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY fo_update ON faiz_oranlari FOR UPDATE USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY fo_delete ON faiz_oranlari FOR DELETE USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- YASAL FAİZ
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('yasal','2005-05-01',12,'3095 s.K.'),('yasal','2006-01-01',9,'3095 s.K.'),
  ('yasal','2024-07-01',24,'Resmi Gazete'),('yasal','2025-01-01',24,'Resmi Gazete')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- TİCARİ FAİZ / AVANS
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('ticari','2017-01-01',14.75,'TCMB'),('ticari','2019-03-01',28.50,'TCMB'),
  ('ticari','2019-05-01',25.50,'TCMB'),('ticari','2019-08-01',19.50,'TCMB'),
  ('ticari','2019-10-01',16.75,'TCMB'),('ticari','2019-12-01',12.75,'TCMB'),
  ('ticari','2020-01-01',11.75,'TCMB'),('ticari','2020-04-01',10.75,'TCMB'),
  ('ticari','2020-06-01',9.75,'TCMB'),('ticari','2020-12-01',17.75,'TCMB'),
  ('ticari','2021-04-01',20.25,'TCMB'),('ticari','2021-10-01',19.25,'TCMB'),
  ('ticari','2021-11-01',16.25,'TCMB'),('ticari','2021-12-01',15.75,'TCMB'),
  ('ticari','2022-01-01',15.75,'TCMB'),('ticari','2022-09-01',14.75,'TCMB'),
  ('ticari','2023-01-01',10.75,'TCMB'),('ticari','2023-07-01',19.25,'TCMB'),
  ('ticari','2023-09-01',34.25,'TCMB'),('ticari','2023-12-01',44.25,'TCMB'),
  ('ticari','2024-01-01',49.00,'TCMB'),('ticari','2024-04-01',54.00,'TCMB'),
  ('ticari','2024-07-01',54.00,'TCMB'),('ticari','2024-10-01',54.00,'TCMB'),
  ('ticari','2025-01-01',49.00,'TCMB'),('ticari','2025-04-01',44.00,'TCMB')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- REESKONT
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('reeskont','2023-07-01',15.75,'TCMB'),('reeskont','2023-09-01',30.75,'TCMB'),
  ('reeskont','2023-12-01',40.75,'TCMB'),('reeskont','2024-01-01',45.50,'TCMB'),
  ('reeskont','2024-04-01',50.50,'TCMB'),('reeskont','2025-01-01',45.50,'TCMB'),
  ('reeskont','2025-04-01',40.50,'TCMB')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- KAMU ALACAKLARI GECİKME ZAMMI (yıllık)
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('kamu_gecikme','2019-07-01',30,'Resmi Gazete (aylık %2.5)'),
  ('kamu_gecikme','2022-01-01',24,'Resmi Gazete (aylık %2)'),
  ('kamu_gecikme','2023-11-01',42,'Resmi Gazete (aylık %3.5)'),
  ('kamu_gecikme','2024-07-01',48,'Resmi Gazete (aylık %4)')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- VERGİ GECİKME FAİZİ
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('vergi_gecikme','2019-07-01',24,'VUK m.112 (aylık %2)'),
  ('vergi_gecikme','2023-11-01',42,'(aylık %3.5)'),
  ('vergi_gecikme','2024-07-01',36,'(aylık %3)')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- SGK GECİKME ZAMMI
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('sgk_gecikme','2019-07-01',30,'5510 s.K. (aylık %2.5)'),
  ('sgk_gecikme','2023-11-01',42,'(aylık %3.5)'),
  ('sgk_gecikme','2024-07-01',48,'(aylık %4)')
ON CONFLICT (tur, baslangic) DO NOTHING;

-- EN YÜKSEK MEVDUAT FAİZİ (kıdem tazminatı, kamulaştırma referans)
INSERT INTO faiz_oranlari (tur, baslangic, oran, kaynak) VALUES
  ('mevduat','2023-01-01',30,'Bankalar ort.'),('mevduat','2023-07-01',40,'Bankalar ort.'),
  ('mevduat','2024-01-01',50,'Bankalar ort.'),('mevduat','2024-07-01',52,'Bankalar ort.'),
  ('mevduat','2025-01-01',45,'Bankalar ort.')
ON CONFLICT (tur, baslangic) DO NOTHING;

CREATE OR REPLACE FUNCTION get_faiz_oranlari()
RETURNS jsonb AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('tur', tur, 'baslangic', baslangic, 'oran', oran, 'kaynak', kaynak)
    ORDER BY tur, baslangic
  ), '[]'::jsonb) FROM faiz_oranlari;
$$ LANGUAGE sql SECURITY DEFINER;
