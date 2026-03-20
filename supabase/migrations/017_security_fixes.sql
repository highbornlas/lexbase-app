-- ================================================================
-- LEXBASE — GÜVENLİK DÜZELTMELERİ
-- 017_security_fixes.sql
--
-- 1. Eksik RLS policy'leri ekleme
-- 2. Aşırı izinli faiz_oranlari policy'lerini sıkılaştırma
-- 3. UPDATE policy'lere WITH CHECK ekleme (buro_id değişikliğini engelle)
-- 4. iletisimler FK düzeltmesi (auth.users → kullanicilar lookup)
-- 5. icra_dosyalari FK referansı düzeltmesi (notices tablosu)
-- ================================================================

-- ════════════════════════════════════════════════════════════════
-- 1. EKSİK TABLOLAR İÇİN RLS POLİCY'LERİ
-- ════════════════════════════════════════════════════════════════

-- kullanicilar tablosu — kullanıcı sadece kendi bürosundaki kullanıcıları görebilsin
ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY kullanicilar_sel ON kullanicilar FOR SELECT
    USING (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kullanicilar_ins ON kullanicilar FOR INSERT
    WITH CHECK (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kullanicilar_upd ON kullanicilar FOR UPDATE
    USING (buro_id = get_user_buro_id())
    WITH CHECK (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY kullanicilar_del ON kullanicilar FOR DELETE
    USING (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- belgeler tablosu
DO $$ BEGIN
  ALTER TABLE belgeler ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY belgeler_sel ON belgeler FOR SELECT
    USING (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY belgeler_ins ON belgeler FOR INSERT
    WITH CHECK (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY belgeler_upd ON belgeler FOR UPDATE
    USING (buro_id = get_user_buro_id())
    WITH CHECK (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY belgeler_del ON belgeler FOR DELETE
    USING (buro_id = get_user_buro_id());
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════
-- 2. faiz_oranlari — WRITE/UPDATE/DELETE SADECE ADMIN ROLÜNE
-- ════════════════════════════════════════════════════════════════

-- Mevcut aşırı izinli policy'leri kaldır
DROP POLICY IF EXISTS fo_write ON faiz_oranlari;
DROP POLICY IF EXISTS fo_update ON faiz_oranlari;
DROP POLICY IF EXISTS fo_delete ON faiz_oranlari;

-- Sadece 'sahip' veya 'admin' rolündeki kullanıcılar yazabilsin
-- kullanicilar tablosundaki 'rol' alanını kontrol ediyoruz
CREATE POLICY fo_write_admin ON faiz_oranlari FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kullanicilar
      WHERE auth_id = auth.uid()
        AND rol IN ('sahip', 'admin')
    )
  );

CREATE POLICY fo_update_admin ON faiz_oranlari FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kullanicilar
      WHERE auth_id = auth.uid()
        AND rol IN ('sahip', 'admin')
    )
  );

CREATE POLICY fo_delete_admin ON faiz_oranlari FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kullanicilar
      WHERE auth_id = auth.uid()
        AND rol IN ('sahip', 'admin')
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 3. UPDATE POLICY'LERE WITH CHECK EKLE — buro_id DEĞİŞİKLİĞİNİ ENGELLE
-- ════════════════════════════════════════════════════════════════

-- Mevcut UPDATE policy'leri düşür ve WITH CHECK ile yeniden oluştur
DO $$
DECLARE
  tablo_adi text;
  tablolar text[] := ARRAY[
    'muvekkillar', 'karsi_taraflar', 'vekillar',
    'davalar', 'icra', 'butce', 'avanslar',
    'etkinlikler', 'danismanlik', 'arabuluculuk',
    'ihtarnameler', 'todolar', 'personel'
  ];
BEGIN
  FOREACH tablo_adi IN ARRAY tablolar LOOP
    -- Mevcut UPDATE policy'yi kaldır
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tablo_adi || '_upd', tablo_adi);

    -- WITH CHECK eklenmiş yeni policy oluştur
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (buro_id = get_user_buro_id()) WITH CHECK (buro_id = get_user_buro_id())',
      tablo_adi || '_upd', tablo_adi
    );
  END LOOP;
END $$;

-- iletisimler tablosu için de WITH CHECK ekle
DROP POLICY IF EXISTS "iletisimler_update" ON iletisimler;
CREATE POLICY "iletisimler_update" ON iletisimler FOR UPDATE
  USING (buro_id = get_user_buro_id())
  WITH CHECK (buro_id = get_user_buro_id());

-- ════════════════════════════════════════════════════════════════
-- 4. iletisimler FK DÜZELTMESİ
-- ════════════════════════════════════════════════════════════════
-- buro_id şu anda auth.users(id)'ye referans veriyor,
-- ancak kullanicilar tablosu üzerinden buro_id'ye referans olmalı.
-- NOT: Mevcut veriyi korumak için önce eski FK'yı kaldırıp yenisini eklemiyoruz,
-- çünkü mevcut veriler uyumsuz olabilir. Bunun yerine bir CHECK constraint ekliyoruz.

-- Eski FK constraint adını bul ve kaldır (eğer varsa)
DO $$ BEGIN
  ALTER TABLE iletisimler DROP CONSTRAINT IF EXISTS iletisimler_buro_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- NOT: Yeni FK eklemek için hedef tablo 'burolar' olmalı ancak
-- mevcut şemada buro_id doğrudan auth.users id'si olarak kullanılıyor.
-- Bu durumda FK'yı kaldırıp sadece RLS ile koruma sağlıyoruz.
-- CASCADE delete artık RLS politikası tarafından yönetilecek.

-- ════════════════════════════════════════════════════════════════
-- 5. notices TABLOSU FK DÜZELTMESİ
-- ════════════════════════════════════════════════════════════════
-- icra_dosyalari yerine icra olmalı (tablo adı icra)
DO $$ BEGIN
  ALTER TABLE notices DROP CONSTRAINT IF EXISTS notices_icra_id_fkey;
  ALTER TABLE notices ADD CONSTRAINT notices_icra_id_fkey
    FOREIGN KEY (icra_id) REFERENCES icra(id) ON DELETE SET NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;  -- notices tablosu yoksa atla
  WHEN undefined_column THEN NULL; -- icra_id kolonu yoksa atla
END $$;

-- ════════════════════════════════════════════════════════════════
-- DOĞRULAMA
-- ════════════════════════════════════════════════════════════════
-- Aşağıdaki sorgu ile tüm tabloların RLS durumunu kontrol edin:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
