'use client';

import { useMemo } from 'react';
import { fmtTarih } from '@/lib/utils';
import { EmptyState, GunBadge } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Kritik Süreler Widget — 30 gün içindeki deadlinelar
   ══════════════════════════════════════════════════════════════ */

interface KritikWidgetProps {
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
}

export function KritikWidget({ davalar, icralar }: KritikWidgetProps) {
  const kritikSureler = useMemo(() => {
    const items: Array<{ tip: string; baslik: string; tarih: string; gun: number; icon: string }> = [];
    const bugun = new Date();
    const sinir = new Date(bugun);
    sinir.setDate(bugun.getDate() + 30);

    davalar?.forEach((d) => {
      const durusmalar = d.durusmalar as Array<{ id: string; tarih: string; saat?: string }> | undefined;
      if (durusmalar?.length) {
        durusmalar.forEach((dur) => {
          if (!dur.tarih) return;
          const t = new Date(dur.tarih);
          if (t >= bugun && t <= sinir) {
            const gun = Math.ceil((t.getTime() - bugun.getTime()) / 86400000);
            items.push({ tip: 'Duruşma', baslik: `${d.no || d.konu || '—'}`, tarih: dur.tarih, gun, icon: '📅' });
          }
        });
      } else if (d.durusma) {
        const t = new Date(d.durusma as string);
        if (t >= bugun && t <= sinir) {
          const gun = Math.ceil((t.getTime() - bugun.getTime()) / 86400000);
          items.push({ tip: 'Duruşma', baslik: `${d.no || d.konu || '—'}`, tarih: d.durusma as string, gun, icon: '📅' });
        }
      }
    });

    // İcra itiraz süreleri
    icralar?.forEach((i) => {
      const itirazTarih = (i.itirazSonTarih || i.itarih) as string | undefined;
      if (itirazTarih) {
        const t = new Date(itirazTarih);
        if (t >= bugun && t <= sinir) {
          const gun = Math.ceil((t.getTime() - bugun.getTime()) / 86400000);
          items.push({ tip: 'İtiraz Süresi', baslik: `${i.no || '—'}`, tarih: itirazTarih, gun, icon: '⏰' });
        }
      }
    });

    return items.sort((a, b) => a.gun - b.gun).slice(0, 5);
  }, [davalar, icralar]);

  if (kritikSureler.length === 0) {
    return <EmptyState icon="📅" text="30 gün içinde kritik işlem yok" />;
  }

  return (
    <div className="space-y-1.5 mt-1">
      {kritikSureler.map((s, i) => (
        <div key={i} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${s.gun <= 3 ? 'bg-red-dim/40' : s.gun <= 7 ? 'bg-gold-dim/40' : 'bg-surface2/50'}`}>
          <span className="text-base flex-shrink-0">{s.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-text truncate">{s.baslik}</div>
            <div className="text-[10px] text-text-dim">{s.tip} · {fmtTarih(s.tarih)}</div>
          </div>
          <GunBadge gun={s.gun} />
        </div>
      ))}
    </div>
  );
}
