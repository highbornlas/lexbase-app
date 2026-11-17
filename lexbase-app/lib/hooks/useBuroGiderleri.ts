'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
import { buroGiderIslemi } from '@/lib/data/buroGiderIslemi';
import { raporKayitlariniOku } from '@/lib/data/raporKayitlari';

// ── Büro Gideri Tip Tanımı ──────────────────────────────────
export interface BuroGider {
  id: string;
  tarih?: string;
  kategori?: string;
  aciklama?: string;
  tutar?: number;
  kdvOrani?: number;      // KDV oranı (%, 0/1/10/20)
  kdvTutar?: number;      // KDV tutarı
  stopajOrani?: number;   // Stopaj oranı (%)
  stopajTutar?: number;   // Stopaj tutarı
  netTutar?: number;      // Net ödenen tutar
  tekrar?: 'tek' | 'aylik' | 'yillik'; // Tekrarlı gider mi
  belgeNo?: string;       // Fatura/belge no
  odemeDurumu?: 'odendi' | 'bekliyor' | 'gecikti';
  odenmeTarih?: string;
  notlar?: string;
  _silindi?: string;
  [key: string]: unknown;
}

export const GIDER_KATEGORILERI = [
  'Kira',
  'Stopaj',
  'Mali Müşavir',
  'Personel Ücreti',
  'SGK Primi',
  'Temizlik',
  'Kırtasiye',
  'Teknoloji / Yazılım',
  'Ulaşım',
  'Sigorta',
  'Elektrik / Su / Doğalgaz',
  'İletişim (Telefon/İnternet)',
  'Mesleki Gelişim / Eğitim',
  'Baro Aidatı',
  'Temsil / Ağırlama',
  'Diğer',
] as const;

export const KDV_ORANLARI = [0, 1, 10, 20] as const;

// ── Tüm Büro Giderleri ──────────────────────────────────────
export function useBuroGiderleri() {
  const buroId = useBuroId();

  return useQuery<BuroGider[]>({
    queryKey: ['buro-giderleri', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const data = await raporKayitlariniOku(supabase, 'buro_giderleri', buroId);
      return (data || [])
        .map((r) => ({ ...(r.data as object), id: r.id }) as BuroGider)
        .filter((g) => !g._silindi);
    },
    enabled: !!buroId,
  });
}

// ── Kaydet (upsert) — optimistic update ─────────────────────
export function useBuroGiderKaydet(beklenen?: BuroGider) {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kayit: BuroGider) => buroGiderIslemi(createClient(), buroId, kayit, false, beklenen),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['buro-giderleri', buroId] });
      void queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}

export function useBuroGiderSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gider: BuroGider) => buroGiderIslemi(createClient(), buroId, gider, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['buro-giderleri', buroId] });
      void queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}
