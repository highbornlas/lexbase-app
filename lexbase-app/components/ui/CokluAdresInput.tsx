'use client';

import { SmartAdresInput, type Adres } from './SmartAdresInput';

/* ══════════════════════════════════════════════════════════════
   Çoklu Adres Girişi — Başlıklı, ekle/sil, accordion
   ══════════════════════════════════════════════════════════════ */

const BASLIK_ONERILERI = ['Ev Adresi', 'İş Adresi', 'Tebligat Adresi', 'Şube Adresi', 'Merkez Adresi'];

interface Props {
  adresler: Adres[];
  onChange: (adresler: Adres[]) => void;
}

export function CokluAdresInput({ adresler, onChange }: Props) {
  const liste = adresler.length > 0 ? adresler : [{ baslik: 'Ev Adresi' }];

  function ekle() {
    const kullanilan = new Set(liste.map((a) => a.baslik));
    const yeniBas = BASLIK_ONERILERI.find((b) => !kullanilan.has(b)) || `Adres ${liste.length + 1}`;
    onChange([...liste, { baslik: yeniBas }]);
  }

  function sil(idx: number) {
    if (liste.length <= 1) return;
    onChange(liste.filter((_, i) => i !== idx));
  }

  function guncelle(idx: number, adres: Adres) {
    const yeni = [...liste];
    yeni[idx] = { ...yeni[idx], ...adres };
    onChange(yeni);
  }

  function baslikDegistir(idx: number, baslik: string) {
    const yeni = [...liste];
    yeni[idx] = { ...yeni[idx], baslik };
    onChange(yeni);
  }

  return (
    <div className="space-y-3">
      {liste.map((adres, idx) => (
        <div key={idx} className="border border-border/60 rounded-xl overflow-hidden">
          {/* Başlık satırı */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface2/50">
            <span className="text-gold text-xs">📍</span>
            <input
              type="text"
              value={adres.baslik || ''}
              onChange={(e) => baslikDegistir(idx, e.target.value)}
              placeholder="Adres başlığı..."
              className="flex-1 bg-transparent text-xs font-semibold text-text placeholder:text-text-dim focus:outline-none"
              list={`adres-baslik-${idx}`}
            />
            <datalist id={`adres-baslik-${idx}`}>
              {BASLIK_ONERILERI.map((b) => <option key={b} value={b} />)}
            </datalist>
            {liste.length > 1 && (
              <button
                type="button"
                onClick={() => sil(idx)}
                className="text-text-dim hover:text-red text-xs transition-colors p-1"
                title="Bu adresi kaldır"
              >
                ✕
              </button>
            )}
          </div>

          {/* Adres formu */}
          <div className="p-3 pt-2">
            <SmartAdresInput
              value={adres}
              onChange={(a) => guncelle(idx, a)}
            />
          </div>
        </div>
      ))}

      {/* Yeni adres ekle */}
      <button
        type="button"
        onClick={ekle}
        className="w-full py-2 rounded-xl border border-dashed border-border text-xs text-text-muted hover:border-gold/40 hover:text-gold transition-colors"
      >
        + Yeni Adres Ekle
      </button>
    </div>
  );
}
