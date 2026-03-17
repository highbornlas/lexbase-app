'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import {
  useArabuluculukKaydet,
  type Arabuluculuk,
  ARABULUCULUK_DURUMLARI,
  ARABULUCULUK_TURLERI,
  YASAL_SURE_HAFTA,
  hesaplaYasalSureBitis,
} from '@/lib/hooks/useArabuluculuk';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTaraflar, useKarsiTarafKaydet } from '@/lib/hooks/useKarsiTaraflar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useEtkinlikKaydet, type Etkinlik } from '@/lib/hooks/useEtkinlikler';
import { fmt } from '@/lib/utils';
import { bruttenNete } from '@/lib/hooks/useGelirHesapla';

interface ArabuluculukModalProps {
  open: boolean;
  onClose: () => void;
  arabuluculuk?: Arabuluculuk | null;
  onAnlasamama?: (arabuluculuk: Arabuluculuk) => void;
}

const bos: Partial<Arabuluculuk> = {
  muvId: '',
  konu: '',
  tur: '',
  durum: 'Başvuru',
  arabulucu: '',
  basvuruTarih: new Date().toISOString().split('T')[0],
  ilkOturumTarih: '',
  karsiTaraf: '',
  karsiTarafId: '',
  karsiTarafVekil: '',
  talep: 0,
  anlasmaUcret: 0,
  ucret: 0,
  tahsilEdildi: 0,
  aciklama: '',
  sureUzatmaHafta: 0,
  iliskiliDosyaTip: undefined,
  iliskiliDosyaId: '',
  sonTutanakNo: '',
};

export function ArabuluculukModal({ open, onClose, arabuluculuk, onAnlasamama }: ArabuluculukModalProps) {
  const [form, setForm] = useState<Partial<Arabuluculuk>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Arabuluculuk>>({ ...bos });
  const [hata, setHata] = useState('');
  const [anlasamamaDialog, setAnlasamamaDialog] = useState(false);
  const [yeniKtAd, setYeniKtAd] = useState('');
  const [yeniKtGoster, setYeniKtGoster] = useState(false);
  const kaydet = useArabuluculukKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const ktKaydet = useKarsiTarafKaydet();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const etkinlikKaydet = useEtkinlikKaydet();

  useEffect(() => {
    let init: Partial<Arabuluculuk>;
    if (arabuluculuk) {
      init = { ...arabuluculuk };
    } else {
      init = { ...bos, id: crypto.randomUUID() };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setAnlasamamaDialog(false);
    setYeniKtGoster(false);
  }, [arabuluculuk, open]);

  const draftKey = `arabuluculuk_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Yasal süre hesaplama
  const yasalSureBitis = useMemo(() => {
    return hesaplaYasalSureBitis(form.tur, form.ilkOturumTarih, form.sureUzatmaHafta || 0);
  }, [form.tur, form.ilkOturumTarih, form.sureUzatmaHafta]);

  const yasalSureKalanGun = useMemo(() => {
    if (!yasalSureBitis) return null;
    const bugun = new Date();
    const bitis = new Date(yasalSureBitis);
    return Math.ceil((bitis.getTime() - bugun.getTime()) / 86400000);
  }, [yasalSureBitis]);

  // İlişkili dosyalar (müvekkil bazlı filtreleme)
  const iliskiliDavalar = useMemo(() => {
    if (!form.muvId || !davalar) return [];
    return davalar.filter((d) => d.muvId === form.muvId);
  }, [form.muvId, davalar]);

  const iliskiliIcralar = useMemo(() => {
    if (!form.muvId || !icralar) return [];
    return icralar.filter((ic) => ic.muvId === form.muvId);
  }, [form.muvId, icralar]);

  // Karşı taraf seçimi
  function handleKarsiTarafSec(value: string) {
    if (value === '__yeni__') {
      setYeniKtGoster(true);
      return;
    }
    const kt = karsiTaraflar?.find((k) => k.id === value);
    setForm((prev) => ({
      ...prev,
      karsiTarafId: value,
      karsiTaraf: kt ? `${kt.ad}${kt.soyad ? ' ' + kt.soyad : ''}` : '',
    }));
  }

  async function handleYeniKarsiTarafKaydet() {
    if (!yeniKtAd.trim()) return;
    const yeniKt = { id: crypto.randomUUID(), ad: yeniKtAd.trim() };
    await ktKaydet.mutateAsync(yeniKt);
    setForm((prev) => ({ ...prev, karsiTarafId: yeniKt.id, karsiTaraf: yeniKt.ad }));
    setYeniKtAd('');
    setYeniKtGoster(false);
  }

  async function handleSubmit() {
    if (!form.konu?.trim()) {
      setHata('Konu zorunludur.');
      return;
    }
    setHata('');

    // Yasal süre hesapla ve kaydet
    const hesaplananSure = hesaplaYasalSureBitis(form.tur, form.ilkOturumTarih, form.sureUzatmaHafta || 0);
    const kayitData = {
      ...form,
      yasalSureBitis: hesaplananSure,
      oturumSayisi: form.oturumlar?.length || form.oturumSayisi || 0,
    } as Arabuluculuk;

    try {
      await kaydet.mutateAsync(kayitData);

      // Takvime otomatik etkinlik oluştur (yasal süre dolumu)
      if (hesaplananSure && !arabuluculuk?.takvimEtkinlikId) {
        const etkinlikId = crypto.randomUUID();
        const etkinlik: Etkinlik = {
          id: etkinlikId,
          baslik: `⚠️ ${form.konu} - Arabuluculuk Yasal Süresi Doluyor`,
          tarih: hesaplananSure,
          tur: 'Arabuluculuk',
          muvId: form.muvId,
          not: `${form.tur} arabuluculuk yasal süresi sona eriyor. Dosya No: ${form.no || '—'}`,
        };
        await etkinlikKaydet.mutateAsync(etkinlik);
        // Etkinlik ID'yi güncelle
        await kaydet.mutateAsync({ ...kayitData, takvimEtkinlikId: etkinlikId });
      }

      // Anlaşamama durumu → Dava/İcra önerisi
      if (form.durum === 'Anlaşamama' && arabuluculuk?.durum !== 'Anlaşamama') {
        setAnlasamamaDialog(true);
        return; // Modal kapanmasın, dialog göstersin
      }

      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  function handleAnlasamamaOnay() {
    setAnlasamamaDialog(false);
    clearDraft();
    onClose();
    if (onAnlasamama) {
      onAnlasamama(form as Arabuluculuk);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={arabuluculuk ? 'Arabuluculuk Düzenle' : 'Yeni Arabuluculuk'}
      maxWidth="max-w-3xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Arabuluculuk>); clearDraft(); }}
      onDiscardDraft={clearDraft}
      footer={
        anlasamamaDialog ? undefined : (
          <>
            <BtnOutline onClick={onClose}>İptal</BtnOutline>
            <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
              {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </BtnGold>
          </>
        )
      }
    >
      {/* Anlaşamama Dialog */}
      {anlasamamaDialog ? (
        <div className="text-center py-6 space-y-4">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-sm font-semibold text-text">Anlaşamama — Dava veya İcra Dosyası Açılsın mı?</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Bu arabuluculuk dosyası &ldquo;Anlaşamama&rdquo; ile sonuçlandı. Müvekkil, karşı taraf ve konu bilgileri otomatik olarak yeni dosyaya aktarılacaktır.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={handleAnlasamamaOnay}
              className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
              ⚖️ Yeni Dava Aç
            </button>
            <button onClick={() => { setAnlasamamaDialog(false); onClose(); }}
              className="px-4 py-2 bg-surface border border-border text-text-muted rounded-lg text-xs hover:text-text transition-colors">
              Şimdilik Geç
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hata && (
            <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
              {hata}
            </div>
          )}

          {/* Tür + Müvekkil */}
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Arabuluculuk Türü">
              <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
                <option value="">Seçiniz</option>
                {ARABULUCULUK_TURLERI.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label="Müvekkil">
              <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)}>
                <option value="">Seçiniz</option>
                {muvekkillar?.map((m) => (
                  <option key={m.id} value={m.id}>{m.ad}</option>
                ))}
              </FormSelect>
            </FormGroup>
          </div>

          <FormGroup label="Konu" required>
            <FormInput value={form.konu || ''} onChange={(e) => handleChange('konu', e.target.value)} placeholder="Uyuşmazlık konusu" />
          </FormGroup>

          {/* Durum + Tarihler */}
          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="Durum">
              <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
                {ARABULUCULUK_DURUMLARI.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label="Başvuru Tarihi">
              <FormInput type="date" value={form.basvuruTarih || ''} onChange={(e) => handleChange('basvuruTarih', e.target.value)} />
            </FormGroup>
            <FormGroup label="İlk Oturum / Atama Tarihi">
              <FormInput type="date" value={form.ilkOturumTarih || ''} onChange={(e) => handleChange('ilkOturumTarih', e.target.value)} />
            </FormGroup>
          </div>

          {/* Yasal Süre Uyarısı */}
          {yasalSureBitis && (
            <div className={`rounded-lg p-3 text-xs border flex items-center justify-between ${
              yasalSureKalanGun !== null && yasalSureKalanGun <= 7
                ? 'bg-red-dim border-red/20 text-red'
                : yasalSureKalanGun !== null && yasalSureKalanGun <= 14
                ? 'bg-orange-400/10 border-orange-400/20 text-orange-400'
                : 'bg-blue-400/10 border-blue-400/20 text-blue-400'
            }`}>
              <div>
                <span className="font-bold">⏰ Yasal Süre:</span> {form.tur} — {YASAL_SURE_HAFTA[form.tur || ''] || '?'} hafta
                {(form.sureUzatmaHafta || 0) > 0 && <span> (+{form.sureUzatmaHafta} hafta uzatma)</span>}
                <span className="ml-2">· Bitiş: <span className="font-bold">{new Date(yasalSureBitis).toLocaleDateString('tr-TR')}</span></span>
                {yasalSureKalanGun !== null && (
                  <span className="ml-2">
                    · {yasalSureKalanGun > 0 ? `${yasalSureKalanGun} gün kaldı` : yasalSureKalanGun === 0 ? 'BUGÜN DOLUYOR!' : `${Math.abs(yasalSureKalanGun)} gün geçti!`}
                  </span>
                )}
              </div>
              <select value={form.sureUzatmaHafta || 0} onChange={(e) => handleChange('sureUzatmaHafta', Number(e.target.value))}
                className="px-2 py-1 bg-bg/50 border border-current/20 rounded text-[10px] ml-3">
                <option value={0}>Uzatma Yok</option>
                <option value={2}>+2 Hafta</option>
                <option value={4}>+4 Hafta</option>
              </select>
            </div>
          )}

          {/* Arabulucu + Karşı Taraf */}
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Arabulucu">
              <FormInput value={form.arabulucu || ''} onChange={(e) => handleChange('arabulucu', e.target.value)} placeholder="Arabulucu adı" />
            </FormGroup>
            <FormGroup label="Karşı Taraf">
              {yeniKtGoster ? (
                <div className="flex gap-1.5">
                  <input value={yeniKtAd} onChange={(e) => setYeniKtAd(e.target.value)} placeholder="Yeni karşı taraf adı..."
                    className="flex-1 px-3 py-2 bg-bg border border-gold rounded-[10px] text-sm text-text placeholder:text-text-dim focus:outline-none" />
                  <button type="button" onClick={handleYeniKarsiTarafKaydet} disabled={!yeniKtAd.trim()}
                    className="px-3 py-2 bg-gold text-bg rounded-[10px] text-xs font-bold hover:bg-gold-light disabled:opacity-40">✓</button>
                  <button type="button" onClick={() => setYeniKtGoster(false)}
                    className="px-2 py-2 text-text-dim hover:text-text text-xs">✕</button>
                </div>
              ) : (
                <FormSelect value={form.karsiTarafId || ''} onChange={(e) => handleKarsiTarafSec(e.target.value)}>
                  <option value="">Rehberden Seç...</option>
                  {karsiTaraflar?.map((kt) => (
                    <option key={kt.id} value={kt.id}>{kt.ad}{kt.soyad ? ` ${kt.soyad}` : ''}</option>
                  ))}
                  <option value="__yeni__">➕ Yeni Karşı Taraf Ekle</option>
                </FormSelect>
              )}
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Karşı Taraf Vekili">
              <FormInput value={form.karsiTarafVekil || ''} onChange={(e) => handleChange('karsiTarafVekil', e.target.value)} placeholder="Vekil adı" />
            </FormGroup>
            <FormGroup label="Oturum Sayısı">
              <FormInput type="number" value={form.oturumSayisi || ''} onChange={(e) => handleChange('oturumSayisi', Number(e.target.value))} placeholder="0" />
            </FormGroup>
          </div>

          {/* İlişkili Dosya */}
          {form.muvId && (
            <div className="border-t border-border/50 pt-4">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">İlişkili Dosya</div>
              <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Dosya Türü">
                  <FormSelect value={form.iliskiliDosyaTip || ''} onChange={(e) => { handleChange('iliskiliDosyaTip', e.target.value); handleChange('iliskiliDosyaId', ''); }}>
                    <option value="">Bağlantı Yok</option>
                    <option value="dava">Dava Dosyası</option>
                    <option value="icra">İcra Dosyası</option>
                  </FormSelect>
                </FormGroup>
                {form.iliskiliDosyaTip && (
                  <FormGroup label={form.iliskiliDosyaTip === 'dava' ? 'Dava Seç' : 'İcra Seç'}>
                    <FormSelect value={form.iliskiliDosyaId || ''} onChange={(e) => handleChange('iliskiliDosyaId', e.target.value)}>
                      <option value="">Seçiniz...</option>
                      {form.iliskiliDosyaTip === 'dava'
                        ? iliskiliDavalar.map((d) => { const r = d as Record<string, unknown>; return <option key={d.id} value={d.id}>{String(r.esasNo || r.dosyaNo || r.konu || d.id.slice(0, 8))}</option>; })
                        : iliskiliIcralar.map((ic) => { const r = ic as Record<string, unknown>; return <option key={ic.id} value={ic.id}>{String(r.esasNo || r.dosyaNo || r.konu || ic.id.slice(0, 8))}</option>; })
                      }
                    </FormSelect>
                  </FormGroup>
                )}
              </div>
            </div>
          )}

          {/* Finansal */}
          <div className="border-t border-border/50 pt-4">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Finansal</div>
            <div className="grid grid-cols-3 gap-4">
              <FormGroup label="Talep Tutarı (TL)">
                <FormInput type="number" value={form.talep || ''} onChange={(e) => handleChange('talep', Number(e.target.value))} placeholder="0" />
              </FormGroup>
              <FormGroup label="Anlaşma Ücreti (TL)">
                <FormInput type="number" value={form.anlasmaUcret || ''} onChange={(e) => handleChange('anlasmaUcret', Number(e.target.value))} placeholder="0" />
              </FormGroup>
              <FormGroup label="Vekalet Ücreti (TL)">
                <FormInput type="number" value={form.ucret || ''} onChange={(e) => handleChange('ucret', Number(e.target.value))} placeholder="0" />
              </FormGroup>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-3">
              <FormGroup label="Tahsil Edilen (TL)">
                <FormInput type="number" value={form.tahsilEdildi || ''} onChange={(e) => handleChange('tahsilEdildi', Number(e.target.value))} placeholder="0" />
              </FormGroup>
            </div>
            {form.durum === 'Anlaşma' && (form.anlasmaUcret || 0) > 0 && (
              <div className="mt-2 bg-green-dim border border-green/20 rounded-lg p-2 text-xs text-green">
                ℹ️ Anlaşma ücreti ({fmt(form.anlasmaUcret || 0)}) müvekkilin bekleyen tahsilat kasasına yansıtılacaktır.
              </div>
            )}

            {/* KDV / Stopaj / Makbuz */}
            <div className="mt-3 pt-3 border-t border-border/30">
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
            </div>
          </div>

          {/* Anlaşamama — Son Tutanak No */}
          {form.durum === 'Anlaşamama' && (
            <FormGroup label="Son Tutanak No (Zorunlu belge)">
              <FormInput value={form.sonTutanakNo || ''} onChange={(e) => handleChange('sonTutanakNo', e.target.value)} placeholder="Arabuluculuk son tutanak numarası" />
            </FormGroup>
          )}

          <FormGroup label="Açıklama">
            <FormTextarea value={form.aciklama || ''} onChange={(e) => handleChange('aciklama', e.target.value)} rows={2} placeholder="Ek notlar..." />
          </FormGroup>
        </div>
      )}
    </Modal>
  );
}
