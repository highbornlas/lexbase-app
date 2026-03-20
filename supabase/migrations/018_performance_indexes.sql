-- ================================================================
-- LEXBASE — PERFORMANS İNDEKSLERİ
-- 018_performance_indexes.sql
--
-- JSONB data alanındaki sık sorgulanan key'ler için indeksler.
-- N+1 query sorununun DB tarafındaki çözümü.
-- ================================================================

-- ── muvId indeksleri — müvekkile bağlı dosya sorguları ─────────
CREATE INDEX IF NOT EXISTS idx_davalar_data_muvid
  ON davalar USING btree (((data->>'muvId')));

CREATE INDEX IF NOT EXISTS idx_icra_data_muvid
  ON icra USING btree (((data->>'muvId')));

CREATE INDEX IF NOT EXISTS idx_arabuluculuk_data_muvid
  ON arabuluculuk USING btree (((data->>'muvId')));

CREATE INDEX IF NOT EXISTS idx_ihtarnameler_data_muvid
  ON ihtarnameler USING btree (((data->>'muvId')));

CREATE INDEX IF NOT EXISTS idx_danismanlik_data_muvid
  ON danismanlik USING btree (((data->>'muvId')));

-- ── _silindi indeksleri — soft-delete filtreleme ───────────────
-- Partial index: sadece silinmemiş kayıtları indeksle (daha verimli)
CREATE INDEX IF NOT EXISTS idx_davalar_aktif
  ON davalar (buro_id)
  WHERE (data->>'_silindi') IS NULL;

CREATE INDEX IF NOT EXISTS idx_icra_aktif
  ON icra (buro_id)
  WHERE (data->>'_silindi') IS NULL;

CREATE INDEX IF NOT EXISTS idx_muvekkillar_aktif
  ON muvekkillar (buro_id)
  WHERE (data->>'_silindi') IS NULL;

CREATE INDEX IF NOT EXISTS idx_arabuluculuk_aktif
  ON arabuluculuk (buro_id)
  WHERE (data->>'_silindi') IS NULL;

CREATE INDEX IF NOT EXISTS idx_ihtarnameler_aktif
  ON ihtarnameler (buro_id)
  WHERE (data->>'_silindi') IS NULL;

-- ── _eskiMuvId indeksi — cascade relink sorguları ──────────────
CREATE INDEX IF NOT EXISTS idx_davalar_data_eskimuvid
  ON davalar USING btree (((data->>'_eskiMuvId')))
  WHERE (data->>'_eskiMuvId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_icra_data_eskimuvid
  ON icra USING btree (((data->>'_eskiMuvId')))
  WHERE (data->>'_eskiMuvId') IS NOT NULL;
