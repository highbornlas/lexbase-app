'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Müvekkil Bakiyeleri Widget — En yüksek alacağı olan müvekkiller
   ══════════════════════════════════════════════════════════════ */

interface MuvekkilBakiyeWidgetProps {
  muvekkillar: Array<Record<string, unknown>>;
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
  danismanliklar: Array<Record<string, unknown>>;
  arabuluculuklar: Array<Record<string, unknown>>;
  ihtarnameler: Array<Record<string, unknown>>;
  muvAdMap: Record<string, string>;
}

export function MuvekkilBakiyeWidget({
  muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muvAdMap,
}: MuvekkilBakiyeWidgetProps) {
  const bakiyeler = useMemo(() => {
    const map: Record<string, { alacak: number; masraf: number; tahsilat: number }> = {};

    const init = (muvId: string) => {
      if (!muvId || !muvAdMap[muvId]) return;
      if (!map[muvId]) map[muvId] = { alacak: 0, masraf: 0, tahsilat: 0 };
    };

    // Dava + İcra tahsilatları ve masrafları
    [...(davalar || []), ...(icralar || [])].forEach((d) => {
      const muvId = d.muvId as string;
      init(muvId);
      if (!map[muvId]) return;
      (d.tahsilatlar as Array<{ tutar: number }> | undefined)?.forEach((t) => {
        map[muvId].tahsilat += (t.tutar || 0);
      });
      (d.harcamalar as Array<{ tutar: number }> | undefined)?.forEach((h) => {
        map[muvId].masraf += (h.tutar || 0);
      });
      // Dava değeri = alacak tahmini
      if (d.deger) map[muvId].alacak += Number(d.deger || 0);
    });

    // Danışmanlık
    (danismanliklar || []).forEach((d) => {
      const muvId = d.muvId as string;
      init(muvId);
      if (!map[muvId]) return;
      map[muvId].tahsilat += Number(d.tahsilEdildi || 0);
    });

    // Arabuluculuk
    (arabuluculuklar || []).forEach((a) => {
      const muvId = a.muvId as string;
      init(muvId);
      if (!map[muvId]) return;
      map[muvId].tahsilat += Number(a.tahsilEdildi || 0);
    });

    // İhtarname
    (ihtarnameler || []).forEach((ih) => {
      const muvId = ih.muvId as string;
      init(muvId);
      if (!map[muvId]) return;
      map[muvId].tahsilat += Number(ih.tahsilEdildi || 0);
    });

    // Bakiye = masraf - tahsilat (pozitif = büro alacaklı)
    return Object.entries(map)
      .map(([muvId, v]) => ({
        muvId,
        ad: muvAdMap[muvId],
        bakiye: v.masraf - v.tahsilat,
        masraf: v.masraf,
        tahsilat: v.tahsilat,
      }))
      .filter((b) => Math.abs(b.bakiye) > 0)
      .sort((a, b) => b.bakiye - a.bakiye)
      .slice(0, 5);
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muvAdMap]);

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
            <div className="text-[11px] font-medium text-text truncate">{b.ad}</div>
            <div className="text-[9px] text-text-dim">
              Tahsilat: {fmt(b.tahsilat)} · Masraf: {fmt(b.masraf)}
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
