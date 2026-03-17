'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useEtkinlikKaydet, useEtkinlikSil, type Etkinlik } from '@/lib/hooks/useEtkinlikler';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { useYetki } from '@/lib/hooks/useRol';

interface EtkinlikModalProps {
  open: boolean;
  onClose: () => void;
  etkinlik?: Etkinlik | null;
  prefillTarih?: string;
  prefillMuvId?: string;
}

const TURLER = [
  'Duruşma', 'Son Gün', 'Müvekkil Görüşmesi', 'Toplantı',
  'Keşif', 'Bilirkişi', 'Arabuluculuk', 'Uzlaşma', 'Diğer',
];

const DOSYA_TURLERI = [
  { value: '', label: 'Seçiniz (Opsiyonel)' },
  { value: 'dava', label: 'Dava' },
  { value: 'icra', label: 'İcra' },
  { value: 'arabuluculuk', label: 'Arabuluculuk' },
  { value: 'ihtarname', label: 'İhtarname' },
  { value: 'danismanlik', label: 'Danışmanlık' },
];

const bos: Partial<Etkinlik> = {
  baslik: '',
  tarih: new Date().toISOString().split('T')[0],
  saat: '',
  bitisSaati: '',
  tur: 'Toplantı',
  muvId: '',
  yer: '',
  not: '',
  hatirlatma: '30',
  dosyaTur: '',
  dosyaId: '',
  katilimcilar: [],
};

export function EtkinlikModal({ open, onClose, etkinlik, prefillTarih, prefillMuvId }: EtkinlikModalProps) {
  const [form, setForm] = useState<Partial<Etkinlik>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Etkinlik>>({ ...bos });
  const [hata, setHata] = useState('');
  const [silOnay, setSilOnay] = useState(false);
  const kaydet = useEtkinlikKaydet();
  const sil = useEtkinlikSil();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: personeller } = usePersoneller();
  const { yetkili: silYetkisi } = useYetki('gorev:sil'); // genel silme yetkisi

  useEffect(() => {
    let init: Partial<Etkinlik>;
    if (etkinlik) {
      init = { ...etkinlik };
    } else {
      init = {
        ...bos,
        id: crypto.randomUUID(),
        tarih: prefillTarih || new Date().toISOString().split('T')[0],
        muvId: prefillMuvId || '',
      };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setSilOnay(false);
  }, [etkinlik, open, prefillTarih, prefillMuvId]);

  const draftKey = `etkinlik_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Dosya türü değişince dosya ID'yi sıfırla
    if (field === 'dosyaTur') {
      setForm((prev) => ({ ...prev, dosyaTur: value as string, dosyaId: '' }));
    }
    // Müvekkil değişince dosyayı sıfırla
    if (field === 'muvId') {
      setForm((prev) => ({ ...prev, muvId: value as string, dosyaTur: '', dosyaId: '' }));
    }
  }

  // Seçili müvekkile göre filtrelenmiş dosyalar
  const dosyaSecenekleri = useMemo(() => {
    const muvId = form.muvId;
    switch (form.dosyaTur) {
      case 'dava':
        return (davalar || [])
          .filter((d) => !muvId || d.muvId === muvId)
          .map((d) => ({ id: d.id, label: `${d.no || '—'} · ${d.konu || 'Dava'}` }));
      case 'icra':
        return (icralar || [])
          .filter((i) => !muvId || i.muvId === muvId)
          .map((i) => ({ id: i.id, label: `${i.no || '—'} · ${i.borclu || 'İcra'}` }));
      case 'arabuluculuk':
        return (arabuluculuklar || [])
          .filter((a) => !muvId || a.muvId === muvId)
          .map((a) => ({ id: a.id, label: `${a.no || '—'} · ${a.konu || 'Arabuluculuk'}` }));
      case 'ihtarname':
        return (ihtarnameler || [])
          .filter((ih) => !muvId || ih.muvId === muvId)
          .filter((ih) => !ih._silindi && !ih._arsivlendi)
          .map((ih) => ({ id: ih.id, label: `${ih.no || '—'} · ${ih.konu || 'İhtarname'}` }));
      case 'danismanlik':
        return (danismanliklar || [])
          .filter((d) => !muvId || d.muvId === muvId)
          .map((d) => ({ id: d.id, label: `${d.no || '—'} · ${d.konu || 'Danışmanlık'}` }));
      default:
        return [];
    }
  }, [form.dosyaTur, form.muvId, davalar, icralar, arabuluculuklar, ihtarnameler, danismanliklar]);

  // Katılımcı toggle
  function katilimciToggle(personelId: string) {
    setForm((prev) => {
      const mevcut = prev.katilimcilar || [];
      const yeni = mevcut.includes(personelId)
        ? mevcut.filter((id) => id !== personelId)
        : [...mevcut, personelId];
      return { ...prev, katilimcilar: yeni };
    });
  }

  async function handleSubmit() {
    if (!form.baslik?.trim()) {
      setHata('Etkinlik başlığı zorunludur.');
      return;
    }
    if (!form.tarih) {
      setHata('Tarih zorunludur.');
      return;
    }
    setHata('');
    try {
      await kaydet.mutateAsync(form as Etkinlik);
      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  async function handleSil() {
    if (!etkinlik) return;
    try {
      await sil.mutateAsync(etkinlik.id);
      onClose();
    } catch {
      setHata('Silme sırasında bir hata oluştu.');
    }
  }

  const isSanal = etkinlik?.sanal;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isSanal ? '📌 Sanal Etkinlik Detayı' : etkinlik ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}
      maxWidth="max-w-3xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Etkinlik>); clearDraft(); }}
      onDiscardDraft={clearDraft}
      footer={
        isSanal ? (
          <BtnOutline onClick={onClose}>Kapat</BtnOutline>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div>
              {etkinlik && silYetkisi && (
                silOnay ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSil}
                      disabled={sil.isPending}
                      className="px-3 py-1.5 bg-red text-white text-xs rounded-lg hover:bg-red/80"
                    >
                      {sil.isPending ? '...' : 'Evet, Sil'}
                    </button>
                    <button
                      onClick={() => setSilOnay(false)}
                      className="px-3 py-1.5 bg-surface2 text-text-muted text-xs rounded-lg hover:text-text"
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSilOnay(true)}
                    className="px-3 py-1.5 text-red text-xs hover:bg-red-dim rounded-lg transition-colors"
                  >
                    🗑️ Sil
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <BtnOutline onClick={onClose}>İptal</BtnOutline>
              <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
                {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </BtnGold>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}

        {/* Sanal etkinlik uyarısı */}
        {isSanal && (
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-[10px] px-3 py-2 text-xs text-blue-400">
            Bu etkinlik <strong>{etkinlik?.kaynak}</strong> modülünden otomatik oluşturulmuştur.
            Düzenlemek için{' '}
            {etkinlik?.kaynakUrl ? (
              <a href={etkinlik.kaynakUrl} className="underline font-bold hover:text-blue-300" onClick={onClose}>
                kaynak dosyaya gidin →
              </a>
            ) : 'kaynak dosyaya gidin.'}
          </div>
        )}

        {/* Adli tatil uzaması uyarısı */}
        {etkinlik?.adliTatilUzama && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[10px] px-3 py-2 text-xs text-amber-500">
            ⚠️ <strong>Adli Tatil Süre Uzaması:</strong> Bu sürenin son günü adli tatile (20 Tem — 31 Ağu) denk gelmektedir.
            HMK md.104 gereği süre <strong>{etkinlik.adliTatilUzama}</strong> tarihine kadar uzamıştır.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* ── SOL SÜTUN ── */}
          <div className="space-y-4">
            <FormGroup label="Etkinlik Başlığı" required>
              <FormInput
                value={form.baslik || ''}
                onChange={(e) => handleChange('baslik', e.target.value)}
                placeholder="Ör: Duruşma, Toplantı, Son Gün"
                disabled={!!isSanal}
              />
            </FormGroup>

            <FormGroup label="Tür">
              <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)} disabled={!!isSanal}>
                {TURLER.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup label="Konum / Adliye">
              <FormInput
                value={form.yer || ''}
                onChange={(e) => handleChange('yer', e.target.value)}
                placeholder="Ör: İstanbul 3. Asliye Hukuk Mahkemesi, Salon 4"
                disabled={!!isSanal}
              />
            </FormGroup>

            <FormGroup label="Notlar">
              <FormTextarea
                value={(form.not as string) || ''}
                onChange={(e) => handleChange('not', e.target.value)}
                rows={3}
                placeholder="Ek notlar, hazırlık notları..."
                disabled={!!isSanal}
              />
            </FormGroup>
          </div>

          {/* ── SAĞ SÜTUN ── */}
          <div className="space-y-4">
            <FormGroup label="Tarih" required>
              <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} disabled={!!isSanal} />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Başlangıç Saati">
                <FormInput type="time" value={form.saat || ''} onChange={(e) => handleChange('saat', e.target.value)} disabled={!!isSanal} />
              </FormGroup>
              <FormGroup label="Bitiş Saati">
                <FormInput type="time" value={form.bitisSaati || ''} onChange={(e) => handleChange('bitisSaati', e.target.value)} disabled={!!isSanal} />
              </FormGroup>
            </div>

            <FormGroup label="Hatırlatma">
              <FormSelect value={form.hatirlatma || ''} onChange={(e) => handleChange('hatirlatma', e.target.value)} disabled={!!isSanal}>
                <option value="">Yok</option>
                <option value="15">15 dakika önce</option>
                <option value="30">30 dakika önce</option>
                <option value="60">1 saat önce</option>
                <option value="1440">1 gün önce</option>
                <option value="4320">3 gün önce</option>
                <option value="10080">1 hafta önce</option>
              </FormSelect>
            </FormGroup>

            <FormGroup label="Müvekkil">
              <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)} disabled={!!isSanal}>
                <option value="">Seçiniz (Opsiyonel)</option>
                {muvekkillar?.map((m) => (
                  <option key={m.id} value={m.id}>{m.ad}</option>
                ))}
              </FormSelect>
            </FormGroup>

            {/* Dosya Bağlantısı (cascade) */}
            {!isSanal && (
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="İlgili Dosya Türü">
                  <FormSelect value={form.dosyaTur || ''} onChange={(e) => handleChange('dosyaTur', e.target.value)}>
                    {DOSYA_TURLERI.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </FormSelect>
                </FormGroup>
                {form.dosyaTur && (
                  <FormGroup label="Dosya Seç">
                    <FormSelect value={form.dosyaId || ''} onChange={(e) => handleChange('dosyaId', e.target.value)}>
                      <option value="">Seçiniz</option>
                      {dosyaSecenekleri.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </div>
            )}

            {/* Katılımcılar */}
            {!isSanal && personeller && personeller.length > 0 && (
              <FormGroup label="Katılımcılar">
                <div className="flex flex-wrap gap-1.5">
                  {personeller.map((p) => {
                    const secili = (form.katilimcilar || []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => katilimciToggle(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                          secili
                            ? 'bg-gold/20 text-gold border-gold/30'
                            : 'bg-surface2 text-text-muted border-border hover:text-text hover:border-text-muted'
                        }`}
                      >
                        {secili && '✓ '}{p.ad || p.email || '?'}
                      </button>
                    );
                  })}
                </div>
              </FormGroup>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
