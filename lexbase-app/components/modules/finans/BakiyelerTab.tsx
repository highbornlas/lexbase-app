'use client';

import { useState, useMemo } from 'react';
import { muvekkileGoreGrupla } from '@/lib/finans/dosyaGruplari';
import { hizmetUcretHareketleri } from '@/lib/finans/gelirKurallari';
import Link from 'next/link';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { fmt } from '@/lib/utils';
import { safeNum, tahsilatToplam, dosyaParaOzeti, dosyaMasrafToplami, anlasilanUcret } from '@/lib/utils/finans';
import { EmptyState, MiniKpi } from './shared';

/* ══════════════════════════════════════════════════════════════
   Bakiyeler Sekmesi — Müvekkil bazlı alacak/tahsilat/masraf özeti
   MuvAlacak.tsx ile aynı hesaplama mantığını kullanır.
   ══════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 20;

export function BakiyelerTab() {
  const muvekkilQuery = useMuvekkillar();
  const davaQuery = useDavalar(true);
  const icraQuery = useIcralar(true);
  const danismanlikQuery = useDanismanliklar(true);
  const arabuluculukQuery = useArabuluculuklar(true);
  const ihtarnameQuery = useIhtarnameler(true);
  const { data: muvekkillar } = muvekkilQuery;
  const { data: davalar } = davaQuery;
  const { data: icralar } = icraQuery;
  const { data: danismanliklar } = danismanlikQuery;
  const { data: arabuluculuklar } = arabuluculukQuery;
  const { data: ihtarnameler } = ihtarnameQuery;
  const [arama, setArama] = useState('');
  const [sayfa, setSayfa] = useState(1);

  const bakiyeler = useMemo(() => {
    if (!muvekkillar) return [];
    const davaGruplari = muvekkileGoreGrupla(davalar || []);
    const icraGruplari = muvekkileGoreGrupla(icralar || []);
    const danismanlikGruplari = muvekkileGoreGrupla(danismanliklar || []);
    const arabuluculukGruplari = muvekkileGoreGrupla(arabuluculuklar || []);
    const ihtarnameGruplari = muvekkileGoreGrupla(ihtarnameler || []);
    return muvekkillar.map((m) => {
      const muvDavalar = (davaGruplari.get(m.id) || []) as Record<string, unknown>[];
      const muvIcralar = (icraGruplari.get(m.id) || []) as Record<string, unknown>[];
      const muvDanismanlik = danismanlikGruplari.get(m.id) || [];
      const muvArabuluculuk = arabuluculukGruplari.get(m.id) || [];
      const muvIhtarname = ihtarnameGruplari.get(m.id) || [];

      let anlasilanToplam = 0;
      let tahsilEdilenToplam = 0;
      let masrafToplam = 0;

      // ── Dava + İcra (MuvAlacak pattern) ──
      const tumDosyalar = [...muvDavalar, ...muvIcralar];
      tumDosyalar.forEach((dosya) => {
        anlasilanToplam += anlasilanUcret(dosya);
        tahsilEdilenToplam += dosyaParaOzeti(dosya).sozlesmeTahsilati;
        masrafToplam += dosyaMasrafToplami(dosya);
      });

      // ── Danışmanlık ──
      muvDanismanlik.forEach((d) => {
        const ucret = safeNum(d.ucret || d.aylikUcret);
        if (ucret > 0) anlasilanToplam += ucret;
        tahsilEdilenToplam += tahsilatToplam(hizmetUcretHareketleri(d).map((t) => ({ tutar: safeNum(t.tutar) })));
      });

      // ── Arabuluculuk ──
      muvArabuluculuk.forEach((a) => {
        const ucret = safeNum(a.ucret);
        if (ucret > 0) anlasilanToplam += ucret;
        tahsilEdilenToplam += tahsilatToplam(hizmetUcretHareketleri(a).map((t) => ({ tutar: safeNum(t.tutar) })));
      });

      // ── İhtarname ──
      muvIhtarname.forEach((ih) => {
        const ucret = safeNum(ih.ucret);
        if (ucret > 0) anlasilanToplam += ucret;
        tahsilEdilenToplam += tahsilatToplam(hizmetUcretHareketleri(ih).map((t) => ({ tutar: safeNum(t.tutar) })));
        masrafToplam += safeNum(ih.noterMasrafi);
      });

      const kalanAlacak = anlasilanToplam - tahsilEdilenToplam;
      const netBakiye = tahsilEdilenToplam - masrafToplam;
      const dosyaSayisi = tumDosyalar.length + muvDanismanlik.length + muvArabuluculuk.length + muvIhtarname.length;

      return {
        id: m.id,
        ad: m.ad || '—',
        kayitNo: (m as Record<string, unknown>).kayitNo as number | undefined,
        anlasilanToplam,
        tahsilEdilenToplam,
        kalanAlacak,
        masrafToplam,
        netBakiye,
        dosyaSayisi,
      };
    }).filter((b) => {
      if (!arama) return true;
      const q = arama.toLocaleLowerCase('tr');
      return b.ad.toLocaleLowerCase('tr').includes(q) || String(b.kayitNo || '').includes(q);
    });
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, arama]);

  // Genel toplamlar
  const toplamlar = useMemo(() => ({
    anlasilanToplam: bakiyeler.reduce((t, b) => t + b.anlasilanToplam, 0),
    tahsilEdilenToplam: bakiyeler.reduce((t, b) => t + b.tahsilEdilenToplam, 0),
    kalanAlacak: bakiyeler.reduce((t, b) => t + b.kalanAlacak, 0),
    masrafToplam: bakiyeler.reduce((t, b) => t + b.masrafToplam, 0),
    netBakiye: bakiyeler.reduce((t, b) => t + b.netBakiye, 0),
    muvSayi: bakiyeler.length,
  }), [bakiyeler]);

  // Pagination
  const toplamSayfa = Math.max(1, Math.ceil(bakiyeler.length / PAGE_SIZE));
  const sayfadakiler = bakiyeler.slice((sayfa - 1) * PAGE_SIZE, sayfa * PAGE_SIZE);

  const queries = [muvekkilQuery, davaQuery, icraQuery, danismanlikQuery, arabuluculukQuery, ihtarnameQuery];
  if (queries.some((query) => query.isError)) {
    return <div role="alert" className="text-center py-8 text-red text-xs">Bakiyeler yüklenemedi. Lütfen tekrar deneyiniz.</div>;
  }
  if (queries.some((query) => query.isPending)) {
    return <div className="text-center py-8 text-text-muted text-xs">Bakiyeler yükleniyor...</div>;
  }

  return (
    <div>
      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <MiniKpi label="Müvekkil Sayısı" value={String(toplamlar.muvSayi)} />
        <MiniKpi label="Anlaşılan Toplam" value={fmt(toplamlar.anlasilanToplam)} color="text-text" />
        <MiniKpi label="Tahsil Edilen" value={fmt(toplamlar.tahsilEdilenToplam)} color="text-green" />
        <MiniKpi label="Kalan Alacak" value={fmt(toplamlar.kalanAlacak)} color={toplamlar.kalanAlacak > 0 ? 'text-gold' : 'text-green'} />
        <MiniKpi label="Masraflar" value={fmt(toplamlar.masrafToplam)} color="text-red" />
      </div>

      <div className="mb-4 relative max-w-md">
        <input
          type="text"
          value={arama}
          onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
          placeholder="Müvekkil ara (ad veya kayıt no)..."
          className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
      </div>

      {bakiyeler.length === 0 ? (
        <EmptyState icon="💳" message="Müvekkil bakiyesi bulunamadı" />
      ) : (
        <>
          {/* Tablo */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface2">
                    <th className="text-left px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider w-8">No</th>
                    <th className="text-left px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Müvekkil</th>
                    <th className="text-center px-2 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Dosya</th>
                    <th className="text-right px-3 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Anlaşılan</th>
                    <th className="text-right px-3 py-2.5 text-[10px] text-green font-medium uppercase tracking-wider">Tahsil Edilen</th>
                    <th className="text-right px-3 py-2.5 text-[10px] text-gold font-medium uppercase tracking-wider">Kalan Alacak</th>
                    <th className="text-right px-3 py-2.5 text-[10px] text-red font-medium uppercase tracking-wider">Masraf</th>
                    <th className="text-right px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Net Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {sayfadakiler.map((b) => {
                    const tahsilYuzde = b.anlasilanToplam > 0 ? Math.round((b.tahsilEdilenToplam / b.anlasilanToplam) * 100) : 0;
                    return (
                      <tr key={b.id} className="border-b border-border/50 hover:bg-gold-dim transition-colors">
                        <td className="px-4 py-3 text-text-dim text-[10px]">{b.kayitNo || '—'}</td>
                        <td className="px-3 py-3">
                          <Link href={`/muvekkillar/${b.id}`} className="text-text font-medium hover:text-gold transition-colors">
                            {b.ad}
                          </Link>
                        </td>
                        <td className="px-2 py-3 text-center text-text-dim">{b.dosyaSayisi || '—'}</td>
                        <td className="px-3 py-3 text-right text-text-muted">{b.anlasilanToplam > 0 ? fmt(b.anlasilanToplam) : '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="text-green">{b.tahsilEdilenToplam > 0 ? fmt(b.tahsilEdilenToplam) : '—'}</div>
                          {b.anlasilanToplam > 0 && b.tahsilEdilenToplam > 0 && (
                            <div className="w-full bg-surface2 rounded-full h-1 mt-1">
                              <div className="bg-green rounded-full h-1 transition-all" style={{ width: `${Math.min(tahsilYuzde, 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className={`px-3 py-3 text-right font-semibold ${b.kalanAlacak > 0 ? 'text-gold' : 'text-green'}`}>
                          {b.kalanAlacak !== 0 ? fmt(b.kalanAlacak) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-red">{b.masrafToplam > 0 ? fmt(b.masrafToplam) : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${b.netBakiye >= 0 ? 'text-green' : 'text-red'}`}>
                            {fmt(b.netBakiye)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Toplam */}
                  <tr className="bg-surface2 font-bold border-t border-border">
                    <td colSpan={2} className="px-4 py-3 text-text">TOPLAM ({bakiyeler.length} müvekkil)</td>
                    <td className="px-2 py-3 text-center text-text-dim">{bakiyeler.reduce((t, b) => t + b.dosyaSayisi, 0)}</td>
                    <td className="px-3 py-3 text-right text-text">{fmt(toplamlar.anlasilanToplam)}</td>
                    <td className="px-3 py-3 text-right text-green">{fmt(toplamlar.tahsilEdilenToplam)}</td>
                    <td className={`px-3 py-3 text-right ${toplamlar.kalanAlacak > 0 ? 'text-gold' : 'text-green'}`}>{fmt(toplamlar.kalanAlacak)}</td>
                    <td className="px-3 py-3 text-right text-red">{fmt(toplamlar.masrafToplam)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={toplamlar.netBakiye >= 0 ? 'text-green' : 'text-red'}>{fmt(toplamlar.netBakiye)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
