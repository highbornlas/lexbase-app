'use client';

import { useMemo } from 'react';
import { useFinansRaporVerisi } from './useFinansRaporVerisi';
import { useBuroGiderleri } from './useBuroGiderleri';
import { dashboardFinansHesapla } from '@/lib/finans/dashboardHesaplari';
import { finansBugunu } from '@/lib/finans/beklenenHesaplari';

export function useDashboardFinans() {
  const kaynak = useFinansRaporVerisi(), gider = useBuroGiderleri();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const isPending = kaynak.isPending || gider.isPending, isError = kaynak.isError || gider.isError;
  const bugun = finansBugunu();
  const data = useMemo(() => !isPending && !isError ? dashboardFinansHesapla({
    davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, giderler: gider.data,
  }, bugun) : null, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, gider.data, bugun, isPending, isError]);
  return { data, isPending, isError };
}
