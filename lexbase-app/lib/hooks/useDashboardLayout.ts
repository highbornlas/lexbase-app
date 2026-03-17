'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';

/* ══════════════════════════════════════════════════════════════
   Dashboard Layout Hook — Widget konumlarını yönetir
   localStorage tabanlı persist
   ══════════════════════════════════════════════════════════════ */

export interface WidgetTanim {
  id: string;
  label: string;
  icon: string;
  varsayilanGorunur: boolean;
}

// Tüm widget tanımları — varsayilanGorunur: false olanlar gizli başlar
export const WIDGET_TANIMLARI: WidgetTanim[] = [
  // ── Varsayılan Görünür (9 widget) ──
  { id: 'kpi', label: 'KPI Göstergeleri', icon: '📊', varsayilanGorunur: true },
  { id: 'performans', label: 'Aylık Performans', icon: '💰', varsayilanGorunur: true },
  { id: 'gundem', label: 'Gündem', icon: '📋', varsayilanGorunur: true },
  { id: 'gorevler', label: 'Bu Hafta Yapılacaklar', icon: '✅', varsayilanGorunur: true },
  { id: 'kritik', label: 'Kritik Süreler', icon: '⚠️', varsayilanGorunur: true },
  { id: 'finans-uyari', label: 'Finansal Uyarılar', icon: '🔴', varsayilanGorunur: true },
  { id: 'muvekkil-bakiye', label: 'Müvekkil Bakiyeleri', icon: '💰', varsayilanGorunur: true },
  { id: 'beklenen-gelir', label: 'Beklenen Gelir', icon: '📈', varsayilanGorunur: true },
  { id: 'aktivite', label: 'Son Aktiviteler', icon: '📋', varsayilanGorunur: true },
  // ── Varsayılan Gizli (Düzenleme ile eklenebilir) ──
  { id: 'personel-ozet', label: 'Personel Özeti', icon: '👥', varsayilanGorunur: false },
  { id: 'menfaat', label: 'Menfaat Çakışması', icon: '🔍', varsayilanGorunur: false },
  { id: 'hizmetler', label: 'Devam Eden Hizmetler', icon: '⚖️', varsayilanGorunur: false },
  { id: 'hizli-erisim', label: 'Hızlı Erişim', icon: '⭐', varsayilanGorunur: true },
  { id: 'vekaletname-sure', label: 'Vekaletname Süreleri', icon: '📜', varsayilanGorunur: false },
];

// Varsayılan gizli widget ID'leri
const VARSAYILAN_GIZLI = WIDGET_TANIMLARI.filter((w) => !w.varsayilanGorunur).map((w) => w.id);

// Varsayılan layout (lg breakpoint: 3 sütun)
const VARSAYILAN_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: 'performans', x: 0, y: 2, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gundem', x: 1, y: 2, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gorevler', x: 2, y: 2, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'kritik', x: 0, y: 5, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'finans-uyari', x: 1, y: 5, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'muvekkil-bakiye', x: 2, y: 5, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'beklenen-gelir', x: 0, y: 8, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'aktivite', x: 1, y: 8, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'hizli-erisim', x: 2, y: 8, w: 1, h: 3, minW: 1, minH: 2 },
    // Gizli widget'lar — kullanıcı eklediğinde yerleşecek
    { i: 'personel-ozet', x: 0, y: 11, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'menfaat', x: 1, y: 11, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'hizmetler', x: 2, y: 11, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'vekaletname-sure', x: 0, y: 14, w: 1, h: 3, minW: 1, minH: 2 },
  ],
  md: [
    { i: 'kpi', x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'performans', x: 0, y: 3, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gundem', x: 1, y: 3, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gorevler', x: 0, y: 6, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'kritik', x: 1, y: 6, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'finans-uyari', x: 0, y: 9, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'muvekkil-bakiye', x: 1, y: 9, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'beklenen-gelir', x: 0, y: 12, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'aktivite', x: 1, y: 12, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'personel-ozet', x: 0, y: 15, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'menfaat', x: 1, y: 15, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'hizmetler', x: 0, y: 18, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'hizli-erisim', x: 1, y: 17, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'vekaletname-sure', x: 0, y: 21, w: 1, h: 3, minW: 1, minH: 2 },
  ],
  sm: [
    { i: 'kpi', x: 0, y: 0, w: 1, h: 4, minW: 1, minH: 2 },
    { i: 'performans', x: 0, y: 4, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gundem', x: 0, y: 7, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'gorevler', x: 0, y: 10, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'kritik', x: 0, y: 13, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'finans-uyari', x: 0, y: 16, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'muvekkil-bakiye', x: 0, y: 19, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'beklenen-gelir', x: 0, y: 22, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'aktivite', x: 0, y: 25, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'personel-ozet', x: 0, y: 28, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'menfaat', x: 0, y: 31, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'hizmetler', x: 0, y: 33, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'hizli-erisim', x: 0, y: 36, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'vekaletname-sure', x: 0, y: 39, w: 1, h: 3, minW: 1, minH: 2 },
  ],
};

const LS_LAYOUT = 'lb_dashboard_layout';
const LS_HIDDEN = 'lb_dashboard_hidden';

function okuLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useDashboardLayout() {
  const [layouts, setResponsiveLayouts] = useState<ResponsiveLayouts>(VARSAYILAN_LAYOUTS);
  const [gizliWidgetler, setGizliWidgetler] = useState<string[]>(VARSAYILAN_GIZLI);
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // localStorage'dan oku (SSR-safe) + yeni widget migrasyon
  useEffect(() => {
    const kayitliLayout = okuLS<ResponsiveLayouts>(LS_LAYOUT, VARSAYILAN_LAYOUTS);
    const kayitliGizli = okuLS<string[]>(LS_HIDDEN, VARSAYILAN_GIZLI);

    // Migrasyon: localStorage'daki eski kayıtta olmayan yeni widget'ları tespit et
    const tumKayitliIds = new Set<string>();
    // Layout'taki widget ID'leri
    if (kayitliLayout.lg) {
      kayitliLayout.lg.forEach((l: Layout) => tumKayitliIds.add(l.i));
    }
    // Gizli listedeki ID'ler
    kayitliGizli.forEach((id: string) => tumKayitliIds.add(id));

    let gizliSonuc = [...kayitliGizli];
    let layoutSonuc = { ...kayitliLayout };
    let degisti = false;

    for (const w of WIDGET_TANIMLARI) {
      if (!tumKayitliIds.has(w.id)) {
        // Yeni widget — varsayılan tercihine göre ekle
        if (!w.varsayilanGorunur) {
          gizliSonuc.push(w.id);
        }
        // Layout'a da ekle (her breakpoint'e)
        for (const bp of ['lg', 'md', 'sm'] as const) {
          const varsayilanItem = VARSAYILAN_LAYOUTS[bp]?.find((l: Layout) => l.i === w.id);
          if (varsayilanItem && layoutSonuc[bp]) {
            (layoutSonuc[bp] as Layout[]).push(varsayilanItem);
          }
        }
        degisti = true;
      }
    }

    if (degisti) {
      try {
        localStorage.setItem(LS_HIDDEN, JSON.stringify(gizliSonuc));
        localStorage.setItem(LS_LAYOUT, JSON.stringify(layoutSonuc));
      } catch { /* */ }
    }

    setResponsiveLayouts(layoutSonuc);
    setGizliWidgetler(gizliSonuc);
    setMounted(true);
  }, []);

  // Layout değiştiğinde kaydet
  const onLayoutChange = useCallback((_currentLayout: Layout, allResponsiveLayouts: ResponsiveLayouts) => {
    setResponsiveLayouts(allResponsiveLayouts);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(LS_LAYOUT, JSON.stringify(allResponsiveLayouts)); } catch { /* */ }
    }
  }, []);

  // Widget gizle
  const widgetGizle = useCallback((id: string) => {
    setGizliWidgetler((prev) => {
      const yeni = [...prev, id];
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(LS_HIDDEN, JSON.stringify(yeni)); } catch { /* */ }
      }
      return yeni;
    });
  }, []);

  // Widget göster
  const widgetGoster = useCallback((id: string) => {
    setGizliWidgetler((prev) => {
      const yeni = prev.filter((w) => w !== id);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(LS_HIDDEN, JSON.stringify(yeni)); } catch { /* */ }
      }
      return yeni;
    });
  }, []);

  // Varsayılana dön
  const resetLayout = useCallback(() => {
    setResponsiveLayouts(VARSAYILAN_LAYOUTS);
    setGizliWidgetler(VARSAYILAN_GIZLI);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LS_LAYOUT);
        localStorage.removeItem(LS_HIDDEN);
      } catch { /* */ }
    }
  }, []);

  // Görünür widget'lar
  const gorunurWidgetler = WIDGET_TANIMLARI.filter((w) => !gizliWidgetler.includes(w.id));
  const gizliTanimlar = WIDGET_TANIMLARI.filter((w) => gizliWidgetler.includes(w.id));

  return {
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
  };
}
