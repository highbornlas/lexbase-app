'use client';

import { useState, useRef } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { fmt } from '@/lib/utils';
import { bruttenNete, nettenBrute } from '@/lib/utils/finans';
import { gelirTahsilatiMi } from '@/lib/finans/gelirKurallari';
import { DAVA_ODEME_TURLERI, ICRA_ODEME_TURLERI, odemeFormTuru, odemeKayitTuru } from '@/lib/finans/odemeTurleri';

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
  onKaydet: (tahsilat: TahsilatKaydi) => Promise<void>;
  draftScope: string;
  tahsilat?: TahsilatKaydi | null;
  icraDosyasi?: boolean;
}

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

export function TahsilatModal(props: TahsilatModalProps) {
  return <TahsilatModalForm key={`${props.draftScope}-${props.open}-${props.tahsilat?.id || 'yeni'}`} {...props} />;
}

function TahsilatModalForm({ open, onClose, onKaydet, tahsilat, draftScope, icraDosyasi = false }: TahsilatModalProps) {
  const odemeTurleri = icraDosyasi ? ICRA_ODEME_TURLERI : DAVA_ODEME_TURLERI;
  const [initialForm] = useState<TahsilatKaydi>(() => tahsilat ? {
    ...tahsilat, tur: odemeFormTuru(tahsilat.tur, icraDosyasi),
  } : {
    ...bos, id: crypto.randomUUID(), tur: icraDosyasi ? 'borclu_odeme' : 'akdi_vekalet',
    tarih: new Date().toISOString().split('T')[0],
  });
  const [form, setForm] = useState<TahsilatKaydi>(initialForm);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const kayitKilidi = useRef(false);
  const [tutarModu, setTutarModu] = useState<'brut' | 'net'>('brut');
  const [hata, setHata] = useState('');

  const draftKey = `tahsilat_${draftScope}_${tahsilat?.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft, saveDraft } = useModalDraft(
    draftKey, form as unknown as Record<string, unknown>, initialForm as unknown as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (kayitKilidi.current) return;
    if (!Number.isFinite(form.tutar) || form.tutar <= 0) {
      setHata('Tutar giriniz.');
      return;
    }
    setHata('');
    kayitKilidi.current = true;
    setKaydediliyor(true);
    try {
      const kaydedilecek = { ...form, tur: odemeKayitTuru(form.tur, icraDosyasi) };
      if (!kaydedilecek.makbuzKesildi || !gelirTahsilatiMi(kaydedilecek.tur)) {
        kaydedilecek.makbuzKesildi = false;
        kaydedilecek.kdvOrani = 0;
        kaydedilecek.stopajOrani = 0;
      }
      await onKaydet(kaydedilecek);
      clearDraft();
      onClose();
    } catch (error) {
      saveDraft();
      setHata(error instanceof Error ? error.message : 'Tahsilat kaydedilemedi. Tekrar deneyiniz.');
    } finally {
      kayitKilidi.current = false;
      setKaydediliyor(false);
    }
  }

  // Vergi hesaplama
  const vergiUygulanabilir = gelirTahsilatiMi(form.tur);
  const efektifKdv = form.makbuzKesildi && vergiUygulanabilir ? (form.kdvOrani || 0) : 0;
  const efektifStopaj = form.makbuzKesildi && vergiUygulanabilir ? (form.stopajOrani || 0) : 0;
  const hesap = bruttenNete(form.tutar || 0, efektifKdv, efektifStopaj);

  return (
    <Modal open={open} onClose={() => { if (!kayitKilidi.current) onClose(); }} title={tahsilat ? 'Ödeme Düzenle' : 'Yeni Ödeme Kaydı'} maxWidth="max-w-lg"
      dirty={isDirty && !kaydediliyor}
      hasDraft={!kaydediliyor && hasDraft()}
      onLoadDraft={() => {
        const d = loadDraft();
        if (d) setForm({
          ...d, id: initialForm.id,
          tur: odemeFormTuru(typeof d.tur === 'string' ? d.tur : initialForm.tur, icraDosyasi),
        } as unknown as TahsilatKaydi);
      }}
      onSaveDraft={saveDraft}
      onDiscardDraft={clearDraft}
    >
      <fieldset disabled={kaydediliyor} className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-lg px-3 py-2 text-xs text-red">{hata}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Ödeme Türü">
            <FormSelect value={form.tur} onChange={(e) => handleChange('tur', e.target.value)}>
              {!odemeTurleri.some((t) => t.value === form.tur) && (
                <option value={form.tur}>{form.tur || 'Türü belirtilmemiş eski kayıt'}</option>
              )}
              {odemeTurleri.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </FormSelect>
            <p className="text-[11px] text-text-muted mt-1">
              {form.tur === 'tahsilat' || form.tur === 'borclu_odeme'
                ? 'Karşı taraftan müvekkil adına alınan para. Büro geliri değildir; ücret mahsubunu ayrı bir ücret veya hakediş kaydıyla izleyin.'
                : form.tur === 'aktarim'
                  ? 'Müvekkile aktarılan para. Büro geliri değildir.'
                  : form.tur === 'iade'
                    ? 'İade edilen para. Büro geliri değildir.'
                    : 'Büroya ait ücret veya hakediş. Müvekkil adına alınan ana paradan ayrı kaydedilir.'}
            </p>
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
              value={(tutarModu === 'net' && form.makbuzKesildi && vergiUygulanabilir ? hesap.netTutar : form.tutar) || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (tutarModu === 'net' && form.makbuzKesildi && vergiUygulanabilir) {
                  // Net girildiyse brüte çevir
                  const { brutTutar } = nettenBrute(val, form.kdvOrani || 0, form.stopajOrani || 0);
                  setForm((prev) => ({ ...prev, tutar: brutTutar }));
                } else {
                  handleChange('tutar', val);
                }
              }}
              placeholder="0"
            />
            {form.makbuzKesildi && vergiUygulanabilir && (
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
          <FormInput value={form.acik || ''} onChange={(e) => handleChange('acik', e.target.value)} placeholder="Ödeme açıklaması..." />
        </FormGroup>

        {/* Vergi / SMM Bölümü */}
        {vergiUygulanabilir && <div className="border-t border-border/50 pt-4">
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
        </div>}
      </fieldset>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
        <BtnOutline disabled={kaydediliyor} onClick={onClose}>İptal</BtnOutline>
        <BtnGold disabled={kaydediliyor} onClick={handleSubmit}>{kaydediliyor ? 'Kaydediliyor...' : tahsilat ? 'Güncelle' : 'Ekle'}</BtnGold>
      </div>
    </Modal>
  );
}
