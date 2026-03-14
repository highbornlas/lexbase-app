'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useVekillar, useVekilKaydet, type Vekil } from '@/lib/hooks/useVekillar';
import { SmartBankaSecici } from '@/components/ui/SmartBankaSecici';
import { EtiketSecici } from '@/components/ui/EtiketSecici';
import { baroSicilDogrula, tbbSicilDogrula, bankaIbanlarDogrula, telefonDogrula, telefonFormatla, epostaDogrula } from '@/lib/validation';

interface VekilModalProps {
  open: boolean;
  onClose: () => void;
  vekil?: Vekil | null;
  onCreated?: (v: Vekil) => void;
}

const BAROLAR = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

const bos: Partial<Vekil> = {
  ad: '',
  soyad: '',
  baro: '',
  baroSicil: '',
  tbbSicil: '',
  tel: '',
  mail: '',
  uets: '',
  bankalar: [],
  aciklama: '',
};

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Kimlik Bilgileri',
  2: 'İletişim',
  3: 'Finans & Diğer',
};

export function VekilModal({ open, onClose, vekil, onCreated }: VekilModalProps) {
  const [form, setForm] = useState<Partial<Vekil>>({ ...bos });
  const [hata, setHata] = useState('');
  const [alanHata, setAlanHata] = useState<Record<string, string | null>>({});
  const [adim, setAdim] = useState<Adim>(1);
  const { data: mevcutlar } = useVekillar();
  const kaydet = useVekilKaydet();

  useEffect(() => {
    if (vekil) {
      setForm({ ...vekil });
    } else {
      setForm({ ...bos, id: crypto.randomUUID() });
    }
    setHata('');
    setAlanHata({});
    setAdim(1);
  }, [vekil, open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (alanHata[field]) setAlanHata((p) => ({ ...p, [field]: null }));
  }

  const ALAN_DOGRULAMA: Record<string, (v: string) => string | null> = {
    baroSicil: baroSicilDogrula, tbbSicil: tbbSicilDogrula, tel: telefonDogrula, mail: epostaDogrula,
  };
  function handleBlur(field: string) {
    const fn = ALAN_DOGRULAMA[field];
    const val = (form as Record<string, unknown>)[field] as string;
    if (fn && val) setAlanHata((p) => ({ ...p, [field]: fn(val) }));
  }

  function adim1Dogrula(): boolean {
    if (!form.ad?.trim()) { setHata('Avukat adı zorunludur.'); return false; }
    if (!form.soyad?.trim()) { setHata('Avukat soyadı zorunludur.'); return false; }
    let formatHata: string | null = null;
    if (form.baroSicil) formatHata = baroSicilDogrula(form.baroSicil);
    if (!formatHata && form.tbbSicil) formatHata = tbbSicilDogrula(form.tbbSicil);
    if (formatHata) { setHata(formatHata); return false; }

    if (form.baro && form.baroSicil?.trim()) {
      const digerler = (mevcutlar || []).filter((v) => v.id !== form.id);
      const ayni = digerler.find((v) => v.baro === form.baro && v.baroSicil === form.baroSicil?.trim());
      if (ayni) { setHata(`${form.baro} Barosu ${form.baroSicil} sicil numaralı avukat zaten kayıtlı: ${[ayni.ad, ayni.soyad].filter(Boolean).join(' ')}`); return false; }
    }
    setHata('');
    return true;
  }

  function adim2Dogrula(): boolean {
    let formatHata: string | null = null;
    if (form.tel) formatHata = telefonDogrula(form.tel);
    if (!formatHata && form.mail) formatHata = epostaDogrula(form.mail);
    if (formatHata) { setHata(formatHata); return false; }
    if (form.tel) form.tel = telefonFormatla(form.tel);
    setHata('');
    return true;
  }

  function ileri() {
    if (adim === 1 && adim1Dogrula()) setAdim(2);
    else if (adim === 2 && adim2Dogrula()) setAdim(3);
  }

  function geri() {
    setHata('');
    if (adim === 2) setAdim(1);
    else if (adim === 3) setAdim(2);
  }

  async function handleSubmit() {
    if (form.bankalar?.length) {
      const bankaHata = bankaIbanlarDogrula(form.bankalar);
      if (bankaHata) { setHata(bankaHata); return; }
    }
    setHata('');
    try {
      await kaydet.mutateAsync(form as Vekil);
      onCreated?.(form as Vekil);
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vekil ? 'Avukat Düzenle' : 'Yeni Avukat'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>{adim > 1 && <BtnOutline onClick={geri}>← Geri</BtnOutline>}</div>
          <div className="flex gap-2">
            <BtnOutline onClick={onClose}>İptal</BtnOutline>
            {adim < 3 ? (
              <BtnGold onClick={ileri}>İleri →</BtnGold>
            ) : (
              <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
                {kaydet.isPending ? 'Kaydediliyor...' : '✓ Kaydet'}
              </BtnGold>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ═══ ADIM İNDİKATÖRÜ ═══ */}
        <div className="flex items-center gap-2 mb-2">
          {([1, 2, 3] as Adim[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                if (a < adim) { setHata(''); setAdim(a); }
                else if (a === adim + 1 && adim === 1 && adim1Dogrula()) setAdim(a);
                else if (a === adim + 1 && adim === 2 && adim2Dogrula()) setAdim(a);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                a === adim
                  ? 'bg-gold text-bg shadow-[0_2px_8px_rgba(201,168,76,0.3)]'
                  : a < adim
                  ? 'bg-green-500/15 text-green-400 cursor-pointer hover:bg-green-500/25'
                  : 'bg-surface2 text-text-dim'
              }`}
            >
              {a < adim ? '✓' : a}
              <span className="hidden sm:inline">{ADIM_BASLIKLAR[a]}</span>
            </button>
          ))}
        </div>

        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">{hata}</div>
        )}

        {/* ═══ ADIM 1: KİMLİK ═══ */}
        {adim === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Ad" required>
                <FormInput value={form.ad || ''} onChange={(e) => handleChange('ad', e.target.value)} placeholder="Ad" />
              </FormGroup>
              <FormGroup label="Soyad" required>
                <FormInput value={form.soyad || ''} onChange={(e) => handleChange('soyad', e.target.value)} placeholder="Soyad" />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Baro">
                <select value={form.baro || ''} onChange={(e) => handleChange('baro', e.target.value)} className="form-input">
                  <option value="">Baro Seçin</option>
                  {BAROLAR.map((b) => <option key={b} value={b}>{b} Barosu</option>)}
                </select>
              </FormGroup>
              <FormGroup label="Baro Sicil No" error={alanHata.baroSicil}>
                <FormInput value={form.baroSicil || ''} onChange={(e) => handleChange('baroSicil', e.target.value)} onBlur={() => handleBlur('baroSicil')} placeholder="Sicil No" />
              </FormGroup>
            </div>

            <FormGroup label="TBB Sicil No" error={alanHata.tbbSicil}>
              <FormInput value={form.tbbSicil || ''} onChange={(e) => handleChange('tbbSicil', e.target.value)} onBlur={() => handleBlur('tbbSicil')} placeholder="Türkiye Barolar Birliği Sicil No" />
            </FormGroup>
          </>
        )}

        {/* ═══ ADIM 2: İLETİŞİM ═══ */}
        {adim === 2 && (
          <>
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">İletişim Bilgileri</div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Telefon" error={alanHata.tel}>
                <FormInput type="tel" value={form.tel || ''} onChange={(e) => handleChange('tel', e.target.value)} onBlur={() => handleBlur('tel')} placeholder="0532 000 0000" />
              </FormGroup>
              <FormGroup label="E-posta" error={alanHata.mail}>
                <FormInput type="email" value={form.mail || ''} onChange={(e) => handleChange('mail', e.target.value)} onBlur={() => handleBlur('mail')} placeholder="ornek@mail.com" />
              </FormGroup>
            </div>
            <FormGroup label="UETS / KEP Adresi">
              <FormInput value={form.uets || ''} onChange={(e) => handleChange('uets', e.target.value)} placeholder="UETS adresi" />
            </FormGroup>
          </>
        )}

        {/* ═══ ADIM 3: FİNANS ═══ */}
        {adim === 3 && (
          <>
            <SmartBankaSecici
              bankalar={form.bankalar || []}
              onChange={(bankalar) => setForm((prev) => ({ ...prev, bankalar }))}
            />

            <EtiketSecici
              etiketler={form.etiketler || []}
              onChange={(etiketler) => setForm((prev) => ({ ...prev, etiketler }))}
              mevcutEtiketler={(mevcutlar || []).flatMap((v) => v.etiketler || [])}
            />

            <FormGroup label="Notlar">
              <FormTextarea value={form.aciklama || ''} onChange={(e) => handleChange('aciklama', e.target.value)} rows={3} placeholder="Ek notlar..." />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  );
}
