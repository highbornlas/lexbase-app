'use client';

import { useMemo } from 'react';
import { fmt } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   Aylık Performans Widget — Gelir/Gider bar chart + kaynak dağılımı
   Tüm modüllerden veri toplar: Dava, İcra, Danışmanlık,
   Arabuluculuk, İhtarname, Büro Giderleri
   ══════════════════════════════════════════════════════════════ */

interface PerformansWidgetProps {
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
  danismanliklar: Array<Record<string, unknown>>;
  arabuluculuklar: Array<Record<string, unknown>>;
  ihtarnameler: Array<Record<string, unknown>>;
  buroGiderleri: Array<Record<string, unknown>>;
}

export function PerformansWidget({ davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, buroGiderleri }: PerformansWidgetProps) {
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const buAy = new Date().getMonth();
  const buYil = new Date().getFullYear();

  const { aylikVeri, kaynakDagilim } = useMemo(() => {
    const gelirler = new Array(12).fill(0);
    const giderler = new Array(12).fill(0);

    // Kaynak bazlı toplam gelir (yıllık)
    const kaynaklar: Record<string, number> = {
      'Dava': 0,
      'İcra': 0,
      'Danışmanlık': 0,
      'Arabuluculuk': 0,
      'İhtarname': 0,
    };

    const ayaEkle = (tarih: string | undefined, tutar: number, hedef: number[]) => {
      if (!tarih) return;
      const d = new Date(tarih);
      if (isNaN(d.getTime()) || d.getFullYear() !== buYil) return;
      hedef[d.getMonth()] += tutar;
    };

    // Dava tahsilatları ve harcamaları
    (davalar || []).forEach((dosya) => {
      const tahsilatlar = dosya.tahsilatlar as Array<{ tutar: number; tarih?: string }> | undefined;
      tahsilatlar?.forEach((t) => {
        ayaEkle(t.tarih, t.tutar || 0, gelirler);
        if (t.tarih) {
          const d = new Date(t.tarih);
          if (d.getFullYear() === buYil) kaynaklar['Dava'] += (t.tutar || 0);
        }
      });
      const harcamalar = dosya.harcamalar as Array<{ tutar: number; tarih?: string }> | undefined;
      harcamalar?.forEach((h) => ayaEkle(h.tarih, h.tutar || 0, giderler));
    });

    // İcra tahsilatları ve harcamaları
    (icralar || []).forEach((dosya) => {
      const tahsilatlar = dosya.tahsilatlar as Array<{ tutar: number; tarih?: string }> | undefined;
      tahsilatlar?.forEach((t) => {
        ayaEkle(t.tarih, t.tutar || 0, gelirler);
        if (t.tarih) {
          const d = new Date(t.tarih);
          if (d.getFullYear() === buYil) kaynaklar['İcra'] += (t.tutar || 0);
        }
      });
      const harcamalar = dosya.harcamalar as Array<{ tutar: number; tarih?: string }> | undefined;
      harcamalar?.forEach((h) => ayaEkle(h.tarih, h.tutar || 0, giderler));
    });

    // Danışmanlık gelirleri
    (danismanliklar || []).forEach((d) => {
      const tutar = Number(d.tahsilEdildi || 0);
      if (tutar > 0) {
        const tarih = (d.sonucTarih as string) || (d.tarih as string);
        ayaEkle(tarih, tutar, gelirler);
        if (tarih) {
          const dt = new Date(tarih);
          if (dt.getFullYear() === buYil) kaynaklar['Danışmanlık'] += tutar;
        }
      }
    });

    // Arabuluculuk gelirleri
    (arabuluculuklar || []).forEach((a) => {
      const tutar = Number(a.tahsilEdildi || 0);
      if (tutar > 0) {
        const tarih = (a.sonucTarih as string) || (a.basvuruTarih as string);
        ayaEkle(tarih, tutar, gelirler);
        if (tarih) {
          const dt = new Date(tarih);
          if (dt.getFullYear() === buYil) kaynaklar['Arabuluculuk'] += tutar;
        }
      }
    });

    // İhtarname gelirleri
    (ihtarnameler || []).forEach((ih) => {
      const tutar = Number(ih.tahsilEdildi || 0);
      if (tutar > 0) {
        ayaEkle(ih.tarih as string, tutar, gelirler);
        if (ih.tarih) {
          const dt = new Date(ih.tarih as string);
          if (dt.getFullYear() === buYil) kaynaklar['İhtarname'] += tutar;
        }
      }
      const noter = Number(ih.noterMasrafi || 0);
      if (noter > 0) ayaEkle(ih.tarih as string, noter, giderler);
    });

    // Büro giderleri
    (buroGiderleri || []).forEach((g) => {
      const tutar = Number(g.netTutar || g.tutar || 0);
      if (tutar > 0) ayaEkle(g.tarih as string, tutar, giderler);
    });

    // Kaynak dağılımı (sadece 0'dan büyük olanlar)
    const kaynakDagilim = Object.entries(kaynaklar)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    return { aylikVeri: { gelirler, giderler }, kaynakDagilim };
  }, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, buroGiderleri, buYil]);

  const maxVal = Math.max(1, ...aylikVeri.gelirler, ...aylikVeri.giderler);
  const toplamVarMi = aylikVeri.gelirler.some(v => v > 0) || aylikVeri.giderler.some(v => v > 0);

  const KAYNAK_RENK: Record<string, string> = {
    'Dava': 'bg-blue',
    'İcra': 'bg-red',
    'Danışmanlık': 'bg-gold',
    'Arabuluculuk': 'bg-green',
    'İhtarname': 'bg-purple',
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24 px-1">
        {aylar.map((ay, i) => {
          const gelirH = toplamVarMi ? (aylikVeri.gelirler[i] / maxVal) * 100 : 0;
          const giderH = toplamVarMi ? (aylikVeri.giderler[i] / maxVal) * 100 : 0;
          return (
            <div key={ay} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-[1px] h-16 items-end">
                <div className={`flex-1 rounded-sm ${i === buAy ? 'bg-green' : 'bg-green/30'}`} style={{ height: `${Math.max(gelirH, 0)}%` }} title={`Gelir: ${fmt(aylikVeri.gelirler[i])}`} />
                <div className={`flex-1 rounded-sm ${i === buAy ? 'bg-red' : 'bg-red/30'}`} style={{ height: `${Math.max(giderH, 0)}%` }} title={`Gider: ${fmt(aylikVeri.giderler[i])}`} />
              </div>
              <span className={`text-[8px] ${i === buAy ? 'text-text font-bold' : 'text-text-dim'}`}>{ay}</span>
            </div>
          );
        })}
      </div>

      {/* Legend: Gelir/Gider + Kaynak dağılımı */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green" /> Gelir</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red" /> Gider</span>
        </div>

        {/* Kaynak dağılımı mini bar */}
        {kaynakDagilim.length > 0 && (
          <div className="px-1">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-surface2">
              {(() => {
                const toplam = kaynakDagilim.reduce((s, [, v]) => s + v, 0);
                return kaynakDagilim.map(([kaynak, tutar]) => (
                  <div
                    key={kaynak}
                    className={`${KAYNAK_RENK[kaynak] || 'bg-text-dim'}`}
                    style={{ width: `${(tutar / toplam) * 100}%` }}
                    title={`${kaynak}: ${fmt(tutar)}`}
                  />
                ));
              })()}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1.5">
              {kaynakDagilim.map(([kaynak, tutar]) => (
                <span key={kaynak} className="flex items-center gap-1 text-[9px] text-text-dim">
                  <span className={`w-1.5 h-1.5 rounded-full ${KAYNAK_RENK[kaynak] || 'bg-text-dim'}`} />
                  {kaynak} {fmt(tutar)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
