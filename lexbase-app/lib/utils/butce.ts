/**
 * Bütçe ve Hedef Takibi
 * Aylık/yıllık gelir hedefleri, gerçekleşme oranları
 */

import { yuvarla, safeNum } from './finans';

// ── Bütçe hedef yapısı ──────────────────────────────────────
export interface ButceHedef {
  id: string;
  yil: number;
  ay: number; // 0 = yıllık, 1-12 = aylık
  kategori: 'gelir' | 'gider' | 'tahsilat' | 'dosya_acma';
  hedef: number;
  aciklama?: string;
}

export interface ButceGerceklesme {
  kategori: string;
  hedef: number;
  gerceklesen: number;
  oran: number; // %
  fark: number;
  durum: 'basarili' | 'yakin' | 'geride';
}

/**
 * Bütçe gerçekleşme oranlarını hesapla
 */
export function butceGerceklesmeHesapla(
  hedefler: ButceHedef[],
  gerceklesenler: Record<string, number>,
): ButceGerceklesme[] {
  return hedefler.map((h) => {
    const gercek = safeNum(gerceklesenler[h.kategori]);
    const hedef = safeNum(h.hedef);
    const oran = hedef > 0 ? yuvarla((gercek / hedef) * 100) : 0;
    const fark = yuvarla(gercek - hedef);
    const durum: ButceGerceklesme['durum'] =
      oran >= 100 ? 'basarili' : oran >= 75 ? 'yakin' : 'geride';

    return {
      kategori: h.kategori,
      hedef,
      gerceklesen: gercek,
      oran,
      fark,
      durum,
    };
  });
}

// ── Kategori etiketleri ─────────────────────────────────────
export const BUTCE_KATEGORILERI: Record<string, string> = {
  gelir: 'Gelir Hedefi',
  gider: 'Gider Limiti',
  tahsilat: 'Tahsilat Hedefi',
  dosya_acma: 'Yeni Dosya Hedefi',
};

/**
 * Yıllık hedeften aylık oranları hesapla
 * Bazı aylar daha düşük olabilir (tatil ayları)
 */
export function yilliktenAylik(yillikHedef: number): number[] {
  // Eşit dağılım — ileride sezonsal ağırlık eklenebilir
  const aylik = yuvarla(yillikHedef / 12);
  return Array.from({ length: 12 }, () => aylik);
}

/**
 * Oran bazlı renk sınıfı döndür
 */
export function butceRenkSinifi(oran: number, tur: 'gelir' | 'gider' = 'gelir'): string {
  if (tur === 'gider') {
    // Giderde yüksek = kötü
    if (oran >= 100) return 'text-red';
    if (oran >= 80) return 'text-orange-400';
    return 'text-green';
  }
  // Gelirde yüksek = iyi
  if (oran >= 100) return 'text-green';
  if (oran >= 75) return 'text-orange-400';
  return 'text-red';
}
