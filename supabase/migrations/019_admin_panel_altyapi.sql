-- ══════════════════════════════════════════════════════════════
-- 017 — Admin Panel Altyapısı
-- Platform yönetimi için gerekli tablolar ve güvenlik fonksiyonları
-- ══════════════════════════════════════════════════════════════

-- ── 1. Platform Adminler ─────────────────────────────────────
-- Superadmin kullanıcılar (platform sahibi/yöneticileri)
CREATE TABLE IF NOT EXISTS platform_adminler (
  auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ad TEXT NOT NULL,
  email TEXT NOT NULL,
  yetki_seviye TEXT NOT NULL DEFAULT 'admin' CHECK (yetki_seviye IN ('admin', 'super')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_adminler ENABLE ROW LEVEL SECURITY;

-- Sadece kendisi veya başka bir admin görebilir
CREATE POLICY "platform_adminler_select"
  ON platform_adminler FOR SELECT
  USING (
    auth.uid() = auth_id
    OR EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid())
  );

-- Sadece super seviye admin ekleyebilir/güncelleyebilir
CREATE POLICY "platform_adminler_insert"
  ON platform_adminler FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid() AND yetki_seviye = 'super')
  );

CREATE POLICY "platform_adminler_update"
  ON platform_adminler FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid() AND yetki_seviye = 'super')
  );

CREATE POLICY "platform_adminler_delete"
  ON platform_adminler FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid() AND yetki_seviye = 'super')
    AND auth_id != auth.uid()  -- kendini silemez
  );

-- ── 2. is_platform_admin() — Güvenlik Fonksiyonu ────────────
-- Herhangi bir RPC / RLS policy içinde admin kontrolü yapmak için
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_adminler
    WHERE auth_id = auth.uid()
  );
$$;

-- Super admin kontrolü
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_adminler
    WHERE auth_id = auth.uid()
    AND yetki_seviye = 'super'
  );
$$;

-- ── 3. Plan Limitleri ────────────────────────────────────────
-- Her plan için modül limitleri ve açık özellikler
-- NOT: plan_limitleri tablosu 007_plan_enforcement migration'ında oluşturuldu.
-- PK: plan_id (id değil). Aşağıdaki ALTER komutları yeni sütunları ekler.
-- Orijinal sütunlar: plan_id, ad, muvekkil_limit, dava_limit, icra_limit, personel_limit
ALTER TABLE plan_limitleri ADD COLUMN IF NOT EXISTS aciklama TEXT;
-- (Aşağıdaki CREATE TABLE referans olarak bırakılmıştır, çalıştırılmaz)
-- CREATE TABLE plan_limitleri (
--   plan_id TEXT PRIMARY KEY,
  ad TEXT NOT NULL,                       -- Görünen ad
  aciklama TEXT,                          -- Plan açıklaması
  max_uye INT NOT NULL DEFAULT 3,
  max_dava INT NOT NULL DEFAULT 50,
  max_muvekkil INT NOT NULL DEFAULT 30,
  max_icra INT NOT NULL DEFAULT 30,
  max_depolama_mb INT NOT NULL DEFAULT 500,
  max_belge INT NOT NULL DEFAULT 200,
  ozellikler JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "finans": true, "raporlar": true, "api": false }
  fiyat_aylik NUMERIC(10,2) DEFAULT 0,
  fiyat_yillik NUMERIC(10,2) DEFAULT 0,
  para_birimi TEXT NOT NULL DEFAULT 'TRY',
  sirasi INT NOT NULL DEFAULT 0,          -- Sıralama (landing page vb.)
  aktif BOOLEAN NOT NULL DEFAULT true,
  ozel_plan BOOLEAN NOT NULL DEFAULT false, -- Kurumsal özel plan mı?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plan_limitleri ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (landing page fiyatlandırma için)
CREATE POLICY "plan_limitleri_select"
  ON plan_limitleri FOR SELECT
  USING (true);

-- Sadece admin yazabilir
CREATE POLICY "plan_limitleri_admin_write"
  ON plan_limitleri FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 4. Abonelikler ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abonelikler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buro_id UUID NOT NULL REFERENCES buro(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plan_limitleri(id),
  durum TEXT NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif', 'read_only', 'askida', 'iptal', 'suresi_doldu')),
  baslangic TIMESTAMPTZ NOT NULL DEFAULT now(),
  bitis TIMESTAMPTZ,
  tutar NUMERIC(10,2),
  para_birimi TEXT NOT NULL DEFAULT 'TRY',
  lisans_kodu_id UUID,
  otomatik_yenileme BOOLEAN NOT NULL DEFAULT true,
  notlar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE abonelikler ENABLE ROW LEVEL SECURITY;

-- Büro sahibi kendi aboneliğini görebilir
CREATE POLICY "abonelikler_buro_select"
  ON abonelikler FOR SELECT
  USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
    OR is_platform_admin()
  );

-- Sadece admin yazabilir
CREATE POLICY "abonelikler_admin_write"
  ON abonelikler FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 5. Lisans Kodları ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lisans_kodlari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kod TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plan_limitleri(id),
  sure_gun INT NOT NULL DEFAULT 30,        -- Kaç gün geçerli
  max_kullanim INT NOT NULL DEFAULT 1,
  kullanim_sayisi INT NOT NULL DEFAULT 0,
  durum TEXT NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif', 'kullanildi', 'iptal', 'suresi_doldu')),
  olusturan_admin UUID REFERENCES platform_adminler(auth_id),
  son_kullanma TIMESTAMPTZ,                 -- Kodun son kullanım tarihi
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lisans_kodlari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lisans_kodlari_admin"
  ON lisans_kodlari FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Lisans kodu doğrulama (herkes çağırabilir — kayıt sırasında)
CREATE POLICY "lisans_kodlari_verify"
  ON lisans_kodlari FOR SELECT
  USING (true);

-- ── 6. Ödeme Geçmişi ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odemeler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buro_id UUID NOT NULL REFERENCES buro(id) ON DELETE CASCADE,
  abonelik_id UUID REFERENCES abonelikler(id),
  tutar NUMERIC(10,2) NOT NULL,
  para_birimi TEXT NOT NULL DEFAULT 'TRY',
  odeme_yontemi TEXT CHECK (odeme_yontemi IN ('kredi_karti', 'havale', 'lisans_kodu', 'diger')),
  durum TEXT NOT NULL DEFAULT 'tamamlandi' CHECK (durum IN ('tamamlandi', 'beklemede', 'iptal', 'iade')),
  aciklama TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE odemeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "odemeler_buro_select"
  ON odemeler FOR SELECT
  USING (
    buro_id IN (SELECT buro_id FROM uyelikler WHERE auth_id = auth.uid() AND durum = 'aktif')
    OR is_platform_admin()
  );

CREATE POLICY "odemeler_admin_write"
  ON odemeler FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 7. Platform Duyuruları ───────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_duyurular (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baslik TEXT NOT NULL,
  icerik TEXT NOT NULL,
  tip TEXT NOT NULL DEFAULT 'bilgi' CHECK (tip IN ('bilgi', 'uyari', 'guncelleme', 'bakim')),
  hedef_kitle JSONB NOT NULL DEFAULT '{"tumu": true}'::jsonb,
  yayinlanma_tarihi TIMESTAMPTZ,
  bitis_tarihi TIMESTAMPTZ,
  durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak', 'aktif', 'suresi_doldu')),
  olusturan_admin UUID REFERENCES platform_adminler(auth_id),
  okunma_sayisi INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_duyurular ENABLE ROW LEVEL SECURITY;

-- Aktif duyurular herkes görebilir
CREATE POLICY "duyurular_public_select"
  ON platform_duyurular FOR SELECT
  USING (
    (durum = 'aktif' AND (bitis_tarihi IS NULL OR bitis_tarihi > now()))
    OR is_platform_admin()
  );

CREATE POLICY "duyurular_admin_write"
  ON platform_duyurular FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 8. Destek Talepleri ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS destek_talepleri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buro_id UUID REFERENCES buro(id) ON DELETE SET NULL,
  kullanici_auth_id UUID NOT NULL REFERENCES auth.users(id),
  konu TEXT NOT NULL,
  oncelik TEXT NOT NULL DEFAULT 'normal' CHECK (oncelik IN ('dusuk', 'normal', 'yuksek', 'acil')),
  durum TEXT NOT NULL DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'inceleniyor', 'cozuldu', 'kapatildi')),
  etiketler TEXT[] DEFAULT '{}',
  mesajlar JSONB NOT NULL DEFAULT '[]'::jsonb,
  atanan_admin UUID REFERENCES platform_adminler(auth_id),
  ilk_yanit_tarihi TIMESTAMPTZ,
  cozum_tarihi TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE destek_talepleri ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi taleplerini görebilir
CREATE POLICY "destek_kullanici_select"
  ON destek_talepleri FOR SELECT
  USING (
    kullanici_auth_id = auth.uid()
    OR is_platform_admin()
  );

CREATE POLICY "destek_kullanici_insert"
  ON destek_talepleri FOR INSERT
  WITH CHECK (kullanici_auth_id = auth.uid());

-- Kullanıcı kendi talebine mesaj ekleyebilir (update)
CREATE POLICY "destek_kullanici_update"
  ON destek_talepleri FOR UPDATE
  USING (
    kullanici_auth_id = auth.uid()
    OR is_platform_admin()
  );

-- Sadece admin silebilir
CREATE POLICY "destek_admin_delete"
  ON destek_talepleri FOR DELETE
  USING (is_platform_admin());

-- ── 9. Platform Hukuki Parametreler ──────────────────────────
-- Merkezi hukuk motoru: faiz oranları, asgari ücret vb.
CREATE TABLE IF NOT EXISTS platform_parametreler (
  anahtar TEXT PRIMARY KEY,                 -- 'yasal_faiz_orani', 'asgari_ucret', 'harc_tarifesi_2026' vb.
  deger JSONB NOT NULL,                     -- { "oran": 3.5, "birim": "aylik", "gecerlilik": "2026-01-01" }
  aciklama TEXT,
  kategori TEXT NOT NULL DEFAULT 'genel',   -- 'faiz', 'ucret', 'harc', 'genel'
  guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT now(),
  guncelleyen_admin UUID REFERENCES platform_adminler(auth_id)
);

ALTER TABLE platform_parametreler ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (finans/icra hesaplamalarında kullanılır)
CREATE POLICY "parametreler_public_select"
  ON platform_parametreler FOR SELECT
  USING (true);

-- Sadece admin yazabilir
CREATE POLICY "parametreler_admin_write"
  ON platform_parametreler FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 10. Platform İndirimler ──────────────────────────────────
-- Süreli kampanya / indirim yönetimi
CREATE TABLE IF NOT EXISTS platform_indirimler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,                          -- 'Yeni Yıl Kampanyası'
  indirim_tipi TEXT NOT NULL CHECK (indirim_tipi IN ('yuzde', 'sabit')),
  indirim_degeri NUMERIC(10,2) NOT NULL,     -- %20 için 20, 100₺ için 100
  plan_id TEXT REFERENCES plan_limitleri(id), -- NULL = tüm planlar
  baslangic TIMESTAMPTZ NOT NULL,
  bitis TIMESTAMPTZ NOT NULL,
  kupon_kodu TEXT UNIQUE,                    -- Opsiyonel kupon kodu
  max_kullanim INT,                          -- NULL = sınırsız
  kullanim_sayisi INT NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  olusturan_admin UUID REFERENCES platform_adminler(auth_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_indirimler ENABLE ROW LEVEL SECURITY;

-- Aktif indirimleri herkes görebilir (landing page)
CREATE POLICY "indirimler_public_select"
  ON platform_indirimler FOR SELECT
  USING (
    (aktif = true AND baslangic <= now() AND bitis > now())
    OR is_platform_admin()
  );

CREATE POLICY "indirimler_admin_write"
  ON platform_indirimler FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ── 11. Admin Audit Log ──────────────────────────────────────
-- Admin işlemleri ayrı loglama (daha hassas)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_auth_id UUID NOT NULL REFERENCES platform_adminler(auth_id),
  islem TEXT NOT NULL,                      -- 'plan_degistir', 'buro_askiya_al', 'lisans_olustur' vb.
  hedef_tablo TEXT,
  hedef_kayit_id TEXT,
  detay JSONB DEFAULT '{}'::jsonb,
  ip_adresi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_select"
  ON admin_audit_log FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "admin_audit_insert"
  ON admin_audit_log FOR INSERT
  WITH CHECK (is_platform_admin());

-- ── 12. Varsayılan Plan Limitleri ────────────────────────────
INSERT INTO plan_limitleri (id, ad, aciklama, max_uye, max_dava, max_muvekkil, max_icra, max_depolama_mb, max_belge, fiyat_aylik, fiyat_yillik, sirasi, ozellikler)
VALUES
  ('trial', 'Deneme', '30 gün ücretsiz deneme', 3, 25, 15, 15, 250, 100, 0, 0, 0,
    '{"finans": true, "raporlar": false, "api": false, "toplu_islem": false}'::jsonb),
  ('baslangic', 'Başlangıç', 'Bireysel avukatlar için', 2, 50, 30, 30, 500, 200, 199, 1990, 1,
    '{"finans": true, "raporlar": true, "api": false, "toplu_islem": false}'::jsonb),
  ('profesyonel', 'Profesyonel', 'Küçük-orta bürolaı için', 10, 500, 200, 200, 5000, 2000, 399, 3990, 2,
    '{"finans": true, "raporlar": true, "api": true, "toplu_islem": true}'::jsonb),
  ('kurumsal', 'Kurumsal', 'Büyük bürolaı için özel', 999, 99999, 99999, 99999, 50000, 99999, 0, 0, 3,
    '{"finans": true, "raporlar": true, "api": true, "toplu_islem": true, "ozel_destek": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── 13. İndeksler ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_abonelikler_buro ON abonelikler(buro_id);
CREATE INDEX IF NOT EXISTS idx_abonelikler_durum ON abonelikler(durum);
CREATE INDEX IF NOT EXISTS idx_odemeler_buro ON odemeler(buro_id);
CREATE INDEX IF NOT EXISTS idx_lisans_kodlari_kod ON lisans_kodlari(kod);
CREATE INDEX IF NOT EXISTS idx_destek_talepleri_durum ON destek_talepleri(durum);
CREATE INDEX IF NOT EXISTS idx_destek_talepleri_kullanici ON destek_talepleri(kullanici_auth_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_auth_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_tarih ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_duyurular_durum ON platform_duyurular(durum);
CREATE INDEX IF NOT EXISTS idx_platform_indirimler_aktif ON platform_indirimler(aktif, baslangic, bitis);

-- ── 14. Admin İstatistik RPC ─────────────────────────────────
-- Dashboard için platform geneli istatistikler
CREATE OR REPLACE FUNCTION admin_platform_istatistik()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sonuc JSONB;
BEGIN
  -- Sadece admin çağırabilir
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  SELECT jsonb_build_object(
    'toplam_buro', (SELECT count(*) FROM buro),
    'toplam_kullanici', (SELECT count(*) FROM auth.users),
    'toplam_dava', (SELECT count(*) FROM dava),
    'toplam_icra', (SELECT count(*) FROM icra),
    'toplam_muvekkil', (SELECT count(*) FROM muvekkil),
    'aktif_abonelik', (SELECT count(*) FROM abonelikler WHERE durum = 'aktif'),
    'bekleyen_destek', (SELECT count(*) FROM destek_talepleri WHERE durum IN ('bekliyor', 'inceleniyor')),
    'aktif_duyuru', (SELECT count(*) FROM platform_duyurular WHERE durum = 'aktif'),
    'bugunki_giris', (SELECT count(*) FROM ip_loglari WHERE created_at > now() - interval '24 hours'),
    'haftalik_giris', (SELECT count(*) FROM ip_loglari WHERE created_at > now() - interval '7 days')
  ) INTO sonuc;

  RETURN sonuc;
END;
$$;
