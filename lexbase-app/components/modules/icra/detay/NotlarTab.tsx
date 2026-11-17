'use client';

import { useState } from "react";
import { fmtTarih } from "@/lib/utils";
import { EmptyTab } from "./DetailUi";

export function NotlarTab({ notlar, notText, onEkle, onSil }: {
  notlar: Record<string, unknown>[];
  notText?: string;
  onEkle: (n: { id: string; tarih: string; icerik: string }) => void;
  onSil: (id: string) => void;
}) {
  const [yeniNot, setYeniNot] = useState('');

  function handleEkle() {
    if (!yeniNot.trim()) return;
    onEkle({ id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() });
    setYeniNot('');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
          placeholder="Not ekle..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleEkle(); }}
          className="flex-1 px-4 py-2.5 bg-surface2/50 border border-border rounded-xl text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
        <button onClick={handleEkle} disabled={!yeniNot.trim()} className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-xl text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">+ Ekle</button>
      </div>

      {notText && (
        <div className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative">
          <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
          <div className="text-xs text-text whitespace-pre-wrap mt-1">{notText}</div>
        </div>
      )}
      {notlar.length === 0 && !notText && (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} message="Henüz not eklenmemiş" />
      )}
      {notlar.map((n, i) => (
        <div key={(n.id as string) || i} className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative group">
          <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
          <div className="flex items-start gap-3 mt-1">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-text-dim">{fmtTarih(n.tarih as string)}</span>
                {typeof n.yazar === 'string' && <span className="text-[10px] text-text-muted">{n.yazar}</span>}
              </div>
            </div>
            {typeof n.id === 'string' && (
              <button onClick={() => onSil(n.id as string)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0" title="Sil">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
