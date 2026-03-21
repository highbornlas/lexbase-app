'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from '@/lib/hooks/useBuro';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt } from '@/lib/utils';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Müvekkil Bakiyeleri Widget — RPC tabanlı cari özet
   ══════════════════════════════════════════════════════════════ */

interface CariOzetRow {
  muvId: string;
  borc: number;
  alacak: number;
  bakiye: number;
}

function useCariOzet() {
  const buroId = useBuroId();

  return useQuery<CariOzetRow[]>({
    queryKey: ['cari-ozet', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_cari_ozet', {
        p_buro_id: buroId,
      });
      if (error) throw error;
      return (data || []) as CariOzetRow[];
    },
    enabled: !!buroId,
  });
}

export function MuvekkilBakiyeWidget() {
  const { data: cariOzet, isLoading } = useCariOzet();
  const { data: muvekkillar } = useMuvekkillar();

  // Müvekkil ad haritası
  const muvAdMap: Record<string, string> = {};
  (muvekkillar || []).forEach((m) => {
    muvAdMap[m.id] = m.ad || '?';
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  // Bakiyeye göre sıralayıp ilk 5'i al (bakiye != 0 olanlar)
  const bakiyeler = (cariOzet || [])
    .filter((row) => Math.abs(row.bakiye) > 0 && muvAdMap[row.muvId])
    .sort((a, b) => b.bakiye - a.bakiye)
    .slice(0, 5);

  if (bakiyeler.length === 0) {
    return <EmptyState icon="💰" text="Bakiye verisi bulunmuyor" />;
  }

  return (
    <div className="space-y-1 mt-1">
      {bakiyeler.map((b) => (
        <Link
          key={b.muvId}
          href={`/muvekkillar/${b.muvId}`}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface2/50 transition-colors"
        >
          <span className="text-sm flex-shrink-0">
            {b.bakiye > 0 ? '🔴' : '🟢'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-text truncate">{muvAdMap[b.muvId]}</div>
            <div className="text-[9px] text-text-dim">
              Borç: {fmt(b.borc)} · Alacak: {fmt(b.alacak)}
            </div>
          </div>
          <span className={`text-[11px] font-semibold flex-shrink-0 ${b.bakiye > 0 ? 'text-red' : 'text-green'}`}>
            {b.bakiye > 0 ? '+' : ''}{fmt(b.bakiye)}
          </span>
        </Link>
      ))}
    </div>
  );
}
