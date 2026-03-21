'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { fmt } from '@/lib/utils';
import { bruttenNete, nettenBrute } from '@/lib/utils/finans';

/* ══════════════════════════════════════════════════════════════
   Tahsilat Ekleme / Düzenleme Modal
   Dava ve İcra detay sayfalarında kullanılır.
   KDV / Stopaj / SMM Makbuz desteği ile.
   ══════════════════════════════════════════════════════════════ */

export interface TahsilatKaydi {
  id: string;
  tur: string;
  tutar: number;
  tarih?: string;
  acik?: string;
  kdvOrani?: number;
  stopajOrani?: number;
  makbuzKesildi?: boolean;
  makbuzNo?: string;
  makbuzTarih?: string;
}

interface TahsilatModalProps {
  open: boolean;
  onClose: () => void;
  onKaydet: (tahsilat: TahsilatKaydi) => void;
  tahsilat?: TahsilatKaydi | null;
}

const TAHSILAT_TURLERI = [
  { value: 'akdi_vekalet', label: 'Akdi Vekalet Ücreti' },
  { value: 'hakediş', label: 'Karşı Vekalet Hakedişi' },
  { value: 'tahsilat', label: 'Genel Tahsilat' },
  { value: 'aktarim', label: 'Aktarım' },
  { value: 'iade', label: 'İade' },
];

const bos: TahsilatKaydi = {
  id: '',
  tur: 'akdi_vekalet',
  tutar: 0,
  tarih: new Date().toISOString().split('T')[0],
  acik: '',
  kdvOrani: 0,
  stopajOrani: 0,
  makbuzKesildi: false,
  makbuzNo: '',
  makbuzTarih: '',
};

export function TahsilatModal({ open, onClose, onKaydet, tahsilat }: TahsilatModalProps) {
  const [form, setForm] = useState<TahsilatKaydi>({ ...bos });
  const [initialForm, setInitialForm] = useState<TahsilatKaydi>({ ...bos });
  const [tutarModu, setTutarModu] = useState<'brut' | 'net'>('brut');
  const [hata, setHata] = useState('');

  useEffect(() => {
    let init: TahsilatKaydi;
    if (tahsilat) {
      init = { ...tahsilat };
    } else {
      init = { ...bos, id: crypto.randomUUID() };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setTutarModu('brut');
  }, [tahsilat, open]);

  const draftKey = `tahsilat_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as unknown as Record<string, unknown>, initialForm as unknown as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.tutar || form.tutar <= 0) {
      setHata('Tutar giriniz.');
      return;
    }
    setHata('');
    onKaydet(form);
    clearDraft();
    onClose();
  }

  // Vergi hesaplama
  const efektifKdv = form.makbuzKesildi ? (form.kdvOrani || 0) : 0;
  const efektifStopaj = form.makbuzKesildi ? (form.stopajOrani || 0) : 0;
  const hesap = bruttenNete(form.tutar || 0, efektifKdv, efektifStopaj);

  return (
    <Modal open={open} onClose={onClose} title={tahsilat ? 'Tahsilat Düzenle' : 'Yeni Tahsilat'} maxWidth="max-w-lg"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as unknown as TahsilatKaydi); clearDraft(); }}
      onDiscardDraft={clearDraft}
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-lg px-3 py-2 text-xs text-red">{hata}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Tahsilat Türü">
            <FormSelect value={form.tur} onChange={(e) => handleChange('tur', e.target.value)}>
              {TAHSILAT_TURLERI.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Tarih">
            <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
          </FormGroup>
        </div>

        {/* Tutar + Net/Brüt Toggle */}
        <FormGroup label="Tutar (TL)">
          <div className="flex gap-2">
            <FormInput
              type="number"
              value={form.tutar || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (tutarModu === 'net' && form.makbuzKesildi) {
                  // Net girildiyse brüte çevir
                  const { brutTutar } = nettenBrute(val, form.kdvOrani || 0, form.stopajOrani || 0);
                  setForm((prev) => ({ ...prev, tutar: brutTutar }));
                } else {
                  handleChange('tutar', val);
                }
              }}
              placeholder="0"
            />
            {form.makbuzKesildi && (
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setTutarModu('brut')}
                  className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
                    tutarModu === 'brut' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
                  }`}
                >
                  Brüt
                </button>
                <button
                  type="button"
                  onClick={() => setTutarModu('net')}
                  className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
                    tutarModu === 'net' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
                  }`}
                >
                  Net
                </button>
              </div>
            )}
          </div>
        </FormGroup>

        <FormGroup label="Açıklama">
          <FormInput value={form.acik || ''} onChange={(e) => handleChange('acik', e.target.value)} placeholder="Tahsilat açıklaması..." />
        </FormGroup>

        {/* Vergi / SMM Bölümü */}
        <div className="border-t border-border/50 pt-4">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Vergi / SMM Bilgileri</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <FormGroup label="KDV Oranı (%)">
              <FormSelect value={String(form.kdvOrani ?? 0)} onChange={(e) => handleChange('kdvOrani', Number(e.target.value))}>
                <option value="0">%0 (Yok)</option>
                <option value="1">%1</option>
                <option value="10">%10</option>
                <option value="20">%20</option>
              </FormSelect>
            </FormGroup>
            <FormGroup label="Stopaj Oranı (%)">
              <FormSelect value={String(form.stopajOrani ?? 0)} onChange={(e) => handleChange('stopajOrani', Number(e.target.value))}>
                <option value="0">%0 (Yok)</option>
                <option value="15">%15</option>
                <option value="20">%20</option>
                <option value="25">%25</option>
              </FormSelect>
            </FormGroup>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-muted mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.makbuzKesildi}
              onChange={(e) => handleChange('makbuzKesildi', e.target.checked)}
              className="rounded border-border accent-gold"
            />
            Resmi Makbuz (SMM) Kesildi
          </label>

          {form.makbuzKesildi && (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <FormGroup label="Makbuz No">
                <FormInput value={form.makbuzNo || ''} onChange={(e) => handleChange('makbuzNo', e.target.value)} placeholder="SMM-2026-001" />
              </FormGroup>
              <FormGroup label="Makbuz Tarihi">
                <FormInput type="date" value={form.makbuzTarih || ''} onChange={(e) => handleChange('makbuzTarih', e.target.value)} />
              </FormGroup>
            </div>
          )}

          {/* Hesaplama Özeti */}
          {form.makbuzKesildi && (form.kdvOrani || 0) > 0 && (form.tutar || 0) > 0 && (
            <div className="grid grid-cols-3 gap-3 bg-surface2 rounded-lg p-3">
              <div>
                <div className="text-[9px] text-text-dim uppercase tracking-wider">KDV Tutarı</div>
                <div className="text-sm font-semibold text-text">{fmt(hesap.kdvTutar)}</div>
              </div>
              <div>
                <div className="text-[9px] text-text-dim uppercase tracking-wider">Stopaj Tutarı</div>
                <div className="text-sm font-semibold text-text">{fmt(hesap.stopajTutar)}</div>
              </div>
              <div>
                <div className="text-[9px] text-text-dim uppercase tracking-wider">Net Tutar</div>
                <div className="text-sm font-bold text-gold">{fmt(hesap.netTutar)}</div>
              </div>
            </div>
          )}

          {!form.makbuzKesildi && (form.kdvOrani || 0) > 0 && (
            <div className="text-[10px] text-text-dim mt-1">
              ℹ️ Makbuz kesilmediğinde KDV/Stopaj vergi hesabına dahil edilmez (avans/elden tahsilat).
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
        <BtnOutline onClick={onClose}>İptal</BtnOutline>
        <BtnGold onClick={handleSubmit}>{tahsilat ? 'Güncelle' : 'Ekle'}</BtnGold>
      </div>
    </Modal>
  );
}
