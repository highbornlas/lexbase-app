'use client';

import { useState, useMemo } from 'react';
import { ILLER } from '@/lib/data/iller';

export interface Adres {
  baslik?: string;
  ulke?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  postaKodu?: string;
  sokak?: string;
  binaNo?: string;
  kat?: string;
  daire?: string;
  acik?: string;
}

interface Props {
  value: Adres;
  onChange: (adres: Adres) => void;
}

export function SmartAdresInput({ value, onChange }: Props) {
  const [ilArama, setIlArama] = useState('');
  const [ilceArama, setIlceArama] = useState('');
  const [ilDropdownOpen, setIlDropdownOpen] = useState(false);
  const [ilceDropdownOpen, setIlceDropdownOpen] = useState(false);

  /* ── İl filtreleme ── */
  const filtreliIller = useMemo(() => {
    if (!ilArama) return ILLER;
    const q = ilArama.toLowerCase();
    return ILLER.filter(i => i.il.toLowerCase().includes(q));
  }, [ilArama]);

  /* ── Seçili ilin ilçeleri ── */
  const ilceler = useMemo(() => {
    if (!value.il) return [];
    const ilData = ILLER.find(i => i.il === value.il);
    if (!ilData) return [];
    if (!ilceArama) return ilData.ilceler;
    const q = ilceArama.toLowerCase();
    return ilData.ilceler.filter(ilce => ilce.toLowerCase().includes(q));
  }, [value.il, ilceArama]);

  const handleField = (field: keyof Adres, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const handleIlSec = (il: string) => {
    onChange({ ...value, il, ilce: '' }); // İl değişince ilçeyi sıfırla
    setIlArama('');
    setIlDropdownOpen(false);
  };

  const handleIlceSec = (ilce: string) => {
    onChange({ ...value, ilce });
    setIlceArama('');
    setIlceDropdownOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* İl + İlçe */}
      <div className="grid grid-cols-2 gap-3">
        {/* İl Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-text-muted mb-1">İl</label>
          <input
            type="text"
            value={ilDropdownOpen ? ilArama : value.il || ''}
            onChange={(e) => { setIlArama(e.target.value); setIlDropdownOpen(true); }}
            onFocus={() => setIlDropdownOpen(true)}
            placeholder="İl seçin..."
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
          {ilDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIlDropdownOpen(false)} />
              <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
                {filtreliIller.map(i => (
                  <button
                    key={i.il}
                    type="button"
                    onClick={() => handleIlSec(i.il)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gold-dim transition-colors ${
                      value.il === i.il ? 'text-gold font-semibold' : 'text-text'
                    }`}
                  >
                    {i.il}
                  </button>
                ))}
                {filtreliIller.length === 0 && (
                  <div className="px-3 py-2 text-xs text-text-dim">Sonuç bulunamadı</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* İlçe Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-text-muted mb-1">İlçe</label>
          <input
            type="text"
            value={ilceDropdownOpen ? ilceArama : value.ilce || ''}
            onChange={(e) => { setIlceArama(e.target.value); setIlceDropdownOpen(true); }}
            onFocus={() => { if (value.il) setIlceDropdownOpen(true); }}
            placeholder={value.il ? 'İlçe seçin...' : 'Önce il seçin'}
            disabled={!value.il}
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none disabled:opacity-50"
          />
          {ilceDropdownOpen && value.il && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIlceDropdownOpen(false)} />
              <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
                {ilceler.map(ilce => (
                  <button
                    key={ilce}
                    type="button"
                    onClick={() => handleIlceSec(ilce)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gold-dim transition-colors ${
                      value.ilce === ilce ? 'text-gold font-semibold' : 'text-text'
                    }`}
                  >
                    {ilce}
                  </button>
                ))}
                {ilceler.length === 0 && (
                  <div className="px-3 py-2 text-xs text-text-dim">Sonuç bulunamadı</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mahalle + Posta Kodu */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-[11px] font-medium text-text-muted mb-1">Mahalle</label>
          <input
            type="text"
            value={value.mahalle || ''}
            onChange={(e) => handleField('mahalle', e.target.value)}
            placeholder="Mahalle adı"
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-muted mb-1">Posta Kodu</label>
          <input
            type="text"
            value={value.postaKodu || ''}
            onChange={(e) => handleField('postaKodu', e.target.value)}
            placeholder="34000"
            maxLength={5}
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Sokak + Bina No + Kat + Daire */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-[11px] font-medium text-text-muted mb-1">Sokak / Cadde</label>
          <input
            type="text"
            value={value.sokak || ''}
            onChange={(e) => handleField('sokak', e.target.value)}
            placeholder="Sokak / Cadde"
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-muted mb-1">Bina No</label>
          <input
            type="text"
            value={value.binaNo || ''}
            onChange={(e) => handleField('binaNo', e.target.value)}
            placeholder="No"
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-muted mb-1">Kat / Daire</label>
          <input
            type="text"
            value={value.daire || ''}
            onChange={(e) => handleField('daire', e.target.value)}
            placeholder="K:3 D:5"
            className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Açık Adres (otomatik veya manuel) */}
      <div>
        <label className="block text-[11px] font-medium text-text-muted mb-1">Açık Adres</label>
        <textarea
          value={value.acik || ''}
          onChange={(e) => handleField('acik', e.target.value)}
          rows={2}
          placeholder="Tam açık adres"
          className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
