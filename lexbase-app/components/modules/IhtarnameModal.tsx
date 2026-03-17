'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useIhtarnameKaydet, useIhtarnameler, type Ihtarname } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useEtkinlikKaydet } from '@/lib/hooks/useEtkinlikler';
import { useKarsiTaraflar, useKarsiTarafKaydet } from '@/lib/hooks/useKarsiTaraflar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { fmt } from '@/lib/utils';
import { bruttenNete } from '@/lib/hooks/useGelirHesapla';

interface IhtarnameModalProps {
  open: boolean;
  onClose: () => void;
  ihtarname?: Ihtarname | null;
}

const bos: Partial<Ihtarname> = {
  muvId: '',
  konu: '',
  tur: 'İhtar',
  yon: 'giden',
  durum: 'Taslak',
  gonderen: '',
  alici: '',
  aliciAdres: '',
  noterAd: '',
  noterNo: '',
  tarih: new Date().toISOString().split('T')[0],
  gonderimTarih: '',
  ucret: 0,
  noterMasrafi: 0,
  tebligDurum: 'Gönderilmedi',
  tebligTarih: '',
  cevapSuresi: 0,
  pttBarkod: '',
  icerik: '',
  cevapTarih: '',
  cevapOzet: '',
  iliskiliDosyaTip: '',
  iliskiliDosyaId: '',
};

export function IhtarnameModal({ open, onClose, ihtarname }: IhtarnameModalProps) {
  const [form, setForm] = useState<Partial<Ihtarname>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Ihtarname>>({ ...bos });
  const [hata, setHata] = useState('');
  const [pttLoading, setPttLoading] = useState(false);
  const [pttSonuc, setPttSonuc] = useState('');
  const [yeniKarsiTarafAd, setYeniKarsiTarafAd] = useState('');
  const [yeniKarsiTarafGoster, setYeniKarsiTarafGoster] = useState(false);
  const kaydet = useIhtarnameKaydet();
  const etkinlikKaydet = useEtkinlikKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: tumIhtarnameler } = useIhtarnameler();
  const karsiTarafKaydet = useKarsiTarafKaydet();

  /* ── Otomatik numaralama ── */
  const sonrakiNo = useMemo(() => {
    if (!tumIhtarnameler) return 'İHT-2026/001';
    const yil = new Date().getFullYear();
    const prefix = `İHT-${yil}/`;
    const mevcutNolar = tumIhtarnameler
      .filter((i) => !i._silindi && i.no?.startsWith(prefix))
      .map((i) => {
        const sayi = parseInt(i.no!.replace(prefix, ''), 10);
        return isNaN(sayi) ? 0 : sayi;
      });
    const enBuyuk = mevcutNolar.length > 0 ? Math.max(...mevcutNolar) : 0;
    return `${prefix}${String(enBuyuk + 1).padStart(3, '0')}`;
  }, [tumIhtarnameler]);

  /* ── Adres otomatik doldurma için karşı taraf haritası ── */
  const karsiAdresMap = useMemo(() => {
    const map: Record<string, string> = {};
    karsiTaraflar?.forEach((k) => {
      const ad = (k.ad as string) || '';
      const adresRaw = k.adres;
      const adres = typeof adresRaw === 'string' ? adresRaw : (adresRaw as Record<string, string> | undefined)?.tam || '';
      if (ad && adres) map[ad] = adres;
    });
    muvekkillar?.forEach((m) => {
      const adresRaw = m.adres;
      const adres = typeof adresRaw === 'string' ? adresRaw : '';
      if (m.ad && adres) map[m.ad] = adres;
    });
    return map;
  }, [karsiTaraflar, muvekkillar]);

  /* ── Seçili müvekkil adı ── */
  const seciliMuvAd = useMemo(() => {
    if (!form.muvId || !muvekkillar) return '';
    return muvekkillar.find((m) => m.id === form.muvId)?.ad || '';
  }, [form.muvId, muvekkillar]);

  /* ── Yön değişince gönderen/alıcı otomatik doldur ── */
  function handleYonDegistir(yeniYon: string) {
    setForm((prev) => {
      const next = { ...prev, yon: yeniYon };
      const muvAd = seciliMuvAd || prev.gonderen || prev.alici || '';

      if (yeniYon === 'giden') {
        // Giden: müvekkil → gönderen
        if (muvAd && !prev.gonderen) next.gonderen = muvAd;
      } else {
        // Gelen: müvekkil → alıcı
        if (muvAd && !prev.alici) next.alici = muvAd;
      }
      return next;
    });
  }

  /* ── Müvekkil değişince gönderen/alıcı otomatik doldur ── */
  function handleMuvDegistir(muvId: string) {
    const muvAd = muvekkillar?.find((m) => m.id === muvId)?.ad || '';
    setForm((prev) => {
      const next = { ...prev, muvId };
      if (muvAd) {
        if ((prev.yon || 'giden') === 'giden') {
          next.gonderen = muvAd;
        } else {
          next.alici = muvAd;
          if (karsiAdresMap[muvAd]) {
            next.aliciAdres = karsiAdresMap[muvAd];
          }
        }
      }
      return next;
    });
  }

  /* ── Karşı taraf seçilince ── */
  function handleKarsiTarafSec(karsiTarafId: string) {
    if (karsiTarafId === '__yeni__') {
      setYeniKarsiTarafGoster(true);
      return;
    }
    const kt = karsiTaraflar?.find((k) => k.id === karsiTarafId);
    if (!kt) return;
    const ktAd = kt.ad || '';
    const adresRaw = kt.adres;
    const adres = typeof adresRaw === 'string' ? adresRaw : (adresRaw as Record<string, string> | undefined)?.tam || '';

    setForm((prev) => {
      const yon = prev.yon || 'giden';
      if (yon === 'giden') {
        // Giden: karşı taraf = alıcı
        return { ...prev, alici: ktAd, aliciAdres: adres || prev.aliciAdres || '' };
      } else {
        // Gelen: karşı taraf = gönderen
        return { ...prev, gonderen: ktAd };
      }
    });
  }

  /* ── Yeni karşı taraf kaydet ── */
  async function handleYeniKarsiTarafKaydet() {
    if (!yeniKarsiTarafAd.trim()) return;
    const yeniKt = {
      id: crypto.randomUUID(),
      ad: yeniKarsiTarafAd.trim(),
      tip: 'gercek' as const,
    };
    await karsiTarafKaydet.mutateAsync(yeniKt);

    // Otomatik seç
    setForm((prev) => {
      const yon = prev.yon || 'giden';
      if (yon === 'giden') {
        return { ...prev, alici: yeniKt.ad };
      } else {
        return { ...prev, gonderen: yeniKt.ad };
      }
    });
    setYeniKarsiTarafAd('');
    setYeniKarsiTarafGoster(false);
  }

  useEffect(() => {
    let init: Partial<Ihtarname>;
    if (ihtarname) {
      init = { ...ihtarname };
    } else {
      init = { ...bos, id: crypto.randomUUID(), no: sonrakiNo };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setPttSonuc('');
    setYeniKarsiTarafGoster(false);
    setYeniKarsiTarafAd('');
  }, [ihtarname, open, sonrakiNo]);

  const draftKey = `ihtarname_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Alıcı değiştiğinde adres otomatik doldur
      if (field === 'alici' && typeof value === 'string' && karsiAdresMap[value]) {
        next.aliciAdres = karsiAdresMap[value];
      }
      return next;
    });
  }

  /* ── Süre sonu hesaplama ── */
  const hesaplananSureSonu = useMemo(() => {
    if (!form.tebligTarih || !form.cevapSuresi || form.cevapSuresi <= 0) return '';
    const tarih = new Date(form.tebligTarih);
    tarih.setDate(tarih.getDate() + form.cevapSuresi);
    return tarih.toISOString().split('T')[0];
  }, [form.tebligTarih, form.cevapSuresi]);

  /* ── İlişkili dosya listesi (müvekkile göre filtreli) ── */
  const iliskiliDavalar = useMemo(() => {
    if (!davalar) return [];
    if (form.muvId) return davalar.filter((d) => d.muvId === form.muvId && !d._silindi && !d._arsivlendi);
    return davalar.filter((d) => !d._silindi && !d._arsivlendi);
  }, [davalar, form.muvId]);

  const iliskiliIcralar = useMemo(() => {
    if (!icralar) return [];
    if (form.muvId) return icralar.filter((i) => i.muvId === form.muvId && !i._silindi && !i._arsivlendi);
    return icralar.filter((i) => !i._silindi && !i._arsivlendi);
  }, [icralar, form.muvId]);

  /* ── Karşı taraf label'ı (yöne göre) ── */
  const karsiTarafLabel = (form.yon || 'giden') === 'giden' ? 'Alıcı (Karşı Taraf)' : 'Gönderen (Karşı Taraf)';
  const muvTarafLabel = (form.yon || 'giden') === 'giden' ? 'Gönderen (Müvekkil)' : 'Alıcı (Müvekkil)';
  const muvTarafValue = (form.yon || 'giden') === 'giden' ? form.gonderen : form.alici;

  /* ── PTT Barkod Sorgulama ── */
  async function handlePttSorgula() {
    if (!form.pttBarkod?.trim()) {
      setPttSonuc('Lütfen barkod numarası giriniz.');
      return;
    }
    setPttLoading(true);
    setPttSonuc('');
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: form.pttBarkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc(`${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}`);
        if (data.tebligDurum) {
          setForm((prev) => ({
            ...prev,
            tebligDurum: data.tebligDurum,
            ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
            pttSonSorgu: new Date().toISOString(),
            pttSonuc: data.durum,
          }));
        }
      } else {
        setPttSonuc('Otomatik sorgu başarısız. PTT sitesi açılıyor...');
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${form.pttBarkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc('Bağlantı hatası. PTT sitesi açılıyor...');
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${form.pttBarkod!.trim()}`, '_blank');
    } finally {
      setPttLoading(false);
    }
  }

  /* ── Kaydet + Takvim Entegrasyonu ── */
  async function handleSubmit() {
    if (!form.konu?.trim()) {
      setHata('Konu zorunludur.');
      return;
    }
    setHata('');

    const sureSonu = hesaplananSureSonu;
    const kayitForm = { ...form, sureSonu } as Ihtarname;

    try {
      await kaydet.mutateAsync(kayitForm);

      // Takvim entegrasyonu
      if (sureSonu && form.cevapSuresi && form.cevapSuresi > 0) {
        await etkinlikKaydet.mutateAsync({
          id: crypto.randomUUID(),
          baslik: `⚠️ ${form.konu} - Cevap Süresi Doluyor`,
          tarih: sureSonu,
          saat: '09:00',
          tur: 'Son Gün',
          muvId: form.muvId || '',
          not: `İhtarname cevap süresi son günü. No: ${form.no || '—'}, Alıcı: ${form.alici || '—'}`,
          hatirlatma: '1gun',
        });
      }

      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  /* ── Cevap bölümü gösterilecek mi? ── */
  const cevapGosterilecek = form.durum === 'Cevap Geldi' || form.durum === 'Sonuçlandı';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ihtarname ? 'İhtarname Düzenle' : 'Yeni İhtarname'}
      maxWidth="max-w-3xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Ihtarname>); clearDraft(); }}
      onDiscardDraft={clearDraft}
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
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}

        {/* ── Temel Bilgiler ── */}
        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="İhtarname No">
            <FormInput value={form.no || ''} onChange={(e) => handleChange('no', e.target.value)} placeholder="İHT-2026/001" />
          </FormGroup>
          <FormGroup label="İhtarname Türü">
            <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
              <option value="İhtar">İhtar</option>
              <option value="İhbarname">İhbarname</option>
              <option value="Fesih İhtarı">Fesih İhtarı</option>
              <option value="Ödeme İhtarı">Ödeme İhtarı</option>
              <option value="Tahliye İhtarı">Tahliye İhtarı</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Yön">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => handleYonDegistir('giden')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  form.yon === 'giden' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
                }`}>
                📤 Giden
              </button>
              <button type="button" onClick={() => handleYonDegistir('gelen')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  form.yon === 'gelen' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
                }`}>
                📥 Gelen
              </button>
            </div>
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Müvekkil">
            <FormSelect value={form.muvId || ''} onChange={(e) => handleMuvDegistir(e.target.value)}>
              <option value="">Seçiniz</option>
              {muvekkillar?.map((m) => (
                <option key={m.id} value={m.id}>{m.ad}</option>
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Durum">
            <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
              <option value="Taslak">Taslak</option>
              <option value="Hazırlandı">Hazırlandı</option>
              <option value="Gönderildi">Gönderildi</option>
              <option value="Tebliğ Edildi">Tebliğ Edildi</option>
              <option value="Cevap Geldi">Cevap Geldi</option>
              <option value="Sonuçlandı">Sonuçlandı</option>
            </FormSelect>
          </FormGroup>
        </div>

        <FormGroup label="Konu" required>
          <FormInput value={form.konu || ''} onChange={(e) => handleChange('konu', e.target.value)} placeholder="İhtarname konusu" />
        </FormGroup>

        {/* ── Taraflar (Yöne göre akıllı form) ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>👥</span> Taraflar
            <span className="text-[10px] font-normal text-text-dim ml-auto">
              {(form.yon || 'giden') === 'giden' ? '📤 Müvekkil gönderen, karşı taraf alıcı' : '📥 Karşı taraf gönderen, müvekkil alıcı'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Müvekkil tarafı (otomatik dolan, readonly görünümlü) */}
            <FormGroup label={muvTarafLabel}>
              <FormInput
                value={(muvTarafValue as string) || ''}
                onChange={(e) => handleChange((form.yon || 'giden') === 'giden' ? 'gonderen' : 'alici', e.target.value)}
                placeholder={seciliMuvAd || 'Müvekkil seçince otomatik dolar'}
                className="bg-gold-dim/30"
              />
              {seciliMuvAd && (
                <div className="text-[10px] text-gold mt-0.5">↑ Müvekkilden otomatik</div>
              )}
            </FormGroup>

            {/* Karşı taraf seçici */}
            <FormGroup label={karsiTarafLabel}>
              <FormSelect
                value=""
                onChange={(e) => handleKarsiTarafSec(e.target.value)}
              >
                <option value="">Rehberden seç...</option>
                {karsiTaraflar?.map((k) => (
                  <option key={k.id} value={k.id}>{k.ad}{k.tc ? ` (${k.tc})` : ''}</option>
                ))}
                <option value="__yeni__">➕ Yeni Karşı Taraf Ekle</option>
              </FormSelect>
              {/* Seçilen değeri gösteren input */}
              <FormInput
                value={((form.yon || 'giden') === 'giden' ? form.alici : form.gonderen) as string || ''}
                onChange={(e) => handleChange((form.yon || 'giden') === 'giden' ? 'alici' : 'gonderen', e.target.value)}
                placeholder="veya elle yazın..."
                className="mt-1.5"
              />
            </FormGroup>
          </div>

          {/* Yeni Karşı Taraf Ekleme */}
          {yeniKarsiTarafGoster && (
            <div className="flex items-end gap-2 p-3 bg-gold-dim border border-gold/20 rounded-lg">
              <div className="flex-1">
                <label className="text-[10px] text-gold font-bold block mb-1">Yeni Karşı Taraf Adı</label>
                <input
                  value={yeniKarsiTarafAd}
                  onChange={(e) => setYeniKarsiTarafAd(e.target.value)}
                  placeholder="Ad Soyad veya Unvan"
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
                  autoFocus
                />
              </div>
              <button
                onClick={handleYeniKarsiTarafKaydet}
                disabled={!yeniKarsiTarafAd.trim() || karsiTarafKaydet.isPending}
                className="px-3 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {karsiTarafKaydet.isPending ? '...' : '✓ Kaydet & Seç'}
              </button>
              <button
                onClick={() => { setYeniKarsiTarafGoster(false); setYeniKarsiTarafAd(''); }}
                className="px-3 py-2 text-xs text-text-muted hover:text-text border border-border rounded-lg"
              >
                İptal
              </button>
            </div>
          )}
        </div>

        <FormGroup label="Alıcı Adresi">
          <FormTextarea value={form.aliciAdres || ''} onChange={(e) => handleChange('aliciAdres', e.target.value)} rows={2} placeholder="Alıcı açık adresi" />
        </FormGroup>

        {/* ── İlişkili Dosya ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>📎</span> İlişkili Dosya
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Dosya Türü">
              <FormSelect value={form.iliskiliDosyaTip || ''} onChange={(e) => { handleChange('iliskiliDosyaTip', e.target.value); handleChange('iliskiliDosyaId', ''); }}>
                <option value="">Seçiniz (opsiyonel)</option>
                <option value="dava">📁 Dava Dosyası</option>
                <option value="icra">⚡ İcra Dosyası</option>
              </FormSelect>
            </FormGroup>
            <FormGroup label="Dosya Seç">
              {form.iliskiliDosyaTip === 'dava' ? (
                <FormSelect value={form.iliskiliDosyaId || ''} onChange={(e) => handleChange('iliskiliDosyaId', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {iliskiliDavalar.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.esasNo ? `${d.esasYil || ''}/${d.esasNo}` : d.no || '—'} — {d.konu || 'Konusuz'}
                    </option>
                  ))}
                  {iliskiliDavalar.length === 0 && <option disabled>Dava dosyası bulunamadı</option>}
                </FormSelect>
              ) : form.iliskiliDosyaTip === 'icra' ? (
                <FormSelect value={form.iliskiliDosyaId || ''} onChange={(e) => handleChange('iliskiliDosyaId', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {iliskiliIcralar.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.esas || i.no || '—'} — {i.borclu || 'Borçlu Yok'}
                    </option>
                  ))}
                  {iliskiliIcralar.length === 0 && <option disabled>İcra dosyası bulunamadı</option>}
                </FormSelect>
              ) : (
                <FormSelect disabled value="">
                  <option>Önce dosya türü seçin</option>
                </FormSelect>
              )}
            </FormGroup>
          </div>
          {form.iliskiliDosyaId && (
            <div className="text-[10px] text-green flex items-center gap-1">
              ✓ Dosya bağlandı
            </div>
          )}
        </div>

        {/* ── Tarih & Noter ── */}
        <div className="grid grid-cols-4 gap-4">
          <FormGroup label="Düzenleme Tarihi">
            <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
          </FormGroup>
          <FormGroup label="Gönderim Tarihi">
            <FormInput type="date" value={form.gonderimTarih || ''} onChange={(e) => handleChange('gonderimTarih', e.target.value)} />
          </FormGroup>
          <FormGroup label="Noter Adı">
            <FormInput value={form.noterAd || ''} onChange={(e) => handleChange('noterAd', e.target.value)} placeholder="Noter adı" />
          </FormGroup>
          <FormGroup label="Noter Yevmiye No">
            <FormInput value={form.noterNo || ''} onChange={(e) => handleChange('noterNo', e.target.value)} placeholder="Yevmiye numarası" />
          </FormGroup>
        </div>

        {/* ── İçerik / Metin ── */}
        <FormGroup label="İhtarname Metni / İçerik">
          <FormTextarea
            value={form.icerik || ''}
            onChange={(e) => handleChange('icerik', e.target.value)}
            rows={5}
            placeholder="İhtarname metin içeriğini buraya giriniz veya kopyalayınız..."
          />
        </FormGroup>

        {/* ── Tebliğ & Süre Takibi ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>📬</span> Tebliğ & Süre Takibi
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="Tebliğ Durumu">
              <FormSelect value={form.tebligDurum || 'Gönderilmedi'} onChange={(e) => handleChange('tebligDurum', e.target.value)}>
                <option value="Gönderilmedi">Gönderilmedi</option>
                <option value="PTT'de Bekliyor">PTT&apos;de Bekliyor</option>
                <option value="Tebliğ Edildi">Tebliğ Edildi</option>
                <option value="İade Döndü">İade Döndü</option>
              </FormSelect>
            </FormGroup>
            <FormGroup label="Tebliğ Tarihi">
              <FormInput
                type="date"
                value={form.tebligTarih || ''}
                onChange={(e) => handleChange('tebligTarih', e.target.value)}
                disabled={form.tebligDurum !== 'Tebliğ Edildi'}
              />
            </FormGroup>
            <FormGroup label="Cevap Süresi (Gün)">
              <FormInput
                type="number"
                value={form.cevapSuresi || ''}
                onChange={(e) => handleChange('cevapSuresi', Number(e.target.value))}
                placeholder="Ör: 7, 15, 30"
              />
            </FormGroup>
          </div>

          {hesaplananSureSonu && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gold-dim border border-gold/20 rounded-lg">
              <span className="text-sm">⏰</span>
              <span className="text-xs text-gold font-semibold">
                Cevap Son Tarihi: {new Date(hesaplananSureSonu).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[10px] text-text-muted ml-auto">Takvime otomatik eklenecek</span>
            </div>
          )}
        </div>

        {/* ── Cevap Bilgileri (durum Cevap Geldi veya Sonuçlandı ise) ── */}
        {cevapGosterilecek && (
          <div className="border border-green/20 rounded-lg p-4 bg-green-dim/30 space-y-3">
            <div className="text-xs font-bold text-green uppercase tracking-wider flex items-center gap-1.5">
              <span>💬</span> Cevap Bilgileri
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Cevap Tarihi">
                <FormInput type="date" value={form.cevapTarih || ''} onChange={(e) => handleChange('cevapTarih', e.target.value)} />
              </FormGroup>
              <div />
            </div>
            <FormGroup label="Cevap Özeti">
              <FormTextarea
                value={form.cevapOzet || ''}
                onChange={(e) => handleChange('cevapOzet', e.target.value)}
                rows={3}
                placeholder="Gelen cevabın kısa özeti..."
              />
            </FormGroup>
          </div>
        )}

        {/* ── PTT Barkod Sorgulama ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>📦</span> PTT Gönderi Takip
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <FormGroup label="PTT Barkod No">
                <FormInput
                  value={form.pttBarkod || ''}
                  onChange={(e) => handleChange('pttBarkod', e.target.value)}
                  placeholder="RR123456789TR"
                />
              </FormGroup>
            </div>
            <button
              onClick={handlePttSorgula}
              disabled={pttLoading || !form.pttBarkod?.trim()}
              className="px-4 py-2.5 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-[#c00510] disabled:opacity-40 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              {pttLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <span>📦</span>
              )}
              {pttLoading ? 'Sorgulanıyor...' : 'PTT\'den Sorgula'}
            </button>
          </div>

          {pttSonuc && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${
              pttSonuc.includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
              pttSonuc.includes('İade') ? 'bg-red-dim border-red/20 text-red' :
              pttSonuc.includes('hata') || pttSonuc.includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
              'bg-blue-400/10 border-blue-400/20 text-blue-400'
            }`}>
              📬 {pttSonuc}
            </div>
          )}

          {form.pttSonSorgu && (
            <div className="text-[10px] text-text-dim">
              Son sorgu: {new Date(form.pttSonSorgu).toLocaleString('tr-TR')}
              {form.pttSonuc && ` — ${form.pttSonuc}`}
            </div>
          )}
        </div>

        {/* ── Ücretler ── */}
        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="Ücret (TL)">
            <FormInput type="number" value={form.ucret || ''} onChange={(e) => handleChange('ucret', Number(e.target.value))} placeholder="0" />
          </FormGroup>
          <FormGroup label="Noter Masrafı (TL)">
            <FormInput type="number" value={form.noterMasrafi || ''} onChange={(e) => handleChange('noterMasrafi', Number(e.target.value))} placeholder="0" />
          </FormGroup>
          <FormGroup label="Tahsil Edilen (TL)">
            <FormInput type="number" value={form.tahsilEdildi || ''} onChange={(e) => handleChange('tahsilEdildi', Number(e.target.value))} placeholder="0" />
          </FormGroup>
        </div>

        {/* ── Vergi / SMM ── */}
        <div className="border-t border-border/50 pt-4">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Vergi / SMM Bilgileri</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <FormGroup label="KDV Oranı (%)">
              <FormSelect value={String(form.kdvOrani ?? 0)} onChange={(e) => handleChange('kdvOrani', Number(e.target.value))}>
                <option value="0">%0 (Yok)</option>
                <option value="1">%1</option>
                <option value="10">%10</option>
                <option value="20">%20</option>
              </FormSelect>
            </FormGroup>
            <FormGroup label="Stopaj Oranı (%)">
              <FormSelect value={String(form.stopajOrani ?? 0)} onChange={(e) => handleChange('stopajOrani', Number(e.target.value))}>
                <option value="0">%0 (Yok)</option>
                <option value="15">%15</option>
                <option value="20">%20</option>
                <option value="25">%25</option>
              </FormSelect>
            </FormGroup>
          </div>
          <label className="flex items-center gap-2 text-xs text-text-muted mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.makbuzKesildi}
              onChange={(e) => setForm((p) => ({ ...p, makbuzKesildi: e.target.checked }))}
              className="rounded border-border accent-gold"
            />
            Resmi Makbuz (SMM) Kesildi
          </label>
          {form.makbuzKesildi && (
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Makbuz No">
                <FormInput value={form.makbuzNo || ''} onChange={(e) => handleChange('makbuzNo', e.target.value)} placeholder="SMM-2026-001" />
              </FormGroup>
              <FormGroup label="Makbuz Tarihi">
                <FormInput type="date" value={form.makbuzTarih || ''} onChange={(e) => handleChange('makbuzTarih', e.target.value)} />
              </FormGroup>
            </div>
          )}
          {form.makbuzKesildi && (form.kdvOrani || 0) > 0 && (form.ucret || 0) > 0 && (() => {
            const { kdvTutar, stopajTutar, netTutar } = bruttenNete(form.ucret || 0, form.kdvOrani || 0, form.stopajOrani || 0);
            return (
              <div className="grid grid-cols-3 gap-3 bg-surface2 rounded-lg p-3 mt-3">
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-wider">KDV Tutarı</div>
                  <div className="text-sm font-semibold text-text">{fmt(kdvTutar)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-wider">Stopaj Tutarı</div>
                  <div className="text-sm font-semibold text-text">{fmt(stopajTutar)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-wider">Net Tutar</div>
                  <div className="text-sm font-bold text-gold">{fmt(netTutar)}</div>
                </div>
              </div>
            );
          })()}
          {!form.makbuzKesildi && (form.kdvOrani || 0) > 0 && (
            <div className="text-[10px] text-text-dim mt-1">
              ℹ️ Makbuz kesilmediğinde KDV/Stopaj vergi hesabına dahil edilmez.
            </div>
          )}
          {/* Always-visible KDV summary */}
          {(form.ucret || 0) > 0 && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface2 rounded-lg border border-border mt-3">
              <div className="text-center">
                <div className="text-[10px] text-text-dim uppercase">KDV Tutarı</div>
                <div className="text-sm font-bold text-blue-400">
                  {fmt((form.ucret || 0) * ((form.kdvOrani ?? 0) / 100))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-text-dim uppercase">Stopaj Tutarı</div>
                <div className="text-sm font-bold text-red">
                  {fmt((form.ucret || 0) * ((form.stopajOrani ?? 0) / 100))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-text-dim uppercase">Net Tutar</div>
                <div className="text-sm font-bold text-green">
                  {fmt((form.ucret || 0) + (form.ucret || 0) * ((form.kdvOrani ?? 0) / 100) - (form.ucret || 0) * ((form.stopajOrani ?? 0) / 100))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
