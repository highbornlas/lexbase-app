'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAdminAbonelikler } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin — Abonelik Yönetimi
   ══════════════════════════════════════════════════════════════ */

const DURUM_BADGE: Record<string, { renk: string; etiket: string }> = {
  aktif: { renk: 'bg-emerald-500/10 text-emerald-400', etiket: 'Aktif' },
  read_only: { renk: 'bg-amber-500/10 text-amber-400', etiket: 'Salt Okunur' },
  askida: { renk: 'bg-orange-500/10 text-orange-400', etiket: 'Askıda' },
  iptal: { renk: 'bg-red-500/10 text-red-400', etiket: 'İptal' },
  suresi_doldu: { renk: 'bg-zinc-700/50 text-zinc-400', etiket: 'Süresi Doldu' },
};

export default function AboneliklerPage() {
  const { data: abonelikler, isLoading } = useAdminAbonelikler();

  const istatistik = useMemo(() => {
    if (!abonelikler) return { aktif: 0, readOnly: 0, iptal: 0, toplam: 0 };
    return {
      aktif: abonelikler.filter((a: Record<string, unknown>) => a.durum === 'aktif').length,
      readOnly: abonelikler.filter((a: Record<string, unknown>) => a.durum === 'read_only').length,
      iptal: abonelikler.filter((a: Record<string, unknown>) => a.durum === 'iptal').length,
      toplam: abonelikler.length,
    };
  }, [abonelikler]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-zinc-200">💳 Abonelikler</h1>
        <p className="text-[11px] text-zinc-600">Tüm büro abonelik durumları</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Toplam', value: istatistik.toplam, renk: 'border-zinc-700' },
          { label: 'Aktif', value: istatistik.aktif, renk: 'border-emerald-500/30' },
          { label: 'Salt Okunur', value: istatistik.readOnly, renk: 'border-amber-500/30' },
          { label: 'İptal', value: istatistik.iptal, renk: 'border-red-500/30' },
        ].map((k) => (
          <div key={k.label} className={`rounded-lg border ${k.renk} bg-zinc-900/30 px-3 py-2`}>
            <div className="text-[10px] text-zinc-600">{k.label}</div>
            <div className="text-xl font-bold text-zinc-300 font-[var(--font-playfair)]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tablo */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Büro</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Plan</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Durum</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden md:table-cell">Başlangıç</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden md:table-cell">Bitiş</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {(abonelikler || []).map((ab: Record<string, unknown>) => {
                const buro = (ab.buro || {}) as Record<string, unknown>;
                const buroData = ((buro.data || {}) as Record<string, string>);
                const plan = (ab.plan || {}) as Record<string, unknown>;
                const durumInfo = DURUM_BADGE[ab.durum as string] || DURUM_BADGE.aktif;
                return (
                  <tr key={ab.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin_panel/burolar/${buro.id || ab.buro_id}`} className="text-[12px] text-zinc-300 hover:text-amber-500 transition-colors">
                        {buroData.ad || 'İsimsiz'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-amber-500 font-medium">{plan.ad as string || ab.plan_id as string}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${durumInfo.renk}`}>
                        {durumInfo.etiket}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[11px] text-zinc-500">
                      {ab.baslangic ? new Date(ab.baslangic as string).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[11px] text-zinc-500">
                      {ab.bitis ? new Date(ab.bitis as string).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-zinc-300 font-medium">
                      {ab.tutar ? `₺${Number(ab.tutar).toLocaleString('tr-TR')}` : 'Ücretsiz'}
                    </td>
                  </tr>
                );
              })}
              {(!abonelikler || abonelikler.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-zinc-600">Henüz abonelik kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
