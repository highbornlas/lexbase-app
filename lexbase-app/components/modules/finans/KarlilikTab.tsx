'use client';

import { useState } from 'react';
import { useDosyaKarlilik } from '@/lib/hooks/useFinans';
import { fmt } from '@/lib/utils';
import { MiniKpi, EmptyState } from './shared';

export function KarlilikTab() {
  const { data: karlilik, isLoading } = useDosyaKarlilik();
  const [sayfa, setSayfa] = useState(1);
  const [arama, setArama] = useState('');
  const sayfaBoyutu = 25;

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const tumDosyalar = ((karlilik?.dosyalar as Record<string, unknown>[]) || []);
  const ozet = (karlilik?.ozet || {}) as Record<string, number>;

  // Arama filtresi
  const filtrelenmis = arama
    ? tumDosyalar.filter((d) => {
        const q = arama.toLocaleLowerCase('tr');
        return (
          ((d.dosyaNo as string) || '').toLocaleLowerCase('tr').includes(q) ||
          ((d.muvAd as string) || '').toLocaleLowerCase('tr').includes(q) ||
          ((d.konu as string) || '').toLocaleLowerCase('tr').includes(q)
        );
      })
    : tumDosyalar;

  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = filtrelenmis.slice((sayfa - 1) * sayfaBoyutu, sayfa * sayfaBoyutu);

  return (
    <div>
      {/* Özet KPI */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <MiniKpi label="Dosya Sayısı" value={String(ozet.dosyaSayisi || 0)} />
        <MiniKpi label="Toplam Masraf" value={fmt(ozet.topMasraf || 0)} />
        <MiniKpi label="Toplam Gelir" value={fmt(ozet.topGelir || 0)} color="text-green" />
        <MiniKpi label="Net" value={fmt(ozet.topNet || 0)} color={(ozet.topNet || 0) >= 0 ? 'text-green' : 'text-red'} />
        <MiniKpi label="Ort. Kârlılık" value={`%${(ozet.ortKarlilik || 0).toFixed(1)}`} color="text-gold" />
      </div>

      {/* Arama */}
      <div className="mb-4 relative max-w-md">
        <input
          type="text"
          value={arama}
          onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
          placeholder="Dosya no, müvekkil, konu ile ara..."
          className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
      </div>

      {/* Dosya Tablosu */}
      {filtrelenmis.length === 0 ? (
        <EmptyState icon="🎯" message="Kârlılık verisi bulunamadı" />
      ) : (
        <>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_100px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
              <span>Dosya No</span>
              <span>Müvekkil</span>
              <span>Konu</span>
              <span>Masraf</span>
              <span>Gelir</span>
              <span>Net</span>
              <span>Oran</span>
            </div>
            {sayfadakiler.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_100px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border/50 text-xs hover:bg-gold-dim transition-colors">
                <span className="text-gold font-bold truncate">{(d.dosyaNo as string) || '—'}</span>
                <span className="text-text truncate">{(d.muvAd as string) || '—'}</span>
                <span className="text-text-muted truncate">{(d.konu as string) || '—'}</span>
                <span className="text-text">{fmt((d.masraf as number) || 0)}</span>
                <span className="text-green">{fmt((d.gelir as number) || 0)}</span>
                <span className={`font-semibold ${((d.net as number) || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                  {fmt((d.net as number) || 0)}
                </span>
                <span className={`${((d.karlilikOrani as number) || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                  %{((d.karlilikOrani as number) || 0).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-[11px] text-text-dim">
              {filtrelenmis.length} dosya
              {toplamSayfa > 1 && ` — Sayfa ${sayfa}/${toplamSayfa}`}
            </div>
            {toplamSayfa > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setSayfa(1)} disabled={sayfa === 1} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&laquo;</button>
                <button onClick={() => setSayfa((p) => Math.max(1, p - 1))} disabled={sayfa === 1} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&lsaquo;</button>
                {Array.from({ length: Math.min(5, toplamSayfa) }, (_, idx) => {
                  let pg: number;
                  if (toplamSayfa <= 5) pg = idx + 1;
                  else if (sayfa <= 3) pg = idx + 1;
                  else if (sayfa >= toplamSayfa - 2) pg = toplamSayfa - 4 + idx;
                  else pg = sayfa - 2 + idx;
                  return (
                    <button key={pg} onClick={() => setSayfa(pg)} className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${pg === sayfa ? 'border-gold bg-gold text-bg font-bold' : 'border-border bg-surface text-text-muted hover:border-gold'}`}>{pg}</button>
                  );
                })}
                <button onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))} disabled={sayfa === toplamSayfa} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&rsaquo;</button>
                <button onClick={() => setSayfa(toplamSayfa)} disabled={sayfa === toplamSayfa} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&raquo;</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
