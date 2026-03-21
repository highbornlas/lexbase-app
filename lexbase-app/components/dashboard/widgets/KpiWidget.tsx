'use client';

import { useMemo } from 'react';
import { fmt } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   KPI Widget — Üst sıra KPI kartları (genişletilmiş)
   ══════════════════════════════════════════════════════════════ */

interface KpiWidgetProps {
  muvekkillar: Array<Record<string, unknown>>;
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
  danismanliklar: Array<Record<string, unknown>>;
  arabuluculuklar: Array<Record<string, unknown>>;
  ihtarnameler: Array<Record<string, unknown>>;
  yilNet: number;
}

function KpiCard({ icon, value, label, sub, accent, color }: {
  icon: string;
  value: number | string;
  label: string;
  sub?: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className={`kpi-card px-3 sm:px-4 py-3 ${accent ? 'kpi-accent' : ''}`}>
      <div className="flex items-start gap-2.5">
        <div className="text-lg sm:text-xl flex-shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0">
          <div className={`font-[var(--font-playfair)] text-lg sm:text-xl font-bold leading-tight ${color || 'text-text'}`}>
            {value}
          </div>
          <div className="text-[8px] sm:text-[9px] text-text-muted uppercase tracking-wider font-semibold mt-0.5">{label}</div>
          {sub && <div className="text-[9px] sm:text-[10px] text-text-dim mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function KpiWidget({ muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, yilNet }: KpiWidgetProps) {
  const kpis = useMemo(() => {
    const muvSayi = muvekkillar?.length ?? 0;
    const muvGercek = muvekkillar?.filter((m) => m.tip === 'gercek').length ?? 0;
    const muvTuzel = muvekkillar?.filter((m) => m.tip === 'tuzel').length ?? 0;
    const aktifDava = davalar?.filter((d) => d.durum === 'Derdest' || d.durum === 'Aktif' || d.durum === 'Devam Ediyor').length ?? 0;
    const davaSayi = davalar?.length ?? 0;
    const aktifIcra = icralar?.filter((i) => i.durum !== 'Kapandı').length ?? 0;
    const icraSayi = icralar?.length ?? 0;

    const bugun = new Date();
    const haftaSonu = new Date(bugun);
    haftaSonu.setDate(bugun.getDate() + 7);
    let buHaftaDurusma = 0;
    davalar?.forEach((d) => {
      const durusmalar = d.durusmalar as Array<{ tarih: string }> | undefined;
      if (durusmalar?.length) {
        durusmalar.forEach((dur) => {
          if (!dur.tarih) return;
          const t = new Date(dur.tarih);
          if (t >= bugun && t <= haftaSonu) buHaftaDurusma++;
        });
      } else if (d.durusma) {
        const t = new Date(d.durusma as string);
        if (t >= bugun && t <= haftaSonu) buHaftaDurusma++;
      }
    });

    // Bu ay tahsilat (tüm kaynaklardan)
    const buAy = bugun.getMonth();
    const buYil = bugun.getFullYear();
    let buAyTahsilat = 0;

    // Dava + İcra tahsilatları
    [...(davalar || []), ...(icralar || [])].forEach((d) => {
      (d.tahsilatlar as Array<{ tutar: number; tarih?: string }> | undefined)?.forEach((t) => {
        if (!t.tarih) return;
        const td = new Date(t.tarih);
        if (td.getMonth() === buAy && td.getFullYear() === buYil) {
          buAyTahsilat += (t.tutar || 0);
        }
      });
    });

    // Danışmanlık tahsilatları
    (danismanliklar || []).forEach((d) => {
      const tutar = Number(d.tahsilEdildi || 0);
      if (tutar <= 0) return;
      const tarih = (d.sonucTarih || d.tarih) as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // Arabuluculuk tahsilatları
    (arabuluculuklar || []).forEach((a) => {
      const tutar = Number(a.tahsilEdildi || 0);
      if (tutar <= 0) return;
      const tarih = (a.sonucTarih || a.basvuruTarih) as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // İhtarname tahsilatları
    (ihtarnameler || []).forEach((ih) => {
      const tutar = Number(ih.tahsilEdildi || 0);
      if (tutar <= 0) return;
      const tarih = ih.tarih as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // Bekleyen alacak: müvekkillerdeki cari bakiye toplamı (pozitif = alacak)
    let bekleyenAlacak = 0;
    (muvekkillar || []).forEach((m) => {
      const bakiye = m.bakiye as Record<string, number> | undefined;
      if (bakiye?.genelBakiye) {
        bekleyenAlacak += bakiye.genelBakiye;
      }
    });

    return { muvSayi, muvGercek, muvTuzel, aktifDava, davaSayi, aktifIcra, icraSayi, buHaftaDurusma, buAyTahsilat, bekleyenAlacak };
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard icon="👥" value={kpis.muvSayi} label="MÜVEKKİLLER" sub={`${kpis.muvGercek} Gerçek · ${kpis.muvTuzel} Tüzel`} />
      <KpiCard icon="📁" value={kpis.aktifDava} label="DERDEST DAVA" sub={`${kpis.davaSayi} dosya`} color="text-gold" />
      <KpiCard icon="⚡" value={kpis.aktifIcra} label="DERDEST İCRA" sub={`${kpis.icraSayi} dosya`} color="text-red" />
      <KpiCard icon="📅" value={kpis.buHaftaDurusma} label="BU HAFTA DURUŞMA" sub={`${kpis.buHaftaDurusma} adet`} color="text-red" accent />
      <KpiCard icon="💰" value={fmt(kpis.buAyTahsilat)} label="BU AY TAHSİLAT" color="text-green" />
      <KpiCard icon="📊" value={fmt(kpis.bekleyenAlacak)} label="BEKLEYEN ALACAK" color={kpis.bekleyenAlacak > 0 ? 'text-red' : 'text-green'} />
      <KpiCard icon="💎" value={fmt(yilNet)} label={`${new Date().getFullYear()} NET GELİR`} sub="Kâr" color={yilNet >= 0 ? 'text-green' : 'text-red'} />
    </div>
  );
}
