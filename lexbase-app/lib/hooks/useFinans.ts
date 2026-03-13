'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

export function useFinansOzet(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['finans', 'ozet', muvId],
    queryFn: async () => {
      if (!buroId || !muvId) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc('finans_muvekkil_ozet', {
        p_buro_id: buroId,
        p_muv_id: muvId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!buroId && !!muvId,
  });
}

export function useBuroKarZarar(yil?: number, ay?: number) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['finans', 'karzarar', yil, ay],
    queryFn: async () => {
      if (!buroId) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc('finans_buro_kar_zarar', {
        p_buro_id: buroId,
        p_yil: yil ?? null,
        p_ay: ay ?? null,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!buroId,
  });
}

export function useFinansUyarilar() {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['finans', 'uyarilar'],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc('finans_uyarilar', {
        p_buro_id: buroId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!buroId,
  });
}

export function useDosyaKarlilik(filtre?: Record<string, string>) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['finans', 'karlilik', filtre],
    queryFn: async () => {
      if (!buroId) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc('finans_dosya_karlilik', {
        p_buro_id: buroId,
        p_filtre: filtre || {},
      });
      if (error) throw error;
      return data;
    },
    enabled: !!buroId,
  });
}

export function useBeklenenGelir() {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['finans', 'beklenen'],
    queryFn: async () => {
      if (!buroId) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc('finans_beklenen_gelir', {
        p_buro_id: buroId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!buroId,
  });
}
