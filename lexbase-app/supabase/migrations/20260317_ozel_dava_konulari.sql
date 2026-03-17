-- Özel dava konuları tablosu (büro bazlı)
CREATE TABLE IF NOT EXISTS ozel_dava_konulari (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buro_id uuid NOT NULL REFERENCES burolar(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ozel_dava_konulari_buro ON ozel_dava_konulari(buro_id);

ALTER TABLE ozel_dava_konulari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ozel_dava_konulari_select" ON ozel_dava_konulari
  FOR SELECT USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_dava_konulari_insert" ON ozel_dava_konulari
  FOR INSERT WITH CHECK (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_dava_konulari_update" ON ozel_dava_konulari
  FOR UPDATE USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );

CREATE POLICY "ozel_dava_konulari_delete" ON ozel_dava_konulari
  FOR DELETE USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
  );
