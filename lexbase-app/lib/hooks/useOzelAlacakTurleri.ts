'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

/* ══════════════════════════════════════════════════════════════
   Özel Alacak Türleri Hook — Liste + Kaydet
   Tablo: ozel_alacak_turleri (id, buro_id, data jsonb)
   data: { tur: string }
   ══════════════════════════════════════════════════════════════ */

// ── Tüm Özel Alacak Türleri (string[] olarak) ───────────────
export function useOzelAlacakTurleri() {
  const buroId = useBuroId();

  return useQuery<string[]>({
    queryKey: ['ozel_alacak_turleri', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ozel_alacak_turleri')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || [])
        .map((r) => (r.data as { tur: string })?.tur)
        .filter(Boolean);
    },
    enabled: !!buroId,
  });
}

// ── Yeni Özel Alacak Türü Kaydet ────────────────────────────
export function useOzelAlacakTuruKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tur: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const id = crypto.randomUUID();
      const { error } = await supabase.from('ozel_alacak_turleri').insert({
        id,
        buro_id: buroId,
        data: { tur },
      });
      if (error) throw error;
    },
    onMutate: async (yeniTur) => {
      await queryClient.cancelQueries({ queryKey: ['ozel_alacak_turleri'] });
      const onceki = queryClient.getQueryData<string[]>(['ozel_alacak_turleri', buroId]);
      queryClient.setQueryData<string[]>(['ozel_alacak_turleri', buroId], (eski = []) => {
        return [...eski, yeniTur];
      });
      return { onceki };
    },
    onError: (_err, _tur, context) => {
      if (context?.onceki) {
        queryClient.setQueryData(['ozel_alacak_turleri', buroId], context.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ozel_alacak_turleri'] });
    },
  });
}
