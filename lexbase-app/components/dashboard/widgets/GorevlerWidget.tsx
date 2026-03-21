'use client';

import { useMemo } from 'react';
import { fmtTarih } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Görevler Widget — Bu hafta yapılacaklar
   ══════════════════════════════════════════════════════════════ */

interface GorevlerWidgetProps {
  gorevler: Array<Record<string, unknown>>;
}

function badgeCls(gecikmi: boolean, oncelik: unknown): string {
  if (gecikmi) return 'bg-red text-white';
  if (oncelik === 'Yüksek') return 'bg-red-dim text-red';
  if (oncelik === 'Düşük') return 'bg-green-dim text-green';
  return 'bg-gold-dim text-gold';
}

export function GorevlerWidget({ gorevler }: GorevlerWidgetProps) {
  const bugunStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const buHaftaGorevler = useMemo(() => {
    if (!gorevler) return [];

    // Bu haftanın Pazartesi ve Pazar tarihlerini hesapla
    const bugun = new Date();
    const gunSirasi = bugun.getDay(); // 0=Pazar, 1=Pazartesi...
    const pazartesiFark = gunSirasi === 0 ? -6 : 1 - gunSirasi;
    const pazartesi = new Date(bugun);
    pazartesi.setDate(bugun.getDate() + pazartesiFark);
    pazartesi.setHours(0, 0, 0, 0);
    const pazar = new Date(pazartesi);
    pazar.setDate(pazartesi.getDate() + 6);
    pazar.setHours(23, 59, 59, 999);

    const pazartesiStr = pazartesi.toISOString().split('T')[0];
    const pazarStr = pazar.toISOString().split('T')[0];

    return gorevler
      .filter((g) => {
        if (g.durum === 'Tamamlandı' || g.durum === 'İptal') return false;
        const sonTarih = g.sonTarih as string | undefined;
        // Son tarihi bu hafta içinde olan veya gecikmis (son tarihi pazartesiden once) gorevler
        if (!sonTarih) return false;
        return sonTarih <= pazarStr;
      })
      .sort((a, b) => {
        if (a.oncelik === 'Yüksek' && b.oncelik !== 'Yüksek') return -1;
        if (b.oncelik === 'Yüksek' && a.oncelik !== 'Yüksek') return 1;
        return ((a.sonTarih as string) || '').localeCompare((b.sonTarih as string) || '');
      })
      .slice(0, 5);
  }, [gorevler]);

  if (buHaftaGorevler.length === 0) {
    return <EmptyState icon="✅" text="Görev bulunmuyor" />;
  }

  return (
    <div className="space-y-1.5 mt-1">
      {buHaftaGorevler.map((g) => {
        const gecikmi = !!(g.sonTarih && (g.sonTarih as string) < bugunStr && g.durum !== 'Tamamlandı' && g.durum !== 'İptal');
        return (
          <div key={g.id as string} className={`flex items-center gap-2 px-2 py-2 rounded-lg ${gecikmi ? 'bg-red-dim/30' : 'bg-surface2/50'}`}>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-text truncate">{(g.baslik as string) || '—'}</div>
              <div className="text-[10px] text-text-dim">{g.sonTarih ? fmtTarih(g.sonTarih as string) : ''}</div>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 uppercase ${badgeCls(gecikmi, g.oncelik)}`}>
              {gecikmi ? 'Gecikti' : (g.oncelik as string) || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
