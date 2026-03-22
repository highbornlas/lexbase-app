/**
 * Döviz Kuru Yardımcıları
 * TCMB kurları + para birimi formatlama
 */

// ── Desteklenen para birimleri ──────────────────────────────
export type ParaBirimi = 'TRY' | 'USD' | 'EUR' | 'GBP';

export const PARA_BIRIMLERI: { kod: ParaBirimi; sembol: string; ad: string }[] = [
  { kod: 'TRY', sembol: '₺', ad: 'Türk Lirası' },
  { kod: 'USD', sembol: '$', ad: 'ABD Doları' },
  { kod: 'EUR', sembol: '€', ad: 'Euro' },
  { kod: 'GBP', sembol: '£', ad: 'İngiliz Sterlini' },
];

// ── Para formatı (çoklu para birimi) ─────────────────────────
export function fmtPara(tutar: number, birim: ParaBirimi = 'TRY'): string {
  const num = Number.isFinite(tutar) ? tutar : 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: birim,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// ── TCMB kur cache ──────────────────────────────────────────
export interface DovizKuru {
  birim: string;
  dovizAlis: number;
  dovizSatis: number;
  efektifAlis: number;
  efektifSatis: number;
  tarih: string;
}

let kurCache: { kurlar: DovizKuru[]; tarih: string } | null = null;

/**
 * TCMB güncel kurlarını çek (XML API)
 * Client-side cache ile tekrar istekleri önler
 */
export async function tcmbKurlariGetir(): Promise<DovizKuru[]> {
  // Cache kontrolü (aynı gün içinde tekrar çekme)
  const bugun = new Date().toISOString().slice(0, 10);
  if (kurCache && kurCache.tarih === bugun) return kurCache.kurlar;

  try {
    // TCMB CORS sorunu nedeniyle proxy kullanılır — Cloudflare Worker veya Next API route
    const res = await fetch('/api/doviz-kur', { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Kur API hatası');
    const data = await res.json();
    kurCache = { kurlar: data.kurlar || [], tarih: bugun };
    return kurCache.kurlar;
  } catch {
    // Fallback: hardcoded yaklaşık kurlar (son güncel)
    return FALLBACK_KURLAR;
  }
}

// Fallback kurlar — API erişilemezse kullanılır
const FALLBACK_KURLAR: DovizKuru[] = [
  { birim: 'USD', dovizAlis: 37.80, dovizSatis: 37.90, efektifAlis: 37.70, efektifSatis: 38.00, tarih: '2025-03-22' },
  { birim: 'EUR', dovizAlis: 41.20, dovizSatis: 41.35, efektifAlis: 41.10, efektifSatis: 41.45, tarih: '2025-03-22' },
  { birim: 'GBP', dovizAlis: 48.90, dovizSatis: 49.10, efektifAlis: 48.80, efektifSatis: 49.20, tarih: '2025-03-22' },
];

/**
 * Basit kur dönüşümü
 */
export function kurDonustur(
  tutar: number,
  kaynak: ParaBirimi,
  hedef: ParaBirimi,
  kurlar: DovizKuru[],
): number {
  if (kaynak === hedef) return tutar;
  if (!Number.isFinite(tutar) || tutar === 0) return 0;

  // TRY bazlı dönüşüm
  let tryTutar = tutar;
  if (kaynak !== 'TRY') {
    const kaynakKur = kurlar.find((k) => k.birim === kaynak);
    if (!kaynakKur) return tutar;
    tryTutar = tutar * kaynakKur.dovizSatis;
  }

  if (hedef === 'TRY') return Math.round(tryTutar * 100) / 100;

  const hedefKur = kurlar.find((k) => k.birim === hedef);
  if (!hedefKur || hedefKur.dovizAlis <= 0) return tryTutar;
  return Math.round((tryTutar / hedefKur.dovizAlis) * 100) / 100;
}
