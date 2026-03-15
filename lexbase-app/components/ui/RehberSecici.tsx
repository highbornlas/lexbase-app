'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useKarsiTaraflar, type KarsiTaraf } from '@/lib/hooks/useKarsiTaraflar';
import { useVekillar, type Vekil } from '@/lib/hooks/useVekillar';
import { KarsiTarafModal } from '@/components/modules/KarsiTarafModal';
import { VekilModal } from '@/components/modules/VekilModal';

/* ══════════════════════════════════════════════════════════════
   RehberSecici — Akıllı Seçici (Autocomplete Dropdown)
   Rehberden karşı taraf veya avukat seçimi
   - Rehberden seç → id + ad döner
   - "Yeni Ekle" → Modal açılır → oluşturulan otomatik seçilir
   - Serbest metin de kabul edilir (eski kayıtlar için)
   ══════════════════════════════════════════════════════════════ */

interface RehberSeciciProps {
  tip: 'karsiTaraf' | 'avukat';
  /** Seçili kaydın adı (form'daki text değeri) */
  value: string;
  /** Seçili kaydın ID'si (opsiyonel, rehberden seçildiyse dolu) */
  selectedId?: string | null;
  /** Seçim veya metin değişikliği */
  onChange: (id: string | null, ad: string) => void;
  placeholder?: string;
  className?: string;
}

interface SecenekItem {
  id: string;
  ad: string;
  meta?: string;
  badge?: string;
  badgeClass?: string;
}

export function RehberSecici({
  tip,
  value,
  selectedId,
  onChange,
  placeholder,
  className,
}: RehberSeciciProps) {
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const { data: vekillar } = useVekillar();

  const [acik, setAcik] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Listeyi oluştur ── */
  const secenekler = useMemo<SecenekItem[]>(() => {
    if (tip === 'karsiTaraf') {
      return (karsiTaraflar || []).map((kt) => ({
        id: kt.id,
        ad: kt.ad,
        meta: [kt.tc && `TC: ${kt.tc}`, kt.vergiNo && `VKN: ${kt.vergiNo}`, kt.tel]
          .filter(Boolean)
          .join(' · '),
        badge: kt.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK',
        badgeClass: kt.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-green bg-green-dim',
      }));
    }
    return (vekillar || []).map((v) => ({
      id: v.id,
      ad: v.ad,
      meta: [v.baro && `${v.baro} Barosu`, v.baroSicil && `Sicil: ${v.baroSicil}`, v.tel]
        .filter(Boolean)
        .join(' · '),
      badge: v.baro ? `${v.baro}` : undefined,
      badgeClass: 'text-gold bg-gold/10',
    }));
  }, [tip, karsiTaraflar, vekillar]);

  /* ── Filtreleme ── */
  const filtrelenmis = useMemo(() => {
    if (!value.trim()) return secenekler;
    const q = value.toLocaleLowerCase('tr');
    return secenekler.filter(
      (s) => s.ad.toLocaleLowerCase('tr').includes(q) || (s.meta || '').toLocaleLowerCase('tr').includes(q)
    );
  }, [secenekler, value]);

  /* ── Dışarı tıklama ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAcik(false);
      }
    }
    if (acik) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [acik]);

  /* ── Seçim yapıldığında ── */
  function handleSecim(item: SecenekItem) {
    onChange(item.id, item.ad);
    setAcik(false);
  }

  /* ── Modal'dan oluşturulan kayıt ── */
  function handleCreated(kayit: KarsiTaraf | Vekil) {
    onChange(kayit.id, kayit.ad);
    setModalOpen(false);
    setAcik(false);
  }

  /* ── Input change (serbest metin) ── */
  function handleInputChange(text: string) {
    // Eğer serbest metin yazılıyorsa, ID'yi temizle
    const match = secenekler.find((s) => s.ad.toLocaleLowerCase('tr') === text.toLocaleLowerCase('tr'));
    onChange(match?.id ?? null, text);
    if (!acik) setAcik(true);
  }

  /* ── Seçili kaydı temizle ── */
  function handleTemizle() {
    onChange(null, '');
    inputRef.current?.focus();
  }

  const defaultPlaceholder =
    tip === 'karsiTaraf' ? 'Karşı taraf seçin veya yazın...' : 'Avukat seçin veya yazın...';

  const hasSelection = !!selectedId;

  return (
    <>
      <div ref={wrapperRef} className="relative">
        {/* Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setAcik(true)}
            placeholder={placeholder || defaultPlaceholder}
            className={`w-full h-10 px-3 pr-8 rounded-[10px] bg-surface2 border text-sm text-text
              focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50
              ${hasSelection ? 'border-gold/50' : 'border-border'}
              ${className || ''}`}
          />
          {/* Seçim göstergesi veya temizle butonu */}
          {hasSelection ? (
            <button
              onClick={handleTemizle}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red transition-colors text-xs"
              title="Seçimi kaldır"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[10px] pointer-events-none">
              ▼
            </span>
          )}
        </div>

        {/* Dropdown */}
        {acik && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {/* Sonuçlar */}
            {filtrelenmis.length > 0 ? (
              filtrelenmis.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSecim(item)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-gold-dim transition-colors border-b border-border/30 last:border-b-0 ${
                    selectedId === item.id ? 'bg-gold-dim' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">{item.ad}</span>
                    {item.badge && (
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    )}
                    {selectedId === item.id && (
                      <span className="text-gold text-xs ml-auto flex-shrink-0">✓</span>
                    )}
                  </div>
                  {item.meta && (
                    <div className="text-[10px] text-text-muted mt-0.5 truncate">{item.meta}</div>
                  )}
                </button>
              ))
            ) : value.trim() ? (
              <div className="px-3 py-3 text-xs text-text-muted text-center">
                Eşleşen kayıt bulunamadı
              </div>
            ) : null}

            {/* Yeni Ekle */}
            <button
              onClick={() => { setModalOpen(true); setAcik(false); }}
              className="w-full text-left px-3 py-2.5 text-gold hover:bg-gold-dim transition-colors border-t border-border flex items-center gap-2"
            >
              <span className="text-sm">➕</span>
              <span className="text-xs font-semibold">
                {tip === 'karsiTaraf' ? 'Yeni Karşı Taraf Ekle' : 'Yeni Avukat Ekle'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* İlgili Modal */}
      {tip === 'karsiTaraf' ? (
        <KarsiTarafModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      ) : (
        <VekilModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
