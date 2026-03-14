'use client';

import { useState, useMemo } from 'react';
import { BANKALAR } from '@/lib/data/bankalar';
import { FormGroup, FormInput } from '@/components/ui/Modal';

interface BankaHesap {
  banka?: string;
  sube?: string;
  iban?: string;
  hesapNo?: string;
  hesapAd?: string;
}

interface Props {
  bankalar: BankaHesap[];
  onChange: (bankalar: BankaHesap[]) => void;
}

/* ── IBAN Formatlama ── */
function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  const val = clean.startsWith('TR') ? clean : (clean.length > 0 && /^\d/.test(clean) ? 'TR' + clean : clean);
  return val.replace(/(.{4})/g, '$1 ').trim().slice(0, 32);
}

export function SmartBankaSecici({ bankalar, onChange }: Props) {
  function handleChange(index: number, field: keyof BankaHesap, value: string) {
    const yeni = [...bankalar];
    if (field === 'iban') {
      yeni[index] = { ...yeni[index], iban: formatIban(value) };
    } else {
      yeni[index] = { ...yeni[index], [field]: value };
    }
    onChange(yeni);
  }

  function handleBankaSec(index: number, bankaAd: string) {
    const yeni = [...bankalar];
    yeni[index] = { ...yeni[index], banka: bankaAd };
    onChange(yeni);
  }

  function handleEkle() {
    onChange([...bankalar, { banka: '', sube: '', iban: '', hesapNo: '', hesapAd: '' }]);
  }

  function handleKaldir(index: number) {
    onChange(bankalar.filter((_, i) => i !== index));
  }

  return (
    <div className="border-t border-border/50 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Banka Hesapları
        </div>
        <button
          type="button"
          onClick={handleEkle}
          className="text-[11px] font-semibold text-gold hover:text-gold-light transition-colors flex items-center gap-1"
        >
          <span>+</span> Hesap Ekle
        </button>
      </div>

      {bankalar.length === 0 ? (
        <div className="text-center py-4 text-text-dim text-xs bg-surface2/50 rounded-lg border border-border/30">
          Henüz banka hesabı eklenmemiş
        </div>
      ) : (
        <div className="space-y-3">
          {bankalar.map((hesap, idx) => (
            <BankaHesapKarti
              key={idx}
              hesap={hesap}
              onBankaSec={(ad) => handleBankaSec(idx, ad)}
              onChange={(field, val) => handleChange(idx, field, val)}
              onKaldir={() => handleKaldir(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tek Hesap Kartı ── */
function BankaHesapKarti({
  hesap,
  onBankaSec,
  onChange,
  onKaldir,
}: {
  hesap: BankaHesap;
  onBankaSec: (ad: string) => void;
  onChange: (field: keyof BankaHesap, val: string) => void;
  onKaldir: () => void;
}) {
  const [arama, setArama] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtreliBankalar = useMemo(() => {
    if (!arama) return BANKALAR;
    const q = arama.toLowerCase();
    return BANKALAR.filter(
      (b) =>
        b.ad.toLowerCase().includes(q) ||
        (b.ticariUnvan && b.ticariUnvan.toLowerCase().includes(q))
    );
  }, [arama]);

  const seciliBanka = BANKALAR.find((b) => b.ad === hesap.banka);

  return (
    <div className="bg-surface2/50 rounded-xl border border-border/50 p-3 relative group">
      {/* Kaldır butonu */}
      <button
        type="button"
        onClick={onKaldir}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md
                   text-text-dim hover:text-red hover:bg-red-dim transition-all text-xs
                   opacity-0 group-hover:opacity-100"
        title="Hesabı kaldır"
      >
        ✕
      </button>

      {/* Banka Seçici + Şube */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="relative">
          <FormGroup label="Banka Adı">
            <input
              type="text"
              value={dropdownOpen ? arama : (seciliBanka?.ticariUnvan || seciliBanka?.ad || hesap.banka || '')}
              onChange={(e) => {
                setArama(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Banka seçin..."
              className="w-full h-8 px-3 text-xs bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
            />
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
                  {filtreliBankalar.map((b) => (
                    <button
                      key={b.ad}
                      type="button"
                      onClick={() => {
                        onBankaSec(b.ad);
                        setArama('');
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gold-dim transition-colors border-b border-border/20 last:border-b-0 ${
                        hesap.banka === b.ad ? 'bg-gold-dim/30' : ''
                      }`}
                    >
                      <div className={`text-xs font-medium ${hesap.banka === b.ad ? 'text-gold' : 'text-text'}`}>
                        {b.ticariUnvan || b.ad}
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        {b.mersis && (
                          <span className="text-[10px] text-text-dim">
                            MERSİS: {b.mersis}
                          </span>
                        )}
                        {b.swift && (
                          <span className="text-[10px] text-text-dim">
                            SWIFT: {b.swift}
                          </span>
                        )}
                        {b.kod && (
                          <span className="text-[10px] text-text-dim">
                            Kod: {b.kod}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filtreliBankalar.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-dim">Sonuç bulunamadı</div>
                  )}
                </div>
              </>
            )}
          </FormGroup>
        </div>
        <FormGroup label="Şube">
          <FormInput
            value={hesap.sube || ''}
            onChange={(e) => onChange('sube', e.target.value)}
            placeholder="Şube adı"
            className="!h-8 !text-xs"
          />
        </FormGroup>
      </div>

      {/* Banka bilgi satırı (seçili banka) */}
      {seciliBanka && (
        <div className="mb-2 px-2 py-1.5 bg-bg/50 rounded-lg border border-border/30">
          {seciliBanka.ticariUnvan && (
            <div className="text-[10px] text-gold font-medium mb-0.5">
              {seciliBanka.ticariUnvan}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-text-dim">
            {seciliBanka.mersis && <span>MERSİS: {seciliBanka.mersis}</span>}
            {seciliBanka.swift && <span>SWIFT: {seciliBanka.swift}</span>}
            {seciliBanka.kod && <span>Banka Kodu: {seciliBanka.kod}</span>}
          </div>
        </div>
      )}

      {/* IBAN */}
      <div className="mb-2">
        <FormGroup label="IBAN">
          <FormInput
            value={hesap.iban || ''}
            onChange={(e) => onChange('iban', e.target.value)}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            className="!h-8 !text-xs !font-mono !tracking-wider"
            maxLength={32}
          />
        </FormGroup>
      </div>

      {/* Hesap No + Hesap Sahibi */}
      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Hesap No">
          <FormInput
            value={hesap.hesapNo || ''}
            onChange={(e) => onChange('hesapNo', e.target.value)}
            placeholder="Hesap numarası"
            className="!h-8 !text-xs"
          />
        </FormGroup>
        <FormGroup label="Hesap Sahibi">
          <FormInput
            value={hesap.hesapAd || ''}
            onChange={(e) => onChange('hesapAd', e.target.value)}
            placeholder="Hesap sahibi adı"
            className="!h-8 !text-xs"
          />
        </FormGroup>
      </div>
    </div>
  );
}
