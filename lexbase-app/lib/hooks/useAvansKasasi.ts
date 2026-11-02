'use client';

import { useQuery } from '@tanstack/react-query';
import { useKasaIslemi } from './useKasaIslemi';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
export { hesaplaKasaOzet, hesaplaTumKasalar } from '@/lib/finans/avansKurallari';

// ── Avans Hareket Tipi ──────────────────────────────────────
export interface AvansHareket {
  id: string;
  muvId: string;
  dosyaId?: string;
  dosyaTur?: string;        // 'Dava' | 'İcra' | 'Arabuluculuk' | 'İhtarname'
  dosyaNo?: string;
  tip: 'alim' | 'masraf' | 'iade';
  tarih: string;
  tutar: number;            // daima pozitif
  aciklama?: string;
  kategori?: string;
  odemeYontemi?: string;    // 'Nakit' | 'Havale/EFT' | 'Kredi Kartı'
  dekontNo?: string;
  _silindi?: string;
  [key: string]: unknown;
}

export interface AvansKasaOzet {
  muvId: string;
  muvAd?: string;
  toplamAlim: number;
  toplamMasraf: number;
  toplamIade: number;
  bakiye: number;
  masrafAlacagi: number;
  emanetBakiyesi: number;
  gecersizHareketSayisi: number;
  hareketSayisi: number;
}

export const MASRAF_KATEGORILERI = [
  'Harçlar', 'Posta/Tebligat', 'Bilirkişi', 'Tanık', 'Yol/Konaklama',
  'Vekaletname Harcı', 'Keşif', 'Fotokopi/Baskı', 'Haciz Masrafı',
  'Noter', 'Tercüman', 'Diğer',
] as const;

export const ODEME_YONTEMLERI = ['Nakit', 'Havale/EFT', 'Kredi Kartı', 'Çek'] as const;

// Bakiye eşiği (altında uyarı gösterilir)
export const AVANS_ESIK = 500;

// ── Müvekkile Ait Avans Hareketleri ─────────────────────────
export function useAvansHareketleri(muvId?: string) {
  const buroId = useBuroId();

  return useQuery<AvansHareket[]>({
    queryKey: ['avans', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('avans_hareketleri')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('data->>muvId', muvId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ ...(r.data as object), id: r.id }) as AvansHareket)
        .filter((h) => !h._silindi)
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Tüm Büro Avans Hareketleri (dashboard widget için) ─────
export function useTumAvansHareketleri() {
  const buroId = useBuroId();

  return useQuery<AvansHareket[]>({
    queryKey: ['avans', 'tum', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('avans_hareketleri')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ ...(r.data as object), id: r.id }) as AvansHareket)
        .filter((h) => !h._silindi);
    },
    enabled: !!buroId,
  });
}


export function useAvansHareketKaydet() {
  const mutation = useKasaIslemi();
  return {
    isPending: mutation.isPending,
    mutateAsync: (hareket: AvansHareket) => mutation.mutateAsync({ islem: 'kaydet', hareket }),
  };
}

export function useAvansHareketSil() {
  const mutation = useKasaIslemi();
  return {
    isPending: mutation.isPending,
    mutateAsync: (hareket: AvansHareket) => mutation.mutateAsync({ islem: 'sil', hareket, beklenen: hareket }),
  };
}
