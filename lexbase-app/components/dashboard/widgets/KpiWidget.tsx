'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fmt } from '@/lib/utils';
import { useDashboardFinans } from '@/lib/hooks/useDashboardFinans';

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
}

function KpiCard({ icon, value, label, sub, accent, color, href, onClick }: {
  icon: string;
  value: number | string;
  label: string;
  sub?: string;
  accent?: boolean;
  color?: string;
  href?: string;
  onClick?: () => void;
}) {
  const router = useRouter();
  const isClickable = !!(href || onClick);

  const handleClick = () => {
    if (onClick) onClick();
    else if (href) router.push(href);
  };

  return (
    <div
      className={`kpi-card px-3 sm:px-4 py-3 ${accent ? 'kpi-accent' : ''} ${isClickable ? 'cursor-pointer hover:scale-[1.03] hover:shadow-md transition-all duration-200' : ''}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'link' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
    >
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

export function KpiWidget({ muvekkillar, davalar, icralar }: KpiWidgetProps) {
  const finans = useDashboardFinans();
  const yilNet = finans.data?.yilNet ?? 0;
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


    return { muvSayi, muvGercek, muvTuzel, aktifDava, davaSayi, aktifIcra, icraSayi, buHaftaDurusma };
  }, [muvekkillar, davalar, icralar]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard icon="👥" value={kpis.muvSayi} label="MÜVEKKİLLER" sub={`${kpis.muvGercek} Gerçek · ${kpis.muvTuzel} Tüzel`} href="/muvekkillar" />
      <KpiCard icon="📁" value={kpis.aktifDava} label="DERDEST DAVA" sub={`${kpis.davaSayi} dosya`} color="text-gold" href="/davalar" />
      <KpiCard icon="⚡" value={kpis.aktifIcra} label="DERDEST İCRA" sub={`${kpis.icraSayi} dosya`} color="text-red" href="/icra" />
      <KpiCard icon="📅" value={kpis.buHaftaDurusma} label="BU HAFTA DURUŞMA" sub={`${kpis.buHaftaDurusma} adet`} color="text-red" accent href="/takvim" />
      <KpiCard icon="💰" value={finans.data ? fmt(finans.data.buAyTahsilat) : '—'} label="BU AY BÜRO GELİRİ" sub={finans.isError ? 'Veri yüklenemedi' : undefined} color="text-green" href="/finans" />
      <KpiCard icon="📊" value={finans.data ? fmt(finans.data.ucretAlacagi) : '—'} label="ÜCRET ALACAĞI" color="text-orange-400" href="/finans" />
      <KpiCard icon="💎" value={finans.data ? fmt(yilNet) : '—'} label={`${new Date().getFullYear()} NET GELİR`} sub="Büro gelirleri eksi büro maliyetleri" color={yilNet >= 0 ? 'text-green' : 'text-red'} href="/finans" />
    </div>
  );
}
