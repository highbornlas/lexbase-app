'use client';

import { useMemo } from 'react';
import { useAdminAbonelikler } from '@/lib/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Gelir Raporu
   MRR, ARR, plan dağılımı, ödeme geçmişi
   ══════════════════════════════════════════════════════════════ */

function useOdemeler() {
  return useQuery({
    queryKey: ['admin', 'odemeler'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('odemeler').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export default function GelirlerPage() {
  const { data: abonelikler } = useAdminAbonelikler();
  const { data: odemeler, isLoading } = useOdemeler();

  const metrikler = useMemo(() => {
    if (!abonelikler) return { mrr: 0, arr: 0, planDagilimi: {} as Record<string, number> };
    let mrr = 0;
    const planDagilimi: Record<string, number> = {};

    (abonelikler as Array<Record<string, unknown>>).forEach((ab) => {
      if (ab.durum === 'aktif' && ab.tutar) {
        mrr += Number(ab.tutar);
      }
      const planAd = ((ab.plan || {}) as Record<string, unknown>).ad as string || ab.plan_id as string;
      planDagilimi[planAd] = (planDagilimi[planAd] || 0) + 1;
    });

    return { mrr, arr: mrr * 12, planDagilimi };
  }, [abonelikler]);

  const toplamOdeme = useMemo(() => {
    if (!odemeler) return 0;
    return odemeler.filter((o: Record<string, unknown>) => o.durum === 'tamamlandi')
      .reduce((t: number, o: Record<string, unknown>) => t + Number(o.tutar || 0), 0);
  }, [odemeler]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-zinc-200">💰 Gelir Raporu</h1>
        <p className="text-[11px] text-zinc-600">Platform gelir metrikleri ve ödeme geçmişi</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aylık Gelir (MRR)', value: `₺${metrikler.mrr.toLocaleString('tr-TR')}`, renk: 'border-emerald-500/20 bg-emerald-500/5', degerRenk: 'text-emerald-400' },
          { label: 'Yıllık Gelir (ARR)', value: `₺${metrikler.arr.toLocaleString('tr-TR')}`, renk: 'border-amber-500/20 bg-amber-500/5', degerRenk: 'text-amber-500' },
          { label: 'Toplam Tahsilat', value: `₺${toplamOdeme.toLocaleString('tr-TR')}`, renk: 'border-blue-500/20 bg-blue-500/5', degerRenk: 'text-blue-400' },
          { label: 'Ödeme Sayısı', value: String(odemeler?.length || 0), renk: 'border-zinc-700 bg-zinc-900/30', degerRenk: 'text-zinc-300' },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.renk}`}>
            <div className="text-[10px] text-zinc-600 mb-1">{k.label}</div>
            <div className={`text-xl font-bold font-[var(--font-playfair)] ${k.degerRenk}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Plan Dağılımı */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="text-[12px] font-bold text-zinc-400 mb-3">📊 Plan Dağılımı</h3>
        <div className="space-y-2">
          {Object.entries(metrikler.planDagilimi).map(([plan, sayi]) => {
            const toplam = Object.values(metrikler.planDagilimi).reduce((a, b) => a + b, 0);
            const yuzde = toplam > 0 ? Math.round((sayi / toplam) * 100) : 0;
            return (
              <div key={plan}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">{plan}</span>
                  <span className="text-zinc-500">{sayi} büro (%{yuzde})</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${yuzde}%` }} />
                </div>
              </div>
            );
          })}
          {Object.keys(metrikler.planDagilimi).length === 0 && (
            <div className="text-[11px] text-zinc-600 text-center py-4">Veri yok</div>
          )}
        </div>
      </div>

      {/* Ödeme Geçmişi */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-[12px] font-bold text-zinc-400">💳 Son Ödemeler</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-900/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-zinc-600 uppercase">Tarih</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-zinc-600 uppercase">Yöntem</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-zinc-600 uppercase">Durum</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-zinc-600 uppercase">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {(odemeler || []).slice(0, 20).map((odeme: Record<string, unknown>) => (
                <tr key={odeme.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2.5 text-[11px] text-zinc-400">
                    {new Date(odeme.created_at as string).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-zinc-500">{odeme.odeme_yontemi as string || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      odeme.durum === 'tamamlandi' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>{odeme.durum as string}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[12px] text-zinc-300 font-medium">
                    ₺{Number(odeme.tutar).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
              {(!odemeler || odemeler.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-zinc-600">Henüz ödeme kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
