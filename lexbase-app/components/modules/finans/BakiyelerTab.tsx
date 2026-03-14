'use client';

import { useState, useMemo } from 'react';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { fmt } from '@/lib/utils';
import { BakiyeItem, EmptyState, MiniKpi } from './shared';

const PAGE_SIZE = 20;

export function BakiyelerTab() {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const [arama, setArama] = useState('');
  const [sayfa, setSayfa] = useState(1);

  const bakiyeler = useMemo(() => {
    if (!muvekkillar) return [];
    return muvekkillar.map((m) => {
      const muvDavalar = (davalar || []).filter((d) => d.muvId === m.id);
      const muvIcralar = (icralar || []).filter((i) => i.muvId === m.id);
      const muvDanismanlik = (danismanliklar || []).filter((d) => d.muvId === m.id);
      const muvArabuluculuk = (arabuluculuklar || []).filter((a) => a.muvId === m.id);
      const muvIhtarname = (ihtarnameler || []).filter((ih) => ih.muvId === m.id);

      let masrafToplam = 0;
      let tahsilatToplam = 0;
      let vekaletTahsil = 0;
      let hakedisToplam = 0;
      let danismanlikGelir = 0;
      let arabuluculukGelir = 0;
      let ihtarnameGelir = 0;
      let ihtarnameMasraf = 0;

      // Dava + İcra harcamaları ve tahsilatları
      [...muvDavalar, ...muvIcralar].forEach((dosya) => {
        masrafToplam += (dosya.harcamalar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
        (dosya.tahsilatlar || []).forEach((th: { tur: string; tutar: number }) => {
          if (th.tur === 'tahsilat') tahsilatToplam += th.tutar || 0;
          if (th.tur === 'akdi_vekalet') vekaletTahsil += th.tutar || 0;
          if (th.tur === 'hakediş') hakedisToplam += th.tutar || 0;
        });
      });

      // Danışmanlık gelirleri
      muvDanismanlik.forEach((d) => {
        danismanlikGelir += Number(d.tahsilEdildi || 0);
      });

      // Arabuluculuk gelirleri
      muvArabuluculuk.forEach((a) => {
        arabuluculukGelir += Number(a.tahsilEdildi || 0);
      });

      // İhtarname gelirleri ve masrafları
      muvIhtarname.forEach((ih) => {
        ihtarnameGelir += Number(ih.tahsilEdildi || 0);
        ihtarnameMasraf += Number(ih.noterMasrafi || 0);
      });

      const toplamGelir = vekaletTahsil + hakedisToplam + tahsilatToplam + danismanlikGelir + arabuluculukGelir + ihtarnameGelir;
      const toplamMasraf = masrafToplam + ihtarnameMasraf;
      const genelBakiye = toplamGelir - toplamMasraf;

      return {
        id: m.id, ad: m.ad,
        masrafToplam: toplamMasraf,
        tahsilatToplam,
        vekaletTahsil,
        hakedisToplam,
        danismanlikGelir,
        arabuluculukGelir,
        ihtarnameGelir,
        toplamGelir,
        genelBakiye,
      };
    }).filter((b) => {
      if (!arama) return true;
      return b.ad.toLowerCase().includes(arama.toLowerCase());
    });
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, arama]);

  // Genel toplamlar
  const genelToplamlar = useMemo(() => {
    return {
      toplamGelir: bakiyeler.reduce((t, b) => t + b.toplamGelir, 0),
      toplamMasraf: bakiyeler.reduce((t, b) => t + b.masrafToplam, 0),
      netBakiye: bakiyeler.reduce((t, b) => t + b.genelBakiye, 0),
      muvSayi: bakiyeler.length,
    };
  }, [bakiyeler]);

  // Pagination
  const toplamSayfa = Math.max(1, Math.ceil(bakiyeler.length / PAGE_SIZE));
  const sayfadakiler = bakiyeler.slice((sayfa - 1) * PAGE_SIZE, sayfa * PAGE_SIZE);

  return (
    <div>
      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MiniKpi label="Müvekkil Sayısı" value={String(genelToplamlar.muvSayi)} />
        <MiniKpi label="Toplam Gelir" value={fmt(genelToplamlar.toplamGelir)} color="text-green" />
        <MiniKpi label="Toplam Masraf" value={fmt(genelToplamlar.toplamMasraf)} color="text-red" />
        <MiniKpi label="Net Bakiye" value={fmt(genelToplamlar.netBakiye)} color={genelToplamlar.netBakiye >= 0 ? 'text-green' : 'text-red'} />
      </div>

      <div className="mb-4 relative max-w-md">
        <input
          type="text"
          value={arama}
          onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
          placeholder="Müvekkil ara..."
          className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
      </div>

      {bakiyeler.length === 0 ? (
        <EmptyState icon="💳" message="Müvekkil bakiyesi bulunamadı" />
      ) : (
        <>
          {/* Tablo Görünümü */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface2">
                  <th className="text-left px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Müvekkil</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Vekalet</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Hakediş</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Tahsilat</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Diğer Gelir</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-green font-medium uppercase tracking-wider">Toplam Gelir</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-red font-medium uppercase tracking-wider">Masraf</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Net Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {sayfadakiler.map((b) => {
                  const digerGelir = b.danismanlikGelir + b.arabuluculukGelir + b.ihtarnameGelir;
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-gold-dim transition-colors">
                      <td className="px-4 py-3 text-text font-medium">{b.ad}</td>
                      <td className="px-3 py-3 text-right text-text-muted">{b.vekaletTahsil > 0 ? fmt(b.vekaletTahsil) : '—'}</td>
                      <td className="px-3 py-3 text-right text-text-muted">{b.hakedisToplam > 0 ? fmt(b.hakedisToplam) : '—'}</td>
                      <td className="px-3 py-3 text-right text-text-muted">{b.tahsilatToplam > 0 ? fmt(b.tahsilatToplam) : '—'}</td>
                      <td className="px-3 py-3 text-right text-text-muted">
                        {digerGelir > 0 ? (
                          <span title={[
                            b.danismanlikGelir > 0 ? `Danışmanlık: ${fmt(b.danismanlikGelir)}` : '',
                            b.arabuluculukGelir > 0 ? `Arabuluculuk: ${fmt(b.arabuluculukGelir)}` : '',
                            b.ihtarnameGelir > 0 ? `İhtarname: ${fmt(b.ihtarnameGelir)}` : '',
                          ].filter(Boolean).join(' · ')}>
                            {fmt(digerGelir)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-green">{fmt(b.toplamGelir)}</td>
                      <td className="px-3 py-3 text-right text-red">{b.masrafToplam > 0 ? fmt(b.masrafToplam) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${b.genelBakiye >= 0 ? 'text-green' : 'text-red'}`}>
                          {fmt(b.genelBakiye)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Toplam Satırı */}
                <tr className="bg-surface2 font-bold border-t border-border">
                  <td className="px-4 py-3 text-text">TOPLAM ({bakiyeler.length} müvekkil)</td>
                  <td className="px-3 py-3 text-right text-text-muted">{fmt(bakiyeler.reduce((t, b) => t + b.vekaletTahsil, 0))}</td>
                  <td className="px-3 py-3 text-right text-text-muted">{fmt(bakiyeler.reduce((t, b) => t + b.hakedisToplam, 0))}</td>
                  <td className="px-3 py-3 text-right text-text-muted">{fmt(bakiyeler.reduce((t, b) => t + b.tahsilatToplam, 0))}</td>
                  <td className="px-3 py-3 text-right text-text-muted">{fmt(bakiyeler.reduce((t, b) => t + b.danismanlikGelir + b.arabuluculukGelir + b.ihtarnameGelir, 0))}</td>
                  <td className="px-3 py-3 text-right text-green">{fmt(genelToplamlar.toplamGelir)}</td>
                  <td className="px-3 py-3 text-right text-red">{fmt(genelToplamlar.toplamMasraf)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={genelToplamlar.netBakiye >= 0 ? 'text-green' : 'text-red'}>{fmt(genelToplamlar.netBakiye)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {toplamSayfa > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-[11px] text-text-dim">
                {bakiyeler.length} müvekkil — Sayfa {sayfa}/{toplamSayfa}
              </div>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
