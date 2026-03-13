'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

interface Muvekkil {
  id: string;
  ad: string;
  tc?: string;
  tel?: string;
  mail?: string;
  tip?: string;
  [key: string]: unknown;
}

export function useMuvekkillar() {
  const buroId = useBuroId();

  return useQuery<Muvekkil[]>({
    queryKey: ['muvekkillar', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('muvekkillar')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...(r.data as object) })) as Muvekkil[];
    },
    enabled: !!buroId,
  });
}

export function useMuvekkilKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Muvekkil) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('muvekkillar').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    // Optimistic update
    onMutate: async (yeniKayit) => {
      await queryClient.cancelQueries({ queryKey: ['muvekkillar'] });
      const onceki = queryClient.getQueryData<Muvekkil[]>(['muvekkillar', buroId]);
      queryClient.setQueryData<Muvekkil[]>(['muvekkillar', buroId], (eski = []) => {
        const idx = eski.findIndex((m) => m.id === yeniKayit.id);
        if (idx >= 0) {
          const yeni = [...eski];
          yeni[idx] = yeniKayit;
          return yeni;
        }
        return [...eski, yeniKayit];
      });
      return { onceki };
    },
    onError: (_err, _kayit, context) => {
      if (context?.onceki) {
        queryClient.setQueryData(['muvekkillar', buroId], context.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
    },
  });
}

export function useMuvekkilSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('muvekkillar')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
    },
  });
}
