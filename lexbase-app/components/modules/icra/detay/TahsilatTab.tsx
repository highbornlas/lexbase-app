'use client';

import { fmt, fmtTarih } from "@/lib/utils";
import type { TahsilatKaydi } from "@/components/modules/TahsilatModal";
import { EmptyTab } from "./DetailUi";

export function TahsilatTab({ tahsilatlar, onEkle, onDuzenle, onSil }: {
  tahsilatlar: Array<TahsilatKaydi>;
  onEkle: () => void;
  onDuzenle: (t: TahsilatKaydi) => void;
  onSil: (id: string) => void;
}) {
  const turLabel: Record<string, string> = {
    tahsilat: 'Tahsilat', akdi_vekalet: 'Akdi Vekalet', 'hakediş': 'Hakediş', aktarim: 'Aktarım', iade: 'İade',
  };
  const toplam = tahsilatlar.reduce((t, h) => t + (h.tutar || 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-text-muted">
          {tahsilatlar.length > 0 && <>Toplam: <span className="font-bold text-green">{fmt(toplam)}</span> · {tahsilatlar.length} kayıt</>}
        </div>
        <button onClick={onEkle} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">+ Tahsilat Ekle</button>
      </div>
      {tahsilatlar.length === 0 ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>} message="Henüz tahsilat kaydı yok" action="+ Tahsilat Ekle" onAction={onEkle} />
      ) : (
        <div className="space-y-1.5">
          {tahsilatlar.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg text-xs group hover:bg-surface2 transition-colors">
              <span className="text-text-dim w-20 flex-shrink-0">{fmtTarih(t.tarih)}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                t.tur === 'tahsilat' ? 'bg-green-dim text-green' :
                t.tur === 'akdi_vekalet' ? 'bg-blue-400/10 text-blue-400' :
                t.tur === 'hakediş' ? 'bg-gold-dim text-gold' :
                'bg-surface text-text-muted'
              }`}>{turLabel[t.tur] || t.tur}</span>
              <span className="flex-1 text-text truncate">{t.acik || '—'}</span>
              {t.makbuzKesildi && <span className="text-[10px] text-green flex-shrink-0" title="Makbuz kesildi">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </span>}
              <span className={`font-bold flex-shrink-0 ${t.tur === 'aktarim' || t.tur === 'iade' ? 'text-red' : 'text-green'}`}>{fmt(t.tutar)}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                <button onClick={() => onDuzenle(t)} className="text-text-dim hover:text-gold p-1" title="Düzenle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => onSil(t.id)} className="text-text-dim hover:text-red p-1" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
