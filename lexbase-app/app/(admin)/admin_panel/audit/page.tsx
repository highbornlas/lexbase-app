'use client';

import { useState } from 'react';
import { useAdminAuditLog } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin — Audit Log Görüntüleyici
   Admin işlemlerinin tam kaydı
   ══════════════════════════════════════════════════════════════ */

const ISLEM_RENK: Record<string, string> = {
  plan_guncelle: 'bg-amber-500/10 text-amber-400',
  lisans_olustur: 'bg-emerald-500/10 text-emerald-400',
  buro_durum_degistir: 'bg-blue-500/10 text-blue-400',
  duyuru_olustur: 'bg-purple-500/10 text-purple-400',
  destek_yanitla: 'bg-blue-500/10 text-blue-400',
  indirim_olustur: 'bg-amber-500/10 text-amber-400',
  parametre_guncelle: 'bg-red-500/10 text-red-400',
};

export default function AuditPage() {
  const { data: loglar, isLoading } = useAdminAuditLog(100);
  const [filtre, setFiltre] = useState('');

  const filtreli = (loglar || []).filter((log: Record<string, unknown>) => {
    if (!filtre) return true;
    const q = filtre.toLowerCase();
    return (
      (log.islem as string || '').toLowerCase().includes(q) ||
      (log.hedef_tablo as string || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">🔍 Admin Audit Log</h1>
          <p className="text-[11px] text-zinc-600">Tüm admin işlemlerinin kaydı ({filtreli.length} kayıt)</p>
        </div>
        <input
          type="text"
          placeholder="İşlem veya tablo ara..."
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none w-56"
        />
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filtreli.map((log: Record<string, unknown>) => {
            const islemRenk = ISLEM_RENK[log.islem as string] || 'bg-zinc-700 text-zinc-400';
            const detay = log.detay as Record<string, unknown> | null;
            return (
              <div key={log.id as string} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-800/30 bg-zinc-900/20 hover:bg-zinc-800/20 transition-colors">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${islemRenk}`}>
                  {(log.islem as string).replace(/_/g, ' ').toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!!log.hedef_tablo && (
                      <span className="text-[10px] text-zinc-500">{String(log.hedef_tablo)}</span>
                    )}
                    {!!log.hedef_kayit_id && (
                      <span className="text-[9px] text-zinc-600 font-mono">{String(log.hedef_kayit_id).slice(0, 8)}...</span>
                    )}
                  </div>
                  {detay && Object.keys(detay).length > 0 && (
                    <div className="text-[9px] text-zinc-600 mt-0.5 truncate">
                      {JSON.stringify(detay).slice(0, 80)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {new Date(log.created_at as string).toLocaleString('tr-TR')}
                </span>
              </div>
            );
          })}
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-[12px] text-zinc-600">Audit kaydı bulunamadı</div>
          )}
        </div>
      )}
    </div>
  );
}
