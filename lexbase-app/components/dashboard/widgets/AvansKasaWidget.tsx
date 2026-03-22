'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/utils';
import { useTumAvansHareketleri, hesaplaTumKasalar, AVANS_ESIK } from '@/lib/hooks/useAvansKasasi';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';

export function AvansKasaWidget() {
  const { data: hareketler, isLoading } = useTumAvansHareketleri();
  const { data: muvekkillar } = useMuvekkillar();

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  const { kasalar, toplamBakiye, kritikSayisi } = useMemo(() => {
    if (!hareketler?.length) return { kasalar: [], toplamBakiye: 0, kritikSayisi: 0 };

    const kasaMap = hesaplaTumKasalar(hareketler);
    const arr = Array.from(kasaMap.values())
      .map((k) => ({ ...k, muvAd: muvAdMap[k.muvId] || '?' }))
      .sort((a, b) => a.bakiye - b.bakiye); // En düşük bakiye önce

    const toplamBakiye = arr.reduce((t, k) => t + k.bakiye, 0);
    const kritikSayisi = arr.filter((k) => k.bakiye < AVANS_ESIK).length;

    return { kasalar: arr, toplamBakiye, kritikSayisi };
  }, [hareketler, muvAdMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!kasalar.length) {
    return (
      <div className="text-center py-6 text-text-muted">
        <div className="text-2xl mb-1">🏦</div>
        <div className="text-xs">Henüz avans kasası verisi yok</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Özet satırı */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Toplam Bakiye</div>
            <div className={`font-[var(--font-playfair)] text-lg font-bold ${toplamBakiye < 0 ? 'text-red' : 'text-green'}`}>
              {fmt(toplamBakiye)}
            </div>
          </div>
          {kritikSayisi > 0 && (
            <div className="px-2 py-1 bg-orange-400/10 border border-orange-400/20 rounded-md">
              <div className="text-[10px] text-orange-400 font-semibold">{kritikSayisi} düşük bakiye</div>
            </div>
          )}
        </div>
        <div className="text-[10px] text-text-dim">{kasalar.length} müvekkil</div>
      </div>

      {/* Müvekkil listesi — en kritik 7 tanesi */}
      <div className="space-y-1">
        {kasalar.slice(0, 7).map((k) => (
          <Link
            key={k.muvId}
            href={`/muvekkillar/${k.muvId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface2 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              {k.bakiye < 0 ? (
                <span className="text-red text-xs">🚨</span>
              ) : k.bakiye < AVANS_ESIK ? (
                <span className="text-orange-400 text-xs">⚠️</span>
              ) : (
                <span className="text-green text-xs">✓</span>
              )}
              <span className="text-xs text-text truncate group-hover:text-gold transition-colors">
                {k.muvAd}
              </span>
            </div>
            <div className={`text-xs font-semibold tabular-nums ${k.bakiye < 0 ? 'text-red' : k.bakiye < AVANS_ESIK ? 'text-orange-400' : 'text-green'}`}>
              {fmt(k.bakiye)}
            </div>
          </Link>
        ))}
        {kasalar.length > 7 && (
          <div className="text-center text-[10px] text-text-dim pt-1">
            +{kasalar.length - 7} müvekkil daha
          </div>
        )}
      </div>
    </div>
  );
}
