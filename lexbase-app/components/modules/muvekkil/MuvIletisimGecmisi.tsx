'use client';

import { useState, useMemo } from 'react';
import { useMuvIletisimler, useIletisimKaydet, useIletisimSil, KANALLAR, type Iletisim } from '@/lib/hooks/useIletisimler';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';

/* ── Kanal renkleri ── */
const KANAL_RENK: Record<string, string> = {
  'Telefon': 'text-green bg-green-dim border-green/20',
  'E-posta': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Yüz Yüze': 'text-gold bg-gold-dim border-gold/20',
  'Faks': 'text-text-dim bg-surface2 border-border',
  'Posta': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Video': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Diğer': 'text-text-dim bg-surface2 border-border',
};

interface Props {
  muvId: string;
}

export function MuvIletisimGecmisi({ muvId }: Props) {
  const { data: iletisimler = [], isLoading } = useMuvIletisimler(muvId);
  const kaydetMut = useIletisimKaydet();
  const silMut = useIletisimSil();
  const [modalOpen, setModalOpen] = useState(false);
  const [duzenle, setDuzenle] = useState<Iletisim | null>(null);

  /* ── Aya göre grupla ── */
  const gruplar = useMemo(() => {
    const map: Record<string, Iletisim[]> = {};
    iletisimler.forEach((i) => {
      const ay = i.tarih ? i.tarih.slice(0, 7) : 'Tarihsiz';
      if (!map[ay]) map[ay] = [];
      map[ay].push(i);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [iletisimler]);

  const ayLabel = (ayStr: string) => {
    if (ayStr === 'Tarihsiz') return 'Tarihsiz';
    const [yil, ay] = ayStr.split('-');
    const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${aylar[parseInt(ay) - 1] || ay} ${yil}`;
  };

  const handleKaydet = async (form: Partial<Iletisim>) => {
    await kaydetMut.mutateAsync({
      id: form.id || crypto.randomUUID(),
      muvId,
      tarih: form.tarih || new Date().toISOString().slice(0, 10),
      saat: form.saat || '',
      kanal: form.kanal || 'Telefon',
      konu: form.konu || '',
      ozet: form.ozet || '',
    });
    setModalOpen(false);
    setDuzenle(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-text-dim text-sm">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">📞 İletişim Geçmişi ({iletisimler.length})</h3>
        <button
          onClick={() => { setDuzenle(null); setModalOpen(true); }}
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
        >
          + Yeni İletişim
        </button>
      </div>

      {/* Liste */}
      {iletisimler.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">📞</div>
          <div className="text-sm font-medium">Henüz iletişim kaydı yok</div>
          <div className="text-xs text-text-dim mt-1">Müvekkilinizle yapılan görüşmeleri kaydedin</div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
          >
            + İlk İletişimi Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {gruplar.map(([ay, kayitlar]) => (
            <div key={ay}>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold/50" />
                {ayLabel(ay)}
              </div>
              <div className="space-y-2 ml-3 border-l-2 border-border pl-4">
                {kayitlar.map((i) => (
                  <div key={i.id} className="bg-surface border border-border rounded-lg p-3.5 group hover:border-gold/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${KANAL_RENK[i.kanal] || KANAL_RENK['Diğer']}`}>
                            {i.kanal}
                          </span>
                          <span className="text-xs font-semibold text-text">{i.konu}</span>
                        </div>
                        {i.ozet && <div className="text-xs text-text-muted mt-1">{i.ozet}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-dim">{i.tarih} {i.saat}</span>
                        <button
                          onClick={() => silMut.mutateAsync(i.id)}
                          className="text-text-dim hover:text-red text-xs opacity-0 group-hover:opacity-100 transition-all"
                          title="Sil"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <IletisimEkleModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setDuzenle(null); }}
        onKaydet={handleKaydet}
        iletisim={duzenle}
      />
    </div>
  );
}

/* ── İletişim Ekle/Düzenle Modal ── */
function IletisimEkleModal({
  open,
  onClose,
  onKaydet,
  iletisim,
}: {
  open: boolean;
  onClose: () => void;
  onKaydet: (form: Partial<Iletisim>) => void;
  iletisim: Iletisim | null;
}) {
  const [form, setForm] = useState({
    tarih: new Date().toISOString().slice(0, 10),
    saat: new Date().toTimeString().slice(0, 5),
    kanal: 'Telefon',
    konu: '',
    ozet: '',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Reset form when modal opens
  const handleSubmit = () => {
    if (!form.konu.trim()) return;
    onKaydet({
      id: iletisim?.id,
      ...form,
    });
    setForm({ tarih: new Date().toISOString().slice(0, 10), saat: new Date().toTimeString().slice(0, 5), kanal: 'Telefon', konu: '', ozet: '' });
  };

  return (
    <Modal open={open} onClose={onClose} title={iletisim ? 'İletişim Düzenle' : 'Yeni İletişim Kaydı'}>
      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Tarih">
          <FormInput type="date" value={form.tarih} onChange={(e) => set('tarih', e.target.value)} />
        </FormGroup>
        <FormGroup label="Saat">
          <FormInput type="time" value={form.saat} onChange={(e) => set('saat', e.target.value)} />
        </FormGroup>
      </div>
      <FormGroup label="Kanal">
        <FormSelect value={form.kanal} onChange={(e) => set('kanal', e.target.value)}>
          {KANALLAR.map((k) => <option key={k} value={k}>{k}</option>)}
        </FormSelect>
      </FormGroup>
      <FormGroup label="Konu *">
        <FormInput value={form.konu} onChange={(e) => set('konu', e.target.value)} placeholder="Görüşme konusu" />
      </FormGroup>
      <FormGroup label="Özet / Notlar">
        <FormTextarea value={form.ozet} onChange={(e) => set('ozet', e.target.value)} placeholder="Görüşme özeti..." rows={3} />
      </FormGroup>
      <div className="flex justify-end gap-2 pt-2">
        <BtnOutline onClick={onClose}>İptal</BtnOutline>
        <BtnGold onClick={handleSubmit} disabled={!form.konu.trim()}>Kaydet</BtnGold>
      </div>
    </Modal>
  );
}
