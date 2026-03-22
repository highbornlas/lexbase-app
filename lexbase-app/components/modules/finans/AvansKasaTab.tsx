'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/utils';
import { useTumAvansHareketleri, hesaplaTumKasalar, AVANS_ESIK } from '@/lib/hooks/useAvansKasasi';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { MiniKpi } from './shared';
import { exportAvansKasaPDF } from '@/lib/export/pdfExport';
import { exportAvansKasaXLS } from '@/lib/export/excelExport';

/* ══════════════════════════════════════════════════════════════
   Avans Kasası Sekmesi — Finans sayfasında tüm müvekkil kasaları
   ══════════════════════════════════════════════════════════════ */

export function AvansKasaTab() {
  const { data: hareketler, isLoading } = useTumAvansHareketleri();
  const { data: muvekkillar } = useMuvekkillar();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<'hepsi' | 'kritik' | 'normal'>('hepsi');

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  const { kasalar, toplamBakiye, toplamAlim, toplamMasraf, kritikSayisi, eksiSayisi } = useMemo(() => {
    if (!hareketler?.length) return { kasalar: [], toplamBakiye: 0, toplamAlim: 0, toplamMasraf: 0, kritikSayisi: 0, eksiSayisi: 0 };

    const kasaMap = hesaplaTumKasalar(hareketler);
    const arr = Array.from(kasaMap.values())
      .map((k) => ({ ...k, muvAd: muvAdMap[k.muvId] || '?' }))
      .sort((a, b) => a.bakiye - b.bakiye);

    const toplamBakiye = arr.reduce((t, k) => t + k.bakiye, 0);
    const toplamAlim = arr.reduce((t, k) => t + k.toplamAlim, 0);
    const toplamMasraf = arr.reduce((t, k) => t + k.toplamMasraf, 0);
    const kritikSayisi = arr.filter((k) => k.bakiye < AVANS_ESIK && k.bakiye >= 0).length;
    const eksiSayisi = arr.filter((k) => k.bakiye < 0).length;

    return { kasalar: arr, toplamBakiye, toplamAlim, toplamMasraf, kritikSayisi, eksiSayisi };
  }, [hareketler, muvAdMap]);

  // Filtreleme
  const gosterilenler = useMemo(() => {
    let sonuc = kasalar;
    if (durumFiltre === 'kritik') sonuc = sonuc.filter((k) => k.bakiye < AVANS_ESIK);
    if (durumFiltre === 'normal') sonuc = sonuc.filter((k) => k.bakiye >= AVANS_ESIK);
    if (arama) {
      const q = arama.toLocaleLowerCase('tr');
      sonuc = sonuc.filter((k) => k.muvAd.toLocaleLowerCase('tr').includes(q));
    }
    return sonuc;
  }, [kasalar, durumFiltre, arama]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* KPI Kartları */}
      <div className="grid grid-cols-5 gap-3">
        <MiniKpi label="Toplam Bakiye" value={fmt(toplamBakiye)} color={toplamBakiye >= 0 ? 'text-green' : 'text-red'} />
        <MiniKpi label="Toplam Alınan" value={fmt(toplamAlim)} color="text-green" />
        <MiniKpi label="Toplam Harcanan" value={fmt(toplamMasraf)} color="text-text" />
        <MiniKpi label="Düşük Bakiye" value={kritikSayisi.toString()} color={kritikSayisi > 0 ? 'text-orange-400' : 'text-green'} />
        <MiniKpi label="Eksiye Düşen" value={eksiSayisi.toString()} color={eksiSayisi > 0 ? 'text-red' : 'text-green'} />
      </div>

      {/* Filtreler + Export */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Müvekkil ara..."
          className="w-64 text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
        />
        <div className="flex gap-1">
          {[
            { key: 'hepsi', label: 'Tümü' },
            { key: 'kritik', label: `Kritik (${kritikSayisi + eksiSayisi})` },
            { key: 'normal', label: 'Normal' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setDurumFiltre(f.key as typeof durumFiltre)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                durumFiltre === f.key ? 'bg-gold text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => exportAvansKasaPDF({ kasalar: gosterilenler, toplamBakiye })}
            className="px-3 py-1.5 text-xs font-medium text-text-muted bg-surface border border-border rounded-lg hover:text-text hover:border-gold/30 transition-colors"
          >PDF</button>
          <button
            onClick={() => exportAvansKasaXLS(gosterilenler)}
            className="px-3 py-1.5 text-xs font-medium text-text-muted bg-surface border border-border rounded-lg hover:text-text hover:border-gold/30 transition-colors"
          >Excel</button>
        </div>
      </div>

      {/* Tablo */}
      {gosterilenler.length === 0 ? (
        <div className="text-center py-12 bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">🏦</div>
          <div className="text-sm text-text-muted">Avans kasası verisi bulunamadı</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-4 py-3 text-left text-[10px] text-text-muted font-medium uppercase tracking-wider">Müvekkil</th>
                <th className="px-4 py-3 text-right text-[10px] text-text-muted font-medium uppercase tracking-wider">Alınan</th>
                <th className="px-4 py-3 text-right text-[10px] text-text-muted font-medium uppercase tracking-wider">Harcanan</th>
                <th className="px-4 py-3 text-right text-[10px] text-text-muted font-medium uppercase tracking-wider">İade</th>
                <th className="px-4 py-3 text-right text-[10px] text-text-muted font-medium uppercase tracking-wider">Bakiye</th>
                <th className="px-4 py-3 text-center text-[10px] text-text-muted font-medium uppercase tracking-wider">Durum</th>
                <th className="px-4 py-3 text-center text-[10px] text-text-muted font-medium uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {gosterilenler.map((k) => (
                <tr key={k.muvId} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-3 text-text font-medium">{k.muvAd}</td>
                  <td className="px-4 py-3 text-right text-green">{fmt(k.toplamAlim)}</td>
                  <td className="px-4 py-3 text-right text-text">{fmt(k.toplamMasraf)}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{fmt(k.toplamIade)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${k.bakiye < 0 ? 'text-red' : k.bakiye < AVANS_ESIK ? 'text-orange-400' : 'text-green'}`}>
                    {fmt(k.bakiye)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {k.bakiye < 0 ? (
                      <span className="text-[10px] px-2 py-0.5 bg-red/10 text-red border border-red/20 rounded-md">Eksi</span>
                    ) : k.bakiye < AVANS_ESIK ? (
                      <span className="text-[10px] px-2 py-0.5 bg-orange-400/10 text-orange-400 border border-orange-400/20 rounded-md">Düşük</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-green/10 text-green border border-green/20 rounded-md">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/muvekkillar/${k.muvId}`} className="text-[10px] text-gold hover:underline font-medium">
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface2 font-bold text-xs">
                <td className="px-4 py-3 text-text-muted">TOPLAM ({gosterilenler.length} müvekkil)</td>
                <td className="px-4 py-3 text-right text-green">{fmt(gosterilenler.reduce((t, k) => t + k.toplamAlim, 0))}</td>
                <td className="px-4 py-3 text-right text-text">{fmt(gosterilenler.reduce((t, k) => t + k.toplamMasraf, 0))}</td>
                <td className="px-4 py-3 text-right text-blue-400">{fmt(gosterilenler.reduce((t, k) => t + k.toplamIade, 0))}</td>
                <td className={`px-4 py-3 text-right text-sm ${toplamBakiye < 0 ? 'text-red' : 'text-green'}`}>
                  {fmt(gosterilenler.reduce((t, k) => t + k.bakiye, 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
