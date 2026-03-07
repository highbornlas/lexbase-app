-- ================================================================
-- LEXBASE — İHTARNAME MODÜLÜ SUPABASE MİGRASYONU
-- Dosya: supabase/migrations/002_ihtarname_upgrade.sql
--
-- Bu dosya doğrudan Supabase SQL Editor'de çalıştırılabilir.
-- Mevcut notices/ihtarnameler tablosunu genişletir,
-- Foreign Key'ler, Trigger'lar ve RPC fonksiyonları oluşturur.
-- ================================================================

-- ── 1. ENUM TİPLERİ ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notice_direction AS ENUM ('Giden', 'Gelen');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notice_type AS ENUM ('İhtarname', 'Protesto', 'İhbar', 'Fesih Bildirimi', 'Diğer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_method AS ENUM ('Noter', 'KEP', 'PTT', 'Elden', 'Diğer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('Bekliyor', 'Tebliğ Edildi', 'Bila', 'İade', 'Posta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. NOTICES (İHTARNAMELER) TABLOSU ────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buro_id           uuid NOT NULL REFERENCES burolar(id) ON DELETE CASCADE,
  
  -- Temel Bilgiler
  notice_no         varchar(50),
  direction         notice_direction NOT NULL DEFAULT 'Giden',
  type              notice_type NOT NULL DEFAULT 'İhtarname',
  subject           text NOT NULL,
  content           text,
  
  -- Taraf İlişkileri (Foreign Key)
  client_id         uuid NOT NULL REFERENCES muvekkillar(id) ON DELETE RESTRICT,
  opposing_party_id uuid REFERENCES karsi_taraflar(id) ON DELETE SET NULL,
  
  -- Dosya İlişkisi
  case_id           uuid REFERENCES davalar(id) ON DELETE SET NULL,
  icra_id           uuid REFERENCES icra_dosyalari(id) ON DELETE SET NULL,
  
  -- Gönderim Bilgileri
  delivery_method   delivery_method DEFAULT 'Noter',
  delivery_info     jsonb DEFAULT '{}'::jsonb,
  -- delivery_info örnekleri:
  -- Noter:  {"noter_adi": "İstanbul 1. Noterliği", "yevmiye_no": "12345"}
  -- KEP:    {"kep_adresi": "firma@hs01.kep.tr", "delil_no": "ABC-123"}
  -- PTT:    {"barkod_no": "RR123456789TR"}
  
  notice_date       date DEFAULT CURRENT_DATE,
  
  -- Tebliğ Bilgileri
  delivery_status   delivery_status NOT NULL DEFAULT 'Bekliyor',
  delivery_date     date,
  
  -- Süre Takibi
  given_time_days   int,
  response_deadline date, -- Hesaplanmış: delivery_date + given_time_days
  
  -- Masraf Bilgileri
  expense_amount    numeric(12,2) DEFAULT 0,
  is_expense_billed boolean DEFAULT true,
  
  -- Meta
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_notices_buro ON notices(buro_id);
CREATE INDEX IF NOT EXISTS idx_notices_client ON notices(client_id);
CREATE INDEX IF NOT EXISTS idx_notices_opposing ON notices(opposing_party_id);
CREATE INDEX IF NOT EXISTS idx_notices_case ON notices(case_id);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notices_date ON notices(notice_date DESC);

-- ── 3. RLS (Row Level Security) ──────────────────────────────
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_select" ON notices FOR SELECT
  USING (buro_id = current_setting('app.buro_id', true)::uuid);

CREATE POLICY "notices_insert" ON notices FOR INSERT
  WITH CHECK (buro_id = current_setting('app.buro_id', true)::uuid);

CREATE POLICY "notices_update" ON notices FOR UPDATE
  USING (buro_id = current_setting('app.buro_id', true)::uuid);

CREATE POLICY "notices_delete" ON notices FOR DELETE
  USING (buro_id = current_setting('app.buro_id', true)::uuid);

-- ── 4. UPDATED_AT TRİGGER ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_notices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notices_updated ON notices;
CREATE TRIGGER trg_notices_updated
  BEFORE UPDATE ON notices
  FOR EACH ROW
  EXECUTE FUNCTION update_notices_timestamp();

-- ── 5. SÜRE HESAPLAMA TRİGGER ────────────────────────────────
-- delivery_date ve given_time_days doluysa response_deadline hesapla
CREATE OR REPLACE FUNCTION calc_notice_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_date IS NOT NULL AND NEW.given_time_days IS NOT NULL AND NEW.given_time_days > 0 THEN
    NEW.response_deadline = NEW.delivery_date + (NEW.given_time_days || ' days')::interval;
  ELSE
    NEW.response_deadline = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_deadline ON notices;
CREATE TRIGGER trg_notice_deadline
  BEFORE INSERT OR UPDATE ON notices
  FOR EACH ROW
  EXECUTE FUNCTION calc_notice_deadline();

-- ── 6. FİNANS OTOMASYONu — Masraf Tahakkuku ─────────────────
-- İhtarname kaydedildiğinde expense_amount > 0 ve is_expense_billed = true ise
-- finance_transactions tablosuna otomatik borç kaydı ekle
CREATE OR REPLACE FUNCTION auto_notice_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece yeni kayıtta veya tutar değiştiğinde
  IF (TG_OP = 'INSERT' AND NEW.expense_amount > 0 AND NEW.is_expense_billed = true)
     OR (TG_OP = 'UPDATE' AND NEW.expense_amount > 0 AND NEW.is_expense_billed = true
         AND (OLD.expense_amount IS DISTINCT FROM NEW.expense_amount
              OR OLD.is_expense_billed IS DISTINCT FROM NEW.is_expense_billed)) THEN
    
    -- Eski kaydı sil (güncelleme durumunda)
    IF TG_OP = 'UPDATE' THEN
      DELETE FROM finance_transactions 
      WHERE related_notice_id = NEW.id AND type = 'Masraf';
    END IF;
    
    -- Yeni masraf kaydı oluştur
    INSERT INTO finance_transactions (
      buro_id, client_id, amount, type, description, 
      transaction_date, related_notice_id
    ) VALUES (
      NEW.buro_id,
      NEW.client_id,
      -1 * NEW.expense_amount,  -- Borç (negatif)
      'Masraf',
      NEW.notice_no || ' numaralı ' || NEW.type::text || ' masrafı',
      NEW.notice_date,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_expense ON notices;
CREATE TRIGGER trg_notice_expense
  AFTER INSERT OR UPDATE ON notices
  FOR EACH ROW
  EXECUTE FUNCTION auto_notice_expense();

-- ── 7. GÖREV OTOMASYONu — Süre Dolunca Görev Oluştur ────────
-- Tebliğ edildiğinde ve süre verildiyse otomatik görev oluştur
CREATE OR REPLACE FUNCTION auto_notice_task()
RETURNS TRIGGER AS $$
BEGIN
  -- delivery_status 'Tebliğ Edildi' olarak değiştirildiğinde
  IF NEW.delivery_status = 'Tebliğ Edildi' 
     AND NEW.delivery_date IS NOT NULL
     AND NEW.given_time_days IS NOT NULL 
     AND NEW.given_time_days > 0
     AND (TG_OP = 'INSERT' 
          OR OLD.delivery_status IS DISTINCT FROM NEW.delivery_status
          OR OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) THEN
    
    -- Daha önce oluşturulmuş görevi sil
    DELETE FROM tasks 
    WHERE related_notice_id = NEW.id AND auto_generated = true;
    
    -- Yeni görev oluştur
    INSERT INTO tasks (
      buro_id, title, description, due_date, status, 
      priority, related_notice_id, auto_generated,
      assigned_to
    ) VALUES (
      NEW.buro_id,
      NEW.notice_no || ' — İhtarname Süresi Doldu',
      'Tebliğ: ' || to_char(NEW.delivery_date, 'DD.MM.YYYY') 
        || ' | Süre: ' || NEW.given_time_days || ' gün'
        || ' | Son gün: ' || to_char(NEW.response_deadline, 'DD.MM.YYYY'),
      NEW.response_deadline,
      'Bekliyor',
      'Yüksek',
      NEW.id,
      true,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_task ON notices;
CREATE TRIGGER trg_notice_task
  AFTER INSERT OR UPDATE ON notices
  FOR EACH ROW
  EXECUTE FUNCTION auto_notice_task();

-- ── 8. FİNANS TABLOSUNA related_notice_id EKLEMESİ ──────────
-- (Eğer finance_transactions tablosu mevcutsa)
DO $$ BEGIN
  ALTER TABLE finance_transactions 
    ADD COLUMN IF NOT EXISTS related_notice_id uuid REFERENCES notices(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 9. GÖREVLER TABLOSUNA ALANLAR EKLEMESİ ──────────────────
-- (Eğer tasks tablosu mevcutsa)
DO $$ BEGIN
  ALTER TABLE tasks 
    ADD COLUMN IF NOT EXISTS related_notice_id uuid REFERENCES notices(id) ON DELETE SET NULL;
  ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS auto_generated boolean DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 10. GÖRÜNÜM (VIEW) — İhtarname Özet ─────────────────────
CREATE OR REPLACE VIEW v_notices_summary AS
SELECT 
  n.id,
  n.notice_no,
  n.direction,
  n.type,
  n.subject,
  n.delivery_method,
  n.delivery_status,
  n.notice_date,
  n.delivery_date,
  n.response_deadline,
  n.expense_amount,
  n.given_time_days,
  c.ad_soyad AS client_name,
  op.ad AS opposing_party_name,
  d.dosya_no AS case_no,
  d.konu AS case_subject,
  n.created_at
FROM notices n
LEFT JOIN muvekkillar c ON n.client_id = c.id
LEFT JOIN karsi_taraflar op ON n.opposing_party_id = op.id
LEFT JOIN davalar d ON n.case_id = d.id
ORDER BY n.notice_date DESC;

-- ── 11. RPC: İhtarname İstatistikleri ────────────────────────
CREATE OR REPLACE FUNCTION get_notice_stats(p_buro_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'toplam', COUNT(*),
    'giden', COUNT(*) FILTER (WHERE direction = 'Giden'),
    'gelen', COUNT(*) FILTER (WHERE direction = 'Gelen'),
    'teblig_bekliyor', COUNT(*) FILTER (WHERE delivery_status = 'Bekliyor'),
    'teblig_edildi', COUNT(*) FILTER (WHERE delivery_status = 'Tebliğ Edildi'),
    'bila', COUNT(*) FILTER (WHERE delivery_status = 'Bila'),
    'toplam_masraf', COALESCE(SUM(expense_amount) FILTER (WHERE expense_amount > 0), 0),
    'yaklaşan_sureler', COUNT(*) FILTER (
      WHERE response_deadline IS NOT NULL 
      AND response_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    )
  ) INTO result
  FROM notices
  WHERE buro_id = p_buro_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- KURULUM TAMAMLANDI
-- ================================================================
-- Bu migration çalıştırıldıktan sonra:
-- 1. notices tablosu oluşturulur (veya güncellenir)
-- 2. RLS politikaları etkinleşir
-- 3. Masraf otomasyonu aktif olur (INSERT/UPDATE trigger)
-- 4. Görev otomasyonu aktif olur (tebliğ + süre = otomatik görev)
-- 5. response_deadline otomatik hesaplanır
-- ================================================================
