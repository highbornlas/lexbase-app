'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

export interface Arabuluculuk {
  id: string;
  no?: string;
  muvId?: string;
  konu?: string;
  tur?: string; // Ticari, İş, Tüketici, Aile
  durum?: string; // Başvuru, Görüşme, Anlaşma, Anlaşamama, İptal
  arabulucu?: string;
  basvuruTarih?: string;
  ilkOturumTarih?: string;
  sonOturumTarih?: string;
  sonucTarih?: string;
  karsiTaraf?: string;
  karsiTarafVekil?: string;
  talep?: number;
  anlasmaUcret?: number;
  ucret?: number;
  tahsilEdildi?: number;
  oturumSayisi?: number;
  aciklama?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  [key: string]: unknown;
}

export function useArabuluculuklar() {
  const buroId = useBuroId();

  return useQuery<Arabuluculuk[]>({
    queryKey: ['arabuluculuk', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('arabuluculuk')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...(r.data as object) })) as Arabuluculuk[];
    },
    enabled: !!buroId,
  });
}

export function useArabuluculukKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Arabuluculuk) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('arabuluculuk').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] });
    },
  });
}

export function useArabuluculukSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('arabuluculuk').delete().eq('id', id).eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] });
    },
  });
}
