-- ══════════════════════════════════════════════════════════════
-- Özel Alacak Türleri
-- Büro bazlı kullanıcı tanımlı alacak türleri
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ozel_alacak_turleri (
  id TEXT PRIMARY KEY,
  buro_id UUID NOT NULL REFERENCES burolar(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE ozel_alacak_turleri ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────────

CREATE POLICY "ozel_alacak_turleri_select"
  ON ozel_alacak_turleri FOR SELECT
  USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_alacak_turleri_insert"
  ON ozel_alacak_turleri FOR INSERT
  WITH CHECK (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_alacak_turleri_update"
  ON ozel_alacak_turleri FOR UPDATE
  USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_alacak_turleri_delete"
  ON ozel_alacak_turleri FOR DELETE
  USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

-- ── İndeks ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ozel_alacak_turleri_buro ON ozel_alacak_turleri(buro_id);
