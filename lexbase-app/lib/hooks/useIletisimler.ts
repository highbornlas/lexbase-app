'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── İletişim Tip Tanımı ──────────────────────────────────────
export interface Iletisim {
  id: string;
  muvId: string;
  tarih: string;
  saat?: string;
  kanal: string;
  konu: string;
  ozet?: string;
  olusturanId?: string;
  [key: string]: unknown;
}

export const KANALLAR = [
  'Telefon', 'E-posta', 'Yüz Yüze', 'Faks', 'Posta', 'Video', 'Diğer'
] as const;

// ── Müvekkile bağlı iletişimler ──────────────────────────────
export function useMuvIletisimler(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery<Iletisim[]>({
    queryKey: ['iletisimler', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('iletisimler')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Iletisim)
        .filter((i) => i.muvId === muvId)
        .sort((a, b) => (b.tarih + (b.saat || '')).localeCompare(a.tarih + (a.saat || '')));
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Kaydet (upsert) ───────────────────────────────────────────
export function useIletisimKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Iletisim) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('iletisimler').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['iletisimler'] });
    },
  });
}

// ── Sil ───────────────────────────────────────────────────────
export function useIletisimSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('iletisimler')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['iletisimler'] });
    },
  });
}
