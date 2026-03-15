'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════
   Menfaat Çakışması Widget — Kompakt versiyon
   Tarama butonu + sonuç özeti (2-3 satır max)
   ══════════════════════════════════════════════════════════════ */

interface MenfaatWidgetProps {
  muvekkillar: Array<Record<string, unknown>>;
  davalar: Array<Record<string, unknown>>;
}

export function MenfaatWidget({ muvekkillar, davalar }: MenfaatWidgetProps) {
  const [tapilanTarih, setTapilanTarih] = useState<string | null>(null);

  const cakismalar = useMemo(() => {
    if (!muvekkillar?.length || !davalar?.length) return [];

    const muvAdlar = new Map<string, string>();
    const muvIdMap = new Map<string, string>();
    muvekkillar.forEach((m) => {
      const ad = String(m.ad || '').trim();
      if (ad) { muvAdlar.set(ad.toLocaleLowerCase('tr'), ad); muvIdMap.set(m.id as string, ad); }
      const unvan = String(m.unvan || '').trim();
      if (unvan) muvAdlar.set(unvan.toLocaleLowerCase('tr'), unvan);
    });

    const bulunanlar: Array<{ muvekkil: string; karsi: string; davaNo: string }> = [];

    davalar.forEach((d) => {
      const davaNo = String(d.no || d.konu || '—');
      const muvAd = muvIdMap.get(d.muvId as string) || '';
      const karsiAd = String(d.karsi || '').trim();

      if (karsiAd && muvAdlar.has(karsiAd.toLocaleLowerCase('tr')) && karsiAd.toLocaleLowerCase('tr') !== muvAd.toLocaleLowerCase('tr')) {
        bulunanlar.push({ muvekkil: muvAd, karsi: karsiAd, davaNo });
      }
    });

    return bulunanlar;
  }, [muvekkillar, davalar]);

  function taraTikla() {
    setTapilanTarih(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  }

  const tarandi = muvekkillar?.length > 0;

  return (
    <div className="mt-1">
      {cakismalar.length === 0 ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 bg-green-dim rounded-full flex items-center justify-center text-green text-base">✅</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-green">Temiz</div>
            <div className="text-[10px] text-text-dim">
              {tarandi ? `${muvekkillar.length} müvekkil · ${davalar.length} dava tarandı` : 'Veri yükleniyor...'}
              {tapilanTarih && ` · ${tapilanTarih}`}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-red-dim/40 rounded-lg px-3 py-2">
            <span className="text-red text-base">⚠️</span>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-red">{cakismalar.length}</span>
              <span className="text-[11px] text-red ml-1">çakışma tespit edildi</span>
            </div>
          </div>
          {cakismalar.slice(0, 2).map((c, i) => (
            <div key={i} className="text-[10px] text-text-dim px-2 truncate">
              {c.muvekkil} ↔ {c.karsi} ({c.davaNo})
            </div>
          ))}
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={taraTikla}
          className="flex-1 text-[11px] font-medium text-gold border border-gold/20 rounded-lg px-3 py-1.5 hover:bg-gold-dim transition-colors text-center"
        >
          🔍 Tarama Yap
        </button>
        <Link
          href="/arac-kutusu"
          className="text-[11px] text-text-dim hover:text-gold transition-colors"
        >
          Detay ›
        </Link>
      </div>
    </div>
  );
}
