'use client';

import { useMemo, useState } from 'react';
import { useGelirVerisi } from '@/lib/hooks/useGelirHesapla';
import { vergiOzetiHesapla } from '@/lib/finans/raporHesaplari';
import { useBuroGiderleri } from '@/lib/hooks/useBuroGiderleri';
import { fmt } from '@/lib/utils';
import { MiniKpi, AYLAR } from './shared';

/* ══════════════════════════════════════════════════════════════
   Vergi Özeti Sekmesi — KDV + Stopaj Beyanname Özeti
   Gelir ve gider tarafındaki vergi kalemlerini dönem bazlı gösterir.
   Yalnızca makbuzKesildi=true olan gelirlerin vergileri hesaba dahil.
   ══════════════════════════════════════════════════════════════ */

const CEYREKLER = [
  { val: 0, label: 'Tüm Yıl' },
  { val: 1, label: 'Q1 (Oca-Mar)' },
  { val: 2, label: 'Q2 (Nis-Haz)' },
  { val: 3, label: 'Q3 (Tem-Eyl)' },
  { val: 4, label: 'Q4 (Eki-Ara)' },
];

export function VergiOzetTab() {
  const buYil = new Date().getFullYear();
  const [yil, setYil] = useState(buYil);
  const [ceyrek, setCeyrek] = useState(0);

  const { gelirler, isPending, isError } = useGelirVerisi();
  const giderQuery = useBuroGiderleri();
  const { data: buroGiderleri } = giderQuery;

  const vergiOzeti = useMemo(() => {
    const ozet = vergiOzetiHesapla(gelirler as unknown as Record<string, unknown>[], buroGiderleri || [], yil, ceyrek);
    return { ...ozet, aylik: ozet.aylik.map(row => ({ ...row, ayLabel: AYLAR[row.ay]?.label || '' })) };
  }, [gelirler, buroGiderleri, yil, ceyrek]);

  if (isError || giderQuery.isError) return <div role="alert" className="py-8 text-center text-xs text-red">Vergi kayıtları yüklenemedi. Lütfen tekrar deneyiniz.</div>;
  if (isPending || giderQuery.isPending) return <div className="py-8 text-center text-xs text-text-muted">Vergi kayıtları yükleniyor...</div>;

  const varMi = vergiOzeti.aylik.some(
    (a) => a.gelirKdv > 0 || a.giderKdv > 0 || a.gelirStopaj > 0 || a.giderStopaj > 0
  );

  return (
    <div>
      {/* Filtreler */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Yıl:</span>
          {[buYil - 2, buYil - 1, buYil].map((y) => (
            <button
              key={y}
              onClick={() => setYil(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                yil === y ? 'bg-gold text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Dönem:</span>
          <select
            value={ceyrek}
            onChange={(e) => setCeyrek(Number(e.target.value))}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            {CEYREKLER.map((c) => (
              <option key={c.val} value={c.val}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <MiniKpi label="Hesaplanan KDV (Gelir)" value={fmt(vergiOzeti.toplamGelirKdv)} color="text-green" />
        <MiniKpi label="İndirilecek KDV (Gider)" value={fmt(vergiOzeti.toplamGiderKdv)} color="text-red" />
        <MiniKpi label="Kayıtlı KDV Farkı" value={fmt(vergiOzeti.odenecekKdv)} color={vergiOzeti.odenecekKdv >= 0 ? 'text-gold' : 'text-green'} />
        <MiniKpi label="Kesilen Stopaj (Gelir)" value={fmt(vergiOzeti.toplamGelirStopaj)} color="text-text" />
        <MiniKpi label="Ödenen Stopaj (Gider)" value={fmt(vergiOzeti.toplamGiderStopaj)} color="text-text-muted" />
      </div>

      {/* Bilgi Notu */}
      <div className="bg-gold-dim border border-gold/20 rounded-lg p-3 text-xs text-gold mb-5">
        ℹ️ Bu özet yalnızca <strong>resmi makbuz kesilmiş</strong> gelir kayıtlarını ve büro gideri KDV/Stopaj tutarlarını içerir.
        Makbuzsuz (avans/elden) tahsilatlar vergi hesabına dahil edilmez.
      </div>

      {/* Aylık Breakdown Tablosu */}
      {!varMi ? (
        <div className="text-center py-12 bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm text-text-muted">Seçilen dönemde vergi kaydı bulunmuyor</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="text-left px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Ay</th>
                <th className="text-right px-4 py-2.5 text-[10px] text-green font-medium uppercase tracking-wider">Gelir KDV</th>
                <th className="text-right px-4 py-2.5 text-[10px] text-red font-medium uppercase tracking-wider">Gider KDV</th>
                <th className="text-right px-4 py-2.5 text-[10px] text-gold font-medium uppercase tracking-wider">Net KDV</th>
                <th className="text-right px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Gelir Stopaj</th>
                <th className="text-right px-4 py-2.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">Gider Stopaj</th>
              </tr>
            </thead>
            <tbody>
              {vergiOzeti.aylik.map((a) => {
                const netKdv = a.gelirKdv - a.giderKdv;
                return (
                  <tr key={a.ay} className="border-b border-border/50 hover:bg-gold-dim transition-colors">
                    <td className="px-4 py-2.5 text-text font-medium">{a.ayLabel}</td>
                    <td className="px-4 py-2.5 text-right text-green">{a.gelirKdv > 0 ? fmt(a.gelirKdv) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-red">{a.giderKdv > 0 ? fmt(a.giderKdv) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${netKdv >= 0 ? 'text-gold' : 'text-green'}`}>
                      {(a.gelirKdv > 0 || a.giderKdv > 0) ? fmt(netKdv) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{a.gelirStopaj > 0 ? fmt(a.gelirStopaj) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{a.giderStopaj > 0 ? fmt(a.giderStopaj) : '—'}</td>
                  </tr>
                );
              })}
              {/* Toplam satırı */}
              <tr className="bg-surface2 font-bold">
                <td className="px-4 py-2.5 text-text">TOPLAM</td>
                <td className="px-4 py-2.5 text-right text-green">{fmt(vergiOzeti.toplamGelirKdv)}</td>
                <td className="px-4 py-2.5 text-right text-red">{fmt(vergiOzeti.toplamGiderKdv)}</td>
                <td className={`px-4 py-2.5 text-right ${vergiOzeti.odenecekKdv >= 0 ? 'text-gold' : 'text-green'}`}>
                  {fmt(vergiOzeti.odenecekKdv)}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted">{fmt(vergiOzeti.toplamGelirStopaj)}</td>
                <td className="px-4 py-2.5 text-right text-text-muted">{fmt(vergiOzeti.toplamGiderStopaj)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* KDV Formülü Açıklaması */}
      <div className="mt-4 text-[10px] text-text-dim">
        <strong>Kayıtlı KDV farkı</strong>, uygulamadaki gelir ve gider KDV kayıtlarının farkıdır. Beyanname veya kesin vergi borcu hesabı değildir.
      </div>
    </div>
  );
}
