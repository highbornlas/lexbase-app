'use client';

import { useMemo } from 'react';
import { useMuvekkillar } from './useMuvekkillar';
import { useKarsiTaraflar } from './useKarsiTaraflar';
import { useVekillar } from './useVekillar';

/* ══════════════════════════════════════════════════════════════
   Tüm entity'lerden etiketleri toplayan ortak hook.
   Bir etiket herhangi bir müvekkil/karşı taraf/avukatta oluşturulunca
   diğer tüm formlarda da seçilebilir hale gelir.
   ══════════════════════════════════════════════════════════════ */

export function useTumEtiketler(): unknown[] {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const { data: vekillar } = useVekillar();

  return useMemo(() => {
    return [
      ...(muvekkillar || []).flatMap((m) => m.etiketler || []),
      ...(karsiTaraflar || []).flatMap((k) => k.etiketler || []),
      ...(vekillar || []).flatMap((v) => v.etiketler || []),
    ];
  }, [muvekkillar, karsiTaraflar, vekillar]);
}
