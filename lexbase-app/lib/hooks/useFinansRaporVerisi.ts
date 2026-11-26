'use client';

import { useQueries } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { raporKayitlariniOku } from '@/lib/data/raporKayitlari';
import { raporKaydiGorunurMu } from '@/lib/finans/gelirKurallari';
import { useBuroId } from './useBuro';

const TABLES = ['davalar', 'icra', 'danismanlik', 'arabuluculuk', 'ihtarnameler'] as const;

// One bureau lookup per consumer, parallel reads, and the existing cache/invalidation keys.
export function useFinansRaporVerisi(muvId?: string | null) {
  const buroId = useBuroId();
  const queries = useQueries({ queries: TABLES.map(table => ({
    queryKey: muvId === undefined ? [table, buroId, 'finans'] : [table, 'muv', muvId, buroId],
    enabled: !!buroId && (muvId === undefined || !!muvId),
    queryFn: async () => {
      const rows = await raporKayitlariniOku(createClient(), table, buroId!, muvId || undefined, !!muvId);
      return rows.map(r => ({ ...r.data, id: r.id }) as Record<string, unknown> & { id: string })
        .filter(r => raporKaydiGorunurMu({ _silindi: r._silindi }, true));
    },
  })) });
  return { veriler: { davalar: queries[0].data, icralar: queries[1].data, danismanliklar: queries[2].data,
    arabuluculuklar: queries[3].data, ihtarnameler: queries[4].data },
    isPending: queries.some(q => q.isPending), isError: queries.some(q => q.isError) };
}
