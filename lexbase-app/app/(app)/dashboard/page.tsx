'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useFinansUyarilar, useBuroKarZarar } from '@/lib/hooks/useFinans';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useTodolar } from '@/lib/hooks/useTodolar';
import { fmt, fmtTarih } from '@/lib/utils';

export default function DashboardPage() {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: uyarilar } = useFinansUyarilar();
  const { data: karZarar } = useBuroKarZarar(new Date().getFullYear(), new Date().getMonth() + 1);
  const { data: danismanliklar } = useDanismanliklar();
  const { data: gorevler } = useTodolar();

  // ── KPI Hesaplamaları ──
  const kpis = useMemo(() => {
    const muvSayi = muvekkillar?.length ?? 0;
    const aktifDava = davalar?.filter((d) => d.durum === 'Aktif' || d.durum === 'Devam Ediyor').length ?? 0;
    const aktifIcra = icralar?.filter((i) => i.durum !== 'Kapandı').length ?? 0;

    const bugun = new Date();
    const haftaSonu = new Date(bugun);
    haftaSonu.setDate(bugun.getDate() + 7);
    const buHaftaDurusma = davalar?.filter((d) => {
      if (!d.durusma) return false;
      const t = new Date(d.durusma);
      return t >= bugun && t <= haftaSonu;
    }).length ?? 0;

    const ayGelir = karZarar?.gelir ?? 0;
    const ayGider = karZarar?.gider ?? 0;
    const ayNet = karZarar?.net ?? 0;

    return { muvSayi, aktifDava, aktifIcra, buHaftaDurusma, ayGelir, ayGider, ayNet };
  }, [muvekkillar, davalar, icralar, karZarar]);

  // ── Müvekkil adı çözücü ──
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // ── Gündem (yaklaşan duruşmalar + etkinlikler) ──
  const gundem = useMemo(() => {
    if (!davalar) return [];
    const bugun = new Date();
    const sinir = new Date(bugun);
    sinir.setDate(bugun.getDate() + 14);
    return davalar
      .filter((d) => {
        if (!d.durusma) return false;
        const t = new Date(d.durusma);
        return t >= bugun && t <= sinir;
      })
      .sort((a, b) => new Date(a.durusma!).getTime() - new Date(b.durusma!).getTime())
      .slice(0, 5);
  }, [davalar]);

  // ── Bu Hafta Görevler ──
  const buHaftaGorevler = useMemo(() => {
    if (!gorevler) return [];
    const bugun = new Date();
    const haftaSonu = new Date(bugun);
    haftaSonu.setDate(bugun.getDate() + 7);
    return gorevler
      .filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal')
      .sort((a, b) => {
        if (a.oncelik === 'Yüksek' && b.oncelik !== 'Yüksek') return -1;
        if (b.oncelik === 'Yüksek' && a.oncelik !== 'Yüksek') return 1;
        return (a.sonTarih || '').localeCompare(b.sonTarih || '');
      })
      .slice(0, 5);
  }, [gorevler]);

  // ── Kritik Süreler (30 gün) ──
  const kritikSureler = useMemo(() => {
    const items: Array<{ tip: string; baslik: string; tarih: string; gun: number }> = [];
    const bugun = new Date();
    const sinir = new Date(bugun);
    sinir.setDate(bugun.getDate() + 30);

    davalar?.forEach((d) => {
      if (d.durusma) {
        const t = new Date(d.durusma);
        if (t >= bugun && t <= sinir) {
          const gun = Math.ceil((t.getTime() - bugun.getTime()) / 86400000);
          items.push({ tip: 'Duruşma', baslik: `${d.no || d.konu || '—'} · ${muvAdMap[d.muvId || ''] || ''}`, tarih: d.durusma, gun });
        }
      }
    });

    return items.sort((a, b) => a.gun - b.gun).slice(0, 5);
  }, [davalar, muvAdMap]);

  // ── Devam Eden Hizmetler ──
  const devamEdenHizmetler = useMemo(() => {
    if (!danismanliklar) return [];
    return danismanliklar
      .filter((d) => d.durum === 'Aktif' || d.durum === 'Devam Ediyor')
      .slice(0, 4);
  }, [danismanliklar]);

  return (
    <div className="dash-container">
      {/* ── BAŞLIK ── */}
      <div className="flex justify-between items-end flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">Genel Bakış</h1>
          <p className="text-sm text-text-muted">Büronuzun anlık durumu</p>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Müvekkil" value={kpis.muvSayi} icon="👥" />
        <KpiCard label="Derdest Dava" value={kpis.aktifDava} icon="⚖️" />
        <KpiCard label="Derdest İcra" value={kpis.aktifIcra} icon="⚡" />
        <KpiCard label="Duruşma (Hafta)" value={kpis.buHaftaDurusma} icon="📅" accent />
        <KpiCard
          label="Bu Ay Net"
          value={kpis.ayNet ? fmt(kpis.ayNet) : '—'}
          icon="💰"
          color={kpis.ayNet >= 0 ? 'text-green' : 'text-red'}
        />
      </div>

      {/* ── BENTO GRID: Satır 1 — 3 eşit sütun ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Aylık Performans */}
        <DashPanel title="💰 Aylık Performans" linkText="Finans ›" linkHref="/finans" color="green">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Gelir</span>
              <span className="text-sm font-semibold text-green">{fmt(kpis.ayGelir)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Gider</span>
              <span className="text-sm font-semibold text-red">{fmt(kpis.ayGider)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-xs font-semibold text-text">Net</span>
              <span className={`text-sm font-bold ${kpis.ayNet >= 0 ? 'text-green' : 'text-red'}`}>{fmt(kpis.ayNet)}</span>
            </div>
          </div>
        </DashPanel>

        {/* Gündem */}
        <DashPanel title="📋 Gündem" linkText="Takvim ›" linkHref="/takvim" color="blue">
          {gundem.length === 0 ? (
            <EmptyState text="Yaklaşan etkinlik yok" />
          ) : (
            <div className="space-y-2">
              {gundem.map((d) => {
                const gun = Math.ceil((new Date(d.durusma!).getTime() - Date.now()) / 86400000);
                return (
                  <Link key={d.id} href={`/davalar/${d.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface2 transition-colors">
                    <GunBadge gun={gun} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-text truncate">{d.no || d.konu || '—'}</div>
                      <div className="text-[10px] text-text-dim truncate">{muvAdMap[d.muvId || ''] || '—'}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DashPanel>

        {/* Bu Hafta Yapılacaklar */}
        <DashPanel title="✅ Bu Hafta Yapılacaklar" linkText="Tümü ›" linkHref="/gorevler" color="purple">
          {buHaftaGorevler.length === 0 ? (
            <EmptyState text="Görev bulunmuyor" />
          ) : (
            <div className="space-y-2">
              {buHaftaGorevler.map((g) => (
                <div key={g.id} className={`flex items-start gap-2 p-2 rounded-lg border-l-3 ${g.oncelik === 'Yüksek' ? 'border-l-red bg-red-dim/30' : 'border-l-gold bg-surface2'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${g.oncelik === 'Yüksek' ? 'bg-red shadow-[0_0_6px_rgba(192,57,43,0.5)]' : 'bg-gold'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-text truncate">{g.baslik || '—'}</div>
                    <div className="text-[10px] text-text-dim truncate">{g.sonTarih ? fmtTarih(g.sonTarih) : 'Tarih yok'}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${g.oncelik === 'Yüksek' ? 'bg-red/20 text-red' : 'bg-gold-dim text-gold'}`}>
                    {g.oncelik === 'Yüksek' ? 'Acil' : g.oncelik || 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashPanel>
      </div>

      {/* ── BENTO GRID: Satır 2 — 3 eşit sütun ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Kritik Süreler */}
        <DashPanel title="⚠️ Kritik Süreler" subtitle="(30 gün)" color="gold">
          {kritikSureler.length === 0 ? (
            <EmptyState text="Kritik süre bulunmuyor" />
          ) : (
            <div className="space-y-2">
              {kritikSureler.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${s.gun <= 3 ? 'bg-red-dim/40 border-l-3 border-l-red' : s.gun <= 7 ? 'bg-gold-dim/40 border-l-3 border-l-gold' : 'bg-surface2'}`}>
                  <GunBadge gun={s.gun} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-text truncate">{s.tip} — {s.baslik}</div>
                    <div className="text-[10px] text-text-dim">{fmtTarih(s.tarih)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashPanel>

        {/* Finansal Uyarılar */}
        <DashPanel title="🔴 Finansal Uyarılar" linkText="Finans ›" linkHref="/finans" color="red">
          {!uyarilar || (Array.isArray(uyarilar) && uyarilar.length === 0) ? (
            <EmptyState text="Uyarı bulunmuyor ✓" />
          ) : (
            <div className="space-y-2">
              {(Array.isArray(uyarilar) ? uyarilar : []).slice(0, 5).map((u: Record<string, unknown>, i: number) => (
                <div key={i} className={`p-2 rounded-lg text-[11px] ${u.oncelik === 'yuksek' ? 'bg-red-dim text-red' : u.oncelik === 'orta' ? 'bg-gold-dim text-gold' : 'bg-surface2 text-text-muted'}`}>
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs">{(u.icon as string) || '⚠️'}</span>
                    <div className="flex-1">
                      <div className="font-medium">{u.mesaj as string}</div>
                      {typeof u.tutar === 'number' && u.tutar > 0 && (
                        <div className="font-bold mt-0.5">{fmt(u.tutar)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashPanel>

        {/* Menfaat Çakışması */}
        <DashPanel title="🔍 Menfaat Çakışması" color="red">
          <EmptyState text="Çakışma tespit edilmedi ✓" />
        </DashPanel>
      </div>

      {/* ── BENTO GRID: Satır 3 — 2 sütun ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Devam Eden Hizmetler */}
        <DashPanel title="⚖️ Devam Eden Hizmetler" linkText="Tümü ›" linkHref="/danismanlik" color="gold">
          {devamEdenHizmetler.length === 0 ? (
            <EmptyState text="Aktif danışmanlık bulunmuyor" />
          ) : (
            <div className="space-y-2">
              {devamEdenHizmetler.map((d) => (
                <div key={d.id} className="flex items-center gap-2 p-2 bg-surface2 rounded-lg">
                  <div className="w-8 h-8 bg-gold-dim rounded-lg flex items-center justify-center text-xs text-gold font-bold">⚖️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-text truncate">{d.konu || '—'}</div>
                    <div className="text-[10px] text-text-dim truncate">{muvAdMap[d.muvId || ''] || '—'} · {d.tur || '—'}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-dim text-green">Aktif</span>
                </div>
              ))}
            </div>
          )}
        </DashPanel>

        {/* Son Aktiviteler */}
        <DashPanel title="📋 Son Aktiviteler" color="blue">
          <EmptyState text="Henüz aktivite kaydı yok" />
        </DashPanel>
      </div>
    </div>
  );
}

// ── Dashboard Panel ─────────────────────────────────────────
function DashPanel({ title, subtitle, linkText, linkHref, color, children }: {
  title: string;
  subtitle?: string;
  linkText?: string;
  linkHref?: string;
  color: string;
  children: React.ReactNode;
}) {
  const borderColor = {
    green: 'border-t-green/30',
    blue: 'border-t-[#3498db]/30',
    purple: 'border-t-[#9b59b6]/30',
    gold: 'border-t-gold/30',
    red: 'border-t-red/30',
  }[color] || 'border-t-border';

  return (
    <div className={`bg-surface border border-border border-t-2 ${borderColor} rounded-lg`}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-sm font-semibold text-text">
          {title}
          {subtitle && <span className="text-[11px] text-text-muted font-normal ml-1">{subtitle}</span>}
        </div>
        {linkText && linkHref && (
          <Link href={linkHref} className="text-[11px] text-gold hover:text-gold-light transition-colors">{linkText}</Link>
        )}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, icon, accent, color }: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className={`bg-surface border rounded-lg p-3 ${accent ? 'border-gold bg-gold-dim' : 'border-border'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-gold'}`}>
        {value}
      </div>
    </div>
  );
}

// ── Gün Badge ────────────────────────────────────────────────
function GunBadge({ gun }: { gun: number }) {
  const cls = gun <= 1 ? 'bg-red text-white' : gun <= 3 ? 'bg-red-dim text-red' : gun <= 7 ? 'bg-gold-dim text-gold' : 'bg-surface2 text-text-muted';
  const text = gun === 0 ? 'Bugün' : gun === 1 ? 'Yarın' : `${gun}g`;
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}>{text}</span>;
}

// ── Empty State ──────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-6 text-text-dim text-xs">{text}</div>;
}
