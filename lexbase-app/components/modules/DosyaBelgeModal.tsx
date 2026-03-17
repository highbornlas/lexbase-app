'use client';

import { useState, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { DAVA_EVRAK_TURLERI, ICRA_EVRAK_TURLERI } from '@/lib/constants/uyap';

/* ══════════════════════════════════════════════════════════════
   Dosya Belge Modal — Dava/İcra evrak yükleme
   Müvekkil belgelerinden tamamen ayrı!
   ══════════════════════════════════════════════════════════════ */

type DosyaTipi = 'dava' | 'icra';

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

export function DosyaBelgeModal({ open, onClose, onKaydet, dosyaTipi, yukleniyor }: Props) {
  const [dosya, setDosya] = useState<File | null>(null);
  const [ad, setAd] = useState('');
  const [evrakTuru, setEvrakTuru] = useState('diger');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [aciklama, setAciklama] = useState('');
  const [etiketStr, setEtiketStr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [boyutHata, setBoyutHata] = useState('');

  const dosyaBelgeForm = useMemo(() => ({ ad, evrakTuru, tarih, aciklama, etiketStr }), [ad, evrakTuru, tarih, aciklama, etiketStr]);
  const dosyaBelgeInitial = useMemo(() => ({ ad: '', evrakTuru: 'diger', tarih: new Date().toISOString().slice(0, 10), aciklama: '', etiketStr: '' }), []);
  const draftKey = 'dosyaBelge_yeni';
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, dosyaBelgeForm as Record<string, unknown>, dosyaBelgeInitial as Record<string, unknown>, open
  );

  const evrakTurleri = dosyaTipi === 'dava' ? DAVA_EVRAK_TURLERI : ICRA_EVRAK_TURLERI;
  const MAX_BOYUT = 10 * 1024 * 1024; // 10MB

  const handleDosyaSec = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BOYUT) {
      setBoyutHata('Dosya boyutu 10MB\'dan büyük olamaz');
      return;
    }
    setBoyutHata('');
    setDosya(file);
    if (!ad) setAd(file.name.replace(/\.[^.]+$/, ''));
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
    onClose();
  };

  const fmtBoyut = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedTur = evrakTurleri.find(t => t.key === evrakTuru);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={dosyaTipi === 'dava' ? 'Dava Evrakı Yükle' : 'İcra Evrakı Yükle'}
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
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer mb-4 ${
          dragOver ? 'border-gold bg-gold-dim' : dosya ? 'border-green/40 bg-green-dim' : 'border-border hover:border-gold/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('dosya-belge-input')?.click()}
      >
        {dosya ? (
          <div>
            <div className="text-green text-2xl mb-1">✓</div>
            <div className="text-sm font-medium text-text">{dosya.name}</div>
            <div className="text-xs text-text-muted mt-1">{fmtBoyut(dosya.size)}</div>
            <button
              onClick={(e) => { e.stopPropagation(); setDosya(null); setAd(''); }}
              className="text-xs text-text-dim hover:text-red mt-2 transition-colors"
            >
              Dosyayı Kaldır
            </button>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-2">📎</div>
            <div className="text-sm text-text-muted">
              {dosyaTipi === 'dava' ? 'Dava evrakını' : 'İcra evrakını'} sürükleyip bırakın
            </div>
            <div className="text-xs text-text-dim mt-1">
              PDF, Word, resim, taranmış belge (maks. 10MB)
            </div>
          </div>
        )}
        <input
          id="dosya-belge-input"
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.bmp,.xls,.xlsx"
          onChange={(e) => handleDosyaSec(e.target.files?.[0] || null)}
        />
      </div>

      {boyutHata && (
        <div className="text-xs text-red mb-3 bg-red-dim px-3 py-2 rounded-lg border border-red/20">
          {boyutHata}
        </div>
      )}

      {/* Evrak Türü Chips */}
      <div className="mb-4">
        <div className="text-xs font-medium text-text-muted mb-2">Evrak Türü</div>
        <div className="flex flex-wrap gap-1.5">
          {evrakTurleri.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setEvrakTuru(t.key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                evrakTuru === t.key
                  ? 'bg-gold/15 text-gold border-gold/30 font-bold'
                  : 'bg-surface2 text-text-muted border-border hover:border-gold/20'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {selectedTur && (
          <div className="text-[10px] text-gold mt-1.5">{selectedTur.icon} {selectedTur.label} seçildi</div>
        )}
      </div>

      {/* Form Alanları */}
      <div className="space-y-3">
        <FormGroup label="Evrak Adı" required>
          <FormInput value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ör: 2026 tarihli tensip zaptı" />
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
