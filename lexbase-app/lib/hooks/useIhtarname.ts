'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

export interface Ihtarname {
  id: string;
  no?: string;
  muvId?: string;
  konu?: string;
  tur?: string; // İhtar, İhbarname, Fesih İhtarı, Ödeme İhtarı, Tahliye İhtarı
  durum?: string; // Taslak, Hazırlandı, Gönderildi, Tebliğ Edildi, Cevap Geldi, Sonuçlandı
  gonderen?: string;
  alici?: string;
  aliciAdres?: string;
  noterAd?: string;
  noterNo?: string;
  tarih?: string;
  gonderimTarih?: string;
  tebligTarih?: string;
  cevapTarih?: string;
  ucret?: number;
  tahsilEdildi?: number;
  noterMasrafi?: number;
  icerik?: string;
  cevapOzet?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  [key: string]: unknown;
}

export function useIhtarnameler() {
  const buroId = useBuroId();

  return useQuery<Ihtarname[]>({
    queryKey: ['ihtarnameler', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ihtarnameler')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...(r.data as object) })) as Ihtarname[];
    },
    enabled: !!buroId,
  });
}

export function useIhtarnameKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Ihtarname) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('ihtarnameler').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
    },
  });
}

export function useIhtarnameSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('ihtarnameler').delete().eq('id', id).eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
    },
  });
}
