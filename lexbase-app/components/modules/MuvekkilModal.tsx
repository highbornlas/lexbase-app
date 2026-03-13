'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useMuvekkilKaydet, type Muvekkil } from '@/lib/hooks/useMuvekkillar';

interface MuvekkilModalProps {
  open: boolean;
  onClose: () => void;
  muvekkil?: Muvekkil | null;
}

const bos: Partial<Muvekkil> = {
  tip: 'gercek',
  ad: '',
  tc: '',
  tel: '',
  mail: '',
  vergiNo: '',
  vergiDairesi: '',
  not: '',
};

export function MuvekkilModal({ open, onClose, muvekkil }: MuvekkilModalProps) {
  const [form, setForm] = useState<Partial<Muvekkil>>({ ...bos });
  const [hata, setHata] = useState('');
  const kaydet = useMuvekkilKaydet();

  useEffect(() => {
    if (muvekkil) {
      setForm({ ...muvekkil });
    } else {
      setForm({ ...bos, id: crypto.randomUUID() });
    }
    setHata('');
  }, [muvekkil, open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.ad?.trim()) {
      setHata('Ad Soyad zorunludur.');
      return;
    }
    setHata('');
    try {
      await kaydet.mutateAsync(form as Muvekkil);
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={muvekkil ? 'Müvekkil Düzenle' : 'Yeni Müvekkil'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <BtnOutline onClick={onClose}>İptal</BtnOutline>
          <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
            {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </BtnGold>
        </>
      }
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-lg px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}

        {/* Tip Seçimi */}
        <FormGroup label="Müvekkil Tipi" required>
          <div className="flex gap-3">
            {(['gercek', 'tuzel'] as const).map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => handleChange('tip', tip)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.tip === tip
                    ? 'bg-gold text-bg border-gold'
                    : 'bg-surface2 text-text-muted border-border hover:border-gold/50'
                }`}
              >
                {tip === 'gercek' ? '👤 Gerçek Kişi' : '🏢 Tüzel Kişi'}
              </button>
            ))}
          </div>
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label={form.tip === 'tuzel' ? 'Şirket Adı' : 'Ad Soyad'} required>
            <FormInput value={form.ad || ''} onChange={(e) => handleChange('ad', e.target.value)} placeholder={form.tip === 'tuzel' ? 'Şirket Unvanı' : 'Ad Soyad'} />
          </FormGroup>

          {form.tip === 'gercek' ? (
            <FormGroup label="TC Kimlik No">
              <FormInput value={form.tc || ''} onChange={(e) => handleChange('tc', e.target.value)} placeholder="11 haneli TC" maxLength={11} />
            </FormGroup>
          ) : (
            <FormGroup label="Vergi No">
              <FormInput value={form.vergiNo || ''} onChange={(e) => handleChange('vergiNo', e.target.value)} placeholder="10 haneli VKN" maxLength={10} />
            </FormGroup>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Telefon">
            <FormInput type="tel" value={form.tel || ''} onChange={(e) => handleChange('tel', e.target.value)} placeholder="0532 000 0000" />
          </FormGroup>
          <FormGroup label="E-posta">
            <FormInput type="email" value={form.mail || ''} onChange={(e) => handleChange('mail', e.target.value)} placeholder="ornek@mail.com" />
          </FormGroup>
        </div>

        {form.tip === 'tuzel' && (
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Vergi Dairesi">
              <FormInput value={form.vergiDairesi || ''} onChange={(e) => handleChange('vergiDairesi', e.target.value)} placeholder="Vergi Dairesi" />
            </FormGroup>
            <FormGroup label="MERSİS No">
              <FormInput value={(form.mersis as string) || ''} onChange={(e) => handleChange('mersis', e.target.value)} placeholder="MERSİS No" />
            </FormGroup>
          </div>
        )}

        <FormGroup label="Adres">
          <FormTextarea
            value={(form.adres as Record<string, string>)?.acik || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, adres: { ...((prev.adres as Record<string, string>) || {}), acik: e.target.value } }))}
            rows={2}
            placeholder="Açık adres"
          />
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="İl">
            <FormInput
              value={(form.adres as Record<string, string>)?.il || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, adres: { ...((prev.adres as Record<string, string>) || {}), il: e.target.value } }))}
              placeholder="İl"
            />
          </FormGroup>
          <FormGroup label="İlçe">
            <FormInput
              value={(form.adres as Record<string, string>)?.ilce || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, adres: { ...((prev.adres as Record<string, string>) || {}), ilce: e.target.value } }))}
              placeholder="İlçe"
            />
          </FormGroup>
        </div>

        <FormGroup label="Notlar">
          <FormTextarea value={(form.not as string) || ''} onChange={(e) => handleChange('not', e.target.value)} rows={3} placeholder="Ek notlar..." />
        </FormGroup>
      </div>
    </Modal>
  );
}
