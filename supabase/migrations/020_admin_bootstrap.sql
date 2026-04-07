-- ══════════════════════════════════════════════════════════════
-- 018 — Admin Bootstrap & RLS Düzeltmeleri
--
-- Sorun: is_platform_admin() platform_adminler tablosunu kontrol eder
-- ama tabloda kayıtlı hesap yok → admin panel veri göstermiyor.
--
-- Çözüm: admin_bootstrap() RPC sadece önceden izin verilmiş hesapları
-- admin paneline ilk erişimde platform_adminler tablosuna kaydeder.
-- İlk admin ataması service-role / SQL ile açıkça izin verilerek yapılır.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Bootstrap izin listesi ────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admin_bootstrap_izinleri (
  email TEXT PRIMARY KEY,
  yetki_seviye TEXT NOT NULL DEFAULT 'admin' CHECK (yetki_seviye IN ('admin', 'super')),
  aktif BOOLEAN NOT NULL DEFAULT true,
  kullanilan_auth_id UUID REFERENCES auth.users(id),
  kullanildi_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_admin_bootstrap_izinleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_bootstrap_izinleri_select" ON platform_admin_bootstrap_izinleri;
CREATE POLICY "platform_admin_bootstrap_izinleri_select"
  ON platform_admin_bootstrap_izinleri FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "platform_admin_bootstrap_izinleri_write" ON platform_admin_bootstrap_izinleri;
CREATE POLICY "platform_admin_bootstrap_izinleri_write"
  ON platform_admin_bootstrap_izinleri FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- İlk admin için örnek seed (yorum satırı olarak bırakılır):
-- INSERT INTO platform_admin_bootstrap_izinleri (email, yetki_seviye)
-- VALUES ('owner@lexbase.app', 'super');

-- ── 2. Bootstrap RPC — İzinli admin kaydı ────────────────────
-- SECURITY DEFINER: izinli ama henüz admin olmayan hesapların kaydını oluşturur.
CREATE OR REPLACE FUNCTION admin_bootstrap(
  p_auth_id UUID,
  p_email TEXT,
  p_ad TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_izin platform_admin_bootstrap_izinleri%ROWTYPE;
BEGIN
  -- Zaten kayıtlıysa hiçbir şey yapma
  IF EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = p_auth_id) THEN
    RETURN;
  END IF;

  -- auth.uid() eşleşmeli (kendini kaydedebilir, başkasını değil)
  IF p_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'Sadece kendi hesabınızı kaydedebilirsiniz';
  END IF;

  IF v_email = '' THEN
    RAISE EXCEPTION 'Admin bootstrap için e-posta zorunludur';
  END IF;

  SELECT *
    INTO v_izin
    FROM platform_admin_bootstrap_izinleri
   WHERE email = v_email
     AND aktif = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bu hesap için admin bootstrap izni tanımlı değil';
  END IF;

  INSERT INTO platform_adminler (auth_id, email, ad, yetki_seviye)
  VALUES (
    p_auth_id,
    v_email,
    coalesce(nullif(trim(p_ad), ''), split_part(v_email, '@', 1)),
    v_izin.yetki_seviye
  );

  UPDATE platform_admin_bootstrap_izinleri
     SET aktif = false,
         kullanilan_auth_id = p_auth_id,
         kullanildi_at = now(),
         updated_at = now()
   WHERE email = v_email;
END;
$$;

-- ── 3. platform_adminler INSERT policy güncelle ──────────────
-- Direkt INSERT sadece mevcut super admin tarafından yapılabilsin.
DROP POLICY IF EXISTS "platform_adminler_insert" ON platform_adminler;
CREATE POLICY "platform_adminler_insert"
  ON platform_adminler FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid() AND yetki_seviye = 'super')
  );

-- ── 4. Admin RLS politikaları — Core tablolar ────────────────
-- Büroları admin görebilsin (tüm büroları listelemek için)
DO $$
BEGIN
  -- burolar admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'burolar_admin_select' AND tablename = 'burolar') THEN
    EXECUTE 'CREATE POLICY "burolar_admin_select" ON burolar FOR SELECT USING (is_platform_admin())';
  END IF;

  -- kullanicilar admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kullanicilar_admin_select' AND tablename = 'kullanicilar') THEN
    EXECUTE 'CREATE POLICY "kullanicilar_admin_select" ON kullanicilar FOR SELECT USING (is_platform_admin())';
  END IF;

  -- davalar admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'davalar_admin_select' AND tablename = 'davalar') THEN
    EXECUTE 'CREATE POLICY "davalar_admin_select" ON davalar FOR SELECT USING (is_platform_admin())';
  END IF;

  -- icra admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'icra_admin_select' AND tablename = 'icra') THEN
    EXECUTE 'CREATE POLICY "icra_admin_select" ON icra FOR SELECT USING (is_platform_admin())';
  END IF;

  -- muvekkillar admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'muvekkillar_admin_select' AND tablename = 'muvekkillar') THEN
    EXECUTE 'CREATE POLICY "muvekkillar_admin_select" ON muvekkillar FOR SELECT USING (is_platform_admin())';
  END IF;

  -- uyelikler admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'uyelikler_admin_select' AND tablename = 'uyelikler') THEN
    EXECUTE 'CREATE POLICY "uyelikler_admin_select" ON uyelikler FOR SELECT USING (is_platform_admin())';
  END IF;

  -- ip_loglari admin select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ip_loglari_admin_select' AND tablename = 'ip_loglari') THEN
    EXECUTE 'CREATE POLICY "ip_loglari_admin_select" ON ip_loglari FOR SELECT USING (is_platform_admin())';
  END IF;
END
$$;
