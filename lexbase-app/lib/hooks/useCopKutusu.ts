'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

/* ══════════════════════════════════════════════════════════════
   Çöp Kutusu Hook — Tüm soft-deleted kayıtları listeler
   ══════════════════════════════════════════════════════════════ */

export type CopTabloTipi =
  | 'muvekkillar'
  | 'karsi_taraflar'
  | 'vekillar'
  | 'davalar'
  | 'icra'
  | 'ihtarnameler';

export interface SilinenKayit {
  id: string;
  tablo: CopTabloTipi;
  tabloLabel: string;
  ad: string;
  tip?: string;
  silinmeTarihi: string;
  kalanSure: number; // ms cinsinden
}

const TABLO_LABELS: Record<CopTabloTipi, string> = {
  muvekkillar: 'Müvekkil',
  karsi_taraflar: 'Karşı Taraf',
  vekillar: 'Avukat',
  davalar: 'Dava',
  icra: 'İcra',
  ihtarnameler: 'İhtarname',
};

// Varsayılan saklama süresi: 24 saat (ms)
const VARSAYILAN_SAKLAMA_MS = 24 * 60 * 60 * 1000;

export function getCopKutusuSuresi(): number {
  if (typeof window === 'undefined') return VARSAYILAN_SAKLAMA_MS;
  const kayitli = localStorage.getItem('lb_cop_kutusu_sure');
  if (kayitli) return parseInt(kayitli, 10);
  return VARSAYILAN_SAKLAMA_MS;
}

export function setCopKutusuSuresi(ms: number) {
  localStorage.setItem('lb_cop_kutusu_sure', ms.toString());
}

export const SURE_SECENEKLERI = [
  { label: '1 saat', ms: 1 * 60 * 60 * 1000 },
  { label: '6 saat', ms: 6 * 60 * 60 * 1000 },
  { label: '12 saat', ms: 12 * 60 * 60 * 1000 },
  { label: '24 saat', ms: 24 * 60 * 60 * 1000 },
  { label: '3 gün', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 gün', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 gün', ms: 30 * 24 * 60 * 60 * 1000 },
];

/** Dosya tablolarındaki kayıttan okunabilir isim üret */
function buildAd(tablo: CopTabloTipi, d: Record<string, unknown>): string {
  if (tablo === 'davalar') {
    const parts: string[] = [];
    if (d.mtur) parts.push(d.mtur as string);
    if (d.esasYil && d.esasNo) parts.push(`${d.esasYil}/${d.esasNo}`);
    if (parts.length === 0 && d.konu) parts.push(d.konu as string);
    return parts.join(' — ') || '(isimsiz dava)';
  }

  if (tablo === 'icra') {
    const parts: string[] = [];
    if (d.daire) parts.push(d.daire as string);
    else if (d.yargiBirimi) parts.push(d.yargiBirimi as string);
    if (d.esasYil && d.esasNo) parts.push(`${d.esasYil}/${d.esasNo}`);
    if (parts.length === 0 && d.konu) parts.push(d.konu as string);
    return parts.join(' — ') || '(isimsiz icra)';
  }

  if (tablo === 'ihtarnameler') {
    if (d.konu) return d.konu as string;
    if (d.no) return `İhtarname #${d.no}`;
    return '(isimsiz ihtarname)';
  }

  // Rehber tabloları (müvekkil, karşı taraf, vekil)
  return ((d.ad as string) || '') + ((d.soyad as string) ? ' ' + (d.soyad as string) : '');
}

export function useCopKutusu() {
  const buroId = useBuroId();

  return useQuery<SilinenKayit[]>({
    queryKey: ['cop-kutusu', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const saklamaSuresi = getCopKutusuSuresi();
      const sonuc: SilinenKayit[] = [];

      const tablolar: CopTabloTipi[] = [
        'muvekkillar',
        'karsi_taraflar',
        'vekillar',
        'davalar',
        'icra',
        'ihtarnameler',
      ];

      for (const tablo of tablolar) {
        try {
          const { data } = await supabase
            .from(tablo)
            .select('id, data')
            .eq('buro_id', buroId);

          if (!data) continue;

          for (const row of data) {
            const d = row.data as Record<string, unknown>;
            if (!d._silindi) continue;

            const silinmeTarihi = d._silindi as string;
            const silinmeMs = new Date(silinmeTarihi).getTime();
            const kalanMs = saklamaSuresi - (Date.now() - silinmeMs);

            // Süresi dolmuş — kalıcı sil
            if (kalanMs <= 0) {
              try {
                await supabase
                  .from(tablo)
                  .delete()
                  .eq('id', row.id)
                  .eq('buro_id', buroId);
              } catch {
                // silme başarısız olsa da devam et
              }
              continue;
            }

            sonuc.push({
              id: row.id,
              tablo,
              tabloLabel: TABLO_LABELS[tablo] || tablo,
              ad: buildAd(tablo, d),
              tip: d.tip as string | undefined,
              silinmeTarihi,
              kalanSure: kalanMs,
            });
          }
        } catch {
          // tablo yoksa devam
        }
      }

      // En son silineni üste
      sonuc.sort((a, b) => new Date(b.silinmeTarihi).getTime() - new Date(a.silinmeTarihi).getTime());
      return sonuc;
    },
    enabled: !!buroId,
    refetchInterval: 60000, // her dakika yenile (süre takibi için)
  });
}
