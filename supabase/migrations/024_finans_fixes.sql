-- ================================================================
-- LEXBASE — Finans Hesaplama Hata Düzeltmeleri
-- 024_finans_fixes.sql
--
-- FIX 1: Hakediş orphan kayıtları (Tahsilat DELETE → hakediş temizle)
-- FIX 2: finans_buro_kar_zarar ay indeksleme hatası (0→1 indexed)
-- FIX 3: Hakediş trigger atomicity (exception block)
-- FIX 4: trg_hakedis DELETE event ekleme
-- FIX 5: finans_uyarilar eşik değerlerini değişken yap
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- FIX 1 + FIX 3 + FIX 4: Hakediş trigger — DELETE desteği,
-- atomicity (exception block), orphan temizliği
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_hakedis_hesapla()
RETURNS TRIGGER AS $$
DECLARE
  v_tur text;
  v_dosya_id text;
  v_tutar numeric;
  v_anlasma record;
  v_hakedis numeric;
  v_muv_id text;
BEGIN
  -- ── FIX 1 & FIX 4: Tahsilat silindiğinde ilişkili oto-hakediş kayıtlarını temizle ──
  IF TG_OP = 'DELETE' THEN
    IF OLD.data->>'tur' = 'Tahsilat' THEN
      DELETE FROM finans_islemler
      WHERE buro_id = OLD.buro_id
        AND data->>'_kaynakId' = OLD.id
        AND (data->>'_otoHakedis')::boolean = true;
    END IF;
    RETURN OLD;
  END IF;

  v_tur := NEW.data->>'tur';
  v_dosya_id := NEW.data->>'dosyaId';
  v_tutar := COALESCE((NEW.data->>'tutar')::numeric, 0);
  v_muv_id := NEW.data->>'muvId';

  -- Sadece Tahsilat türündeki işlemler için çalış
  IF v_tur != 'Tahsilat' OR v_dosya_id IS NULL OR v_tutar <= 0 THEN
    RETURN NEW;
  END IF;

  -- İlişkili ücret anlaşmasını bul
  SELECT * INTO v_anlasma FROM ucret_anlasmalari
  WHERE buro_id = NEW.buro_id AND data->>'dosyaId' = v_dosya_id
  LIMIT 1;

  IF v_anlasma IS NULL THEN RETURN NEW; END IF;

  -- Yüzdelik anlaşma varsa hakediş hesapla
  IF v_anlasma.data->>'anlasmaTuru' IN ('tahsilat', 'basari') THEN
    v_hakedis := v_tutar * COALESCE((v_anlasma.data->>'yuzde')::numeric, 0) / 100;

    IF v_hakedis > 0 THEN
      -- ── FIX 3: Exception block ile atomicity ──
      -- Hakediş oluşturma başarısız olursa ana Tahsilat INSERT'i etkilenmez
      BEGIN
        -- Eski otomatik hakedişi sil (bu tahsilat için)
        DELETE FROM finans_islemler
        WHERE buro_id = NEW.buro_id
          AND (data->>'_kaynakId') = NEW.id
          AND (data->>'_otoHakedis')::boolean = true;

        -- Yeni hakediş kaydı oluştur
        INSERT INTO finans_islemler (id, buro_id, data) VALUES (
          gen_random_uuid()::text,
          NEW.buro_id,
          jsonb_build_object(
            'muvId', v_muv_id,
            'tur', 'Hakediş',
            'yön', 'alacak',
            'tutar', v_hakedis,
            'tarih', NEW.data->>'tarih',
            'aciklama', 'Tahsilat payı (%' || (v_anlasma.data->>'yuzde') || ') — ' || COALESCE(NEW.data->>'aciklama', ''),
            'kategori', 'Avukatlık Ücreti',
            'dosyaTur', NEW.data->>'dosyaTur',
            'dosyaId', v_dosya_id,
            'dosyaNo', COALESCE(NEW.data->>'dosyaNo', ''),
            'durum', 'Onaylandı',
            '_kaynakId', NEW.id,
            '_otoHakedis', true
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Hakediş oluşturulamadı: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FIX 4: Trigger'ı DELETE dahil olacak şekilde yeniden oluştur
DROP TRIGGER IF EXISTS trg_hakedis ON finans_islemler;
CREATE TRIGGER trg_hakedis
  AFTER INSERT OR UPDATE OR DELETE ON finans_islemler
  FOR EACH ROW
  EXECUTE FUNCTION fn_hakedis_hesapla();


-- ────────────────────────────────────────────────────────────────
-- FIX 2: finans_buro_kar_zarar — Ay parametresi 1-indexed olmalı
-- Ocak=1, Şubat=2, ..., Aralık=12
-- Eski davranış: p_ay 0-indexed, lpad((p_ay+1)::text, 2, '0')
-- Yeni davranış: p_ay 1-indexed, lpad(p_ay::text, 2, '0')
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_buro_kar_zarar(
  p_buro_id uuid,
  p_yil int DEFAULT NULL,
  p_ay int DEFAULT NULL  -- 1-indexed: Ocak=1, Şubat=2, ..., Aralık=12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := '';
  v_akdi numeric := 0;
  v_hakedis numeric := 0;
  v_dan_gelir numeric := 0;
  v_arab_gelir numeric := 0;
  v_diger_gelir numeric := 0;
  v_toplam_gelir numeric;
  v_buro_gider_toplam numeric := 0;
  v_buro_kat jsonb;
  v_toplam_gider numeric;
  v_net numeric;
  rec record;
  t jsonb;
  toplanti jsonb;
  v_tutar numeric;
BEGIN
  -- FIX 2: Tarih prefix — artık p_ay doğrudan 1-indexed kullanılıyor
  IF p_yil IS NOT NULL AND p_ay IS NOT NULL AND p_ay >= 1 AND p_ay <= 12 THEN
    v_prefix := p_yil::text || '-' || lpad(p_ay::text, 2, '0');
  ELSIF p_yil IS NOT NULL THEN
    v_prefix := p_yil::text;
  END IF;

  -- ── GELİRLER: Dava + İcra tahsilatları ──
  FOR rec IN
    SELECT data FROM davalar WHERE buro_id = p_buro_id
    UNION ALL
    SELECT data FROM icra WHERE buro_id = p_buro_id
  LOOP
    IF rec.data->'tahsilatlar' IS NOT NULL THEN
      FOR t IN SELECT * FROM jsonb_array_elements(rec.data->'tahsilatlar')
      LOOP
        IF v_prefix != '' AND NOT starts_with(COALESCE(t->>'tarih',''), v_prefix) THEN
          CONTINUE;
        END IF;
        v_tutar := COALESCE((t->>'tutar')::numeric, 0);
        CASE t->>'tur'
          WHEN 'akdi_vekalet' THEN v_akdi    := v_akdi    + v_tutar;
          WHEN 'hakediş'      THEN v_hakedis := v_hakedis + v_tutar;
          ELSE NULL;
        END CASE;
      END LOOP;
    END IF;
  END LOOP;

  -- ── GELİRLER: Danışmanlık ──
  FOR rec IN
    SELECT data FROM danismanlik WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    v_dan_gelir := v_dan_gelir + COALESCE((rec.data->>'tahsilEdildi')::numeric, 0);
  END LOOP;

  -- ── GELİRLER: Arabuluculuk toplantı ücretleri ──
  FOR rec IN
    SELECT data FROM arabuluculuk WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    IF rec.data->'toplanti' IS NOT NULL THEN
      FOR toplanti IN SELECT * FROM jsonb_array_elements(rec.data->'toplanti')
      LOOP
        v_tutar := COALESCE((toplanti->>'tutar')::numeric, 0);
        IF v_tutar > 0 THEN v_arab_gelir := v_arab_gelir + v_tutar; END IF;
      END LOOP;
    END IF;
  END LOOP;

  v_toplam_gelir := v_akdi + v_hakedis + v_dan_gelir + v_arab_gelir + v_diger_gelir;

  -- ── GİDERLER: Büro giderleri (kategoriye göre) ──
  v_buro_kat := '{
    "Kira & Aidat": 0, "Stopaj & Vergi": 0,
    "Muhasebeci / Mali Müşavir": 0, "Çalışan Ücretleri": 0,
    "Temizlik & Bakım": 0, "Kırtasiye & Sarf Malzeme": 0,
    "Teknoloji": 0, "Ulaşım & Araç": 0,
    "Sigorta": 0, "Mesleki Gelişim": 0,
    "Diğer Genel Gider": 0
  }'::jsonb;

  FOR rec IN
    SELECT data FROM buro_giderleri WHERE buro_id = p_buro_id
  LOOP
    IF v_prefix != '' AND NOT starts_with(COALESCE(rec.data->>'tarih',''), v_prefix) THEN
      CONTINUE;
    END IF;
    v_tutar := COALESCE((rec.data->>'tutar')::numeric, 0);
    v_buro_gider_toplam := v_buro_gider_toplam + v_tutar;

    DECLARE
      v_kat text := COALESCE(rec.data->>'kategori', 'Diğer Genel Gider');
      v_mevcut numeric;
    BEGIN
      IF v_buro_kat ? v_kat THEN
        v_mevcut := (v_buro_kat->>v_kat)::numeric;
        v_buro_kat := jsonb_set(v_buro_kat, ARRAY[v_kat], to_jsonb(v_mevcut + v_tutar));
      ELSE
        v_mevcut := (v_buro_kat->>'Diğer Genel Gider')::numeric;
        v_buro_kat := jsonb_set(v_buro_kat, ARRAY['Diğer Genel Gider'], to_jsonb(v_mevcut + v_tutar));
      END IF;
    END;
  END LOOP;

  v_toplam_gider := v_buro_gider_toplam;
  v_net := v_toplam_gelir - v_toplam_gider;

  RETURN jsonb_build_object(
    'gelirler', jsonb_build_object(
      'akdiVekaletUcreti', v_akdi,
      'karsiVekaletHakedis', v_hakedis,
      'danismanlikGeliri', v_dan_gelir,
      'arabuluculukGeliri', v_arab_gelir,
      'digerGelir', v_diger_gelir,
      'toplam', v_toplam_gelir
    ),
    'giderler', jsonb_build_object(
      'buroGiderleri', v_buro_kat,
      'buroGiderToplam', v_buro_gider_toplam,
      'toplam', v_toplam_gider
    ),
    'net', v_net,
    'karZararOrani', CASE WHEN v_toplam_gelir > 0
      THEN round((v_net / v_toplam_gelir) * 100)
      ELSE 0 END
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- FIX 5: finans_uyarilar — Eşik değerlerini değişken yap
-- Hardcoded değerler yerine fonksiyon başında tanımlanan
-- değişkenler kullanılıyor, kolay ayarlanabilir
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finans_uyarilar(p_buro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Konfigüre edilebilir eşik değerleri
  v_masraf_esik numeric := -100;        -- Masraf avansı uyarı eşiği (negatif = borç var)
  v_vekalet_esik numeric := 100;        -- Vekalet bakiye uyarı eşiği
  v_vekalet_gun integer := 30;          -- Vekalet gecikme gün eşiği
  v_aktarim_esik numeric := 100;        -- Aktarım bekleyen tutar eşiği
  v_masraf_yuksek numeric := 10000;     -- Yüksek masraf uyarı eşiği

  v_uyarilar jsonb := '[]'::jsonb;
  v_bugun text;
  rec record;
  v_ozet jsonb;
  v_masraf_bak numeric;
  v_vekalet_bak numeric;
  v_tahsilat_bak numeric;
  v_son_odeme text;
  v_gun_fark int;
  v_muv_ad text;
  t jsonb;
  d record;
BEGIN
  v_bugun := to_char(now(), 'YYYY-MM-DD');

  -- Müvekkil bazlı uyarılar
  FOR rec IN
    SELECT id, data FROM muvekkillar WHERE buro_id = p_buro_id
  LOOP
    v_muv_ad := COALESCE(rec.data->>'ad', '');
    v_ozet := finans_muvekkil_ozet(p_buro_id, rec.id);
    IF v_ozet IS NULL THEN CONTINUE; END IF;

    v_masraf_bak  := (v_ozet->'bakiye'->>'masrafBakiye')::numeric;
    v_vekalet_bak := (v_ozet->'bakiye'->>'vekaletBakiye')::numeric;
    v_tahsilat_bak := (v_ozet->'bakiye'->>'tahsilatBakiye')::numeric;

    -- 1. Masraf avansı tükendi (eşik: v_masraf_esik)
    IF v_masraf_bak < v_masraf_esik THEN
      v_uyarilar := v_uyarilar || jsonb_build_object(
        'tur', 'masraf_avans', 'oncelik', 'yuksek',
        'muvId', rec.id, 'muvAd', v_muv_ad,
        'mesaj', v_muv_ad || ' — Masraf avansı tükendi. Alacağınız var.',
        'tutar', abs(v_masraf_bak), 'icon', '⚠️'
      );
    END IF;

    -- 2. Vekalet ücreti gecikme (eşik: v_vekalet_esik, gün: v_vekalet_gun)
    IF v_vekalet_bak > v_vekalet_esik THEN
      v_son_odeme := NULL;
      -- Tüm dosyalardan son akdi_vekalet ödeme tarihini bul
      FOR d IN
        SELECT data FROM davalar WHERE buro_id = p_buro_id AND data->>'muvId' = rec.id
        UNION ALL
        SELECT data FROM icra WHERE buro_id = p_buro_id AND data->>'muvId' = rec.id
      LOOP
        IF d.data->'tahsilatlar' IS NOT NULL THEN
          FOR t IN SELECT * FROM jsonb_array_elements(d.data->'tahsilatlar')
          LOOP
            IF t->>'tur' = 'akdi_vekalet' THEN
              IF v_son_odeme IS NULL OR (t->>'tarih') > v_son_odeme THEN
                v_son_odeme := t->>'tarih';
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;

      IF v_son_odeme IS NOT NULL THEN
        v_gun_fark := (v_bugun::date - v_son_odeme::date);
        IF v_gun_fark > v_vekalet_gun THEN
          v_uyarilar := v_uyarilar || jsonb_build_object(
            'tur', 'vekalet_gecikme', 'oncelik', 'yuksek',
            'muvId', rec.id, 'muvAd', v_muv_ad,
            'mesaj', v_muv_ad || ' — Vekalet ücreti bakiyesi ' || v_gun_fark || ' gündür ödenmedi.',
            'tutar', v_vekalet_bak, 'icon', '⏰'
          );
        END IF;
      END IF;
    END IF;

    -- 3. Aktarım bekleyen tutar (eşik: v_aktarim_esik)
    IF v_tahsilat_bak > v_aktarim_esik THEN
      v_uyarilar := v_uyarilar || jsonb_build_object(
        'tur', 'aktarim_bekliyor', 'oncelik', 'orta',
        'muvId', rec.id, 'muvAd', v_muv_ad,
        'mesaj', v_muv_ad || ' — Aktarım bekliyor.',
        'tutar', v_tahsilat_bak, 'icon', '📤'
      );
    END IF;
  END LOOP;

  -- 4. Yüksek masraf uyarısı (dosya bazlı, eşik: v_masraf_yuksek)
  FOR rec IN
    SELECT id, data FROM davalar WHERE buro_id = p_buro_id
  LOOP
    IF rec.data->'harcamalar' IS NOT NULL THEN
      DECLARE
        v_m numeric;
      BEGIN
        SELECT COALESCE(SUM((e->>'tutar')::numeric), 0) INTO v_m
          FROM jsonb_array_elements(rec.data->'harcamalar') e;
        IF v_m > v_masraf_yuksek THEN
          SELECT COALESCE(data->>'ad','') INTO v_muv_ad
            FROM muvekkillar WHERE buro_id = p_buro_id AND id = rec.data->>'muvId';
          v_uyarilar := v_uyarilar || jsonb_build_object(
            'tur', 'yuksek_masraf', 'oncelik', 'bilgi',
            'muvId', COALESCE(rec.data->>'muvId',''), 'muvAd', COALESCE(v_muv_ad,''),
            'mesaj', 'Dava ' || COALESCE(rec.data->>'no','') || ' — Masraflar ' || v_masraf_yuksek::text || '₺ eşiğini aştı.',
            'tutar', v_m, 'icon', '💸'
          );
        END IF;
      END;
    END IF;
  END LOOP;

  RETURN v_uyarilar;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- GRANT'lar (idempotent — zaten varsa hata vermez)
-- ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION fn_hakedis_hesapla() TO authenticated;
GRANT EXECUTE ON FUNCTION finans_buro_kar_zarar(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION finans_uyarilar(uuid) TO authenticated;
