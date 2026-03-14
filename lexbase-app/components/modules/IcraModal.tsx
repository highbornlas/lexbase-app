'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useIcralar, useIcraKaydet, type Icra } from '@/lib/hooks/useIcra';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useMahkemeHafizasi } from '@/lib/hooks/useMahkemeHafizasi';
import { RehberSecici } from '@/components/ui/RehberSecici';
import {
  ICRA_TURLERI, ALACAK_TURLERI, ICRA_DURUMLARI,
  ICRA_MUVEKKIL_ROL, KAPANIS_SEBEPLERI_ICRA, ILLER,
} from '@/lib/constants/uyap';
import { tamIcraDairesiAdi, esasNoGoster, tamMahkemeAdi } from '@/lib/utils/uyapHelpers';

interface IcraModalProps {
  open: boolean;
  onClose: () => void;
  icra?: Icra | null;
  onCreated?: (ic: Icra) => void;
  /** Dava'dan icra açarken otomatik doldurma */
  davaKaynak?: {
    davaId: string;
    muvId: string;
    dayanak: string;
  } | null;
}

const bos: Partial<Icra> = {
  muvId: '',
  borclu: '',
  btc: '',
  il: '',
  adliye: '',
  daire: '',
  esasYil: '',
  esasNo: '',
  tur: '',
  atur: '',
  durum: 'Aktif',
  alacak: 0,
  tarih: new Date().toISOString().split('T')[0],
  otarih: '',
  tebligTarihi: '',
  muvRol: 'alacakli',
  karsi: '',
  karsiId: '',
  karsav: '',
  karsavId: '',
  iliskiliDavaId: '',
  dayanak: '',
  kapanisSebebi: '',
  kapanisTarih: '',
  not: '',
};

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Temel Bilgiler',
  2: 'Daire & Tarihler',
  3: 'Bağlantı & Notlar',
};

export function IcraModal({ open, onClose, icra, onCreated, davaKaynak }: IcraModalProps) {
  const [form, setForm] = useState<Partial<Icra>>({ ...bos });
  const [hata, setHata] = useState('');
  const [adim, setAdim] = useState<Adim>(1);
  const { data: mevcutlar } = useIcralar();
  const { data: davalar } = useDavalar();
  const kaydet = useIcraKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { daireler, adliyeler, kullanılanIller } = useMahkemeHafizasi();

  useEffect(() => {
    if (icra) {
      // Eski esas alanını parçala (geriye uyumluluk)
      const f = { ...icra };
      if (f.esas && !f.esasYil && !f.esasNo) {
        const parts = f.esas.split('/');
        if (parts.length === 2) {
          f.esasYil = parts[0].trim();
          f.esasNo = parts[1].trim();
        }
      }
      setForm(f);
    } else {
      const maxNo = Math.max(0, ...(mevcutlar || []).map((i) => i.kayitNo || 0));
      const yeniForm: Partial<Icra> = { ...bos, id: crypto.randomUUID(), sira: Date.now(), kayitNo: maxNo + 1 };

      // Dava'dan gelen otomatik doldurma
      if (davaKaynak) {
        yeniForm.iliskiliDavaId = davaKaynak.davaId;
        yeniForm.muvId = davaKaynak.muvId;
        yeniForm.dayanak = davaKaynak.dayanak;
      }

      setForm(yeniForm);
    }
    setHata('');
    setAdim(1);
  }, [icra, open, davaKaynak]);

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Daire tam adı önizleme
  const daireTamAd = useMemo(() =>
    tamIcraDairesiAdi(form.il, form.daire),
    [form.il, form.daire]
  );

  // Esas no önizleme
  const esasOnizle = useMemo(() =>
    esasNoGoster(form.esasYil, form.esasNo),
    [form.esasYil, form.esasNo]
  );

  // İl listesi
  const ilListesi = useMemo(() => {
    const set = new Set(kullanılanIller);
    return { oncelikli: kullanılanIller, digerleri: ILLER.filter((il) => !set.has(il)) };
  }, [kullanılanIller]);

  // Daire hafızasından otomatik doldur
  function daireSecFromHafiza(oneri: typeof daireler[0]) {
    setForm((prev) => ({
      ...prev,
      il: oneri.il,
      adliye: oneri.adliye,
      daire: oneri.daire,
    }));
  }

  // ── Adım 1 doğrulama ──
  function adim1Dogrula(): boolean {
    if (!form.borclu?.trim() && !form.muvId) {
      setHata('Borçlu adı veya müvekkil seçimi zorunludur.');
      return false;
    }
    if (!form.tur) { setHata('Takip türü zorunludur.'); return false; }
    if (form.durum === 'Kapandı' && !form.kapanisSebebi) { setHata('Kapanış sebebi seçmelisiniz.'); return false; }
    setHata('');
    return true;
  }

  // ── Adım 2 doğrulama ──
  function adim2Dogrula(): boolean {
    if (form.esasYil && !/^\d{4}$/.test(form.esasYil)) {
      setHata('Esas yılı 4 haneli olmalıdır.');
      return false;
    }
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
    // Esas alanını birleştir (geriye uyumluluk)
    if (form.esasYil && form.esasNo) {
      form.esas = `${form.esasYil}/${form.esasNo}`;
    }

    setHata('');
    try {
      await kaydet.mutateAsync(form as Icra);
      onCreated?.(form as Icra);
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={icra ? 'İcra Dosyası Düzenle' : 'Yeni İcra Dosyası'}
      maxWidth="max-w-3xl"
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

        {/* ═══ ADIM 1: TEMEL BİLGİLER ═══ */}
        {adim === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Müvekkil">
                <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {muvekkillar?.map((m) => (
                    <option key={m.id} value={m.id}>{[m.ad, m.soyad].filter(Boolean).join(' ')}</option>
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Müvekkil Rolü">
                <FormSelect value={form.muvRol || ''} onChange={(e) => handleChange('muvRol', e.target.value)}>
                  {ICRA_MUVEKKIL_ROL.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </FormSelect>
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Borçlu Ad/Unvan">
                <FormInput value={form.borclu || ''} onChange={(e) => handleChange('borclu', e.target.value)} placeholder="Borçlu adı veya unvanı" />
              </FormGroup>
              <FormGroup label="Borçlu TC/VKN">
                <FormInput value={form.btc || ''} onChange={(e) => handleChange('btc', e.target.value)} placeholder="TC Kimlik No veya Vergi No" maxLength={11} />
              </FormGroup>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormGroup label="Takip Türü" required>
                <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {ICRA_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Alacak Türü">
                <FormSelect value={form.atur || ''} onChange={(e) => handleChange('atur', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {ALACAK_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Durum">
                <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
                  {ICRA_DURUMLARI.map((d) => <option key={d} value={d}>{d}</option>)}
                </FormSelect>
              </FormGroup>
            </div>

            {/* Kapanış sebebi — sadece Kapandı ise */}
            {form.durum === 'Kapandı' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-surface2/50 rounded-xl border border-border/50">
                <FormGroup label="Kapanış Sebebi" required>
                  <FormSelect value={form.kapanisSebebi || ''} onChange={(e) => handleChange('kapanisSebebi', e.target.value)}>
                    <option value="">Seçiniz</option>
                    {KAPANIS_SEBEPLERI_ICRA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Kapanış Tarihi">
                  <FormInput type="date" value={form.kapanisTarih || ''} onChange={(e) => handleChange('kapanisTarih', e.target.value)} />
                </FormGroup>
              </div>
            )}
          </>
        )}

        {/* ═══ ADIM 2: DAİRE & TARİHLER ═══ */}
        {adim === 2 && (
          <>
            {/* Daire hafızası önerileri */}
            {daireler.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Daha önce kullanılan daireler</div>
                <div className="flex flex-wrap gap-1.5">
                  {daireler.slice(0, 8).map((d) => (
                    <button
                      key={d.tamAd}
                      type="button"
                      onClick={() => daireSecFromHafiza(d)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                        form.il === d.il && form.daire === d.daire
                          ? 'bg-gold/20 text-gold border-gold/30'
                          : 'bg-surface2 text-text-muted border-border hover:border-gold/30 hover:text-text'
                      }`}
                    >
                      {d.tamAd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">İcra Dairesi</div>
              <div className="grid grid-cols-4 gap-4">
                <FormGroup label="İl">
                  <FormSelect value={form.il || ''} onChange={(e) => handleChange('il', e.target.value)}>
                    <option value="">Seçiniz</option>
                    {ilListesi.oncelikli.length > 0 && (
                      <optgroup label="Son Kullanılan">
                        {ilListesi.oncelikli.map((il) => <option key={`son-${il}`} value={il}>{il}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="Tüm İller">
                      {ilListesi.digerleri.map((il) => <option key={il} value={il}>{il}</option>)}
                    </optgroup>
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Adliye">
                  <FormInput
                    value={form.adliye || ''}
                    onChange={(e) => handleChange('adliye', e.target.value)}
                    placeholder="Adliye"
                    list="icra-adliye-onerileri"
                  />
                  {adliyeler.length > 0 && (
                    <datalist id="icra-adliye-onerileri">
                      {adliyeler.map((a) => <option key={a} value={a} />)}
                    </datalist>
                  )}
                </FormGroup>
                <FormGroup label="Daire">
                  <FormInput value={form.daire || ''} onChange={(e) => handleChange('daire', e.target.value)} placeholder="Ör: 5. İcra" />
                </FormGroup>
                <FormGroup label="Esas No">
                  <div className="grid grid-cols-2 gap-2">
                    <FormInput value={form.esasYil || ''} onChange={(e) => handleChange('esasYil', e.target.value)} placeholder="Yıl" maxLength={4} />
                    <FormInput value={form.esasNo || ''} onChange={(e) => handleChange('esasNo', e.target.value)} placeholder="No" />
                  </div>
                </FormGroup>
              </div>

              {/* Daire önizleme */}
              {(daireTamAd || esasOnizle) && (
                <div className="mt-3 p-2.5 bg-gold/5 border border-gold/20 rounded-lg text-xs text-gold">
                  <span className="font-semibold">Dosya: </span>
                  {daireTamAd && <span>{daireTamAd}</span>}
                  {esasOnizle && <span className="font-mono font-bold ml-1">E. {esasOnizle}</span>}
                </div>
              )}
            </div>

            {/* Tarihler & Tutarlar */}
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Tarih ve Tutar</div>
              <div className="grid grid-cols-3 gap-4">
                <FormGroup label="Takip Tarihi">
                  <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
                </FormGroup>
                <FormGroup label="Ödeme Emri Tarihi">
                  <FormInput type="date" value={form.otarih || ''} onChange={(e) => handleChange('otarih', e.target.value)} />
                </FormGroup>
                <FormGroup label="Tebliğ Tarihi">
                  <FormInput type="date" value={form.tebligTarihi || ''} onChange={(e) => handleChange('tebligTarihi', e.target.value)} />
                </FormGroup>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FormGroup label="Alacak Tutarı (TL)">
                  <FormInput type="number" value={form.alacak || ''} onChange={(e) => handleChange('alacak', Number(e.target.value))} placeholder="0" />
                </FormGroup>
                <FormGroup label="Faiz (%)">
                  <FormInput type="number" value={form.faiz || ''} onChange={(e) => handleChange('faiz', Number(e.target.value))} placeholder="0" />
                </FormGroup>
              </div>
            </div>

            {/* Karşı Taraf */}
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Karşı Taraf Bilgileri</div>
              <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Karşı Taraf">
                  <RehberSecici
                    tip="karsiTaraf"
                    value={(form.karsi as string) || ''}
                    selectedId={(form.karsiId as string) || null}
                    onChange={(id, ad) => setForm((prev) => ({ ...prev, karsi: ad, karsiId: id || '' }))}
                    placeholder="Karşı taraf seçin veya yazın..."
                  />
                </FormGroup>
                <FormGroup label="Karşı Avukat">
                  <RehberSecici
                    tip="avukat"
                    value={(form.karsav as string) || ''}
                    selectedId={(form.karsavId as string) || null}
                    onChange={(id, ad) => setForm((prev) => ({ ...prev, karsav: ad, karsavId: id || '' }))}
                    placeholder="Karşı avukat seçin veya yazın..."
                  />
                </FormGroup>
              </div>
            </div>
          </>
        )}

        {/* ═══ ADIM 3: BAĞLANTI & NOTLAR ═══ */}
        {adim === 3 && (
          <>
            {/* İlişkili Dava */}
            {davalar && davalar.length > 0 && (
              <FormGroup label="İlişkili Dava Dosyası">
                <FormSelect value={form.iliskiliDavaId || ''} onChange={(e) => {
                  const davaId = e.target.value;
                  handleChange('iliskiliDavaId', davaId);
                  // Otomatik dayanak doldur
                  if (davaId) {
                    const dava = davalar.find((d) => d.id === davaId);
                    if (dava) {
                      const mAd = tamMahkemeAdi(dava.il, dava.mno, dava.mtur);
                      const esas = esasNoGoster(dava.esasYil, dava.esasNo);
                      const dayanak = [mAd, esas ? `E. ${esas}` : ''].filter(Boolean).join(' ');
                      if (dayanak) setForm((prev) => ({ ...prev, dayanak }));
                    }
                  }
                }}>
                  <option value="">İlişkili dava dosyası yok</option>
                  {davalar.map((d) => {
                    const esas = esasNoGoster(d.esasYil, d.esasNo);
                    return (
                      <option key={d.id} value={d.id}>
                        {esas || d.no || '?'} — {d.konu || '?'}
                      </option>
                    );
                  })}
                </FormSelect>
              </FormGroup>
            )}

            <FormGroup label="Dayanak">
              <FormInput value={form.dayanak || ''} onChange={(e) => handleChange('dayanak', e.target.value)} placeholder="Ör: İstanbul 3. Asliye Ticaret Mahkemesi 2025/456 E." />
            </FormGroup>

            <FormGroup label="Notlar">
              <FormTextarea value={(form.not as string) || ''} onChange={(e) => handleChange('not', e.target.value)} rows={3} placeholder="Ek notlar..." />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  );
}
