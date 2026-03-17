'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useDavalar, useDavaKaydet, type Dava } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useMahkemeHafizasi } from '@/lib/hooks/useMahkemeHafizasi';
import { useOzelDavaKonulari, useOzelDavaKonusuKaydet } from '@/lib/hooks/useOzelDavaKonulari';
import { CokluRehberSecici, type SeciliKisi } from '@/components/ui/CokluRehberSecici';
import { DAVA_KONULARI } from '@/lib/constants/davaKonulari';
import { ADLIYELER } from '@/lib/constants/adliyeler';
import {
  DAVA_DURUMLARI, DAVA_ASAMALARI,
  DAVA_TARAF, KAPANIS_SEBEPLERI_DAVA, DURUSMA_SAATLERI, ILLER,
  YARGI_TURLERI, YARGI_BIRIMLERI,
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
  durum: 'Derdest',
  tarih: new Date().toISOString().split('T')[0],
  durusma: '',
  durusmaSaati: '',
  deger: 0,
  karsi: '',
  karsiId: '',
  karsav: '',
  karsavId: '',
  muvekkilTaraflar: [],
  karsiTaraflar: [],
  vekiller: [],
  iliskiliIcraId: '',
  kapanisSebebi: '',
  kapanisTarih: '',
  not: '',
};

type Adim = 1 | 2 | 3;
const ADIM_BASLIKLAR: Record<Adim, string> = {
  1: 'Dava & Taraflar',
  2: 'Mahkeme Bilgileri',
  3: 'Bağlantı & Notlar',
};

export function DavaModal({ open, onClose, dava, onCreated }: DavaModalProps) {
  const [form, setForm] = useState<Partial<Dava>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Dava>>({ ...bos });
  const [hata, setHata] = useState('');
  const [adim, setAdim] = useState<Adim>(1);
  const [yargiTuru, setYargiTuru] = useState<string>('');
  const { data: mevcutlar } = useDavalar();
  const { data: icralar } = useIcralar();
  const kaydet = useDavaKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { mahkemeler, kullanılanIller } = useMahkemeHafizasi();
  const { data: ozelKonular } = useOzelDavaKonulari();
  const ozelKonuKaydet = useOzelDavaKonusuKaydet();

  // Özel dava konusu oluşturma state
  const [ozelKonuOpen, setOzelKonuOpen] = useState(false);
  const [ozelKonuAd, setOzelKonuAd] = useState('');

  // Dava konusu arama
  const [konuArama, setKonuArama] = useState('');
  const [konuDropOpen, setKonuDropOpen] = useState(false);
  const konuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let init: Partial<Dava>;
    if (dava) {
      init = { ...dava };
      // Legacy → çoklu taraf migrasyonu
      if (!init.muvekkilTaraflar?.length && init.muvId) {
        const muv = muvekkillar?.find((m) => m.id === init.muvId);
        if (muv) init.muvekkilTaraflar = [{ id: muv.id, ad: [muv.ad, muv.soyad].filter(Boolean).join(' ') }];
      }
      if (!init.karsiTaraflar?.length && (init.karsiId || init.karsi)) {
        init.karsiTaraflar = [{ id: init.karsiId || '', ad: (init.karsi as string) || '' }];
      }
      // Legacy vekiller → karşı tarafların vekil alanına migrate et
      if (init.karsiTaraflar?.length && !init.karsiTaraflar.some((kt) => kt.vekiller?.length)) {
        // Eski vekiller dizisi varsa veya legacy karsav alanı varsa
        const legacyVekiller: SeciliKisi[] = init.vekiller?.length
          ? (init.vekiller as SeciliKisi[])
          : (init.karsavId || init.karsav)
          ? [{ id: init.karsavId || '', ad: (init.karsav as string) || '' }]
          : [];
        if (legacyVekiller.length && init.karsiTaraflar.length) {
          // İlk karşı tarafa ata (legacy'de tek vekil listesi vardı)
          init.karsiTaraflar = init.karsiTaraflar.map((kt, i) =>
            i === 0 ? { ...kt, vekiller: legacyVekiller } : kt
          );
        }
      }
      if (!init.muvekkilTaraflar) init.muvekkilTaraflar = [];
      if (!init.karsiTaraflar) init.karsiTaraflar = [];
      if (!init.vekiller) init.vekiller = [];
      // Yargı türünü mtur'dan türet
      const bulunanTur = Object.entries(YARGI_BIRIMLERI).find(([, birimler]) =>
        birimler.some((b) => b === dava.mtur)
      );
      setYargiTuru(bulunanTur ? bulunanTur[0] : '');
    } else {
      const maxNo = Math.max(0, ...(mevcutlar || []).map((d) => d.kayitNo || 0));
      init = { ...bos, id: crypto.randomUUID(), sira: Date.now(), kayitNo: maxNo + 1 };
      setYargiTuru('');
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setAdim(1);
    setKonuArama('');
    setKonuDropOpen(false);
    setOzelKonuOpen(false);
  }, [dava, open]);

  const draftKey = `dava_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Yargı türüne bağlı birimler
  const mevcutBirimler = useMemo(() => yargiTuru ? (YARGI_BIRIMLERI[yargiTuru] || []) : [], [yargiTuru]);

  // Seçili yargı birimine bağlı dava konuları
  const mevcutDavaKonulari = useMemo(() => {
    if (!form.mtur) return [];
    const standart = DAVA_KONULARI[form.mtur] || [];
    const ozel = (ozelKonular || [])
      .filter((ok) => ok.yargiBirimi === form.mtur)
      .map((ok) => ok.konu);
    // Birleştir, sırala
    const hepsi = [...new Set([...standart, ...ozel])];
    hepsi.sort((a, b) => a.localeCompare(b, 'tr'));
    return hepsi;
  }, [form.mtur, ozelKonular]);

  // Dava konusu filtreleme
  const filtreliKonular = useMemo(() => {
    if (!konuArama.trim()) return mevcutDavaKonulari;
    const q = konuArama.toLocaleLowerCase('tr');
    return mevcutDavaKonulari.filter((k) => k.toLocaleLowerCase('tr').includes(q));
  }, [mevcutDavaKonulari, konuArama]);

  // Mahkeme tam adı önizleme
  const mahkemeTamAd = useMemo(() =>
    tamMahkemeAdi(form.il, form.mno, form.mtur, form.adliye),
    [form.il, form.mno, form.mtur, form.adliye]
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

  // Seçilen ile göre adliyeler (ADLIYELER veritabanından)
  const ilAdliyeleri = useMemo(() => {
    if (!form.il) return [];
    return ADLIYELER[form.il] || [];
  }, [form.il]);

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

  // Konusu dışarı tıklamada kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (konuWrapRef.current && !konuWrapRef.current.contains(e.target as Node)) {
        setKonuDropOpen(false);
      }
    }
    if (konuDropOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [konuDropOpen]);

  // Özel dava konusu kaydet
  async function handleOzelKonuKaydet() {
    if (!ozelKonuAd.trim() || !form.mtur) return;
    try {
      await ozelKonuKaydet.mutateAsync({ yargiBirimi: form.mtur, konu: ozelKonuAd.trim() });
      handleChange('konu', ozelKonuAd.trim());
      // davaTuru'ya da aynı değeri set et (geriye uyum)
      handleChange('davaTuru', ozelKonuAd.trim());
      setOzelKonuOpen(false);
      setOzelKonuAd('');
      setKonuDropOpen(false);
    } catch { /* ignore */ }
  }

  // ── Adım 1 doğrulama ──
  function adim1Dogrula(): boolean {
    if (!form.mtur) { setHata('Yargı birimi seçmelisiniz.'); return false; }
    if (!form.konu?.trim()) { setHata('Dava konusu zorunludur.'); return false; }
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
    // Çoklu taraflardan legacy alanlara sync (geriye uyumluluk)
    const syncForm = { ...form };
    if (syncForm.muvekkilTaraflar?.length) {
      syncForm.muvId = syncForm.muvekkilTaraflar[0].id;
    }
    if (syncForm.karsiTaraflar?.length) {
      syncForm.karsiId = syncForm.karsiTaraflar[0].id;
      syncForm.karsi = syncForm.karsiTaraflar[0].ad;
    } else {
      syncForm.karsiId = '';
      syncForm.karsi = '';
    }
    // Karşı taraf vekillerini legacy alana sync (ilk karşı tarafın ilk vekili)
    const ilkKarsiVekil = syncForm.karsiTaraflar?.find((kt) => kt.vekiller?.length)?.vekiller?.[0];
    if (ilkKarsiVekil) {
      syncForm.karsavId = ilkKarsiVekil.id;
      syncForm.karsav = ilkKarsiVekil.ad;
    } else {
      syncForm.karsavId = '';
      syncForm.karsav = '';
    }
    // Legacy vekiller dizisini karşı taraf vekillerinden oluştur (geriye uyum)
    syncForm.vekiller = (syncForm.karsiTaraflar || []).flatMap((kt) => kt.vekiller || []);
    // davaTuru'yu konu ile senkronize et (geriye uyum)
    if (!syncForm.davaTuru && syncForm.konu) {
      syncForm.davaTuru = syncForm.konu;
    }
    try {
      await kaydet.mutateAsync(syncForm as Dava);
      onCreated?.(form as Dava);
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
      title={dava ? 'Dava Düzenle' : 'Yeni Dava'}
      maxWidth="max-w-3xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Dava>); clearDraft(); }}
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
        {/* ADIM İNDİKATÖRÜ */}
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
           ADIM 1: DAVA & TARAFLAR
           ═══════════════════════════════════════════════════ */}
        {adim === 1 && (
          <>
            {/* Yargı Türü → Yargı Birimi → Dava Konusu */}
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Yargı Türü" required>
                <FormSelect value={yargiTuru} onChange={(e) => { setYargiTuru(e.target.value); handleChange('mtur', ''); handleChange('konu', ''); handleChange('davaTuru', ''); }}>
                  <option value="">Seçiniz</option>
                  {YARGI_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Yargı Birimi" required>
                <FormSelect value={form.mtur || ''} onChange={(e) => { handleChange('mtur', e.target.value); handleChange('konu', ''); handleChange('davaTuru', ''); }} disabled={!yargiTuru}>
                  <option value="">Seçiniz</option>
                  {mevcutBirimler.map((b) => <option key={b} value={b}>{b}</option>)}
                </FormSelect>
              </FormGroup>
            </div>

            {/* Dava Konusu — aranabilir dropdown */}
            <FormGroup label="Dava Konusu" required>
              <div ref={konuWrapRef} className="relative">
                <input
                  type="text"
                  value={konuDropOpen ? konuArama : (form.konu || '')}
                  onChange={(e) => { setKonuArama(e.target.value); if (!konuDropOpen) setKonuDropOpen(true); }}
                  onFocus={() => { setKonuDropOpen(true); setKonuArama(form.konu || ''); }}
                  placeholder={form.mtur ? 'Dava konusu ara...' : 'Önce yargı birimi seçin'}
                  disabled={!form.mtur}
                  className="w-full h-9 px-3 rounded-lg bg-surface2 border border-border text-xs text-text
                    focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50
                    placeholder:text-text-dim disabled:opacity-50"
                />
                {konuDropOpen && form.mtur && (
                  <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filtreliKonular.length > 0 ? (
                      filtreliKonular.map((konu) => (
                        <button
                          key={konu}
                          type="button"
                          onClick={() => {
                            handleChange('konu', konu);
                            handleChange('davaTuru', konu);
                            setKonuDropOpen(false);
                            setKonuArama('');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gold-dim transition-colors border-b border-border/30 last:border-b-0 ${
                            form.konu === konu ? 'bg-gold/10 text-gold font-semibold' : 'text-text'
                          }`}
                        >
                          {konu}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-xs text-text-muted text-center">
                        Eşleşen konu bulunamadı
                      </div>
                    )}

                    {/* Serbest metin olarak kullan */}
                    {konuArama.trim() && !mevcutDavaKonulari.some((k) => k.toLocaleLowerCase('tr') === konuArama.toLocaleLowerCase('tr')) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('konu', konuArama.trim());
                          handleChange('davaTuru', konuArama.trim());
                          setKonuDropOpen(false);
                          setKonuArama('');
                        }}
                        className="w-full text-left px-3 py-2.5 text-text-muted hover:bg-surface2 transition-colors border-t border-border"
                      >
                        <span className="text-xs">&quot;{konuArama}&quot; olarak kullan</span>
                      </button>
                    )}

                    {/* Yeni dava konusu oluştur */}
                    <button
                      type="button"
                      onClick={() => { setOzelKonuOpen(true); setOzelKonuAd(konuArama); setKonuDropOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-gold hover:bg-gold-dim transition-colors border-t border-border flex items-center gap-2"
                    >
                      <span className="text-sm">+</span>
                      <span className="text-xs font-semibold">Yeni Dava Konusu Oluştur</span>
                    </button>
                  </div>
                )}
              </div>
            </FormGroup>

            {/* Özel dava konusu oluşturma formu */}
            {ozelKonuOpen && (
              <div className="p-3 bg-surface2/50 rounded-xl border border-gold/30 space-y-3">
                <div className="text-[11px] font-semibold text-gold uppercase tracking-wider">Yeni Dava Konusu Oluştur</div>
                <FormGroup label="Konu Adı" required>
                  <FormInput
                    value={ozelKonuAd}
                    onChange={(e) => setOzelKonuAd(e.target.value)}
                    placeholder="Ör: Özel dava konusu"
                  />
                </FormGroup>
                <div className="text-[10px] text-text-dim">
                  Bu konu &quot;{form.mtur}&quot; yargı birimi altına eklenecektir. Yalnızca sizin büronuzda görünür.
                </div>
                <div className="flex gap-2 justify-end">
                  <BtnOutline onClick={() => { setOzelKonuOpen(false); setOzelKonuAd(''); }}>İptal</BtnOutline>
                  <BtnGold onClick={handleOzelKonuKaydet} disabled={!ozelKonuAd.trim() || ozelKonuKaydet.isPending}>
                    {ozelKonuKaydet.isPending ? 'Kaydediliyor...' : 'Oluştur'}
                  </BtnGold>
                </div>
              </div>
            )}

            <FormGroup label="Müvekkilin Tarafı">
              <FormSelect value={form.taraf || ''} onChange={(e) => handleChange('taraf', e.target.value)}>
                {DAVA_TARAF.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </FormSelect>
            </FormGroup>

            {/* Müvekkiller (vekil = bizim tarafın avukatları) */}
            <CokluRehberSecici
              tip="muvekkil"
              label="Müvekkiller"
              ekleMetni="Müvekkil Ekle"
              value={(form.muvekkilTaraflar as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, muvekkilTaraflar: v }))}
              vekilEklenebilir
            />

            {/* Karşı Taraflar (her birine ayrı vekil atanabilir) */}
            <CokluRehberSecici
              tip="karsiTaraf"
              label="Karşı Taraflar"
              ekleMetni="Karşı Taraf Ekle"
              value={(form.karsiTaraflar as SeciliKisi[]) || []}
              onChange={(v) => setForm((prev) => ({ ...prev, karsiTaraflar: v }))}
              vekilEklenebilir
            />

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
           ADIM 2: MAHKEME BİLGİLERİ
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
              <div className="grid grid-cols-2 gap-4">
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
                      <option key={a.ad} value={a.ad} title={a.mulhakat ? `${a.mulhakat} mülhakatı` : ''}>
                        {a.ad}{a.mulhakat ? ` (${a.mulhakat})` : ''}
                      </option>
                    ))}
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
