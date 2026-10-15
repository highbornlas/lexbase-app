'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
import { kasaIslemiYap, type KasaIslemi } from '@/lib/data/financeCashTransaction';

const CACHE_KEYS = ['avans', 'finans', 'davalar', 'davalar-arsiv', 'dava', 'icra', 'icra-arsiv',
  'icra-detay', 'arabuluculuk', 'arabuluculuk-detay', 'ihtarnameler', 'ihtarnameler-arsiv', 'ihtarname-detay'];

export function useKasaIslemi() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KasaIslemi) => kasaIslemiYap(createClient(), buroId, input),
    // No optimistic balance: show success only after both writes have committed.
    onSettled: () => queryClient.invalidateQueries({ predicate: query => CACHE_KEYS.includes(String(query.queryKey[0])) }),
  });
}
