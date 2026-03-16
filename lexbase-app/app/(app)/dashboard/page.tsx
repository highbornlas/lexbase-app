'use client';

import { useEffect, useMemo } from 'react';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useFinansUyarilar, useBuroKarZarar } from '@/lib/hooks/useFinans';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { useBuroGiderleri } from '@/lib/hooks/useBuroGiderleri';
import { useTodolar } from '@/lib/hooks/useTodolar';
import { useEtkinlikler } from '@/lib/hooks/useEtkinlikler';
import { useBelgeler } from '@/lib/hooks/useBelgeler';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { useKullanici } from '@/lib/hooks/useBuro';
import { useDashboardLayout } from '@/lib/hooks/useDashboardLayout';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { WidgetGrid } from '@/components/dashboard/WidgetGrid';
import { DashboardEditMode } from '@/components/dashboard/DashboardEditMode';

/* ══════════════════════════════════════════════════════════════
   Dashboard — Widget tabanlı, sürükle-bırak, özelleştirilebilir
   ══════════════════════════════════════════════════════════════ */

/* ── Gün bazlı selamlama ── */
function getSelamlama(): string {
  const saat = new Date().getHours();
  if (saat >= 6 && saat < 12) return 'Günaydın';
  if (saat >= 12 && saat < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function DashboardPage() {
  useEffect(() => { document.title = 'Genel Bakış | LexBase'; }, []);

  /* ── Veri Hook'ları ── */
  const { data: muvekkillar, isLoading: muvLoading } = useMuvekkillar();
  const { data: davalar, isLoading: davaLoading } = useDavalar();
  const { data: icralar, isLoading: icraLoading } = useIcralar();
  const { data: uyarilar } = useFinansUyarilar();
  const { data: karZarar } = useBuroKarZarar(new Date().getFullYear(), new Date().getMonth() + 1);
  const { data: danismanliklar } = useDanismanliklar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: buroGiderleri } = useBuroGiderleri();
  const { data: gorevler } = useTodolar();
  const { data: etkinlikler } = useEtkinlikler();
  const { data: belgeler } = useBelgeler();
  const { data: personeller } = usePersoneller();
  const kullanici = useKullanici();

  /* ── Dashboard Layout ── */
  const {
    layouts,
    onLayoutChange,
    gorunurWidgetler,
    gizliTanimlar,
    widgetGizle,
    widgetGoster,
    resetLayout,
    editMode,
    setEditMode,
    mounted,
  } = useDashboardLayout();

  /* ── Müvekkil adı çözücü ── */
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  /* ── Net gelir ── */
  const yilNet = karZarar?.net ?? 0;

  /* ── Tarih bilgisi ── */
  const bugun = new Date();
  const tarihStr = bugun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const gunAdi = bugun.toLocaleDateString('tr-TR', { weekday: 'long' });

  /* ── Loading ── */
  const isLoading = muvLoading || davaLoading || icraLoading;
  if (isLoading || !mounted) {
    return <DashboardSkeleton />;
  }

  /* ── Kullanıcı adı ── */
  const kullaniciAd = kullanici
    ? (kullanici.ad as string) || (kullanici.email as string)?.split('@')[0] || 'Avukat'
    : 'Avukat';

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-8rem)]">
      {/* ── BAŞLIK ── */}
      <div className="flex justify-between items-end flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-[var(--font-playfair)] text-xl sm:text-2xl text-text font-bold leading-tight mb-0.5">Genel Bakış</h1>
          <p className="text-sm text-text-muted">{getSelamlama()}, {kullaniciAd} — {tarihStr} {gunAdi}</p>
        </div>
        <DashboardEditMode
          editMode={editMode}
          onToggleEdit={() => setEditMode(!editMode)}
          gizliWidgetler={gizliTanimlar}
          onWidgetGoster={widgetGoster}
          onReset={resetLayout}
        />
      </div>

      {/* ── WİDGET GRİD ── */}
      <WidgetGrid
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        gorunurWidgetler={gorunurWidgetler}
        editMode={editMode}
        onWidgetGizle={widgetGizle}
        muvekkillar={muvekkillar || []}
        davalar={davalar || []}
        icralar={icralar || []}
        gorevler={gorevler || []}
        danismanliklar={danismanliklar || []}
        etkinlikler={etkinlikler || []}
        uyarilar={Array.isArray(uyarilar) ? uyarilar : []}
        belgeler={belgeler || []}
        arabuluculuklar={arabuluculuklar || []}
        ihtarnameler={ihtarnameler || []}
        buroGiderleri={buroGiderleri || []}
        personeller={personeller || []}
        yilNet={yilNet}
        muvAdMap={muvAdMap}
      />
    </div>
  );
}
