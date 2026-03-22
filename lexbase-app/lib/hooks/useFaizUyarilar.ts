'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Faiz Uyarıları Hook — faiz_uyarilar tablosu
   Edge function hata/uyarılarını admin panele taşır
   ══════════════════════════════════════════════════════════════ */

export interface FaizUyari {
  id: number;
  tur: 'hata' | 'uyari' | 'bilgi';
  kaynak: string;
  mesaj: string;
  detay?: string | null;
  okundu: boolean;
  created_at: string;
}

/** Okunmamış uyarıları çek (son 30 gün) */
export function useFaizUyarilar() {
  return useQuery<FaizUyari[]>({
    queryKey: ['faiz_uyarilar'],
    queryFn: async () => {
      const supabase = createClient();
      const otuzGunOnce = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from('faiz_uyarilar')
        .select('*')
        .gte('created_at', otuzGunOnce)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as FaizUyari[];
    },
    staleTime: 60 * 1000, // 1 dk cache
  });
}

/** Okunmamış uyarı sayısı */
export function useOkunmamisUyariSayisi(): number {
  const { data } = useFaizUyarilar();
  if (!data) return 0;
  return data.filter((u) => !u.okundu).length;
}

/** Uyarıyı okundu olarak işaretle */
export function useUyariOkundu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('faiz_uyarilar')
        .update({ okundu: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faiz_uyarilar'] });
    },
  });
}

/** Tüm uyarıları okundu yap */
export function useTumUyarilariOkundu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('faiz_uyarilar')
        .update({ okundu: true })
        .eq('okundu', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faiz_uyarilar'] });
    },
  });
}
