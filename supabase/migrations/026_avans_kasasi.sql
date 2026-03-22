-- ══════════════════════════════════════════════════════════════
-- 026: Avans Kasası (Müvekkil Masraf Avansı Yönetim Sistemi)
-- ══════════════════════════════════════════════════════════════

-- Avans hareketleri tablosu (alım, masraf, iade)
CREATE TABLE IF NOT EXISTS avans_hareketleri (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buro_id UUID NOT NULL REFERENCES burolar(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE avans_hareketleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avans_hareketleri_select" ON avans_hareketleri
  FOR SELECT USING (buro_id = get_user_buro_id());

CREATE POLICY "avans_hareketleri_insert" ON avans_hareketleri
  FOR INSERT WITH CHECK (buro_id = get_user_buro_id());

CREATE POLICY "avans_hareketleri_update" ON avans_hareketleri
  FOR UPDATE USING (buro_id = get_user_buro_id())
  WITH CHECK (buro_id = get_user_buro_id());

CREATE POLICY "avans_hareketleri_delete" ON avans_hareketleri
  FOR DELETE USING (buro_id = get_user_buro_id());

-- Performans indexleri
CREATE INDEX idx_avans_hareketleri_buro ON avans_hareketleri(buro_id);
CREATE INDEX idx_avans_hareketleri_muv ON avans_hareketleri((data->>'muvId'));
CREATE INDEX idx_avans_hareketleri_tip ON avans_hareketleri((data->>'tip'));
CREATE INDEX idx_avans_hareketleri_silindi ON avans_hareketleri((data->>'_silindi'))
  WHERE data->>'_silindi' IS NULL;
