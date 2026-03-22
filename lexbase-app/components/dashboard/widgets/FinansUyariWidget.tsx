'use client';

import { useMemo } from 'react';
import { fmt } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';
import { useTumAvansHareketleri, hesaplaTumKasalar, AVANS_ESIK } from '@/lib/hooks/useAvansKasasi';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';

/* ══════════════════════════════════════════════════════════════
   Finansal Uyarılar Widget — DB uyarıları + Avans kasası uyarıları
   ══════════════════════════════════════════════════════════════ */

interface Uyari {
  icon: string;
  mesaj: string;
  tutar?: number;
  oncelik: 'yuksek' | 'normal';
}

interface FinansUyariWidgetProps {
  uyarilar: Array<Record<string, unknown>>;
}

export function FinansUyariWidget({ uyarilar }: FinansUyariWidgetProps) {
  const { data: avansHareketleri } = useTumAvansHareketleri();
  const { data: muvekkillar } = useMuvekkillar();

  // Müvekkil ad haritası
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // Avans kasası uyarıları üret
  const avansUyarilari = useMemo<Uyari[]>(() => {
    if (!avansHareketleri?.length) return [];
    const kasaMap = hesaplaTumKasalar(avansHareketleri);
    const result: Uyari[] = [];

    kasaMap.forEach((kasa) => {
      const muvAd = muvAdMap[kasa.muvId] || '?';
      if (kasa.bakiye < 0) {
        result.push({
          icon: '🚨',
          mesaj: `${muvAd} — avans kasası ekside`,
          tutar: Math.abs(kasa.bakiye),
          oncelik: 'yuksek',
        });
      } else if (kasa.bakiye < AVANS_ESIK && kasa.bakiye >= 0) {
        result.push({
          icon: '⚠️',
          mesaj: `${muvAd} — avans bakiyesi düşük`,
          tutar: kasa.bakiye,
          oncelik: 'normal',
        });
      }
    });

    // Kritik olanlar önce, sonra düşük bakiye
    result.sort((a, b) => {
      if (a.oncelik === 'yuksek' && b.oncelik !== 'yuksek') return -1;
      if (a.oncelik !== 'yuksek' && b.oncelik === 'yuksek') return 1;
      return (a.tutar || 0) - (b.tutar || 0);
    });

    return result;
  }, [avansHareketleri, muvAdMap]);

  // DB uyarılarını normalize et + avans uyarılarını birleştir
  const tumUyarilar = useMemo<Uyari[]>(() => {
    const dbUyarilar: Uyari[] = (Array.isArray(uyarilar) ? uyarilar : []).map((u) => ({
      icon: (u.icon as string) || '⚠️',
      mesaj: (u.mesaj as string) || '',
      tutar: typeof u.tutar === 'number' ? u.tutar : undefined,
      oncelik: u.oncelik === 'yuksek' ? 'yuksek' as const : 'normal' as const,
    }));
    return [...dbUyarilar, ...avansUyarilari];
  }, [uyarilar, avansUyarilari]);

  const kritikUyari = tumUyarilar.filter((u) => u.oncelik === 'yuksek').length;

  if (tumUyarilar.length === 0) {
    return <EmptyState icon="✅" text="Finansal uyarı bulunmuyor" />;
  }

  return (
    <div className="mt-1 space-y-2">
      {/* Özet */}
      <div className="bg-surface2 rounded-xl p-3 text-center">
        <div className="progress-bar mb-2">
          <div className="progress-fill" style={{ width: `${Math.min(100, kritikUyari * 25)}%`, background: kritikUyari > 0 ? 'var(--red)' : 'var(--gradient-progress)' }} />
        </div>
        <div className={`font-[var(--font-playfair)] text-xl font-bold ${kritikUyari > 0 ? 'text-red' : 'text-gold'}`}>{kritikUyari} Kritik</div>
        <div className="text-[10px] text-text-dim">{tumUyarilar.length} toplam uyarı</div>
      </div>
      {/* Liste */}
      {tumUyarilar.slice(0, 6).map((u, i) => (
        <div key={i} className={`flex items-start gap-2 px-2 py-2 rounded-lg text-[11px] ${u.oncelik === 'yuksek' ? 'bg-red-dim/40 text-red' : 'bg-gold-dim/30 text-gold'}`}>
          <span className="flex-shrink-0 mt-0.5">{u.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium leading-snug">{u.mesaj}</div>
            {typeof u.tutar === 'number' && u.tutar > 0 && (
              <div className="font-bold mt-0.5">{fmt(u.tutar)}</div>
            )}
          </div>
        </div>
      ))}
      {tumUyarilar.length > 6 && (
        <div className="text-center text-[10px] text-text-dim">+{tumUyarilar.length - 6} uyarı daha</div>
      )}
    </div>
  );
}
