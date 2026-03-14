'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useMuvekkillar, useMuvekkilKaydet, type Muvekkil } from '@/lib/hooks/useMuvekkillar';
import { type Adres } from '@/components/ui/SmartAdresInput';
import { CokluAdresInput } from '@/components/ui/CokluAdresInput';
import { SmartBankaSecici } from '@/components/ui/SmartBankaSecici';
import { EtiketSecici } from '@/components/ui/EtiketSecici';
import {
  tcKimlikDogrula, vknDogrula, ibanDogrula, mersisDogrula,
  ticaretSicilDogrula, yabanciKimlikDogrula, bankaIbanlarDogrula,
  telefonDogrula, telefonFormatla, epostaDogrula,
} from '@/lib/validation';

interface MuvekkilModalProps {
  open: boolean;
  onClose: () => void;
  muvekkil?: Muvekkil | null;
}

const SIRKET_TURLERI = ['A.Ş.', 'Ltd. Şti.', 'Şahıs Firması', 'Kooperatif', 'Dernek', 'Vakıf', 'Kamu Kurumu', 'Diğer'];

const bos: Partial<Muvekkil> = {
  tip: 'gercek',
  ad: '',
  soyad: '',
  tc: '',
  yabanciKimlikNo: '',
  dogum: '',
  dogumYeri: '',
  uyruk: 'T.C.',
  pasaport: '',
  meslek: '',
  // tüzel
  sirketTur: '',
  vergiNo: '',
  vergiDairesi: '',
  mersis: '',
  ticaretSicil: '',
  yetkiliAd: '',
  yetkiliUnvan: '',
  yetkiliTc: '',
  yetkiliTel: '',
  // iletişim
  tel: '',
  mail: '',
  faks: '',
  web: '',
  uets: '',
  adres: {},
  bankalar: [],
  not: '',
};

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Kimlik Bilgileri',
  2: 'İletişim & Adres',
  3: 'Finans & Diğer',
};

export function MuvekkilModal({ open, onClose, muvekkil }: MuvekkilModalProps) {
  const [form, setForm] = useState<Partial<Muvekkil>>({ ...bos });
  const [hata, setHata] = useState('');
  const [alanHata, setAlanHata] = useState<Record<string, string | null>>({});
  const [adim, setAdim] = useState<Adim>(1);
  const { data: mevcutlar } = useMuvekkillar();
  const kaydet = useMuvekkilKaydet();

  useEffect(() => {
    if (muvekkil) {
      const f = { ...muvekkil };
      // Eski tek adres → çoklu adres migrasyonu
      if (f.adres && !f.adresler) {
        const eskiAdres = f.adres as Record<string, string>;
        if (Object.keys(eskiAdres).length > 0) {
          f.adresler = [{ baslik: 'Ev Adresi', ...eskiAdres } as unknown as Record<string, string>];
        }
      }
      setForm(f);
    } else {
      setForm({ ...bos, id: crypto.randomUUID() });
    }
    setHata('');
    setAlanHata({});
    setAdim(1);
  }, [muvekkil, open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (alanHata[field]) setAlanHata((p) => ({ ...p, [field]: null }));
  }

  // ── Gerçek zamanlı doğrulama (onBlur) ──
  const ALAN_DOGRULAMA: Record<string, (v: string) => string | null> = {
    tc: tcKimlikDogrula, vergiNo: vknDogrula, mersis: mersisDogrula as (v: string) => string | null,
    ticaretSicil: ticaretSicilDogrula, yabanciKimlikNo: yabanciKimlikDogrula,
    yetkiliTc: tcKimlikDogrula, tel: telefonDogrula, yetkiliTel: telefonDogrula, mail: epostaDogrula,
  };
  function handleBlur(field: string) {
    const fn = ALAN_DOGRULAMA[field];
    const val = (form as Record<string, unknown>)[field] as string;
    if (fn && val) setAlanHata((p) => ({ ...p, [field]: fn(val) }));
  }

  const isTc = !form.uyruk || form.uyruk === 'T.C.';

  // ── Adım 1 doğrulama ──
  function adim1Dogrula(): boolean {
    if (!form.ad?.trim()) {
      setHata(form.tip === 'tuzel' ? 'Şirket adı zorunludur.' : 'Ad zorunludur.');
      return false;
    }
    if (form.tip === 'gercek' && !form.soyad?.trim()) {
      setHata('Soyad zorunludur.');
      return false;
    }
    if (form.tip === 'gercek') {
      if (isTc && !form.tc?.trim()) { setHata('T.C. Kimlik No zorunludur.'); return false; }
      if (!isTc && !form.yabanciKimlikNo?.trim()) { setHata('Yabancı Kimlik No zorunludur.'); return false; }
    }
    if (form.tip === 'tuzel' && !form.vergiNo?.trim()) { setHata('Vergi Kimlik No zorunludur.'); return false; }

    // Format doğrulama
    let formatHata: string | null = null;
    if (form.tc) formatHata = tcKimlikDogrula(form.tc);
    if (!formatHata && form.vergiNo) formatHata = vknDogrula(form.vergiNo);
    if (!formatHata && form.mersis) formatHata = mersisDogrula(form.mersis as string);
    if (!formatHata && form.ticaretSicil) formatHata = ticaretSicilDogrula(form.ticaretSicil);
    if (!formatHata && form.yabanciKimlikNo) formatHata = yabanciKimlikDogrula(form.yabanciKimlikNo);
    if (!formatHata && form.yetkiliTc) formatHata = tcKimlikDogrula(form.yetkiliTc);
    if (!formatHata && form.yetkiliTel) formatHata = telefonDogrula(form.yetkiliTel);
    if (formatHata) { setHata(formatHata); return false; }

    // Mükerrer kontrolü
    const digerler = (mevcutlar || []).filter((m) => m.id !== form.id);
    if (form.tip === 'gercek' && isTc && form.tc) {
      const ayni = digerler.find((m) => m.tc === form.tc?.trim());
      if (ayni) { setHata(`Bu TC ile kayıtlı müvekkil mevcut: ${[ayni.ad, ayni.soyad].filter(Boolean).join(' ')}`); return false; }
    }
    if (form.tip === 'gercek' && !isTc && form.yabanciKimlikNo) {
      const ayni = digerler.find((m) => m.yabanciKimlikNo === form.yabanciKimlikNo?.trim());
      if (ayni) { setHata(`Bu Yabancı Kimlik No ile kayıtlı müvekkil mevcut: ${[ayni.ad, ayni.soyad].filter(Boolean).join(' ')}`); return false; }
    }
    if (form.tip === 'tuzel' && form.vergiNo) {
      const ayni = digerler.find((m) => m.vergiNo === form.vergiNo?.trim());
      if (ayni) { setHata(`Bu Vergi No ile kayıtlı müvekkil mevcut: ${ayni.ad}`); return false; }
    }

    setHata('');
    return true;
  }

  // ── Adım 2 doğrulama ──
  function adim2Dogrula(): boolean {
    let formatHata: string | null = null;
    if (form.tel) formatHata = telefonDogrula(form.tel);
    if (!formatHata && form.mail) formatHata = epostaDogrula(form.mail);
    if (formatHata) { setHata(formatHata); return false; }
    // Telefon formatla
    if (form.tel) form.tel = telefonFormatla(form.tel);
    if (form.yetkiliTel) form.yetkiliTel = telefonFormatla(form.yetkiliTel);
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
    // Son adım doğrulaması
    if (form.bankalar?.length) {
      const bankaHata = bankaIbanlarDogrula(form.bankalar);
      if (bankaHata) { setHata(bankaHata); return; }
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
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {adim > 1 && (
              <BtnOutline onClick={geri}>← Geri</BtnOutline>
            )}
          </div>
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
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
           ADIM 1: KİMLİK BİLGİLERİ
           ═══════════════════════════════════════════════════ */}
        {adim === 1 && (
          <>
            {/* Tip Seçimi */}
            <FormGroup label="Müvekkil Tipi" required>
              <div className="flex gap-3">
                {(['gercek', 'tuzel'] as const).map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => handleChange('tip', tip)}
                    className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium border transition-all duration-200 ${
                      form.tip === tip
                        ? 'bg-gold text-bg border-gold shadow-[0_2px_8px_rgba(201,168,76,0.25)]'
                        : 'bg-surface2 text-text-muted border-border hover:border-gold/50 hover:bg-gold-dim/30'
                    }`}
                  >
                    {tip === 'gercek' ? '👤 Gerçek Kişi' : '🏢 Tüzel Kişi'}
                  </button>
                ))}
              </div>
            </FormGroup>

            {/* ═══ GERÇEK KİŞİ ═══ */}
            {form.tip === 'gercek' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Ad" required>
                    <FormInput value={form.ad || ''} onChange={(e) => handleChange('ad', e.target.value)} placeholder="Ad" />
                  </FormGroup>
                  <FormGroup label="Soyad" required>
                    <FormInput value={form.soyad || ''} onChange={(e) => handleChange('soyad', e.target.value)} placeholder="Soyad" />
                  </FormGroup>
                </div>

                <FormGroup label="Uyruk">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => handleChange('uyruk', 'T.C.')}
                      className={`flex-1 py-2 rounded-[10px] text-xs font-medium border transition-all duration-200 ${isTc ? 'bg-gold text-bg border-gold' : 'bg-surface2 text-text-muted border-border hover:border-gold/50'}`}>
                      🇹🇷 T.C. Vatandaşı
                    </button>
                    <button type="button" onClick={() => handleChange('uyruk', 'Yabancı')}
                      className={`flex-1 py-2 rounded-[10px] text-xs font-medium border transition-all duration-200 ${!isTc ? 'bg-gold text-bg border-gold' : 'bg-surface2 text-text-muted border-border hover:border-gold/50'}`}>
                      🌍 Yabancı Uyruklu
                    </button>
                  </div>
                </FormGroup>

                {isTc ? (
                  <FormGroup label="T.C. Kimlik No" required error={alanHata.tc}>
                    <FormInput value={form.tc || ''} onChange={(e) => handleChange('tc', e.target.value)} onBlur={() => handleBlur('tc')} placeholder="11 haneli TC Kimlik No" maxLength={11} />
                  </FormGroup>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Yabancı Kimlik No" required error={alanHata.yabanciKimlikNo}>
                      <FormInput value={form.yabanciKimlikNo || ''} onChange={(e) => handleChange('yabanciKimlikNo', e.target.value)} onBlur={() => handleBlur('yabanciKimlikNo')} placeholder="Kimlik / Pasaport No" />
                    </FormGroup>
                    <FormGroup label="Uyruk (Ülke)">
                      <FormInput value={form.uyruk === 'Yabancı' ? '' : form.uyruk || ''} onChange={(e) => handleChange('uyruk', e.target.value || 'Yabancı')} placeholder="Ör: Almanya" />
                    </FormGroup>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Doğum Tarihi">
                    <FormInput type="date" value={form.dogum || ''} onChange={(e) => handleChange('dogum', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Doğum Yeri">
                    <FormInput value={form.dogumYeri || ''} onChange={(e) => handleChange('dogumYeri', e.target.value)} placeholder="Doğum yeri" />
                  </FormGroup>
                </div>

                <FormGroup label="Meslek">
                  <FormInput value={form.meslek || ''} onChange={(e) => handleChange('meslek', e.target.value)} placeholder="Meslek" />
                </FormGroup>
              </>
            )}

            {/* ═══ TÜZEL KİŞİ ═══ */}
            {form.tip === 'tuzel' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Şirket Adı" required>
                    <FormInput value={form.ad || ''} onChange={(e) => handleChange('ad', e.target.value)} placeholder="Şirket Unvanı" />
                  </FormGroup>
                  <FormGroup label="Şirket Türü">
                    <FormSelect value={form.sirketTur || ''} onChange={(e) => handleChange('sirketTur', e.target.value)}>
                      <option value="">Seçiniz</option>
                      {SIRKET_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                  </FormGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Vergi No" required error={alanHata.vergiNo}>
                    <FormInput value={form.vergiNo || ''} onChange={(e) => handleChange('vergiNo', e.target.value)} onBlur={() => handleBlur('vergiNo')} placeholder="10 haneli VKN" maxLength={10} />
                  </FormGroup>
                  <FormGroup label="Vergi Dairesi">
                    <FormInput value={form.vergiDairesi || ''} onChange={(e) => handleChange('vergiDairesi', e.target.value)} placeholder="Vergi Dairesi" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="MERSİS No" error={alanHata.mersis}>
                    <FormInput value={(form.mersis as string) || ''} onChange={(e) => handleChange('mersis', e.target.value)} onBlur={() => handleBlur('mersis')} placeholder="MERSİS No" />
                  </FormGroup>
                  <FormGroup label="Ticaret Sicil No" error={alanHata.ticaretSicil}>
                    <FormInput value={form.ticaretSicil || ''} onChange={(e) => handleChange('ticaretSicil', e.target.value)} onBlur={() => handleBlur('ticaretSicil')} placeholder="Ticaret Sicil No" />
                  </FormGroup>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Yetkili Bilgileri</div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Yetkili Adı">
                      <FormInput value={form.yetkiliAd || ''} onChange={(e) => handleChange('yetkiliAd', e.target.value)} placeholder="Yetkili kişi adı" />
                    </FormGroup>
                    <FormGroup label="Yetkili Unvanı">
                      <FormInput value={form.yetkiliUnvan || ''} onChange={(e) => handleChange('yetkiliUnvan', e.target.value)} placeholder="Ör: Genel Müdür" />
                    </FormGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <FormGroup label="Yetkili TC" error={alanHata.yetkiliTc}>
                      <FormInput value={form.yetkiliTc || ''} onChange={(e) => handleChange('yetkiliTc', e.target.value)} onBlur={() => handleBlur('yetkiliTc')} placeholder="11 haneli TC" maxLength={11} />
                    </FormGroup>
                    <FormGroup label="Yetkili Telefon" error={alanHata.yetkiliTel}>
                      <FormInput type="tel" value={form.yetkiliTel || ''} onChange={(e) => handleChange('yetkiliTel', e.target.value)} onBlur={() => handleBlur('yetkiliTel')} placeholder="0532 000 0000" />
                    </FormGroup>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════
           ADIM 2: İLETİŞİM & ADRES
           ═══════════════════════════════════════════════════ */}
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
            <div className="grid grid-cols-3 gap-4">
              <FormGroup label="Faks">
                <FormInput value={form.faks || ''} onChange={(e) => handleChange('faks', e.target.value)} placeholder="Faks numarası" />
              </FormGroup>
              <FormGroup label="UETS / KEP">
                <FormInput value={form.uets || ''} onChange={(e) => handleChange('uets', e.target.value)} placeholder="UETS adresi" />
              </FormGroup>
              <FormGroup label="Web">
                <FormInput type="url" value={form.web || ''} onChange={(e) => handleChange('web', e.target.value)} placeholder="www.example.com" />
              </FormGroup>
            </div>

            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Adresler</div>
              <CokluAdresInput
                adresler={(form.adresler as Adres[]) || []}
                onChange={(adresler) => setForm((prev) => ({ ...prev, adresler: adresler as unknown as Record<string, string>[] }))}
              />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
           ADIM 3: FİNANS & DİĞER
           ═══════════════════════════════════════════════════ */}
        {adim === 3 && (
          <>
            <SmartBankaSecici
              bankalar={form.bankalar || []}
              onChange={(bankalar) => setForm((prev) => ({ ...prev, bankalar }))}
            />

            <EtiketSecici
              etiketler={form.etiketler || []}
              onChange={(etiketler) => setForm((prev) => ({ ...prev, etiketler }))}
              mevcutEtiketler={(mevcutlar || []).flatMap((m) => m.etiketler || [])}
            />

            <FormGroup label="Notlar">
              <FormTextarea value={(form.not as string) || ''} onChange={(e) => handleChange('not', e.target.value)} rows={3} placeholder="Ek notlar..." />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  );
}
