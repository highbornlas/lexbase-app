'use client';

import { useState, useEffect, useMemo } from 'react';
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

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Temel Bilgiler',
  2: 'Daire & Tarihler',
  3: 'Bağlantı & Notlar',
};

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
  }

  function geri() {
    setHata('');
    if (adim === 2) setAdim(1);
    else if (adim === 3) setAdim(2);
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

            {/* Müvekkiller — çoklu seçim + vekil atama */}
            <CokluRehberSecici
              tip="muvekkil"
              label="Müvekkiller"
              ekleMetni="Müvekkil Ekle"
              value={(form.muvekkilTaraflar as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, muvekkilTaraflar: v }))}
              vekilEklenebilir
            />

            {/* Borçlular — karşı taraf rehberinden çoklu seçim + vekil atama */}
            <CokluRehberSecici
              tip="karsiTaraf"
              label="Borçlular"
              ekleMetni="Borçlu Ekle"
              value={(form.borclular as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, borclular: v }))}
              vekilEklenebilir
            />

            {/* Borçlu detay bilgileri (temel) */}
            <div className="border-t border-border/50 pt-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Borclu Detay</div>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="TC / VKN">
                  <FormInput value={(form.borcluDetay as Record<string, string | undefined>)?.tcVkn || ''} onChange={(e) => setForm((prev) => ({ ...prev, borcluDetay: { ...prev.borcluDetay, tcVkn: e.target.value } }))} placeholder="TC Kimlik No veya VKN" />
                </FormGroup>
                <FormGroup label="Borclu Adresi">
                  <FormInput value={(form.borcluDetay as Record<string, string | undefined>)?.adres || ''} onChange={(e) => setForm((prev) => ({ ...prev, borcluDetay: { ...prev.borcluDetay, adres: e.target.value } }))} placeholder="Adres" />
                </FormGroup>
              </div>
            </div>

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

            {/* Alacak Kalemleri */}
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Alacak Kalemleri</div>
              <div className="grid grid-cols-3 gap-3">
                <FormGroup label="Asil Alacak (TL)">
                  <FormInput type="number" value={(form.alacakKalemleri as Record<string, number | undefined>)?.asilAlacak || ''} onChange={(e) => setForm((prev) => ({ ...prev, alacakKalemleri: { ...prev.alacakKalemleri, asilAlacak: Number(e.target.value) || undefined } }))} placeholder="0" />
                </FormGroup>
                <FormGroup label="Islemis Faiz (TL)">
                  <FormInput type="number" value={(form.alacakKalemleri as Record<string, number | undefined>)?.islemisiFaiz || ''} onChange={(e) => setForm((prev) => ({ ...prev, alacakKalemleri: { ...prev.alacakKalemleri, islemisiFaiz: Number(e.target.value) || undefined } }))} placeholder="0" />
                </FormGroup>
                <FormGroup label="Vekalet Ucreti (TL)">
                  <FormInput type="number" value={(form.alacakKalemleri as Record<string, number | undefined>)?.vekaletUcreti || ''} onChange={(e) => setForm((prev) => ({ ...prev, alacakKalemleri: { ...prev.alacakKalemleri, vekaletUcreti: Number(e.target.value) || undefined } }))} placeholder="0" />
                </FormGroup>
              </div>
            </div>

            {/* Karşı Taraflar — çoklu seçim + vekil atama */}
            <CokluRehberSecici
              tip="karsiTaraf"
              label="Karşı Taraflar"
              ekleMetni="Karşı Taraf Ekle"
              value={(form.karsiTaraflar as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, karsiTaraflar: v }))}
              vekilEklenebilir
            />
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
                      const mAd = tamMahkemeAdi(dava.il, dava.mno, dava.mtur, dava.adliye);
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
