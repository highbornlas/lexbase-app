'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { recordLifecycle, type DurumTablosu, type DurumIslemi } from '@/lib/data/recordLifecycle';
import { useBuroId } from './useBuro';

const CACHE_KEYS: Record<DurumTablosu, string[]> = {
  davalar: ['davalar','davalar-arsiv','dava'], icra: ['icra','icra-arsiv','icra-detay'],
  arabuluculuk: ['arabuluculuk','arabuluculuk-detay'], ihtarnameler: ['ihtarnameler','ihtarnameler-arsiv','ihtarname-detay'],
  danismanlik: ['danismanlik','danismanlik-detay'],
  muvekkillar: ['muvekkillar','muvekkil','davalar','davalar-arsiv','dava','icra','icra-arsiv','icra-detay',
    'arabuluculuk','arabuluculuk-detay','ihtarnameler','ihtarnameler-arsiv','ihtarname-detay','danismanlik','danismanlik-detay'],
};

export function useRecordLifecycle(table: DurumTablosu, operation: DurumIslemi) {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: string | { id: string }) => recordLifecycle(createClient(), table,
      typeof record === 'string' ? record : record.id, buroId, operation),
    onSettled: () => {
      const keys = [...CACHE_KEYS[table], 'cop-kutusu', 'finans', 'avans'];
      return queryClient.invalidateQueries({ predicate: q => keys.includes(String(q.queryKey[0])) });
    },
  });
}
