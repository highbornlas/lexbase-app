'use client';

import { useState, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { BELGE_TURLERI, type BelgeTur } from '@/lib/hooks/useBelgeler';

interface Props {
  open: boolean;
  onClose: () => void;
  onKaydet: (belgeData: BelgeFormData, dosya: File) => void;
  yukleniyor?: boolean;
}

export interface BelgeFormData {
  ad: string;
  tur: BelgeTur;
  tarih: string;
  etiketler: string[];
  meta?: {
    bitis?: string;
    noter?: string;
    yevmiye?: string;
    vekil?: string;
    ozel?: boolean;
    ozelAcik?: string;
  };
}

export function BelgeModal({ open, onClose, onKaydet, yukleniyor }: Props) {
  const [dosya, setDosya] = useState<File | null>(null);
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState<BelgeTur>('diger');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [etiketStr, setEtiketStr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [boyutHata, setBoyutHata] = useState('');

  const belgeForm = useMemo(() => ({ ad, tur, tarih, etiketStr }), [ad, tur, tarih, etiketStr]);
  const belgeInitial = useMemo(() => ({ ad: '', tur: 'diger' as BelgeTur, tarih: new Date().toISOString().slice(0, 10), etiketStr: '' }), []);
  const draftKey = 'belge_yeni';
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, belgeForm as Record<string, unknown>, belgeInitial as Record<string, unknown>, open
  );

  // Vekaletname özel
  const [vekBitis, setVekBitis] = useState('');
  const [vekNoter, setVekNoter] = useState('');
  const [vekYevmiye, setVekYevmiye] = useState('');
  const [vekVekil, setVekVekil] = useState('');
  const [vekOzel, setVekOzel] = useState(false);
  const [vekOzelAcik, setVekOzelAcik] = useState('');

  const MAX_BOYUT = 5 * 1024 * 1024;

  const handleDosyaSec = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BOYUT) {
      setBoyutHata('Dosya boyutu 5MB\'dan büyük olamaz');
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
    const formData: BelgeFormData = {
      ad: ad.trim(),
      tur,
      tarih,
      etiketler,
    };

    if (tur === 'vekaletname') {
      formData.meta = {
        bitis: vekBitis || undefined,
        noter: vekNoter || undefined,
        yevmiye: vekYevmiye || undefined,
        vekil: vekVekil || undefined,
        ozel: vekOzel || undefined,
        ozelAcik: vekOzel ? vekOzelAcik || undefined : undefined,
      };
    }

    clearDraft();
    onKaydet(formData, dosya);
  };

  const handleClose = () => {
    setDosya(null);
    setAd('');
    setTur('diger');
    setTarih(new Date().toISOString().slice(0, 10));
    setEtiketStr('');
    setBoyutHata('');
    setVekBitis('');
    setVekNoter('');
    setVekYevmiye('');
    setVekVekil('');
    setVekOzel(false);
    setVekOzelAcik('');
    onClose();
  };

  const fmtBoyut = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal open={open} onClose={handleClose} title="Belge Yükle" maxWidth="max-w-xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => {
        const d = loadDraft();
        if (d) {
          const draft = d as Record<string, unknown>;
          if (draft.ad) setAd(draft.ad as string);
          if (draft.tur) setTur(draft.tur as BelgeTur);
          if (draft.tarih) setTarih(draft.tarih as string);
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
    }>
      {/* Dosya Seçim / Sürükle-Bırak */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer mb-4 ${
          dragOver ? 'border-gold bg-gold-dim' : dosya ? 'border-green/40 bg-green-dim' : 'border-border hover:border-gold/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('belge-file-input')?.click()}
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
            <div className="text-sm text-text-muted">Dosyayı sürükleyip bırakın</div>
            <div className="text-xs text-text-dim mt-1">veya tıklayarak seçin (maks. 5MB)</div>
          </div>
        )}
        <input
          id="belge-file-input"
          type="file"
          className="hidden"
          onChange={(e) => handleDosyaSec(e.target.files?.[0] || null)}
        />
      </div>

      {boyutHata && (
        <div className="text-xs text-red mb-3 bg-red-dim px-3 py-2 rounded-lg border border-red/20">
          {boyutHata}
        </div>
      )}

      {/* Form Alanları */}
      <div className="space-y-3">
        <FormGroup label="Belge Adı" required>
          <FormInput value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Genel vekaletname" />
        </FormGroup>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Tür" required>
            <FormSelect value={tur} onChange={(e) => setTur(e.target.value as BelgeTur)}>
              {BELGE_TURLERI.map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Tarih">
            <FormInput type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </FormGroup>
        </div>

        <FormGroup label="Etiketler">
          <FormInput
            value={etiketStr}
            onChange={(e) => setEtiketStr(e.target.value)}
            placeholder="Virgülle ayırın: acil, mahkeme, noter"
          />
        </FormGroup>

        {/* Vekaletname Özel Alanları */}
        {tur === 'vekaletname' && (
          <div className="bg-surface2 border border-border rounded-lg p-3 space-y-3">
            <div className="text-xs font-semibold text-gold uppercase tracking-wider">Vekaletname Bilgileri</div>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Geçerlilik Bitiş">
                <FormInput type="date" value={vekBitis} onChange={(e) => setVekBitis(e.target.value)} />
              </FormGroup>
              <FormGroup label="Vekil Adı">
                <FormInput value={vekVekil} onChange={(e) => setVekVekil(e.target.value)} placeholder="Av. ..." />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Noter">
                <FormInput value={vekNoter} onChange={(e) => setVekNoter(e.target.value)} placeholder="İstanbul 5. Noteri" />
              </FormGroup>
              <FormGroup label="Yevmiye No">
                <FormInput value={vekYevmiye} onChange={(e) => setVekYevmiye(e.target.value)} placeholder="12345" />
              </FormGroup>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vekOzel}
                  onChange={(e) => setVekOzel(e.target.checked)}
                  className="rounded border-border bg-bg text-gold focus:ring-gold"
                />
                <span className="text-xs text-text">Özel Yetkiler İçerir</span>
              </label>
              {vekOzel && (
                <FormInput
                  className="mt-2"
                  value={vekOzelAcik}
                  onChange={(e) => setVekOzelAcik(e.target.value)}
                  placeholder="Özel yetki açıklaması..."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
