'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

/* ══════════════════════════════════════════════════════════════
   Etiket Seçici — Kullanıcı tanımlı etiketler (renk + sembol)
   Ön tanımlı etiket YOK. Kullanıcı kendi etiketlerini oluşturur.
   ══════════════════════════════════════════════════════════════ */

export interface EtiketItem {
  ad: string;
  renk: string; // hex color
  sembol: string; // emoji
}

/* ── Renk Paleti ── */
const RENK_PALETI = [
  { hex: '#ef4444', ad: 'Kırmızı' },
  { hex: '#f97316', ad: 'Turuncu' },
  { hex: '#eab308', ad: 'Sarı' },
  { hex: '#22c55e', ad: 'Yeşil' },
  { hex: '#06b6d4', ad: 'Camgöbeği' },
  { hex: '#3b82f6', ad: 'Mavi' },
  { hex: '#8b5cf6', ad: 'Mor' },
  { hex: '#ec4899', ad: 'Pembe' },
  { hex: '#c9a84c', ad: 'Altın' },
  { hex: '#6b7280', ad: 'Gri' },
  { hex: '#14b8a6', ad: 'Turkuaz' },
  { hex: '#a855f7', ad: 'Eflatun' },
];

/* ── Sembol Listesi ── */
const SEMBOL_LISTESI = [
  '🏷️', '⭐', '🔥', '💎', '📌', '🎯', '💼', '👑',
  '🛡️', '⚡', '🔔', '📋', '✅', '❌', '⚠️', '💰',
  '🏢', '👤', '📞', '✉️', '📁', '⚖️', '🔒', '🌟',
  '🏠', '🚗', '💳', '📊', '🔑', '🎓', '🩺', '🔧',
];

/* ── Normalize: eski string → EtiketItem ── */
export function normalizeEtiket(e: unknown): EtiketItem {
  if (typeof e === 'string') {
    return { ad: e, renk: '#6b7280', sembol: '🏷️' };
  }
  const item = e as Record<string, unknown>;
  return {
    ad: (item.ad as string) || '',
    renk: (item.renk as string) || '#6b7280',
    sembol: (item.sembol as string) || '🏷️',
  };
}

/* ── Props ── */
interface EtiketSeciciProps {
  etiketler: unknown[];
  onChange: (etiketler: EtiketItem[]) => void;
  /** Bürodaki tüm kullanılmış etiketleri önermek için */
  mevcutEtiketler?: unknown[];
}

export function EtiketSecici({ etiketler, onChange, mevcutEtiketler = [] }: EtiketSeciciProps) {
  const [acik, setAcik] = useState(false);
  const [olusturMode, setOlusturMode] = useState(false);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniRenk, setYeniRenk] = useState(RENK_PALETI[0].hex);
  const [yeniSembol, setYeniSembol] = useState(SEMBOL_LISTESI[0]);
  const [arama, setArama] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Normalize ── */
  const normalized = useMemo(() => etiketler.map(normalizeEtiket), [etiketler]);

  /* ── Bürodaki tüm benzersiz etiketler ── */
  const tumEtiketler = useMemo(() => {
    const map = new Map<string, EtiketItem>();
    [...mevcutEtiketler, ...etiketler].forEach((e) => {
      const item = normalizeEtiket(e);
      if (item.ad && !map.has(item.ad)) map.set(item.ad, item);
    });
    return Array.from(map.values());
  }, [mevcutEtiketler, etiketler]);

  /* ── Seçilmemiş & aranan etiketler ── */
  const seciliAdlar = new Set(normalized.map((e) => e.ad));
  const mevcut = tumEtiketler
    .filter((e) => !seciliAdlar.has(e.ad))
    .filter((e) => !arama || e.ad.toLowerCase().includes(arama.toLowerCase()));

  /* ── Dışarı tıkla kapat ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAcik(false);
        setOlusturMode(false);
      }
    }
    if (acik) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [acik]);

  function ekle(etiket: EtiketItem) {
    onChange([...normalized, etiket]);
    setArama('');
  }

  function kaldir(ad: string) {
    onChange(normalized.filter((e) => e.ad !== ad));
  }

  function yeniOlustur() {
    const temiz = yeniAd.trim();
    if (!temiz) return;
    if (normalized.some((e) => e.ad === temiz)) return;
    const yeni: EtiketItem = { ad: temiz, renk: yeniRenk, sembol: yeniSembol };
    onChange([...normalized, yeni]);
    setYeniAd('');
    setYeniRenk(RENK_PALETI[0].hex);
    setYeniSembol(SEMBOL_LISTESI[0]);
    setOlusturMode(false);
    setArama('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAcik(false);
      setOlusturMode(false);
    }
    if (e.key === 'Backspace' && !arama && normalized.length > 0) {
      kaldir(normalized[normalized.length - 1].ad);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Etiketler
      </div>

      {/* ── Seçili etiketler + input ── */}
      <div
        className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 rounded-[10px] bg-surface border border-border cursor-text min-h-[38px]"
        onClick={() => {
          setAcik(true);
          inputRef.current?.focus();
        }}
      >
        {normalized.map((e) => (
          <span
            key={e.ad}
            style={{
              backgroundColor: e.renk + '22',
              color: e.renk,
              borderColor: e.renk + '55',
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
          >
            {e.sembol} {e.ad}
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                kaldir(e.ad);
              }}
              className="hover:opacity-70 text-current ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={arama}
          onChange={(ev) => {
            setArama(ev.target.value);
            setAcik(true);
          }}
          onFocus={() => setAcik(true)}
          onKeyDown={handleKeyDown}
          placeholder={normalized.length === 0 ? 'Etiket seçin veya oluşturun...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-text outline-none placeholder:text-text-dim"
        />
      </div>

      {/* ── Dropdown ── */}
      {acik && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-[10px] shadow-lg overflow-hidden">
          {/* Mevcut etiketler */}
          {mevcut.length > 0 && (
            <div className="max-h-32 overflow-y-auto">
              {mevcut.map((e) => (
                <button
                  key={e.ad}
                  type="button"
                  onClick={() => {
                    ekle(e);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface2 transition-colors flex items-center gap-2"
                >
                  <span style={{ color: e.renk }}>{e.sembol}</span>
                  <span>{e.ad}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Yeni Etiket Oluştur ── */}
          {!olusturMode ? (
            <button
              type="button"
              onClick={() => setOlusturMode(true)}
              className="w-full text-left px-3 py-2 text-xs text-gold hover:bg-gold-dim transition-colors border-t border-border/50 font-semibold"
            >
              + Yeni Etiket Oluştur
            </button>
          ) : (
            <div className="p-3 border-t border-border/50 space-y-2.5">
              {/* Ad */}
              <input
                type="text"
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && yeniAd.trim()) {
                    e.preventDefault();
                    yeniOlustur();
                  }
                }}
                placeholder="Etiket adı yazın..."
                className="w-full h-8 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
                autoFocus
              />

              {/* Renk seçici */}
              <div>
                <div className="text-[10px] text-text-dim mb-1.5 font-medium">Renk</div>
                <div className="flex flex-wrap gap-1.5">
                  {RENK_PALETI.map((r) => (
                    <button
                      key={r.hex}
                      type="button"
                      onClick={() => setYeniRenk(r.hex)}
                      style={{ backgroundColor: r.hex }}
                      className={`w-5 h-5 rounded-full transition-all ${
                        yeniRenk === r.hex
                          ? 'ring-2 ring-offset-1 ring-offset-bg ring-white/50 scale-125'
                          : 'hover:scale-110 opacity-75 hover:opacity-100'
                      }`}
                      title={r.ad}
                    />
                  ))}
                </div>
              </div>

              {/* Sembol seçici */}
              <div>
                <div className="text-[10px] text-text-dim mb-1.5 font-medium">Sembol</div>
                <div className="flex flex-wrap gap-1">
                  {SEMBOL_LISTESI.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setYeniSembol(s)}
                      className={`w-7 h-7 rounded-md text-sm flex items-center justify-center transition-all ${
                        yeniSembol === s
                          ? 'bg-gold/20 ring-1 ring-gold scale-110'
                          : 'hover:bg-surface2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Önizleme + Butonlar */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  {yeniAd.trim() && (
                    <span
                      style={{
                        backgroundColor: yeniRenk + '22',
                        color: yeniRenk,
                        borderColor: yeniRenk + '55',
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    >
                      {yeniSembol} {yeniAd}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOlusturMode(false)}
                    className="px-2.5 py-1 text-[10px] text-text-dim hover:text-text transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={yeniOlustur}
                    disabled={!yeniAd.trim()}
                    className="px-3 py-1 text-[10px] font-semibold bg-gold text-bg rounded-md hover:bg-gold-light disabled:opacity-50 transition-colors"
                  >
                    Oluştur
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Etiket Badge (salt okunur, listede göstermek için) ── */
export function EtiketBadge({ etiket }: { etiket: unknown }) {
  const item = normalizeEtiket(etiket);
  return (
    <span
      style={{
        backgroundColor: item.renk + '22',
        color: item.renk,
        borderColor: item.renk + '55',
      }}
      className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
    >
      {item.sembol} {item.ad}
    </span>
  );
}
