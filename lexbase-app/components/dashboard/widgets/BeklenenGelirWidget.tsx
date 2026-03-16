'use client';

import { useMemo } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Beklenen Gelir Widget — Önümüzdeki 30 gün beklenen tahsilatlar
   ══════════════════════════════════════════════════════════════ */

interface BeklenenGelirWidgetProps {
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
  danismanliklar: Array<Record<string, unknown>>;
  muvAdMap: Record<string, string>;
}

export function BeklenenGelirWidget({ davalar, icralar, danismanliklar, muvAdMap }: BeklenenGelirWidgetProps) {
  const { beklenenler, toplamTutar } = useMemo(() => {
    const items: Array<{ kaynak: string; icon: string; acik: string; tutar: number; tarih: string; muvAd: string }> = [];
    const bugun = new Date();
    const otuzGun = new Date();
    otuzGun.setDate(bugun.getDate() + 30);

    // Yaklaşan duruşmalar (dava değeri baz)
    (davalar || []).forEach((d) => {
      if (!d.durusma || !d.deger) return;
      const t = new Date(d.durusma as string);
      if (t < bugun || t > otuzGun) return;
      items.push({
        kaynak: 'Dava',
        icon: '⚖️',
        acik: `${d.no || d.konu || '—'}`,
        tutar: Number(d.deger) * 0.1, // tahmini %10 vekalet ücreti
        tarih: d.durusma as string,
        muvAd: muvAdMap[d.muvId as string] || '',
      });
    });

    // Devam eden danışmanlıklar (henüz tahsil edilmemiş)
    (danismanliklar || []).forEach((d) => {
      if (d.durum === 'Tamamlandı' || d.durum === 'İptal') return;
      const tutar = Number(d.ucret || d.tutar || 0);
      const tahsil = Number(d.tahsilEdildi || 0);
      const kalan = tutar - tahsil;
      if (kalan <= 0) return;
      const teslim = (d.teslimTarihi || d.sonucTarih) as string | undefined;
      if (teslim) {
        const t = new Date(teslim);
        if (t < bugun || t > otuzGun) return;
      }
      items.push({
        kaynak: 'Danışmanlık',
        icon: '📋',
        acik: (d.konu as string) || '—',
        tutar: kalan,
        tarih: (teslim || '') as string,
        muvAd: muvAdMap[d.muvId as string] || '',
      });
    });

    // İcra tahsilatları (aktif icra dosyaları)
    (icralar || []).forEach((i) => {
      if (i.durum === 'Kapandı') return;
      const alacak = Number(i.toplamAlacak || i.takipTutari || 0);
      const tahsil = ((i.tahsilatlar as Array<{ tutar: number }>) || []).reduce((s, t) => s + (t.tutar || 0), 0);
      const kalan = alacak - tahsil;
      if (kalan <= 0) return;
      items.push({
        kaynak: 'İcra',
        icon: '⚡',
        acik: `${i.no || '—'}`,
        tutar: kalan,
        tarih: '',
        muvAd: muvAdMap[i.muvId as string] || '',
      });
    });

    const sorted = items.sort((a, b) => b.tutar - a.tutar).slice(0, 5);
    const toplamTutar = sorted.reduce((s, i) => s + i.tutar, 0);

    return { beklenenler: sorted, toplamTutar };
  }, [davalar, icralar, danismanliklar, muvAdMap]);

  if (beklenenler.length === 0) {
    return <EmptyState icon="📈" text="Beklenen gelir bulunmuyor" />;
  }

  return (
    <div className="space-y-2 mt-1">
      {/* Toplam KPI */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-green/10 rounded-lg">
        <span className="text-[10px] text-text-muted font-medium">Tahmini Toplam</span>
        <span className="text-sm font-bold text-green font-[var(--font-playfair)]">{fmt(toplamTutar)}</span>
      </div>

      {/* Liste */}
      <div className="space-y-0.5">
        {beklenenler.map((b, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2/50 transition-colors">
            <span className="text-sm flex-shrink-0">{b.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-text truncate">{b.acik}</div>
              <div className="text-[9px] text-text-dim truncate">
                {b.kaynak}{b.muvAd ? ` · ${b.muvAd}` : ''}{b.tarih ? ` · ${fmtTarih(b.tarih)}` : ''}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-green flex-shrink-0">{fmt(b.tutar)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
