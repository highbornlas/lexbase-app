'use client';

import { useState } from 'react';
import { useAktifUyelik } from '@/lib/hooks/useUyelik';

/* ══════════════════════════════════════════════════════════════
   Büro Seçici — Sidebar'da gösterilir (çoklu büro varsa)
   ══════════════════════════════════════════════════════════════ */

export function BuroSecici() {
  const { uyelikler, aktifUyelik, cokluBuro, buroSec, isLoading } = useAktifUyelik();
  const [acik, setAcik] = useState(false);

  // Tek büro veya yükleniyor → gösterme
  if (isLoading || !cokluBuro || !aktifUyelik) return null;

  return (
    <div className="mx-2 mb-2">
      <button
        onClick={() => setAcik(!acik)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border/50 hover:border-gold/30 transition-colors text-left"
      >
        <span className="text-xs">🏢</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-text truncate">
            {aktifUyelik.buro_ad}
          </div>
          <div className="text-[9px] text-text-dim">
            {uyelikler.length} büro · Değiştir
          </div>
        </div>
        <span className={`text-[10px] text-text-dim transition-transform ${acik ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {acik && (
        <div className="mt-1 bg-surface border border-border rounded-lg overflow-hidden shadow-md">
          {uyelikler.map((u) => {
            const aktif = u.buro_id === aktifUyelik.buro_id;
            return (
              <button
                key={u.id}
                onClick={() => {
                  if (!aktif) buroSec(u.buro_id);
                  setAcik(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  aktif
                    ? 'bg-gold-dim text-gold'
                    : 'text-text-muted hover:bg-surface2 hover:text-text'
                }`}
              >
                {aktif && <span className="w-1.5 h-1.5 bg-gold rounded-full flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{u.buro_ad}</div>
                  <div className="text-[9px] text-text-dim capitalize">{u.rol}</div>
                </div>
                {u.durum === 'davet_gonderildi' && (
                  <span className="text-[8px] text-gold bg-gold-dim px-1 py-0.5 rounded">Davet</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
