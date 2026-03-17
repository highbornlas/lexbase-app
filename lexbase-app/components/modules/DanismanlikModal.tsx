'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import {
  useDanismanlikKaydet,
  type Danismanlik,
  type EforKaydi,
  DANISMANLIK_DURUMLARI,
  DANISMANLIK_TURLERI,
  EFOR_KATEGORILERI,
} from '@/lib/hooks/useDanismanlik';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt } from '@/lib/utils';
import { bruttenNete, nettenBrute } from '@/lib/hooks/useGelirHesapla';

interface DanismanlikModalProps {
  open: boolean;
  onClose: () => void;
  danismanlik?: Danismanlik | null;
}

const bos: Partial<Danismanlik> = {
  tur: '',
  muvId: '',
  konu: '',
  durum: 'Taslak',
  tarih: new Date().toISOString().split('T')[0],
  teslimTarih: '',
  ucret: 0,
  tahsilEdildi: 0,
  aciklama: '',
  sozlesmeModeli: 'tek_seferlik',
  aylikUcret: 0,
  sozlesmeBaslangic: '',
  sozlesmeBitis: '',
  taksitDongusu: 'aylik',
  eforlar: [],
};

type TabKey = 'genel' | 'efor';

export function DanismanlikModal({ open, onClose, danismanlik }: DanismanlikModalProps) {
  const [form, setForm] = useState<Partial<Danismanlik>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Danismanlik>>({ ...bos });
  const [hata, setHata] = useState('');
  const [aktifTab, setAktifTab] = useState<TabKey>('genel');
  const kaydet = useDanismanlikKaydet();
  const { data: muvekkillar } = useMuvekkillar();

  // Efor ekleme state'leri
  const [yeniEfor, setYeniEfor] = useState({ aciklama: '', sure: '', kategori: '', tarih: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    let init: Partial<Danismanlik>;
    if (danismanlik) {
      init = { ...danismanlik };
    } else {
      init = { ...bos, id: crypto.randomUUID() };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setAktifTab('genel');
  }, [danismanlik, open]);

  const draftKey = `danismanlik_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isSureklii = form.sozlesmeModeli === 'sureklii';

  // Efor toplam
  const toplamEforDk = useMemo(() => {
    return (form.eforlar || []).reduce((t, e) => t + (e.sure || 0), 0);
  }, [form.eforlar]);

  function handleEforEkle() {
    if (!yeniEfor.aciklama.trim() || !yeniEfor.sure) return;
    const efor: EforKaydi = {
      id: crypto.randomUUID(),
      tarih: yeniEfor.tarih || new Date().toISOString().split('T')[0],
      sure: Number(yeniEfor.sure),
      aciklama: yeniEfor.aciklama,
      kategori: yeniEfor.kategori || 'Diğer',
    };
    setForm((prev) => ({
      ...prev,
      eforlar: [...(prev.eforlar || []), efor],
      toplamEforDk: (prev.toplamEforDk || 0) + efor.sure,
    }));
    setYeniEfor({ aciklama: '', sure: '', kategori: '', tarih: new Date().toISOString().split('T')[0] });
  }

  function handleEforSil(eforId: string) {
    setForm((prev) => {
      const yeniList = (prev.eforlar || []).filter((e) => e.id !== eforId);
      return { ...prev, eforlar: yeniList, toplamEforDk: yeniList.reduce((t, e) => t + (e.sure || 0), 0) };
    });
  }

  async function handleSubmit() {
    if (!form.konu?.trim()) {
      setHata('Konu zorunludur.');
      setAktifTab('genel');
      return;
    }
    setHata('');
    try {
      await kaydet.mutateAsync(form as Danismanlik);
      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  function fmtSure(dk: number) {
    const saat = Math.floor(dk / 60);
    const kalan = dk % 60;
    if (saat === 0) return `${kalan} dk`;
    return kalan > 0 ? `${saat} sa ${kalan} dk` : `${saat} sa`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={danismanlik ? 'Danışmanlık Düzenle' : 'Yeni Danışmanlık'}
      maxWidth="max-w-2xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Danismanlik>); clearDraft(); }}
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
      {/* Modal Tab Navigasyonu */}
      <div className="flex border-b border-border mb-4 -mt-2">
        {([
          { key: 'genel' as TabKey, label: '📋 Genel Bilgiler' },
          { key: 'efor' as TabKey, label: `⏱️ Efor Kayıtları (${(form.eforlar || []).length})` },
        ]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setAktifTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              aktifTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {hata && (
        <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red mb-4">
          {hata}
        </div>
      )}

      {/* ── TAB: Genel Bilgiler ──────────────────────────── */}
      {aktifTab === 'genel' && (
        <div className="space-y-4">
          {/* Sözleşme Modeli Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleChange('sozlesmeModeli', 'tek_seferlik')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                !isSureklii ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              📄 Tek Seferlik İş
            </button>
            <button
              type="button"
              onClick={() => handleChange('sozlesmeModeli', 'sureklii')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                isSureklii ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              🔄 Sürekli Danışmanlık Sözleşmesi
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Danışmanlık Türü">
              <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
                <option value="">Seçiniz</option>
                {DANISMANLIK_TURLERI.map((t) => (
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
            <FormInput value={form.konu || ''} onChange={(e) => handleChange('konu', e.target.value)} placeholder="Danışmanlık konusu" />
          </FormGroup>

          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="Durum">
              <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
                {DANISMANLIK_DURUMLARI.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label={isSureklii ? 'Sözleşme Başlangıcı' : 'Başlangıç Tarihi'}>
              <FormInput type="date" value={isSureklii ? (form.sozlesmeBaslangic || '') : (form.tarih || '')} onChange={(e) => handleChange(isSureklii ? 'sozlesmeBaslangic' : 'tarih', e.target.value)} />
            </FormGroup>
            <FormGroup label={isSureklii ? 'Sözleşme Bitişi' : 'Teslim Tarihi'}>
              <FormInput type="date" value={isSureklii ? (form.sozlesmeBitis || '') : (form.teslimTarih || '')} onChange={(e) => handleChange(isSureklii ? 'sozlesmeBitis' : 'teslimTarih', e.target.value)} />
            </FormGroup>
          </div>

          {/* Tek Seferlik: Ücret + Tahsil */}
          {!isSureklii && (
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Ücret (TL)">
                <FormInput type="number" value={form.ucret || ''} onChange={(e) => handleChange('ucret', Number(e.target.value))} placeholder="0" />
              </FormGroup>
              <FormGroup label="Tahsil Edilen (TL)">
                <FormInput type="number" value={form.tahsilEdildi || ''} onChange={(e) => handleChange('tahsilEdildi', Number(e.target.value))} placeholder="0" />
              </FormGroup>
            </div>
          )}

          {/* Sürekli: Aylık Ücret + Döngü */}
          {isSureklii && (
            <div className="grid grid-cols-3 gap-4">
              <FormGroup label="Aylık Ücret (TL)">
                <FormInput type="number" value={form.aylikUcret || ''} onChange={(e) => handleChange('aylikUcret', Number(e.target.value))} placeholder="0" />
              </FormGroup>
              <FormGroup label="Faturalama Döngüsü">
                <FormSelect value={form.taksitDongusu || 'aylik'} onChange={(e) => handleChange('taksitDongusu', e.target.value)}>
                  <option value="aylik">Aylık</option>
                  <option value="3aylik">3 Aylık</option>
                  <option value="6aylik">6 Aylık</option>
                  <option value="yillik">Yıllık</option>
                </FormSelect>
              </FormGroup>
              <FormGroup label="Tahsil Edilen (TL)">
                <FormInput type="number" value={form.tahsilEdildi || ''} onChange={(e) => handleChange('tahsilEdildi', Number(e.target.value))} placeholder="0" />
              </FormGroup>
            </div>
          )}

          {/* KDV / Stopaj / Makbuz */}
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
            {/* Canlı Vergi Hesaplaması — her zaman göster */}
            {((form.kdvOrani || 0) > 0 || (form.stopajOrani || 0) > 0) && (form.ucret || form.aylikUcret || 0) > 0 && (() => {
              const brut = isSureklii ? (form.aylikUcret || 0) : (form.ucret || 0);
              const { kdvTutar, stopajTutar, netTutar } = bruttenNete(brut, form.kdvOrani || 0, form.stopajOrani || 0);
              return (
                <div className={`rounded-lg p-3 mt-3 ${form.makbuzKesildi ? 'bg-surface2' : 'bg-surface2/50 border border-dashed border-border'}`}>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="text-[9px] text-text-dim uppercase tracking-wider">Brüt Ücret</div>
                      <div className="text-sm font-semibold text-text">{fmt(brut)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-dim uppercase tracking-wider">KDV ({form.kdvOrani || 0}%)</div>
                      <div className="text-sm font-semibold text-text">+{fmt(kdvTutar)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-text-dim uppercase tracking-wider">Stopaj ({form.stopajOrani || 0}%)</div>
                      <div className="text-sm font-semibold text-red">-{fmt(stopajTutar)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gold uppercase tracking-wider font-bold">Net Alınacak</div>
                      <div className="text-sm font-bold text-gold">{fmt(netTutar)}</div>
                    </div>
                  </div>
                  {!form.makbuzKesildi && (
                    <div className="text-[10px] text-text-dim mt-2 flex items-center gap-1">
                      <span>ℹ️</span> Makbuz kesilmediğinde vergi hesabına dahil edilmez (avans/elden tahsilat).
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {isSureklii && form.aylikUcret && form.aylikUcret > 0 && (
            <div className="bg-gold-dim border border-gold/20 rounded-lg p-3 text-xs text-gold">
              📊 Yıllık Sözleşme Değeri: <span className="font-bold">{fmt(form.aylikUcret * 12)}</span>
              {form.taksitDongusu === '3aylik' && <span className="ml-2">· 3 Aylık Fatura: {fmt(form.aylikUcret * 3)}</span>}
              {form.taksitDongusu === '6aylik' && <span className="ml-2">· 6 Aylık Fatura: {fmt(form.aylikUcret * 6)}</span>}
            </div>
          )}

          <FormGroup label="Açıklama">
            <FormTextarea value={form.aciklama || ''} onChange={(e) => handleChange('aciklama', e.target.value)} rows={3} placeholder="Detaylar..." />
          </FormGroup>
        </div>
      )}

      {/* ── TAB: Efor Kayıtları ──────────────────────────── */}
      {aktifTab === 'efor' && (
        <div className="space-y-4">
          {/* Toplam Efor Özet */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface2 rounded-lg p-3 text-center">
              <div className="text-[9px] text-text-dim uppercase tracking-wider">Toplam Efor</div>
              <div className="text-lg font-bold text-gold font-[var(--font-playfair)]">{fmtSure(toplamEforDk)}</div>
            </div>
            <div className="bg-surface2 rounded-lg p-3 text-center">
              <div className="text-[9px] text-text-dim uppercase tracking-wider">Kayıt Sayısı</div>
              <div className="text-lg font-bold text-text font-[var(--font-playfair)]">{(form.eforlar || []).length}</div>
            </div>
            <div className="bg-surface2 rounded-lg p-3 text-center">
              <div className="text-[9px] text-text-dim uppercase tracking-wider">Ort. / Kayıt</div>
              <div className="text-lg font-bold text-text-muted font-[var(--font-playfair)]">
                {(form.eforlar || []).length > 0 ? fmtSure(Math.round(toplamEforDk / (form.eforlar || []).length)) : '—'}
              </div>
            </div>
          </div>

          {/* Yeni Efor Ekle */}
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-2">+ Yeni Efor Kaydı</div>
            <div className="grid grid-cols-[100px_80px_1fr_100px] gap-2 items-end">
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Tarih</label>
                <input
                  type="date"
                  value={yeniEfor.tarih}
                  onChange={(e) => setYeniEfor((p) => ({ ...p, tarih: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Süre (dk)</label>
                <input
                  type="number"
                  value={yeniEfor.sure}
                  onChange={(e) => setYeniEfor((p) => ({ ...p, sure: e.target.value }))}
                  placeholder="60"
                  className="w-full px-2 py-1.5 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Açıklama</label>
                <input
                  type="text"
                  value={yeniEfor.aciklama}
                  onChange={(e) => setYeniEfor((p) => ({ ...p, aciklama: e.target.value }))}
                  placeholder="Yapılan iş açıklaması..."
                  className="w-full px-2 py-1.5 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold"
                />
              </div>
              <button
                type="button"
                onClick={handleEforEkle}
                disabled={!yeniEfor.aciklama.trim() || !yeniEfor.sure}
                className="px-3 py-1.5 bg-gold text-bg font-semibold rounded text-xs hover:bg-gold-light disabled:opacity-40 transition-colors"
              >
                Ekle
              </button>
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-text-dim block mb-1">Kategori</label>
              <select
                value={yeniEfor.kategori}
                onChange={(e) => setYeniEfor((p) => ({ ...p, kategori: e.target.value }))}
                className="px-2 py-1.5 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold"
              >
                <option value="">Seçiniz...</option>
                {EFOR_KATEGORILERI.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Efor Listesi */}
          {(form.eforlar || []).length === 0 ? (
            <div className="text-center py-8 bg-surface border border-border rounded-lg">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-xs text-text-muted">Henüz efor kaydı eklenmemiş</div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[80px_60px_80px_1fr_30px] gap-2 px-3 py-2 border-b border-border text-[10px] text-text-muted font-medium uppercase tracking-wider">
                <span>Tarih</span>
                <span>Süre</span>
                <span>Kategori</span>
                <span>Açıklama</span>
                <span></span>
              </div>
              {[...(form.eforlar || [])].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')).map((e) => (
                <div key={e.id} className="grid grid-cols-[80px_60px_80px_1fr_30px] gap-2 px-3 py-2 border-b border-border/50 text-xs items-center hover:bg-gold-dim transition-colors">
                  <span className="text-text-dim">{e.tarih ? new Date(e.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '—'}</span>
                  <span className="font-semibold text-gold">{fmtSure(e.sure)}</span>
                  <span className="text-text-dim truncate text-[10px]">{e.kategori || '—'}</span>
                  <span className="text-text truncate">{e.aciklama}</span>
                  <button
                    type="button"
                    onClick={() => handleEforSil(e.id)}
                    className="text-text-dim hover:text-red transition-colors text-xs"
                    title="Sil"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
