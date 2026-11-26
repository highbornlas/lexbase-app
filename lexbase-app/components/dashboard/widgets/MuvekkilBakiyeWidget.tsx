'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useFinansRaporVerisi } from '@/lib/hooks/useFinansRaporVerisi';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { muvekkilBakiyeleri } from '@/lib/finans/ucretHesaplari';
import { fmt } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';

export function MuvekkilBakiyeWidget() {
  const kaynak = useFinansRaporVerisi(), muv = useMuvekkillar();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const rows = useMemo(() => muvekkilBakiyeleri(muv.data || [], {
    davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler,
  }), [muv.data, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler]);
  if (kaynak.isError || muv.isError) return <p role="alert" className="p-3 text-xs text-red">Ücret bakiyeleri yüklenemedi.</p>;
  if (kaynak.isPending || muv.isPending) return <p role="status" className="p-3 text-xs text-text-muted">Ücret bakiyeleri yükleniyor...</p>;
  const muvAdMap = Object.fromEntries(rows.map(b => [b.id, b.ad]));
  const bakiyeler = rows.filter(b => b.kalanAlacak !== 0).sort((a, b) => b.kalanAlacak - a.kalanAlacak)
    .slice(0, 5).map(b => ({ muvId: b.id, bakiye: b.kalanAlacak, borc: b.anlasilanToplam, alacak: b.tahsilEdilenToplam }));

  if (bakiyeler.length === 0) {
    return <EmptyState icon="💰" text="Bakiye verisi bulunmuyor" />;
  }

  return (
    <div className="space-y-1 mt-1">
      {bakiyeler.map((b) => (
        <Link
          key={b.muvId}
          href={`/muvekkillar/${b.muvId}`}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface2/50 transition-colors"
        >
          <span className="text-sm flex-shrink-0">
            {b.bakiye > 0 ? '🔴' : '🟢'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-text truncate">{muvAdMap[b.muvId]}</div>
            <div className="text-[9px] text-text-dim">
              Ücret: {fmt(b.borc)} · Tahsil: {fmt(b.alacak)}
            </div>
          </div>
          <span className={`text-[11px] font-semibold flex-shrink-0 ${b.bakiye > 0 ? 'text-red' : 'text-green'}`}>
            {b.bakiye > 0 ? '+' : ''}{fmt(b.bakiye)}
          </span>
        </Link>
      ))}
    </div>
  );
}
