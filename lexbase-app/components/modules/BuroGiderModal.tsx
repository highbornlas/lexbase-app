'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useBuroGiderKaydet, type BuroGider, GIDER_KATEGORILERI, KDV_ORANLARI } from '@/lib/hooks/useBuroGiderleri';
import { bruttenNete, formatTL } from '@/lib/utils/finans';

interface BuroGiderModalProps {
  open: boolean;
  onClose: () => void;
  gider?: BuroGider | null;
}

const bos: Partial<BuroGider> = {
  tarih: new Date().toISOString().split('T')[0],
  kategori: '',
  aciklama: '',
  tutar: 0,
  kdvOrani: 20,
  kdvTutar: 0,
  stopajOrani: 0,
  stopajTutar: 0,
  netTutar: 0,
  tekrar: 'tek',
  belgeNo: '',
  odemeDurumu: 'odendi',
  odenmeTarih: '',
  notlar: '',
};

export function BuroGiderModal({ open, onClose, gider }: BuroGiderModalProps) {
  const [form, setForm] = useState<Partial<BuroGider>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<BuroGider>>({ ...bos });
  const [hata, setHata] = useState('');
  const kaydet = useBuroGiderKaydet();

  useEffect(() => {
    let init: Partial<BuroGider>;
    if (gider) {
      init = { ...gider };
    } else {
      init = { ...bos, id: crypto.randomUUID() };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
  }, [gider, open]);

  const draftKey = `buroGider_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => {
      const yeni = { ...prev, [field]: value };

      // Tutar, KDV veya Stopaj değişince otomatik hesapla
      if (field === 'tutar' || field === 'kdvOrani' || field === 'stopajOrani') {
        const tutar = field === 'tutar' ? Number(value) : Number(yeni.tutar || 0);
        const kdvOrani = field === 'kdvOrani' ? Number(value) : Number(yeni.kdvOrani || 0);
        const stopajOrani = field === 'stopajOrani' ? Number(value) : Number(yeni.stopajOrani || 0);

        const hesap = bruttenNete(tutar, kdvOrani, stopajOrani);

        yeni.kdvTutar = hesap.kdvTutar;
        yeni.stopajTutar = hesap.stopajTutar;
        yeni.netTutar = hesap.netTutar;
      }

      return yeni;
    });
  }

  async function handleSubmit() {
    if (!form.kategori?.trim()) {
      setHata('Kategori seçiniz.');
      return;
    }
    if (!form.tutar || form.tutar <= 0) {
      setHata('Tutar giriniz.');
      return;
    }
    setHata('');

    try {
      await kaydet.mutateAsync(form as BuroGider);
      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında hata oluştu.');
    }
  }

  const fmtTRY = (n: number) => formatTL(n);

  return (
    <Modal open={open} onClose={onClose} title={gider ? 'Gideri Düzenle' : 'Yeni Büro Gideri'} maxWidth="max-w-2xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<BuroGider>); clearDraft(); }}
      onDiscardDraft={clearDraft}
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-lg px-3 py-2 text-xs text-red">{hata}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* ── SOL SÜTUN ── */}
          <div className="space-y-4">
            <FormGroup label="Açıklama">
              <FormInput value={form.aciklama || ''} onChange={(e) => handleChange('aciklama', e.target.value)} placeholder="Gider açıklaması..." />
            </FormGroup>

            <FormGroup label="Kategori *">
              <FormSelect value={form.kategori || ''} onChange={(e) => handleChange('kategori', e.target.value)}>
                <option value="">Seçiniz...</option>
                {GIDER_KATEGORILERI.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup label="Tutar (₺) *">
              <FormInput type="number" value={String(form.tutar || '')} onChange={(e) => handleChange('tutar', Number(e.target.value))} placeholder="0" />
            </FormGroup>
          </div>

          {/* ── SAĞ SÜTUN ── */}
          <div className="space-y-4">
            <FormGroup label="KDV Oranı (%)">
              <FormSelect value={String(form.kdvOrani ?? 20)} onChange={(e) => handleChange('kdvOrani', Number(e.target.value))}>
                {KDV_ORANLARI.map((o) => (
                  <option key={o} value={o}>%{o}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup label="Stopaj Oranı (%)">
              <FormInput type="number" value={String(form.stopajOrani || '')} onChange={(e) => handleChange('stopajOrani', Number(e.target.value))} placeholder="0" />
            </FormGroup>

            <FormGroup label="Tarih">
              <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
            </FormGroup>

            <FormGroup label="Tekrar">
              <FormSelect value={form.tekrar || 'tek'} onChange={(e) => handleChange('tekrar', e.target.value)}>
                <option value="tek">Tek Seferlik</option>
                <option value="aylik">Aylık</option>
                <option value="yillik">Yıllık</option>
              </FormSelect>
            </FormGroup>
          </div>
        </div>

        {/* Otomatik hesaplanan alanlar — tam genişlik */}
        <div className="grid grid-cols-3 gap-3 bg-surface2 rounded-lg p-3">
          <div>
            <div className="text-[9px] text-text-dim uppercase tracking-wider">KDV Tutarı</div>
            <div className="text-sm font-semibold text-text">{fmtTRY(form.kdvTutar || 0)}</div>
          </div>
          <div>
            <div className="text-[9px] text-text-dim uppercase tracking-wider">Stopaj Tutarı</div>
            <div className="text-sm font-semibold text-text">{fmtTRY(form.stopajTutar || 0)}</div>
          </div>
          <div>
            <div className="text-[9px] text-text-dim uppercase tracking-wider">Net Ödenecek</div>
            <div className="text-sm font-bold text-gold">{fmtTRY(form.netTutar || 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="Ödeme Durumu">
            <FormSelect value={form.odemeDurumu || 'odendi'} onChange={(e) => handleChange('odemeDurumu', e.target.value)}>
              <option value="odendi">Ödendi</option>
              <option value="bekliyor">Bekliyor</option>
              <option value="gecikti">Gecikti</option>
            </FormSelect>
          </FormGroup>

          <FormGroup label="Belge / Fatura No">
            <FormInput value={form.belgeNo || ''} onChange={(e) => handleChange('belgeNo', e.target.value)} placeholder="FTR-2026-001" />
          </FormGroup>
        </div>

        <FormGroup label="Notlar">
          <FormTextarea value={form.notlar || ''} onChange={(e) => handleChange('notlar', e.target.value)} placeholder="Ek notlar..." rows={2} />
        </FormGroup>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
        <BtnOutline onClick={onClose}>İptal</BtnOutline>
        <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
          {kaydet.isPending ? 'Kaydediliyor...' : gider ? 'Güncelle' : 'Kaydet'}
        </BtnGold>
      </div>
    </Modal>
  );
}
