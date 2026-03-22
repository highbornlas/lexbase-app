'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fmt } from '@/lib/utils';
import { safeNum, tahsilatToplam } from '@/lib/utils/finans';

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

    // Dava + İcra tahsilatları (tahsilatlar[] dizisi — tek kaynak)
    [...(davalar || []), ...(icralar || [])].forEach((d) => {
      (d.tahsilatlar as Array<{ tutar: number; tarih?: string }> | undefined)?.forEach((t) => {
        if (!t.tarih) return;
        const td = new Date(t.tarih);
        if (td.getMonth() === buAy && td.getFullYear() === buYil) {
          buAyTahsilat += safeNum(t.tutar);
        }
      });
    });

    // Danışmanlık tahsilatları (henüz tahsilatlar[] dizisi yok, tahsilEdildi kullan)
    (danismanliklar || []).forEach((d) => {
      const tutar = safeNum(d.tahsilEdildi);
      if (tutar <= 0) return;
      const tarih = (d.sonucTarih || d.tarih) as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // Arabuluculuk tahsilatları
    (arabuluculuklar || []).forEach((a) => {
      const tutar = safeNum(a.tahsilEdildi);
      if (tutar <= 0) return;
      const tarih = (a.sonucTarih || a.basvuruTarih) as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // İhtarname tahsilatları
    (ihtarnameler || []).forEach((ih) => {
      const tutar = safeNum(ih.tahsilEdildi);
      if (tutar <= 0) return;
      const tarih = ih.tarih as string;
      if (!tarih) return;
      const td = new Date(tarih);
      if (td.getMonth() === buAy && td.getFullYear() === buYil) buAyTahsilat += tutar;
    });

    // ── Ücret Alacağı: sözleşme bedeli - tahsil edilen ──
    // Tek kaynak kuralı: tahsilatlar[] varsa onu kullan, yoksa tahsilEdildi fallback
    let ucretAlacagi = 0;

    // Dava: ucret - tahsilatlar toplamı (tek kaynak: tahsilatlar[])
    (davalar || []).forEach((d) => {
      if (d.durum === 'Kapalı') return;
      const sozlesme = safeNum(d.ucret);
      if (sozlesme <= 0) return;
      const tahArr = d.tahsilatlar as Array<{ tutar?: number }> | undefined;
      const tahsil = tahArr?.length ? tahsilatToplam(tahArr) : safeNum(d.tahsilEdildi);
      const kalan = sozlesme - tahsil;
      if (kalan > 0) ucretAlacagi += kalan;
    });

    // İcra: vekaletUcreti - tahsilatlar toplamı (tek kaynak: tahsilatlar[])
    (icralar || []).forEach((ic) => {
      if (ic.durum === 'Kapandı') return;
      const sozlesme = safeNum(ic.vekaletUcreti);
      if (sozlesme <= 0) return;
      const tahArr = ic.tahsilatlar as Array<{ tutar?: number }> | undefined;
      const tahsil = tahArr?.length ? tahsilatToplam(tahArr) : safeNum(ic.tahsil);
      const kalan = sozlesme - tahsil;
      if (kalan > 0) ucretAlacagi += kalan;
    });

    // Danışmanlık: ucret - tahsilEdildi
    (danismanliklar || []).forEach((d) => {
      if (d.durum === 'İptal') return;
      const sozlesme = safeNum(d.ucret);
      if (sozlesme <= 0) return;
      const tahsil = safeNum(d.tahsilEdildi);
      const kalan = sozlesme - tahsil;
      if (kalan > 0) ucretAlacagi += kalan;
    });

    // Arabuluculuk: ucret - tahsilEdildi
    (arabuluculuklar || []).forEach((a) => {
      const sozlesme = safeNum(a.ucret);
      if (sozlesme <= 0) return;
      const tahsil = safeNum(a.tahsilEdildi);
      const kalan = sozlesme - tahsil;
      if (kalan > 0) ucretAlacagi += kalan;
    });

    // İhtarname: ucret - tahsilEdildi
    (ihtarnameler || []).forEach((ih) => {
      const sozlesme = safeNum(ih.ucret);
      if (sozlesme <= 0) return;
      const tahsil = safeNum(ih.tahsilEdildi);
      const kalan = sozlesme - tahsil;
      if (kalan > 0) ucretAlacagi += kalan;
    });

    return { muvSayi, muvGercek, muvTuzel, aktifDava, davaSayi, aktifIcra, icraSayi, buHaftaDurusma, buAyTahsilat, ucretAlacagi };
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard icon="👥" value={kpis.muvSayi} label="MÜVEKKİLLER" sub={`${kpis.muvGercek} Gerçek · ${kpis.muvTuzel} Tüzel`} href="/muvekkillar" />
      <KpiCard icon="📁" value={kpis.aktifDava} label="DERDEST DAVA" sub={`${kpis.davaSayi} dosya`} color="text-gold" href="/davalar" />
      <KpiCard icon="⚡" value={kpis.aktifIcra} label="DERDEST İCRA" sub={`${kpis.icraSayi} dosya`} color="text-red" href="/icra" />
      <KpiCard icon="📅" value={kpis.buHaftaDurusma} label="BU HAFTA DURUŞMA" sub={`${kpis.buHaftaDurusma} adet`} color="text-red" accent href="/takvim" />
      <KpiCard icon="💰" value={fmt(kpis.buAyTahsilat)} label="BU AY TAHSİLAT" color="text-green" href="/finans" />
      <KpiCard icon="📊" value={fmt(kpis.ucretAlacagi)} label="ÜCRET ALACAĞI" color={kpis.ucretAlacagi > 0 ? 'text-orange-400' : 'text-green'} href="/finans" />
      <KpiCard icon="💎" value={fmt(yilNet)} label={`${new Date().getFullYear()} NET GELİR`} sub="Kâr" color={yilNet >= 0 ? 'text-green' : 'text-red'} href="/finans" />
    </div>
  );
}
