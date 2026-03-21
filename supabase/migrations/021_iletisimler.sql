-- İletişim geçmişi tablosu
CREATE TABLE IF NOT EXISTS iletisimler (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buro_id uuid NOT NULL REFERENCES burolar(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_iletisimler_buro ON iletisimler(buro_id);

-- RLS
ALTER TABLE iletisimler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iletisimler_select" ON iletisimler
  FOR SELECT USING (
    buro_id IN (
      SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif'
    )
  );

CREATE POLICY "iletisimler_insert" ON iletisimler
  FOR INSERT WITH CHECK (
    buro_id IN (
      SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif'
    )
  );

CREATE POLICY "iletisimler_update" ON iletisimler
  FOR UPDATE USING (
    buro_id IN (
      SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif'
    )
  );

CREATE POLICY "iletisimler_delete" ON iletisimler
  FOR DELETE USING (
    buro_id IN (
      SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif'
    )
  );
