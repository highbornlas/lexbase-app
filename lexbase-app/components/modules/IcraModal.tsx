'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useIcralar, useIcraKaydet, type Icra } from '@/lib/hooks/useIcra';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useMahkemeHafizasi } from '@/lib/hooks/useMahkemeHafizasi';
import { CokluRehberSecici, type SeciliKisi } from '@/components/ui/CokluRehberSecici';
import { useOzelAlacakTurleri, useOzelAlacakTuruKaydet } from '@/lib/hooks/useOzelAlacakTurleri';
import {
  ICRA_TURLERI, ALACAK_TURLERI, ICRA_DURUMLARI,
  ICRA_MUVEKKIL_ROL, KAPANIS_SEBEPLERI_ICRA, ILLER,
  ICRA_YARGI_BIRIMLERI,
} from '@/lib/constants/uyap';
import { ADLIYELER } from '@/lib/constants/adliyeler';
import { tamIcraDairesiAdi, esasNoGoster, tamMahkemeAdi } from '@/lib/utils/uyapHelpers';
import { fmt } from '@/lib/utils';
import {
  type AlacakKalemi,
  type FaizTuru,
  KALEM_TURLERI,
  faizTurleriGruplu,
  hesaplaKalemFaiz,
  FAIZ_ORAN_DB,
} from '@/lib/utils/faiz';
import { useOzelKalemTurleri, useOzelKalemTuruKaydet } from '@/lib/hooks/useOzelKalemTurleri';

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
  muvekkilTaraflar: [],
  borclular: [],
  karsiTaraflar: [],
  vekiller: [],
  iliskiliDavaId: '',
  dayanak: '',
  kapanisSebebi: '',
  kapanisTarih: '',
  not: '',
  alacakKalemleri: {},
  borcluDetay: {},
};

type Adim = 1 | 2 | 3 | 4;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Temel Bilgiler',
  2: 'Daire & Tarihler',
  3: 'Alacak Kalemleri',
  4: 'Bağlantı & Notlar',
};

const PARA_BIRIMLERI = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
];

export function IcraModal({ open, onClose, icra, onCreated, davaKaynak }: IcraModalProps) {
  const [form, setForm] = useState<Partial<Icra>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Icra>>({ ...bos });
  const [hata, setHata] = useState('');
  const [adim, setAdim] = useState<Adim>(1);
  const { data: mevcutlar } = useIcralar();
  const { data: davalar } = useDavalar();
  const kaydet = useIcraKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { daireler, adliyeler, kullanılanIller } = useMahkemeHafizasi();
  const { data: ozelAlacakTurleri } = useOzelAlacakTurleri();
  const ozelAlacakKaydet = useOzelAlacakTuruKaydet();
  const [yeniAlacakTuru, setYeniAlacakTuru] = useState('');
  const [alacakTuruEkleAcik, setAlacakTuruEkleAcik] = useState(false);

  // Tüm alacak türleri (sabit + özel)
  const tumAlacakTurleri = useMemo(() => {
    const sabitler = [...ALACAK_TURLERI];
    const ozelSet = new Set(sabitler.map((t) => t.toLocaleLowerCase('tr')));
    const ozeller = (ozelAlacakTurleri || []).filter((t) => !ozelSet.has(t.toLocaleLowerCase('tr')));
    return [...sabitler, ...ozeller];
  }, [ozelAlacakTurleri]);

  useEffect(() => {
    let init: Partial<Icra>;
    if (icra) {
      // Eski esas alanını parçala (geriye uyumluluk)
      init = { ...icra };
      if (init.esas && !init.esasYil && !init.esasNo) {
        const parts = init.esas.split('/');
        if (parts.length === 2) {
          init.esasYil = parts[0].trim();
          init.esasNo = parts[1].trim();
        }
      }
      // Legacy → çoklu taraf migrasyonu
      if (!init.muvekkilTaraflar?.length && init.muvId) {
        const muv = muvekkillar?.find((m) => m.id === init.muvId);
        if (muv) init.muvekkilTaraflar = [{ id: muv.id, ad: [muv.ad, muv.soyad].filter(Boolean).join(' ') }];
      }
      if (!init.borclular?.length && init.borclu) {
        init.borclular = [{ id: init.karsiId || '', ad: init.borclu }];
      }
      if (!init.karsiTaraflar?.length && (init.karsiId || init.karsi)) {
        init.karsiTaraflar = [{ id: init.karsiId || '', ad: (init.karsi as string) || '' }];
      }
      if (!init.vekiller?.length && (init.karsavId || init.karsav)) {
        init.vekiller = [{ id: init.karsavId || '', ad: (init.karsav as string) || '' }];
      }
      if (!init.muvekkilTaraflar) init.muvekkilTaraflar = [];
      if (!init.borclular) init.borclular = [];
      if (!init.karsiTaraflar) init.karsiTaraflar = [];
      if (!init.vekiller) init.vekiller = [];
    } else {
      const maxNo = Math.max(0, ...(mevcutlar || []).map((i) => i.kayitNo || 0));
      init = { ...bos, id: crypto.randomUUID(), sira: Date.now(), kayitNo: maxNo + 1 };

      // Dava'dan gelen otomatik doldurma
      if (davaKaynak) {
        init.iliskiliDavaId = davaKaynak.davaId;
        init.muvId = davaKaynak.muvId;
        init.dayanak = davaKaynak.dayanak;
      }
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setAdim(1);
  }, [icra, open, davaKaynak]);

  const draftKey = `icra_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Daire tam adı önizleme
  const daireTamAd = useMemo(() =>
    tamIcraDairesiAdi(form.il, form.daire, form.adliye),
    [form.il, form.daire, form.adliye]
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

  // Seçilen ile göre adliyeler (ADLIYELER veritabanından)
  const ilAdliyeleri = useMemo(() => {
    if (!form.il) return [];
    return ADLIYELER[form.il] || [];
  }, [form.il]);

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
    const hasMuvekkil = (form.muvekkilTaraflar as SeciliKisi[])?.length > 0 || !!form.muvId;
    const hasBorclu = (form.borclular as SeciliKisi[])?.length > 0 || !!form.borclu?.trim();
    if (!hasBorclu && !hasMuvekkil) {
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
    else if (adim === 3) setAdim(4);
  }

  function geri() {
    setHata('');
    if (adim === 2) setAdim(1);
    else if (adim === 3) setAdim(2);
    else if (adim === 4) setAdim(3);
  }

  // Özel alacak türü ekleme
  async function handleYeniAlacakTuruEkle() {
    if (!yeniAlacakTuru.trim()) return;
    try {
      await ozelAlacakKaydet.mutateAsync(yeniAlacakTuru.trim());
      handleChange('atur', yeniAlacakTuru.trim());
      setYeniAlacakTuru('');
      setAlacakTuruEkleAcik(false);
    } catch { /* */ }
  }

  async function handleSubmit() {
    // Esas alanını birleştir (geriye uyumluluk)
    const syncForm = { ...form };
    if (syncForm.esasYil && syncForm.esasNo) {
      syncForm.esas = `${syncForm.esasYil}/${syncForm.esasNo}`;
    }
    // Çoklu taraflardan legacy alanlara sync
    if (syncForm.muvekkilTaraflar?.length) {
      syncForm.muvId = syncForm.muvekkilTaraflar[0].id;
    }
    if (syncForm.borclular?.length) {
      syncForm.borclu = syncForm.borclular[0].ad;
      syncForm.btc = ''; // legacy TC alanı
    }
    if (syncForm.karsiTaraflar?.length) {
      syncForm.karsiId = syncForm.karsiTaraflar[0].id;
      syncForm.karsi = syncForm.karsiTaraflar[0].ad;
    } else {
      syncForm.karsiId = '';
      syncForm.karsi = '';
    }
    // Karşı taraf/borçlu vekillerini legacy alana sync
    const tumVekiller = [
      ...(syncForm.karsiTaraflar || []).flatMap((kt) => kt.vekiller || []),
      ...(syncForm.borclular || []).flatMap((b) => b.vekiller || []),
    ];
    if (tumVekiller.length) {
      syncForm.karsavId = tumVekiller[0].id;
      syncForm.karsav = tumVekiller[0].ad;
    } else {
      syncForm.karsavId = '';
      syncForm.karsav = '';
    }
    syncForm.vekiller = tumVekiller;

    setHata('');
    try {
      await kaydet.mutateAsync(syncForm as Icra);
      onCreated?.(form as Icra);
      clearDraft();
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
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Icra>); clearDraft(); }}
      onDiscardDraft={clearDraft}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>{adim > 1 && <BtnOutline onClick={geri}>← Geri</BtnOutline>}</div>
          <div className="flex gap-2">
            <BtnOutline onClick={onClose}>İptal</BtnOutline>
            {adim < 4 ? (
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
          {([1, 2, 3, 4] as Adim[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                if (a < adim) { setHata(''); setAdim(a); }
                else if (a === adim + 1 && adim === 1 && adim1Dogrula()) setAdim(a);
                else if (a === adim + 1 && adim === 2 && adim2Dogrula()) setAdim(a);
                else if (a === adim + 1 && adim === 3) setAdim(a);
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
            <FormGroup label="Müvekkil Rolü">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {ICRA_MUVEKKIL_ROL.map((r) => (
                  <button key={r.value} type="button" onClick={() => handleChange('muvRol', r.value)}
                    className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                      form.muvRol === r.value ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
                    }`}>
                    {r.value === 'alacakli' ? '\u{1F4B0}' : '\u{1F4CB}'} {r.label}
                  </button>
                ))}
              </div>
            </FormGroup>

            <div className="grid grid-cols-3 gap-4">
              <FormGroup label="Takip Türü" required>
                <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {ICRA_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Alacak Türü">
                <div className="flex gap-1">
                  <FormSelect value={form.atur || ''} onChange={(e) => handleChange('atur', e.target.value)} className="flex-1">
                    <option value="">Seçiniz</option>
                    {tumAlacakTurleri.map((t) => <option key={t} value={t}>{t}</option>)}
                  </FormSelect>
                  <button
                    type="button"
                    onClick={() => setAlacakTuruEkleAcik(!alacakTuruEkleAcik)}
                    className="flex-shrink-0 w-9 h-10 flex items-center justify-center rounded-lg border border-gold/30 text-gold hover:bg-gold-dim transition-colors text-sm"
                    title="Yeni alacak türü ekle"
                  >
                    +
                  </button>
                </div>
                {alacakTuruEkleAcik && (
                  <div className="mt-2 flex gap-2">
                    <FormInput
                      value={yeniAlacakTuru}
                      onChange={(e) => setYeniAlacakTuru(e.target.value)}
                      placeholder="Yeni alacak türü..."
                      className="flex-1 !h-8 !text-xs"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleYeniAlacakTuruEkle(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleYeniAlacakTuruEkle}
                      disabled={!yeniAlacakTuru.trim() || ozelAlacakKaydet.isPending}
                      className="px-3 h-8 rounded-lg text-[11px] font-semibold bg-gold text-bg disabled:opacity-50 transition-colors"
                    >
                      {ozelAlacakKaydet.isPending ? '...' : 'Ekle'}
                    </button>
                  </div>
                )}
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

            {/* Müvekkiller — çoklu seçim + vekil atama */}
            <CokluRehberSecici
              tip="muvekkil"
              label="Müvekkiller"
              ekleMetni="Müvekkil Ekle"
              value={(form.muvekkilTaraflar as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, muvekkilTaraflar: v }))}
              vekilEklenebilir
            />

            {/* Karşı taraf — role göre Borçlular veya Alacaklılar */}
            <CokluRehberSecici
              tip="karsiTaraf"
              label={form.muvRol === 'borclu' ? 'Alacaklılar (Karşı Taraf)' : 'Borçlular'}
              ekleMetni={form.muvRol === 'borclu' ? 'Alacaklı Ekle' : 'Borçlu Ekle'}
              value={(form.borclular as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, borclular: v }))}
              vekilEklenebilir
            />
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
              {/* Yargı Birimi */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <FormGroup label="Yargı Birimi">
                  <FormSelect value={form.yargiBirimi || ''} onChange={(e) => handleChange('yargiBirimi', e.target.value)}>
                    <option value="">Seçiniz</option>
                    {ICRA_YARGI_BIRIMLERI.map((b) => <option key={b} value={b}>{b}</option>)}
                  </FormSelect>
                </FormGroup>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <FormGroup label="İl">
                  <FormSelect value={form.il || ''} onChange={(e) => { handleChange('il', e.target.value); handleChange('adliye', ''); }}>
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
                  <FormSelect value={form.adliye || ''} onChange={(e) => handleChange('adliye', e.target.value)} disabled={!form.il}>
                    <option value="">Seçiniz</option>
                    {ilAdliyeleri.map((a) => (
                      <option key={a.ad} value={a.ad}>
                        {a.ad}{a.mulhakat ? ` (${a.mulhakat} mülhakatı)` : ''}
                      </option>
                    ))}
                  </FormSelect>
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
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Tarihler</div>
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
            </div>
          </>
        )}

        {/* ═══ ADIM 3: ALACAK KALEMLERİ ═══ */}
        {adim === 3 && (
          <AlacakKalemleriAdim
            alacakDetay={(form.alacakDetay as AlacakKalemi[]) || []}
            onChange={(v) => setForm((prev) => ({ ...prev, alacakDetay: v }))}
            alacakKalemleri={form.alacakKalemleri}
            onLegacyChange={(v) => setForm((prev) => ({ ...prev, alacakKalemleri: v }))}
            takipTarihi={form.tarih || ''}
          />
        )}

        {/* ═══ ADIM 4: BAĞLANTI & NOTLAR ═══ */}
        {adim === 4 && (
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
                      const mAd = tamMahkemeAdi(dava.il, dava.mno, dava.mtur, dava.adliye);
                      const esas = esasNoGoster(dava.esasYil, dava.esasNo);
                      const dayanak = [mAd, esas ? `E. ${esas}` : ''].filter(Boolean).join(' ');
                      if (dayanak) setForm((prev) => ({ ...prev, dayanak }));
                    }
                  }
                }}>
                  <option value="">İlişkili dava dosyası yok</option>
                  {davalar.map((d) => {
                    const yer = d.adliye || d.il || '';
                    const esas = esasNoGoster(d.esasYil, d.esasNo);
                    const label = [yer, esas ? `${esas} E.` : '', d.konu ? `- ${d.konu}` : ''].filter(Boolean).join(' ');
                    return (
                      <option key={d.id} value={d.id}>
                        {label || d.no || '?'}
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

/* ══════════════════════════════════════════════════════════════
   ADIM 3: ALACAK KALEMLERİ — Kapsamlı alacak kalemi girişi
   Her kalem: asıl tutar, tarih, işlemiş faiz, takip sonrası faiz türü
   NOT: Takip sonrası faiz yalnızca asıl alacağa işler,
        işlemiş faize tekrar faiz işlemez
   ══════════════════════════════════════════════════════════════ */

interface AlacakKalemleriAdimProps {
  alacakDetay: AlacakKalemi[];
  onChange: (kalemler: AlacakKalemi[]) => void;
  alacakKalemleri?: Record<string, unknown>;
  onLegacyChange: (v: Record<string, unknown>) => void;
  takipTarihi: string;
}

const BOS_KALEM_FORM = {
  kalemTuru: 'asil_alacak' as AlacakKalemi['kalemTuru'],
  aciklama: '',
  asilTutar: '',
  paraBirimi: 'TRY',
  vadeTarihi: '',
  faizTuru: 'yasal' as FaizTuru,
  ozelFaizOrani: '',
  islemiFaiz: '',
};

function AlacakKalemleriAdim({ alacakDetay, onChange, alacakKalemleri, onLegacyChange, takipTarihi }: AlacakKalemleriAdimProps) {
  const [formAcik, setFormAcik] = useState(false);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [form, setForm] = useState(BOS_KALEM_FORM);
  const [digerKalemAciklama, setDigerKalemAciklama] = useState('');
  const [kalemTuruEkleAcik, setKalemTuruEkleAcik] = useState(false);
  const [yeniKalemTuru, setYeniKalemTuru] = useState('');

  // Özel kalem türleri
  const { data: ozelKalemTurleri } = useOzelKalemTurleri();
  const ozelKalemKaydet = useOzelKalemTuruKaydet();

  const tumKalemTurleri = useMemo(() => {
    const sabitler = [...KALEM_TURLERI];
    const ozeller = (ozelKalemTurleri || []).map((t) => ({ value: t as AlacakKalemi['kalemTuru'], label: t }));
    return [...sabitler, ...ozeller];
  }, [ozelKalemTurleri]);

  async function handleYeniKalemTuruEkle() {
    if (!yeniKalemTuru.trim()) return;
    try {
      await ozelKalemKaydet.mutateAsync(yeniKalemTuru.trim());
      setForm((prev) => ({ ...prev, kalemTuru: yeniKalemTuru.trim() as AlacakKalemi['kalemTuru'], aciklama: yeniKalemTuru.trim() }));
      setYeniKalemTuru('');
      setKalemTuruEkleAcik(false);
    } catch { /* */ }
  }

  const bugun = new Date().toISOString().slice(0, 10);

  // Auto-calculate işlemiş faiz (vade → takip arası)
  // Hesaplama fonksiyonu — form state dışında, her zaman güncel değerlerle çalışır
  const hesaplaIslemiFaiz = useCallback((vade: string, tutar: string, faizTuru: string, kalemTuru: string, ozelOran: string, takip: string): string => {
    if (!vade || !tutar || !faizTuru || faizTuru === 'yok' || !takip) return '';
    if (vade >= takip) return ''; // Vade tarihi takip tarihinden sonra → işlemiş faiz yok
    const tempKalem: AlacakKalemi = {
      id: 'temp',
      kalemTuru: kalemTuru as AlacakKalemi['kalemTuru'],
      aciklama: '',
      asilTutar: Number(tutar),
      vadeTarihi: vade,
      faizTuru: faizTuru as FaizTuru,
      ozelFaizOrani: ozelOran ? Number(ozelOran) : undefined,
    };
    const faiz = hesaplaKalemFaiz(tempKalem, takip);
    return faiz > 0 ? faiz.toFixed(2) : '';
  }, []);

  // Form alanları veya takipTarihi değiştiğinde işlemiş faizi yeniden hesapla
  useEffect(() => {
    const yeni = hesaplaIslemiFaiz(form.vadeTarihi, form.asilTutar, form.faizTuru, form.kalemTuru, form.ozelFaizOrani, takipTarihi);
    setForm((prev) => {
      if (prev.islemiFaiz === yeni) return prev; // gereksiz re-render önle
      return { ...prev, islemiFaiz: yeni };
    });
  }, [form.vadeTarihi, form.faizTuru, form.asilTutar, form.ozelFaizOrani, form.kalemTuru, takipTarihi, hesaplaIslemiFaiz]);

  // Takip tarihi değiştiğinde mevcut kaydedilmiş kalemlerin işlemiş faizlerini de güncelle
  const sonTakipRef = useRef(takipTarihi);
  useEffect(() => {
    if (takipTarihi && takipTarihi !== sonTakipRef.current && alacakDetay.length > 0) {
      sonTakipRef.current = takipTarihi;
      const guncellenmis = alacakDetay.map((k) => {
        if (!k.vadeTarihi || k.vadeTarihi >= takipTarihi) {
          return { ...k, islemiFaiz: undefined };
        }
        const faiz = hesaplaKalemFaiz(k, takipTarihi);
        return { ...k, islemiFaiz: faiz > 0 ? Math.round(faiz * 100) / 100 : undefined };
      });
      onChange(guncellenmis);
    }
  }, [takipTarihi, alacakDetay, onChange]);

  // Toplam hesapları
  // İşleyen faiz: takip tarihinden bugüne kadar (takipTarihi override ile)
  const toplamAsil = alacakDetay.reduce((t, k) => t + k.asilTutar, 0);
  const toplamIslemiFaiz = alacakDetay.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
  const toplamIsleyenFaiz = alacakDetay.reduce((t, k) => t + hesaplaKalemFaiz(k, bugun, undefined, undefined, takipTarihi || undefined), 0);

  function handleKaydet() {
    if (!form.asilTutar || !form.vadeTarihi) return;

    const yeniKalem: AlacakKalemi = {
      id: duzenleId || crypto.randomUUID(),
      kalemTuru: form.kalemTuru,
      aciklama: form.aciklama || tumKalemTurleri.find((k) => k.value === form.kalemTuru)?.label || 'Alacak',
      asilTutar: Number(form.asilTutar),
      paraBirimi: form.paraBirimi || 'TRY',
      vadeTarihi: form.vadeTarihi,
      faizTuru: form.faizTuru,
      ozelFaizOrani: (form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') ? Number(form.ozelFaizOrani) || undefined : undefined,
      islemiFaiz: Number(form.islemiFaiz) || undefined,
    };

    if (duzenleId) {
      onChange(alacakDetay.map((k) => k.id === duzenleId ? yeniKalem : k));
    } else {
      onChange([...alacakDetay, yeniKalem]);
    }

    // Legacy alacakKalemleri alanını da güncelle (geriye uyumluluk)
    const tumKalemler = duzenleId
      ? alacakDetay.map((k) => k.id === duzenleId ? yeniKalem : k)
      : [...alacakDetay, yeniKalem];
    const topAsil = tumKalemler.reduce((t, k) => t + k.asilTutar, 0);
    const topIslemis = tumKalemler.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
    onLegacyChange({
      ...(alacakKalemleri || {}),
      asilAlacak: topAsil || undefined,
      islemisiFaiz: topIslemis || undefined,
    });

    setForm(BOS_KALEM_FORM);
    setFormAcik(false);
    setDuzenleId(null);
  }

  function handleDuzenle(k: AlacakKalemi) {
    setForm({
      kalemTuru: k.kalemTuru,
      aciklama: k.aciklama,
      asilTutar: k.asilTutar.toString(),
      paraBirimi: k.paraBirimi || 'TRY',
      vadeTarihi: k.vadeTarihi,
      faizTuru: k.faizTuru,
      ozelFaizOrani: k.ozelFaizOrani?.toString() || '',
      islemiFaiz: k.islemiFaiz?.toString() || '',
    });
    setDuzenleId(k.id);
    setFormAcik(true);
  }

  function handleSil(id: string) {
    const yeniListe = alacakDetay.filter((k) => k.id !== id);
    onChange(yeniListe);
    // Legacy güncelle
    const topAsil = yeniListe.reduce((t, k) => t + k.asilTutar, 0);
    const topIslemis = yeniListe.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
    onLegacyChange({
      ...(alacakKalemleri || {}),
      asilAlacak: topAsil || undefined,
      islemisiFaiz: topIslemis || undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Bilgi notu */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-400/5 border border-blue-400/20 rounded-lg">
        <span className="text-sm mt-0.5">ℹ️</span>
        <div className="text-[11px] text-text-muted leading-relaxed">
          <strong className="text-text">Takip sonrası faiz yalnızca asıl alacağa işler.</strong>{' '}
          İşlemiş faize tekrar faiz işlenmez. Her kalemi ayrı faiz türüyle tanımlayabilirsiniz.
        </div>
      </div>

      {/* Başlık + Ekle butonu */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">Alacak Kalemleri ({alacakDetay.length})</h4>
        <button
          type="button"
          onClick={() => { setFormAcik(!formAcik); setDuzenleId(null); setForm(BOS_KALEM_FORM); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            formAcik ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gold border border-gold/30 hover:bg-gold-dim'
          }`}
        >
          {formAcik ? '✕ Kapat' : '+ Kalem Ekle'}
        </button>
      </div>

      {/* Ekleme / Düzenleme Formu */}
      {formAcik && (
        <div className="bg-surface2/50 border border-gold/20 rounded-lg p-4 space-y-3">
          <h5 className="text-xs font-semibold text-gold">{duzenleId ? 'Kalemi Düzenle' : 'Yeni Alacak Kalemi'}</h5>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Alacak Kalemi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Alacak Kalemi</label>
              <div className="flex gap-1">
                <FormSelect value={form.kalemTuru} onChange={(e) => {
                  const v = e.target.value as AlacakKalemi['kalemTuru'];
                  setForm({ ...form, kalemTuru: v });
                  if (v === 'diger') setDigerKalemAciklama('');
                }} className="flex-1">
                  {tumKalemTurleri.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </FormSelect>
                <button
                  type="button"
                  onClick={() => setKalemTuruEkleAcik(!kalemTuruEkleAcik)}
                  className="flex-shrink-0 w-8 h-10 flex items-center justify-center rounded-lg border border-gold/30 text-gold hover:bg-gold-dim transition-colors text-sm"
                  title="Yeni kalem türü ekle"
                >
                  +
                </button>
              </div>
              {kalemTuruEkleAcik && (
                <div className="mt-2 flex gap-2">
                  <FormInput
                    value={yeniKalemTuru}
                    onChange={(e) => setYeniKalemTuru(e.target.value)}
                    placeholder="Yeni kalem türü..."
                    className="flex-1 !h-8 !text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleYeniKalemTuruEkle(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleYeniKalemTuruEkle}
                    disabled={!yeniKalemTuru.trim() || ozelKalemKaydet.isPending}
                    className="px-3 h-8 rounded-lg text-[11px] font-semibold bg-gold text-bg disabled:opacity-50 transition-colors"
                  >
                    {ozelKalemKaydet.isPending ? '...' : 'Ekle'}
                  </button>
                </div>
              )}
              {form.kalemTuru === 'diger' && (
                <FormInput
                  value={digerKalemAciklama}
                  onChange={(e) => { setDigerKalemAciklama(e.target.value); setForm((prev) => ({ ...prev, aciklama: e.target.value })); }}
                  placeholder="Kalem açıklaması yazın..."
                  className="mt-2 !h-8 !text-xs"
                />
              )}
            </div>
            {/* Açıklama */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Açıklama</label>
              <FormInput value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="Ör: Kira - Ocak 2025" />
            </div>
            {/* Asıl Tutar + Para Birimi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Asıl Alacak Tutarı *</label>
              <div className="flex gap-1.5">
                <FormInput type="number" step="0.01" min="0" value={form.asilTutar}
                  onChange={(e) => setForm({ ...form, asilTutar: e.target.value })} className="flex-1" />
                <FormSelect value={form.paraBirimi} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })} className="!w-20">
                  {PARA_BIRIMLERI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </FormSelect>
              </div>
            </div>
            {/* Vade / Temerrüt Tarihi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Vade / Temerrüt Tarihi *</label>
              <FormInput type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })} />
            </div>
            {/* İşlemiş Faiz (takip öncesi) */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Takip Öncesi İşlemiş Faiz (₺)</label>
              <FormInput type="number" step="0.01" min="0" value={form.islemiFaiz}
                onChange={(e) => setForm({ ...form, islemiFaiz: e.target.value })} placeholder="0.00" />
            </div>
            {/* Takip Sonrası Faiz Türü */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Takip Sonrası Faiz Türü</label>
              <FormSelect value={form.faizTuru} onChange={(e) => setForm({ ...form, faizTuru: e.target.value as FaizTuru })}>
                {Object.entries(faizTurleriGruplu()).map(([kat, turler]) => (
                  <optgroup key={kat} label={kat}>
                    {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </optgroup>
                ))}
              </FormSelect>
              {/* Güncel faiz oranı göstergesi */}
              {form.faizTuru && form.faizTuru !== 'yok' && form.faizTuru !== 'sozlesmeli' && form.faizTuru !== 'diger' && (() => {
                const oranlar = FAIZ_ORAN_DB[form.faizTuru];
                if (!oranlar?.length) return null;
                const guncel = oranlar[oranlar.length - 1];
                return guncel ? (
                  <div className="text-[10px] text-gold mt-1">Guncel oran: %{guncel.o}</div>
                ) : null;
              })()}
            </div>
            {/* Özel Faiz Oranı (sözleşmeli) */}
            {(form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Yıllık Faiz Oranı (%)</label>
                <FormInput type="number" step="0.01" min="0" value={form.ozelFaizOrani}
                  onChange={(e) => setForm({ ...form, ozelFaizOrani: e.target.value })} />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <BtnGold onClick={handleKaydet} disabled={!form.asilTutar || !form.vadeTarihi}>
              {duzenleId ? 'Güncelle' : 'Ekle'}
            </BtnGold>
            <BtnOutline onClick={() => { setFormAcik(false); setDuzenleId(null); setForm(BOS_KALEM_FORM); }}>
              İptal
            </BtnOutline>
          </div>
        </div>
      )}

      {/* Kalem Listesi */}
      {alacakDetay.length === 0 ? (
        <div className="text-center py-6 bg-surface border border-border rounded-lg">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-xs text-text-muted">Henüz alacak kalemi eklenmemiş</div>
          <div className="text-[10px] text-text-dim mt-1">Her kalem için ayrı faiz türü ve işlemiş faiz tanımlayabilirsiniz</div>
          {!formAcik && (
            <button type="button" onClick={() => setFormAcik(true)}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors">
              + İlk Kalemi Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Kalem</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Vade</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Faiz Türü</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Asıl Alacak</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşlemiş Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşleyen Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Toplam</th>
                <th className="px-2 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {alacakDetay.map((k) => {
                const isleyenFaiz = hesaplaKalemFaiz(k, bugun, undefined, undefined, takipTarihi || undefined);
                const islemiFaiz = k.islemiFaiz || 0;
                const toplam = k.asilTutar + islemiFaiz + isleyenFaiz;
                const faizGrup = faizTurleriGruplu();
                const faizAd = Object.values(faizGrup).flat().find((f) => f.id === k.faizTuru)?.ad || k.faizTuru;
                return (
                  <tr key={k.id} className="border-b border-border/50 hover:bg-surface2 transition-colors group">
                    <td className="px-3 py-2">
                      <div className="text-text font-medium">{k.aciklama}</div>
                      <div className="text-[10px] text-text-dim">{tumKalemTurleri.find((kt) => kt.value === k.kalemTuru)?.label || k.kalemTuru}</div>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{k.vadeTarihi}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 border border-border text-text-muted truncate block max-w-[120px]">
                        {faizAd}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-text">{fmt(k.asilTutar, k.paraBirimi)}</td>
                    <td className="px-3 py-2 text-right text-orange-400">{islemiFaiz > 0 ? fmt(islemiFaiz) : '—'}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{isleyenFaiz > 0 ? fmt(isleyenFaiz) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-text">{fmt(toplam)}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => handleDuzenle(k)} className="text-[10px] text-gold hover:underline">Düzenle</button>
                        <button type="button" onClick={() => handleSil(k.id)} className="text-[10px] text-red hover:underline">Sil</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface2 font-bold">
                <td colSpan={3} className="px-3 py-2 text-text-muted text-right">TOPLAM:</td>
                <td className="px-3 py-2 text-right text-text">{fmt(toplamAsil)}</td>
                <td className="px-3 py-2 text-right text-orange-400">{fmt(toplamIslemiFaiz)}</td>
                <td className="px-3 py-2 text-right text-orange-300">{fmt(toplamIsleyenFaiz)}</td>
                <td className="px-3 py-2 text-right text-gold text-sm">{fmt(toplamAsil + toplamIslemiFaiz + toplamIsleyenFaiz)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Ek masraflar (legacy uyumluluk) */}
      <div className="border-t border-border/50 pt-4">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Ek Masraflar</div>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Vekalet Ücreti (₺)">
            <FormInput type="number" step="0.01" value={(alacakKalemleri as Record<string, number | undefined>)?.vekaletUcreti || ''}
              onChange={(e) => onLegacyChange({ ...(alacakKalemleri || {}), vekaletUcreti: Number(e.target.value) || undefined })}
              placeholder="0" />
          </FormGroup>
          <FormGroup label="Diğer Masraflar (₺)">
            <FormInput type="number" step="0.01" value={(alacakKalemleri as Record<string, number | undefined>)?.digerMasraflar || ''}
              onChange={(e) => onLegacyChange({ ...(alacakKalemleri || {}), digerMasraflar: Number(e.target.value) || undefined })}
              placeholder="0" />
          </FormGroup>
        </div>
      </div>
    </div>
  );
}
