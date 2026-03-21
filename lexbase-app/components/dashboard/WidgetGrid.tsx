'use client';

import { useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Responsive, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { ResponsiveLayouts, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { WidgetWrapper } from './WidgetWrapper';
import type { WidgetTanim } from '@/lib/hooks/useDashboardLayout';

/* ── Lazy-loaded widget bileşenleri ── */
const KpiWidget = dynamic(
  () => import('./widgets/KpiWidget').then((m) => m.KpiWidget),
  { ssr: false },
);
const PerformansWidget = dynamic(
  () => import('./widgets/PerformansWidget').then((m) => m.PerformansWidget),
  { ssr: false },
);
const GundemWidget = dynamic(
  () => import('./widgets/GundemWidget').then((m) => m.GundemWidget),
  { ssr: false },
);
const GorevlerWidget = dynamic(
  () => import('./widgets/GorevlerWidget').then((m) => m.GorevlerWidget),
  { ssr: false },
);
const KritikWidget = dynamic(
  () => import('./widgets/KritikWidget').then((m) => m.KritikWidget),
  { ssr: false },
);
const FinansUyariWidget = dynamic(
  () => import('./widgets/FinansUyariWidget').then((m) => m.FinansUyariWidget),
  { ssr: false },
);
const MenfaatWidget = dynamic(
  () => import('./widgets/MenfaatWidget').then((m) => m.MenfaatWidget),
  { ssr: false },
);
const HizmetlerWidget = dynamic(
  () => import('./widgets/HizmetlerWidget').then((m) => m.HizmetlerWidget),
  { ssr: false },
);
const AktiviteWidget = dynamic(
  () => import('./widgets/AktiviteWidget').then((m) => m.AktiviteWidget),
  { ssr: false },
);
const HizliErisimWidget = dynamic(
  () => import('./widgets/HizliErisimWidget').then((m) => m.HizliErisimWidget),
  { ssr: false },
);
const VekaletnameSureWidget = dynamic(
  () => import('./widgets/VekaletnameSureWidget').then((m) => m.VekaletnameSureWidget),
  { ssr: false },
);
const MuvekkilBakiyeWidget = dynamic(
  () => import('./widgets/MuvekkilBakiyeWidget').then((m) => m.MuvekkilBakiyeWidget),
  { ssr: false },
);
const BeklenenGelirWidget = dynamic(
  () => import('./widgets/BeklenenGelirWidget').then((m) => m.BeklenenGelirWidget),
  { ssr: false },
);
const PersonelOzetWidget = dynamic(
  () => import('./widgets/PersonelOzetWidget').then((m) => m.PersonelOzetWidget),
  { ssr: false },
);

/* ══════════════════════════════════════════════════════════════
   Widget Grid — react-grid-layout ile sürükle-bırak dashboard
   ══════════════════════════════════════════════════════════════ */

// Widget konfigürasyonları
const WIDGET_CONFIG: Record<string, { title: string; icon: string; linkText?: string; linkHref?: string; color: string }> = {
  'kpi': { title: '📊 KPI Göstergeleri', icon: '📊', color: 'gold' },
  'performans': { title: '💰 Aylık Performans', icon: '💰', linkText: 'Finans ›', linkHref: '/finans', color: 'green' },
  'gundem': { title: '📋 Gündem', icon: '📋', linkText: 'Takvim ›', linkHref: '/takvim', color: 'blue' },
  'gorevler': { title: '✅ Bu Hafta Yapılacaklar', icon: '✅', linkText: 'Tümü ›', linkHref: '/gorevler', color: 'purple' },
  'kritik': { title: '⚠️ Kritik Süreler', icon: '⚠️', linkText: 'Takvim ›', linkHref: '/takvim', color: 'gold' },
  'finans-uyari': { title: '🔴 Finansal Uyarılar', icon: '🔴', linkText: 'Finans ›', linkHref: '/finans', color: 'red' },
  'muvekkil-bakiye': { title: '💰 Müvekkil Bakiyeleri', icon: '💰', linkText: 'Finans ›', linkHref: '/finans', color: 'gold' },
  'beklenen-gelir': { title: '📈 Beklenen Gelir', icon: '📈', linkText: 'Finans ›', linkHref: '/finans', color: 'green' },
  'personel-ozet': { title: '👥 Personel Özeti', icon: '👥', linkText: 'Tümü ›', linkHref: '/personel', color: 'blue' },
  'menfaat': { title: '🔍 Menfaat Çakışması', icon: '🔍', color: 'red' },
  'hizmetler': { title: '⚖️ Devam Eden Hizmetler', icon: '⚖️', linkText: 'Tümü ›', linkHref: '/danismanlik', color: 'gold' },
  'aktivite': { title: '📋 Son Aktiviteler', icon: '📋', color: 'blue' },
  'hizli-erisim': { title: '⭐ Hızlı Erişim', icon: '⭐', color: 'purple' },
  'vekaletname-sure': { title: '📜 Vekaletname Süreleri', icon: '📜', color: 'gold' },
};

const BREAKPOINTS = { lg: 1100, md: 768, sm: 0 };
const COLS = { lg: 3, md: 2, sm: 1 };

interface WidgetGridProps {
  layouts: ResponsiveLayouts;
  onLayoutChange: (currentLayout: Layout, allLayouts: ResponsiveLayouts) => void;
  gorunurWidgetler: WidgetTanim[];
  editMode: boolean;
  onWidgetGizle: (id: string) => void;
  // Data props
  muvekkillar: Array<Record<string, unknown>>;
  davalar: Array<Record<string, unknown>>;
  icralar: Array<Record<string, unknown>>;
  gorevler: Array<Record<string, unknown>>;
  danismanliklar: Array<Record<string, unknown>>;
  etkinlikler: Array<Record<string, unknown>>;
  uyarilar: Array<Record<string, unknown>>;
  belgeler: Array<Record<string, unknown>>;
  arabuluculuklar: Array<Record<string, unknown>>;
  ihtarnameler: Array<Record<string, unknown>>;
  buroGiderleri: Array<Record<string, unknown>>;
  personeller: Array<Record<string, unknown>>;
  yilNet: number;
  muvAdMap: Record<string, string>;
}

export function WidgetGrid({
  layouts,
  onLayoutChange,
  gorunurWidgetler,
  editMode,
  onWidgetGizle,
  muvekkillar,
  davalar,
  icralar,
  gorevler,
  danismanliklar,
  etkinlikler,
  uyarilar,
  belgeler,
  arabuluculuklar,
  ihtarnameler,
  buroGiderleri,
  personeller,
  yilNet,
  muvAdMap,
}: WidgetGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  // Widget content renderer
  const renderWidget = useCallback((widgetId: string) => {
    switch (widgetId) {
      case 'kpi':
        return <KpiWidget muvekkillar={muvekkillar} davalar={davalar} icralar={icralar} danismanliklar={danismanliklar} arabuluculuklar={arabuluculuklar} ihtarnameler={ihtarnameler} yilNet={yilNet} />;
      case 'performans':
        return <PerformansWidget davalar={davalar} icralar={icralar} danismanliklar={danismanliklar} arabuluculuklar={arabuluculuklar} ihtarnameler={ihtarnameler} buroGiderleri={buroGiderleri} />;
      case 'gundem':
        return <GundemWidget davalar={davalar} etkinlikler={etkinlikler} muvAdMap={muvAdMap} />;
      case 'gorevler':
        return <GorevlerWidget gorevler={gorevler} />;
      case 'kritik':
        return <KritikWidget davalar={davalar} icralar={icralar} />;
      case 'finans-uyari':
        return <FinansUyariWidget uyarilar={uyarilar} />;
      case 'muvekkil-bakiye':
        return <MuvekkilBakiyeWidget />;
      case 'beklenen-gelir':
        return <BeklenenGelirWidget />;
      case 'personel-ozet':
        return <PersonelOzetWidget personeller={personeller} />;
      case 'menfaat':
        return <MenfaatWidget muvekkillar={muvekkillar} davalar={davalar} />;
      case 'hizmetler':
        return <HizmetlerWidget danismanliklar={danismanliklar} muvAdMap={muvAdMap} />;
      case 'aktivite':
        return <AktiviteWidget davalar={davalar} icralar={icralar} gorevler={gorevler} danismanliklar={danismanliklar} arabuluculuklar={arabuluculuklar} ihtarnameler={ihtarnameler} muvAdMap={muvAdMap} />;
      case 'hizli-erisim':
        return <HizliErisimWidget />;
      case 'vekaletname-sure':
        return <VekaletnameSureWidget belgeler={belgeler} muvAdMap={muvAdMap} />;
      default:
        return <div className="text-text-dim text-sm p-4">Widget bulunamadı</div>;
    }
  }, [muvekkillar, davalar, icralar, gorevler, danismanliklar, etkinlikler, uyarilar, belgeler, arabuluculuklar, ihtarnameler, buroGiderleri, personeller, yilNet, muvAdMap]);

  // Görünür layout items — gizli widget'ları filtrele
  const gorunurIds = useMemo(() => new Set(gorunurWidgetler.map((w) => w.id)), [gorunurWidgetler]);

  const filteredLayouts = useMemo(() => {
    const result: ResponsiveLayouts = {};
    for (const [bp, items] of Object.entries(layouts)) {
      if (!items) continue;
      result[bp] = items.filter((item) => gorunurIds.has(item.i));
    }
    return result;
  }, [layouts, gorunurIds]);

  // Drag & resize config — editMode'a göre aç/kapa
  const dragConfig = useMemo(() => ({
    enabled: editMode,
    handle: '.widget-drag-handle',
  }), [editMode]);

  const resizeConfig = useMemo(() => ({
    enabled: editMode,
  }), [editMode]);

  return (
    <div ref={containerRef}>
      {(!mounted || !width) ? null : <Responsive
        className="layout"
        layouts={filteredLayouts}
        width={width}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={55}
        margin={[16, 16] as const}
        containerPadding={[0, 0] as const}
        dragConfig={dragConfig}
        resizeConfig={resizeConfig}
        onLayoutChange={onLayoutChange}
        compactor={verticalCompactor}
      >
        {gorunurWidgetler.map((widget) => {
          const config = WIDGET_CONFIG[widget.id];
          if (!config) return null;

          // KPI widget'ı özel — wrapper'sız
          if (widget.id === 'kpi') {
            return (
              <div key={widget.id}>
                <div className={`h-full ${editMode ? 'ring-1 ring-gold/20 ring-dashed rounded-xl p-2' : ''}`}>
                  {editMode && (
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="widget-drag-handle cursor-grab text-text-dim hover:text-gold text-xs">⠿ KPI Göstergeleri</span>
                      <button onClick={() => onWidgetGizle(widget.id)} className="text-text-dim hover:text-red text-[10px]">✕</button>
                    </div>
                  )}
                  {renderWidget(widget.id)}
                </div>
              </div>
            );
          }

          return (
            <div key={widget.id}>
              <WidgetWrapper
                title={config.title}
                linkText={config.linkText}
                linkHref={config.linkHref}
                color={config.color}
                editMode={editMode}
                onHide={() => onWidgetGizle(widget.id)}
              >
                {renderWidget(widget.id)}
              </WidgetWrapper>
            </div>
          );
        })}
      </Responsive>}
    </div>
  );
}
