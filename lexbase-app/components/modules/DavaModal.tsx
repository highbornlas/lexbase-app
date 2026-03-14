'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useDavalar, useDavaKaydet, type Dava } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useMahkemeHafizasi } from '@/lib/hooks/useMahkemeHafizasi';
import { RehberSecici } from '@/components/ui/RehberSecici';
import {
  DAVA_TURLERI, MAHKEME_TURLERI, DAVA_DURUMLARI, DAVA_ASAMALARI,
  DAVA_TARAF, KAPANIS_SEBEPLERI_DAVA, DURUSMA_SAATLERI, ILLER,
} from '@/lib/constants/uyap';
import { tamMahkemeAdi, esasNoGoster } from '@/lib/utils/uyapHelpers';

interface DavaModalProps {
  open: boolean;
  onClose: () => void;
  dava?: Dava | null;
  onCreated?: (d: Dava) => void;
}

const bos: Partial<Dava> = {
  konu: '',
  davaTuru: '',
  muvId: '',
  il: '',
  adliye: '',
  mtur: '',
  mno: '',
  esasYil: '',
  esasNo: '',
  taraf: 'davaci',
  asama: 'İlk Derece',
  durum: 'Aktif',
  tarih: new Date().toISOString().split('T')[0],
  durusma: '',
  durusmaSaati: '',
  deger: 0,
  karsi: '',
  karsiId: '',
  karsav: '',
  karsavId: '',
  iliskiliIcraId: '',
  kapanisSebebi: '',
  kapanisTarih: '',
  not: '',
};

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Temel Bilgiler',
  2: 'Mahkeme & Taraflar',
  3: 'Bağlantı & Notlar',
};

export function DavaModal({ open, onClose, dava, onCreated }: DavaModalProps) {
  const [form, setForm] = useState<Partial<Dava>>({ ...bos });
  const [hata, setHata] = useState('');
  const [adim, setAdim] = useState<Adim>(1);
  const { data: mevcutlar } = useDavalar();
  const { data: icralar } = useIcralar();
  const kaydet = useDavaKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { mahkemeler, adliyeler, kullanılanIller } = useMahkemeHafizasi();

  useEffect(() => {
    if (dava) {
      setForm({ ...dava });
    } else {
      const maxNo = Math.max(0, ...(mevcutlar || []).map((d) => d.kayitNo || 0));
      setForm({ ...bos, id: crypto.randomUUID(), sira: Date.now(), kayitNo: maxNo + 1 });
    }
    setHata('');
    setAdim(1);
  }, [dava, open]);

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Mahkeme tam adı önizleme
  const mahkemeTamAd = useMemo(() =>
    tamMahkemeAdi(form.il, form.mno, form.mtur),
    [form.il, form.mno, form.mtur]
  );

  // Esas no önizleme
  const esasOnizle = useMemo(() =>
    esasNoGoster(form.esasYil, form.esasNo),
    [form.esasYil, form.esasNo]
  );

  // İl filtreleme: önce kullanılanlar, sonra diğerleri
  const ilListesi = useMemo(() => {
    const set = new Set(kullanılanIller);
    const oncelikli = kullanılanIller;
    const digerleri = ILLER.filter((il) => !set.has(il));
    return { oncelikli, digerleri };
  }, [kullanılanIller]);

  // Adliye önerileri (seçilen ile göre)
  const adliyeOnerileri = useMemo(() => {
    if (!form.il) return adliyeler;
    return adliyeler.filter((a) => a.toLowerCase().includes(form.il!.toLowerCase()));
  }, [form.il, adliyeler]);

  // Mahkeme hafızasından otomatik doldur
  function mahkemeSecFromHafiza(oneri: typeof mahkemeler[0]) {
    setForm((prev) => ({
      ...prev,
      il: oneri.il,
      adliye: oneri.adliye,
      mtur: oneri.mtur,
      mno: oneri.mno,
    }));
  }

  // ── Adım 1 doğrulama ──
  function adim1Dogrula(): boolean {
    if (!form.konu?.trim()) { setHata('Dava konusu zorunludur.'); return false; }
    if (!form.davaTuru) { setHata('Dava türü zorunludur.'); return false; }
    if (form.durum === 'Kapalı' && !form.kapanisSebebi) { setHata('Kapanış sebebi seçmelisiniz.'); return false; }
    setHata('');
    return true;
  }

  // ── Adım 2 doğrulama ──
  function adim2Dogrula(): boolean {
    if (form.esasYil && !/^\d{4}$/.test(form.esasYil)) {
      setHata('Esas yılı 4 haneli olmalıdır (Ör: 2026).');
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
    setHata('');
    try {
      await kaydet.mutateAsync(form as Dava);
      onCreated?.(form as Dava);
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dava ? 'Dava Düzenle' : 'Yeni Dava'}
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

        {/* ═══════════════════════════════════════════════════
           ADIM 1: TEMEL BİLGİLER
           ═══════════════════════════════════════════════════ */}
        {adim === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Dava Türü" required>
                <FormSelect value={form.davaTuru || ''} onChange={(e) => handleChange('davaTuru', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {DAVA_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Dava Konusu" required>
                <FormInput value={form.konu || ''} onChange={(e) => handleChange('konu', e.target.value)} placeholder="Ör: İşçi alacağı davası" />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Müvekkil">
                <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {muvekkillar?.map((m) => (
                    <option key={m.id} value={m.id}>{[m.ad, m.soyad].filter(Boolean).join(' ')}</option>
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Müvekkilin Tarafı">
                <FormSelect value={form.taraf || ''} onChange={(e) => handleChange('taraf', e.target.value)}>
                  {DAVA_TARAF.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </FormSelect>
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Aşama">
                <FormSelect value={form.asama || ''} onChange={(e) => handleChange('asama', e.target.value)}>
                  {DAVA_ASAMALARI.map((a) => <option key={a} value={a}>{a}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Durum">
                <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
                  {DAVA_DURUMLARI.map((d) => <option key={d} value={d}>{d}</option>)}
                </FormSelect>
              </FormGroup>
            </div>

            {/* Kapanış sebebi — sadece Kapalı ise */}
            {form.durum === 'Kapalı' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-surface2/50 rounded-xl border border-border/50">
                <FormGroup label="Kapanış Sebebi" required>
                  <FormSelect value={form.kapanisSebebi || ''} onChange={(e) => handleChange('kapanisSebebi', e.target.value)}>
                    <option value="">Seçiniz</option>
                    {KAPANIS_SEBEPLERI_DAVA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Kapanış Tarihi">
                  <FormInput type="date" value={form.kapanisTarih || ''} onChange={(e) => handleChange('kapanisTarih', e.target.value)} />
                </FormGroup>
              </div>
            )}

            <FormGroup label="Dava Tarihi">
              <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
            </FormGroup>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
           ADIM 2: MAHKEME & TARAFLAR
           ═══════════════════════════════════════════════════ */}
        {adim === 2 && (
          <>
            {/* Mahkeme hafızası önerileri */}
            {mahkemeler.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Daha önce kullanılan mahkemeler</div>
                <div className="flex flex-wrap gap-1.5">
                  {mahkemeler.slice(0, 8).map((m) => (
                    <button
                      key={m.tamAd}
                      type="button"
                      onClick={() => mahkemeSecFromHafiza(m)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                        form.il === m.il && form.mtur === m.mtur && form.mno === m.mno
                          ? 'bg-gold/20 text-gold border-gold/30'
                          : 'bg-surface2 text-text-muted border-border hover:border-gold/30 hover:text-text'
                      }`}
                    >
                      {m.tamAd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Mahkeme Bilgileri</div>
              <div className="grid grid-cols-3 gap-4">
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
                    placeholder="Ör: İstanbul Anadolu"
                    list="adliye-onerileri"
                  />
                  {adliyeOnerileri.length > 0 && (
                    <datalist id="adliye-onerileri">
                      {adliyeOnerileri.map((a) => <option key={a} value={a} />)}
                    </datalist>
                  )}
                </FormGroup>
                <FormGroup label="Mahkeme Türü">
                  <FormSelect value={form.mtur || ''} onChange={(e) => handleChange('mtur', e.target.value)}>
                    <option value="">Seçiniz</option>
                    {MAHKEME_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                </FormGroup>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <FormGroup label="Mahkeme No">
                  <FormInput value={form.mno || ''} onChange={(e) => handleChange('mno', e.target.value)} placeholder="Ör: 3" />
                </FormGroup>
                <FormGroup label="Esas Yılı">
                  <FormInput value={form.esasYil || ''} onChange={(e) => handleChange('esasYil', e.target.value)} placeholder="Ör: 2026" maxLength={4} />
                </FormGroup>
                <FormGroup label="Esas No">
                  <FormInput value={form.esasNo || ''} onChange={(e) => handleChange('esasNo', e.target.value)} placeholder="Ör: 123" />
                </FormGroup>
              </div>

              {/* Mahkeme önizleme */}
              {(mahkemeTamAd || esasOnizle) && (
                <div className="mt-3 p-2.5 bg-gold/5 border border-gold/20 rounded-lg text-xs text-gold">
                  <span className="font-semibold">Dosya: </span>
                  {mahkemeTamAd && <span>{mahkemeTamAd}</span>}
                  {esasOnizle && <span className="font-mono font-bold ml-1">E. {esasOnizle}</span>}
                </div>
              )}
            </div>

            {/* Duruşma */}
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Duruşma & Değer</div>
              <div className="grid grid-cols-3 gap-4">
                <FormGroup label="Duruşma Tarihi">
                  <FormInput type="date" value={form.durusma || ''} onChange={(e) => handleChange('durusma', e.target.value)} />
                </FormGroup>
                <FormGroup label="Duruşma Saati">
                  <FormSelect value={form.durusmaSaati || ''} onChange={(e) => handleChange('durusmaSaati', e.target.value)}>
                    <option value="">Saat seçin</option>
                    {DURUSMA_SAATLERI.map((s) => <option key={s} value={s}>{s}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="Dava Değeri (TL)">
                  <FormInput type="number" value={form.deger || ''} onChange={(e) => handleChange('deger', Number(e.target.value))} placeholder="0" />
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

        {/* ═══════════════════════════════════════════════════
           ADIM 3: BAĞLANTI & NOTLAR
           ═══════════════════════════════════════════════════ */}
        {adim === 3 && (
          <>
            {/* İlişkili İcra */}
            {icralar && icralar.length > 0 && (
              <FormGroup label="İlişkili İcra Dosyası">
                <FormSelect value={form.iliskiliIcraId || ''} onChange={(e) => handleChange('iliskiliIcraId', e.target.value)}>
                  <option value="">İlişkili icra dosyası yok</option>
                  {icralar.map((ic) => (
                    <option key={ic.id} value={ic.id}>
                      {ic.esas || ic.no || '?'} — {ic.borclu || '?'}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>
            )}

            {/* Karar Bilgileri */}
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Karar Bilgileri</div>
              <div className="grid grid-cols-3 gap-4">
                <FormGroup label="Karar Yılı">
                  <FormInput value={form.kararYil || ''} onChange={(e) => handleChange('kararYil', e.target.value)} placeholder="2026" maxLength={4} />
                </FormGroup>
                <FormGroup label="Karar No">
                  <FormInput value={form.kararNo || ''} onChange={(e) => handleChange('kararNo', e.target.value)} placeholder="Karar No" />
                </FormGroup>
                <FormGroup label="Hakim">
                  <FormInput value={form.hakim || ''} onChange={(e) => handleChange('hakim', e.target.value)} placeholder="Hakim adı" />
                </FormGroup>
              </div>
            </div>

            {/* Notlar */}
            <FormGroup label="Notlar">
              <FormTextarea value={(form.not as string) || ''} onChange={(e) => handleChange('not', e.target.value)} rows={3} placeholder="Ek notlar..." />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  );
}
