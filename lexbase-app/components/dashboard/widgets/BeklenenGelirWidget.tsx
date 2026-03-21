'use client';

import { fmt, fmtTarih } from '@/lib/utils';
import { useBeklenenGelir } from '@/lib/hooks/useFinans';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Beklenen Gelir Widget — RPC tabanlı beklenen gelir hesaplama
   ══════════════════════════════════════════════════════════════ */

interface BeklenenGelirItem {
  kaynak: string;
  aciklama: string;
  tutar: number;
  tarih: string;
  muvAd: string;
  gecikmisMi: boolean;
}

interface BeklenenGelirData {
  topTutar: number;
  gecikmisTutar: number;
  gecikmisAdet: number;
  ucAyToplam: number;
  items: BeklenenGelirItem[];
}

const KAYNAK_ICON: Record<string, string> = {
  'Dava': '\u2696\uFE0F',
  'İcra': '\u26A1',
  'Danışmanlık': '\uD83D\uDCCB',
  'Arabuluculuk': '\uD83E\uDD1D',
  'İhtarname': '\uD83D\uDCE8',
};

export function BeklenenGelirWidget() {
  const { data, isLoading } = useBeklenenGelir();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  const gelir = data as BeklenenGelirData | null;

  if (!gelir || !gelir.items || gelir.items.length === 0) {
    return <EmptyState icon="📈" text="Beklenen gelir bulunmuyor" />;
  }

  const topItems = gelir.items.slice(0, 5);

  return (
    <div className="space-y-2 mt-1">
      {/* Toplam KPI */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-green/10 rounded-lg">
        <span className="text-[10px] text-text-muted font-medium">Toplam Beklenen</span>
        <span className="text-sm font-bold text-green font-[var(--font-playfair)]">{fmt(gelir.topTutar)}</span>
      </div>

      {/* Gecikme uyarısı */}
      {gelir.gecikmisAdet > 0 && (
        <div className="flex items-center justify-between px-2 py-1 bg-red/10 rounded-lg">
          <span className="text-[10px] text-text-muted font-medium">Gecikmiş ({gelir.gecikmisAdet})</span>
          <span className="text-[11px] font-semibold text-red">{fmt(gelir.gecikmisTutar)}</span>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-0.5">
        {topItems.map((b, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2/50 transition-colors">
            <span className="text-sm flex-shrink-0">{KAYNAK_ICON[b.kaynak] || '📄'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-text truncate">{b.aciklama}</div>
              <div className="text-[9px] text-text-dim truncate">
                {b.kaynak}{b.muvAd ? ` · ${b.muvAd}` : ''}{b.tarih ? ` · ${fmtTarih(b.tarih)}` : ''}
              </div>
            </div>
            <span className={`text-[11px] font-semibold flex-shrink-0 ${b.gecikmisMi ? 'text-red' : 'text-green'}`}>
              {fmt(b.tutar)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
