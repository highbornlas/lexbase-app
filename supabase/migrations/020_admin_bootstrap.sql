-- ══════════════════════════════════════════════════════════════
-- 018 — Admin Bootstrap & RLS Düzeltmeleri
--
-- Sorun: is_platform_admin() platform_adminler tablosunu kontrol eder
-- ama tabloda kayıtlı hesap yok → admin panel veri göstermiyor.
--
-- Çözüm: admin_bootstrap() RPC — Cloudflare Access'i geçen kullanıcı
-- admin paneline ilk eriştiğinde kendini otomatik kaydeder.
-- Güvenlik: Cloudflare Access URL bazlı koruma sağlar.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Eski test admin kaydını temizle ───────────────────────
DELETE FROM platform_adminler WHERE email = 'admin@gmail.com';

-- ── 2. Bootstrap RPC — İlk admin kaydı ──────────────────────
-- SECURITY DEFINER: RLS bypass eder (henüz admin değilken INSERT yapabilmek için)
CREATE OR REPLACE FUNCTION admin_bootstrap(
  p_auth_id UUID,
  p_email TEXT,
  p_ad TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Zaten kayıtlıysa hiçbir şey yapma
  IF EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = p_auth_id) THEN
    RETURN;
  END IF;

  -- auth.uid() eşleşmeli (kendini kaydedebilir, başkasını değil)
  IF p_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'Sadece kendi hesabınızı kaydedebilirsiniz';
  END IF;

  -- İlk admin → super, sonrakiler → admin
  INSERT INTO platform_adminler (auth_id, email, ad, yetki_seviye)
  VALUES (
    p_auth_id,
    p_email,
    p_ad,
    CASE
      WHEN (SELECT count(*) FROM platform_adminler) = 0 THEN 'super'
      ELSE 'admin'
    END
  );
END;
$$;

-- ── 3. platform_adminler INSERT policy güncelle ──────────────
-- Mevcut policy sadece super admin'e izin veriyor
-- Bootstrap RPC SECURITY DEFINER olduğu için RLS bypass eder,
-- ama direkt INSERT için de izin gerekiyor
DROP POLICY IF EXISTS "platform_adminler_insert" ON platform_adminler;
CREATE POLICY "platform_adminler_insert"
  ON platform_adminler FOR INSERT
  WITH CHECK (
    -- Kendi kaydını oluşturabilir (bootstrap)
    auth.uid() = auth_id
    -- Veya mevcut super admin yeni admin ekleyebilir
    OR EXISTS (SELECT 1 FROM platform_adminler WHERE auth_id = auth.uid() AND yetki_seviye = 'super')
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
