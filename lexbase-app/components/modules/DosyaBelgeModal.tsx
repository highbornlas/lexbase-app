'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, FormGroup, FormInput, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import {
  DAVA_EVRAK_TURLERI, ICRA_EVRAK_TURLERI,
  ARABULUCULUK_EVRAK_TURLERI, IHTARNAME_EVRAK_TURLERI, DANISMANLIK_EVRAK_TURLERI,
  DAVA_EVRAK_GRUPLARI, ICRA_EVRAK_GRUPLARI,
  ARABULUCULUK_EVRAK_GRUPLARI, IHTARNAME_EVRAK_GRUPLARI, DANISMANLIK_EVRAK_GRUPLARI,
  type EvrakGrup,
} from '@/lib/constants/uyap';

/* ══════════════════════════════════════════════════════════════
   Dosya Belge Modal — Tüm modüller için evrak yükleme
   Grup bazlı kategori seçimi, sürükle-bırak, page-level drop
   ══════════════════════════════════════════════════════════════ */

type DosyaTipi = 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname' | 'danismanlik';

interface Props {
  open: boolean;
  onClose: () => void;
  onKaydet: (form: DosyaBelgeFormData, dosya: File) => void;
  dosyaTipi: DosyaTipi;
  yukleniyor?: boolean;
}

export interface DosyaBelgeFormData {
  ad: string;
  evrakTuru: string;
  tarih: string;
  aciklama?: string;
  etiketler: string[];
}

// SVG icons
const SvgCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
);
const SvgFolder = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
);
const SvgUploadCloud = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 16l-4-4-4 4"/><path d="M12 12v9"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
);

export function DosyaBelgeModal({ open, onClose, onKaydet, dosyaTipi, yukleniyor }: Props) {
  const [dosya, setDosya] = useState<File | null>(null);
  const [ad, setAd] = useState('');
  const [evrakTuru, setEvrakTuru] = useState('diger');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [aciklama, setAciklama] = useState('');
  const [etiketStr, setEtiketStr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [boyutHata, setBoyutHata] = useState('');
  const [turArama, setTurArama] = useState('');
  const [acikGrup, setAcikGrup] = useState<string | null>(null);
  const turAramaRef = useRef<HTMLInputElement>(null);

  const dosyaBelgeForm = useMemo(() => ({ ad, evrakTuru, tarih, aciklama, etiketStr }), [ad, evrakTuru, tarih, aciklama, etiketStr]);
  const dosyaBelgeInitial = useMemo(() => ({ ad: '', evrakTuru: 'diger', tarih: new Date().toISOString().slice(0, 10), aciklama: '', etiketStr: '' }), []);
  const draftKey = 'dosyaBelge_yeni';
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, dosyaBelgeForm as Record<string, unknown>, dosyaBelgeInitial as Record<string, unknown>, open
  );

  const evrakTurleri = dosyaTipi === 'dava' ? DAVA_EVRAK_TURLERI :
                       dosyaTipi === 'icra' ? ICRA_EVRAK_TURLERI :
                       dosyaTipi === 'arabuluculuk' ? ARABULUCULUK_EVRAK_TURLERI :
                       dosyaTipi === 'ihtarname' ? IHTARNAME_EVRAK_TURLERI :
                       DANISMANLIK_EVRAK_TURLERI;

  const evrakGruplari: EvrakGrup[] = dosyaTipi === 'dava' ? DAVA_EVRAK_GRUPLARI :
                                     dosyaTipi === 'icra' ? ICRA_EVRAK_GRUPLARI :
                                     dosyaTipi === 'arabuluculuk' ? ARABULUCULUK_EVRAK_GRUPLARI :
                                     dosyaTipi === 'ihtarname' ? IHTARNAME_EVRAK_GRUPLARI :
                                     DANISMANLIK_EVRAK_GRUPLARI;
  const MAX_BOYUT = 10 * 1024 * 1024; // 10MB

  // Page-level drop event listener
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (file) handleDosyaSec(file);
    };
    window.addEventListener('dosya-evrak-drop', handler);
    return () => window.removeEventListener('dosya-evrak-drop', handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDosyaSec = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BOYUT) {
      setBoyutHata('Dosya boyutu 10MB\'dan büyük olamaz');
      return;
    }
    setBoyutHata('');
    setDosya(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleDosyaSec(file);
  };

  const handleSubmit = () => {
    if (!dosya || !ad.trim()) return;

    const etiketler = etiketStr.split(',').map(s => s.trim()).filter(Boolean);
    clearDraft();
    onKaydet(
      {
        ad: ad.trim(),
        evrakTuru,
        tarih,
        aciklama: aciklama.trim() || undefined,
        etiketler,
      },
      dosya,
    );
  };

  const handleClose = () => {
    setDosya(null);
    setAd('');
    setEvrakTuru('diger');
    setTarih(new Date().toISOString().slice(0, 10));
    setAciklama('');
    setEtiketStr('');
    setBoyutHata('');
    setTurArama('');
    setAcikGrup(null);
    onClose();
  };

  const fmtBoyut = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedTur = evrakTurleri.find(t => t.key === evrakTuru);

  // Filtrelenmiş evrak türleri (arama desteği)
  const filtrelenmisGruplar = useMemo(() => {
    if (!turArama.trim()) return evrakGruplari;
    const q = turArama.toLowerCase();
    return evrakGruplari
      .map(g => ({
        ...g,
        turler: g.turler.filter(turKey => {
          const tur = evrakTurleri.find(t => t.key === turKey);
          return tur && tur.label.toLowerCase().includes(q);
        }),
      }))
      .filter(g => g.turler.length > 0);
  }, [turArama, evrakGruplari, evrakTurleri]);

  // Seçilen türün hangi grupta olduğunu bul
  const secilenGrup = evrakGruplari.find(g => g.turler.includes(evrakTuru));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={{ dava: 'Dava Evrakı Yükle', icra: 'İcra Evrakı Yükle', arabuluculuk: 'Arabuluculuk Evrakı Yükle', ihtarname: 'İhtarname Evrakı Yükle', danismanlik: 'Danışmanlık Evrakı Yükle' }[dosyaTipi]}
      maxWidth="max-w-xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => {
        const d = loadDraft();
        if (d) {
          const draft = d as Record<string, unknown>;
          if (draft.ad) setAd(draft.ad as string);
          if (draft.evrakTuru) setEvrakTuru(draft.evrakTuru as string);
          if (draft.tarih) setTarih(draft.tarih as string);
          if (draft.aciklama) setAciklama(draft.aciklama as string);
          if (draft.etiketStr) setEtiketStr(draft.etiketStr as string);
        }
        clearDraft();
      }}
      onDiscardDraft={clearDraft}
      footer={
        <div className="flex justify-end gap-2">
          <BtnOutline onClick={handleClose}>İptal</BtnOutline>
          <BtnGold onClick={handleSubmit} disabled={!dosya || !ad.trim() || yukleniyor}>
            {yukleniyor ? 'Yükleniyor...' : 'Kaydet'}
          </BtnGold>
        </div>
      }
    >
      {/* Dosya Seçim / Sürükle-Bırak */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4 ${
          dragOver ? 'border-gold bg-gold/5 scale-[1.01]' : dosya ? 'border-green/40 bg-green/5' : 'border-border hover:border-gold/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('dosya-belge-input')?.click()}
      >
        {dosya ? (
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
                <SvgCheck />
              </div>
            </div>
            <div className="text-sm font-medium text-text">{dosya.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{fmtBoyut(dosya.size)}</div>
            <button
              onClick={(e) => { e.stopPropagation(); setDosya(null); setAd(''); }}
              className="text-[10px] text-text-dim hover:text-red mt-2 transition-colors"
            >
              Dosyayı Kaldır
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-center mb-2 text-text-dim">
              <SvgUploadCloud />
            </div>
            <div className="text-xs text-text-muted">
              Evrakı sürükleyip bırakın
            </div>
            <div className="text-[10px] text-text-dim mt-1">
              .pdf .doc .docx .jpg .png .xls .xlsx .tiff .bmp .udf (maks. 10MB)
            </div>
          </div>
        )}
        <input
          id="dosya-belge-input"
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.xls,.xlsx,.udf"
          onChange={(e) => handleDosyaSec(e.target.files?.[0] || null)}
        />
      </div>

      {boyutHata && (
        <div className="text-xs text-red mb-3 bg-red/5 px-3 py-2 rounded-lg border border-red/20">
          {boyutHata}
        </div>
      )}

      {/* Evrak Türü — Grup bazlı seçim */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-text-muted">Evrak Türü</div>
          {selectedTur && (
            <div className="text-[10px] text-gold font-semibold flex items-center gap-1">
              <SvgCheck /> {selectedTur.label}
            </div>
          )}
        </div>

        {/* Arama */}
        <div className="relative mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={turAramaRef}
            type="text"
            value={turArama}
            onChange={(e) => setTurArama(e.target.value)}
            placeholder="Evrak türü ara..."
            className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-surface2/50 border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Grup bazlı grid */}
        <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtrelenmisGruplar.map((grup, gi) => {
            const grupTurleri = grup.turler.map(k => evrakTurleri.find(t => t.key === k)).filter(Boolean);
            const isAcik = acikGrup === grup.key || turArama.trim() !== '';
            const hasSelected = grup.turler.includes(evrakTuru);

            return (
              <div key={grup.key} className={gi > 0 ? 'border-t border-border/40' : ''}>
                {/* Grup başlığı */}
                <button
                  type="button"
                  onClick={() => setAcikGrup(acikGrup === grup.key ? null : grup.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface2/30 transition-colors ${
                    hasSelected ? 'bg-gold/5' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${grup.renk}`}>
                    <SvgFolder />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-text">{grup.label}</div>
                    <div className="text-[9px] text-text-dim truncate">{grup.aciklama}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-text-dim transition-transform ${isAcik ? 'rotate-90' : ''}`}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>

                {/* Grup içindeki türler */}
                {isAcik && (
                  <div className="bg-bg/30 border-t border-border/20">
                    {grupTurleri.map(tur => {
                      if (!tur) return null;
                      const isSelected = evrakTuru === tur.key;
                      return (
                        <button
                          key={tur.key}
                          type="button"
                          onClick={() => {
                            setEvrakTuru(tur.key);
                            setTurArama('');
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 pl-11 text-left transition-colors ${
                            isSelected
                              ? 'bg-gold/10 text-gold'
                              : 'hover:bg-surface2/30 text-text-muted hover:text-text'
                          }`}
                        >
                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-border/60 flex-shrink-0" />
                          )}
                          <span className={`text-[11px] ${isSelected ? 'font-semibold' : ''}`}>
                            {tur.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filtrelenmisGruplar.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] text-text-dim">
              Arama sonucu bulunamadı
            </div>
          )}
        </div>
      </div>

      {/* Form Alanları */}
      <div className="space-y-3">
        <FormGroup label="Evrak Adı" required>
          <FormInput
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Ör: 2026 tarihli tensip zaptı"
            className={dosya && !ad.trim() ? '!border-red' : ''}
          />
          {dosya && !ad.trim() && (
            <div className="text-[10px] text-red mt-1">Evrak adı zorunludur</div>
          )}
        </FormGroup>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Tarih">
            <FormInput type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </FormGroup>
          <FormGroup label="Etiketler">
            <FormInput
              value={etiketStr}
              onChange={(e) => setEtiketStr(e.target.value)}
              placeholder="Virgülle ayırın"
            />
          </FormGroup>
        </div>

        <FormGroup label="Açıklama">
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Evrakla ilgili kısa not..."
            rows={2}
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none"
          />
        </FormGroup>
      </div>
    </Modal>
  );
}
