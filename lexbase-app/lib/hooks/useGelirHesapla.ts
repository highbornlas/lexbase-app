'use client';

import { useMemo } from 'react';
import { useMuvekkillar } from './useMuvekkillar';
import { useFinansRaporVerisi } from './useFinansRaporVerisi';
import { gelirListesiOlustur } from '@/lib/finans/gelirListesi';
export type { GelirKaydi } from '@/lib/finans/gelirListesi';
export { GELIR_KAYNAKLARI } from '@/lib/finans/gelirListesi';
export { bruttenNete, nettenBrute } from '@/lib/utils/finans';

export function useGelirVerisi() {
  const muv = useMuvekkillar();
  const kaynak = useFinansRaporVerisi();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const gelirler = useMemo(() => gelirListesiOlustur({ davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler }, muv.data || []),
    [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muv.data]);
  return { gelirler, isPending: kaynak.isPending || muv.isPending, isError: kaynak.isError || muv.isError };
}

export function useGelirHesapla() { return useGelirVerisi().gelirler; }
