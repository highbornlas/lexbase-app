'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

interface OzelDavaKonusu {
  id: string;
  yargiBirimi: string;
  konu: string;
}

/**
 * Büro'ya özel dava konularını getirir
 */
export function useOzelDavaKonulari() {
  const buroId = useBuroId();

  return useQuery<OzelDavaKonusu[]>({
    queryKey: ['ozel-dava-konulari', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ozel_dava_konulari')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) {
        // Tablo yoksa boş dön
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []).map((r) => {
        const d = r.data as Record<string, string>;
        return { id: r.id, yargiBirimi: d.yargiBirimi || '', konu: d.konu || '' };
      });
    },
    enabled: !!buroId,
  });
}

/**
 * Yeni özel dava konusu kaydeder
 */
export function useOzelDavaKonusuKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: { yargiBirimi: string; konu: string }) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('ozel_dava_konulari').insert({
        id: crypto.randomUUID(),
        buro_id: buroId,
        data: { yargiBirimi: kayit.yargiBirimi, konu: kayit.konu },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ozel-dava-konulari'] });
    },
  });
}
