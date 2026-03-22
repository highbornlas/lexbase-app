'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

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
        .map((r) => ({ id: r.id, ...(r.data as object) }) as AvansHareket)
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
        .map((r) => ({ id: r.id, ...(r.data as object) }) as AvansHareket)
        .filter((h) => !h._silindi);
    },
    enabled: !!buroId,
  });
}

// ── Avans Kasa Özeti Hesapla (client-side) ──────────────────
export function hesaplaKasaOzet(hareketler: AvansHareket[]): Omit<AvansKasaOzet, 'muvId' | 'muvAd'> {
  let toplamAlim = 0;
  let toplamMasraf = 0;
  let toplamIade = 0;

  hareketler.forEach((h) => {
    const tutar = Number(h.tutar || 0);
    if (h.tip === 'alim') toplamAlim += tutar;
    else if (h.tip === 'masraf') toplamMasraf += tutar;
    else if (h.tip === 'iade') toplamIade += tutar;
  });

  return {
    toplamAlim,
    toplamMasraf,
    toplamIade,
    bakiye: toplamAlim - toplamMasraf - toplamIade,
    hareketSayisi: hareketler.length,
  };
}

// ── Tüm Müvekkillerin Kasa Özetleri ────────────────────────
export function hesaplaTumKasalar(hareketler: AvansHareket[]): Map<string, Omit<AvansKasaOzet, 'muvAd'>> {
  const gruplar = new Map<string, AvansHareket[]>();

  hareketler.forEach((h) => {
    if (!h.muvId) return;
    const arr = gruplar.get(h.muvId) || [];
    arr.push(h);
    gruplar.set(h.muvId, arr);
  });

  const sonuc = new Map<string, Omit<AvansKasaOzet, 'muvAd'>>();
  gruplar.forEach((hArr, muvId) => {
    sonuc.set(muvId, { muvId, ...hesaplaKasaOzet(hArr) });
  });

  return sonuc;
}

// ── Kaydet (upsert) — optimistic update ─────────────────────
export function useAvansHareketKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: AvansHareket) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('avans_hareketleri').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeni) => {
      const key = ['avans', 'muv', yeni.muvId, buroId];
      await queryClient.cancelQueries({ queryKey: key });
      const onceki = queryClient.getQueryData<AvansHareket[]>(key);

      queryClient.setQueryData<AvansHareket[]>(key, (eski) => {
        if (!eski) return [yeni];
        const idx = eski.findIndex((h) => h.id === yeni.id);
        if (idx >= 0) {
          const klon = [...eski];
          klon[idx] = yeni;
          return klon;
        }
        return [yeni, ...eski];
      });

      return { onceki };
    },
    onError: (_err, yeni, ctx) => {
      if (ctx?.onceki) {
        queryClient.setQueryData(['avans', 'muv', yeni.muvId, buroId], ctx.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['avans'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}

// ── Sil (soft delete) ───────────────────────────────────────
export function useAvansHareketSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hareket: AvansHareket) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('avans_hareketleri')
        .select('data')
        .eq('id', hareket.id)
        .single();

      const mevcutData = (mevcut?.data as object) || {};
      const { error } = await supabase.from('avans_hareketleri').upsert({
        id: hareket.id,
        buro_id: buroId,
        data: { ...mevcutData, _silindi: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onMutate: async (hareket) => {
      const key = ['avans', 'muv', hareket.muvId, buroId];
      await queryClient.cancelQueries({ queryKey: key });
      const onceki = queryClient.getQueryData<AvansHareket[]>(key);

      queryClient.setQueryData<AvansHareket[]>(key, (eski) =>
        (eski || []).filter((h) => h.id !== hareket.id)
      );

      return { onceki };
    },
    onError: (_err, hareket, ctx) => {
      if (ctx?.onceki) {
        queryClient.setQueryData(['avans', 'muv', hareket.muvId, buroId], ctx.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['avans'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}
