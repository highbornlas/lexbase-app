'use client';

import { useState } from 'react';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

interface Not {
  id: string;
  tarih: string;
  icerik: string;
}

interface Props {
  muv: Muvekkil;
  onKaydet: (guncellenen: Muvekkil) => void;
}

export function MuvNotlar({ muv, onKaydet }: Props) {
  const [ekleOpen, setEkleOpen] = useState(false);
  const [yeniNot, setYeniNot] = useState('');

  /* ── Notları al (eski string + yeni array uyumluluğu) ── */
  const notlar: Not[] = (() => {
    const arr = (muv as Record<string, unknown>).notlar as Not[] | undefined;
    if (arr && Array.isArray(arr)) return arr;
    // Eski tek string formatı → array'e dönüştür
    if (muv.not) {
      return [{ id: 'legacy', tarih: '', icerik: muv.not }];
    }
    return [];
  })();

  /* ── Not ekle ── */
  const handleEkle = () => {
    if (!yeniNot.trim()) return;
    const yeni: Not = {
      id: crypto.randomUUID(),
      tarih: new Date().toISOString().slice(0, 16).replace('T', ' '),
      icerik: yeniNot.trim(),
    };
    const guncel = [yeni, ...notlar.filter((n) => n.id !== 'legacy')];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { not: _eskiNot, ...rest } = muv as Record<string, unknown>;
    onKaydet({ ...rest, id: muv.id, ad: muv.ad, notlar: guncel } as Muvekkil);
    setYeniNot('');
    setEkleOpen(false);
  };

  /* ── Not sil ── */
  const handleSil = (silId: string) => {
    const guncel = notlar.filter((n) => n.id !== silId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { not: _eskiNot, ...rest } = muv as Record<string, unknown>;
    onKaydet({ ...rest, id: muv.id, ad: muv.ad, notlar: guncel } as Muvekkil);
  };

  return (
    <div className="space-y-4">
      {/* Başlık + Ekle Butonu */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">📝 Notlar ({notlar.length})</h3>
        <button
          onClick={() => setEkleOpen(!ekleOpen)}
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
        >
          {ekleOpen ? '✕ İptal' : '+ Not Ekle'}
        </button>
      </div>

      {/* Hızlı Not Ekleme */}
      {ekleOpen && (
        <div className="bg-surface border border-gold/30 rounded-lg p-4">
          <textarea
            value={yeniNot}
            onChange={(e) => setYeniNot(e.target.value)}
            placeholder="Notunuzu yazın..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setEkleOpen(false); setYeniNot(''); }}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleEkle}
              disabled={!yeniNot.trim()}
              className="px-4 py-1.5 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Not Listesi — Post-it Card Tasarımı */}
      {notlar.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-sm font-medium">Henüz not eklenmemiş</div>
          <button
            onClick={() => setEkleOpen(true)}
            className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
          >
            + İlk Notu Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notlar.map((n, i) => {
            const renkler = [
              'bg-amber-500/5 border-amber-500/20',
              'bg-blue-400/5 border-blue-400/20',
              'bg-emerald-400/5 border-emerald-400/20',
              'bg-purple-400/5 border-purple-400/20',
              'bg-orange-400/5 border-orange-400/20',
            ];
            const renk = renkler[i % renkler.length];
            return (
              <div key={n.id} className={`border rounded-xl p-4 group relative transition-all hover:shadow-md ${renk}`}>
                {/* Tarih damgası — üst sağ */}
                {n.tarih && (
                  <div className="absolute top-2.5 right-3 text-[9px] text-text-dim font-mono bg-bg/60 px-1.5 py-0.5 rounded">
                    {n.tarih}
                  </div>
                )}
                {/* İçerik */}
                <div className="text-sm text-text whitespace-pre-wrap leading-relaxed pr-6 min-h-[40px]">
                  {n.icerik}
                </div>
                {/* Sil butonu */}
                <button
                  onClick={() => handleSil(n.id)}
                  className="absolute bottom-2.5 right-3 text-text-dim hover:text-red text-xs opacity-0 group-hover:opacity-100 transition-all"
                  title="Notu sil"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
