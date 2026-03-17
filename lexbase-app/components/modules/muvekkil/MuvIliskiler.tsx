'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';
import { useMuvekkillar, useMuvekkilKaydet } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTaraflar } from '@/lib/hooks/useKarsiTaraflar';
import { useVekillar } from '@/lib/hooks/useVekillar';
import { Modal, FormGroup, FormSelect, FormInput, BtnGold, BtnOutline } from '@/components/ui/Modal';

/* ── İlişki türleri ve renkleri ── */
const ILISKI_TURLERI = [
  'Eş', 'Anne/Baba', 'Çocuk', 'Kardeş', 'Ortak/Hissedar',
  'Yönetim Kurulu', 'İşveren/İşçi', 'Vekil', 'Kefil', 'Diğer'
] as const;

const TUR_RENK: Record<string, string> = {
  'Eş': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'Anne/Baba': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Çocuk': 'text-green bg-green-dim border-green/20',
  'Kardeş': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Ortak/Hissedar': 'text-gold bg-gold-dim border-gold/20',
  'Yönetim Kurulu': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'İşveren/İşçi': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Vekil': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Kefil': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Diğer': 'text-text-dim bg-surface2 border-border',
};

/* ── Ters ilişki eşleştirmesi ── */
const TERS_ILISKI: Record<string, string> = {
  'Eş': 'Eş',
  'Anne/Baba': 'Çocuk',
  'Çocuk': 'Anne/Baba',
  'Kardeş': 'Kardeş',
  'Ortak/Hissedar': 'Ortak/Hissedar',
  'Yönetim Kurulu': 'Yönetim Kurulu',
  'İşveren/İşçi': 'İşveren/İşçi',
  'Vekil': 'Vekil',
  'Kefil': 'Kefil',
  'Diğer': 'Diğer',
};

/* ── Birleşik kişi arayüzü ── */
interface BirlesikKisi {
  id: string;
  ad: string;
  kaynak: 'muvekkil' | 'karsiTaraf' | 'avukat';
  kaynakLabel: string;
  tip?: string; // gercek/tuzel
}

const KAYNAK_RENK: Record<string, string> = {
  muvekkil: 'text-green bg-green-dim',
  karsiTaraf: 'text-orange-400 bg-orange-400/10',
  avukat: 'text-blue-400 bg-blue-400/10',
};

interface Props {
  muv: Muvekkil;
}

export function MuvIliskiler({ muv }: Props) {
  const { data: tumMuvekkillar = [] } = useMuvekkillar();
  const { data: tumKarsiTaraflar = [] } = useKarsiTaraflar();
  const { data: tumVekillar = [] } = useVekillar();
  const kaydetMut = useMuvekkilKaydet();
  const [modalOpen, setModalOpen] = useState(false);

  const iliskiler = muv.iliskiler || [];

  /* ── Tüm kişileri birleştir (rehber) ── */
  const tumKisiler = useMemo<BirlesikKisi[]>(() => {
    const result: BirlesikKisi[] = [];
    tumMuvekkillar.forEach((m) => {
      if (m.id !== muv.id) {
        result.push({ id: m.id, ad: m.ad, kaynak: 'muvekkil', kaynakLabel: 'Müvekkil', tip: m.tip });
      }
    });
    tumKarsiTaraflar.forEach((k) => {
      result.push({ id: k.id, ad: (k as Record<string, unknown>).ad as string || '', kaynak: 'karsiTaraf', kaynakLabel: 'Karşı Taraf', tip: (k as Record<string, unknown>).tip as string });
    });
    tumVekillar.forEach((v) => {
      const ad = [v.ad, v.soyad].filter(Boolean).join(' ');
      result.push({ id: v.id, ad: ad || '', kaynak: 'avukat', kaynakLabel: 'Avukat', tip: undefined });
    });
    return result;
  }, [tumMuvekkillar, tumKarsiTaraflar, tumVekillar, muv.id]);

  /* ── İlişki ekle (çift yönlü — sadece müvekkil-müvekkil arası) ── */
  const handleEkle = async (hedefId: string, tur: string, acik: string) => {
    const yeniId = crypto.randomUUID();

    // Bu müvekkile ekle
    const guncelIliskiler = [...iliskiler, { id: yeniId, hedefId, tur, acik }];
    await kaydetMut.mutateAsync({ ...muv, iliskiler: guncelIliskiler });

    // Karşı tarafa da ekle (sadece müvekkil ise — çift yönlü)
    const hedef = tumMuvekkillar.find((m) => m.id === hedefId);
    if (hedef) {
      const hedefIliskiler = hedef.iliskiler || [];
      const tersId = crypto.randomUUID();
      const tersTur = TERS_ILISKI[tur] || 'Diğer';
      await kaydetMut.mutateAsync({
        ...hedef,
        iliskiler: [...hedefIliskiler, { id: tersId, hedefId: muv.id, tur: tersTur, acik }],
      });
    }

    setModalOpen(false);
  };

  /* ── İlişki sil (çift yönlü) ── */
  const handleSil = async (iliski: { id: string; hedefId: string }) => {
    // Bu müvekkilden kaldır
    const guncel = iliskiler.filter((i) => i.id !== iliski.id);
    await kaydetMut.mutateAsync({ ...muv, iliskiler: guncel });

    // Karşı taraftan da kaldır (sadece müvekkil ise)
    const hedef = tumMuvekkillar.find((m) => m.id === iliski.hedefId);
    if (hedef) {
      const hedefIliskiler = (hedef.iliskiler || []).filter((i) => i.hedefId !== muv.id);
      await kaydetMut.mutateAsync({ ...hedef, iliskiler: hedefIliskiler });
    }
  };

  /* ── Kişi adı çözücü ── */
  const kisiAd = (id: string) => {
    return tumKisiler.find((k) => k.id === id)?.ad || tumMuvekkillar.find((m) => m.id === id)?.ad || 'Bilinmeyen';
  };

  /* ── Kişi link'i ── */
  const kisiLink = (id: string) => {
    const kisi = tumKisiler.find((k) => k.id === id);
    if (!kisi) return `/muvekkillar/${id}`;
    if (kisi.kaynak === 'muvekkil') return `/muvekkillar/${id}`;
    if (kisi.kaynak === 'karsiTaraf') return `/muvekkillar/${id}`; // Karşı taraf sayfası varsa güncellenebilir
    return `/muvekkillar/${id}`;
  };

  /* ── Kişi kaynak badge ── */
  const kisiBadge = (id: string) => {
    const kisi = tumKisiler.find((k) => k.id === id);
    if (!kisi) return null;
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded ml-1 ${KAYNAK_RENK[kisi.kaynak] || ''}`}>
        {kisi.kaynakLabel}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">🔗 İlişkiler ({iliskiler.length})</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
        >
          + İlişki Ekle
        </button>
      </div>

      {/* İlişki Kartları */}
      {iliskiler.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">🔗</div>
          <div className="text-sm font-medium">Henüz ilişki tanımlanmamış</div>
          <div className="text-xs text-text-dim mt-1">Müvekkilin diğer kişilerle ilişkilerini tanımlayın</div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
          >
            + İlk İlişkiyi Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {iliskiler.map((i) => (
            <div key={i.id} className="bg-surface border border-border rounded-lg p-4 group hover:border-gold/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TUR_RENK[i.tur] || TUR_RENK['Diğer']}`}>
                      {i.tur}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Link
                      href={kisiLink(i.hedefId)}
                      className="text-sm font-semibold text-gold hover:text-gold-light transition-colors"
                    >
                      {kisiAd(i.hedefId)}
                    </Link>
                    {kisiBadge(i.hedefId)}
                  </div>
                  {i.acik && <div className="text-xs text-text-muted mt-1">{i.acik}</div>}
                </div>
                <button
                  onClick={() => handleSil(i)}
                  className="text-text-dim hover:text-red text-xs opacity-0 group-hover:opacity-100 transition-all"
                  title="İlişkiyi kaldır"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* İlişki Ekle Modal */}
      <IliskiEkleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onKaydet={handleEkle}
        kisiler={tumKisiler}
      />
    </div>
  );
}

/* ── İlişki Ekle Modal ── */
function IliskiEkleModal({
  open,
  onClose,
  onKaydet,
  kisiler,
}: {
  open: boolean;
  onClose: () => void;
  onKaydet: (hedefId: string, tur: string, acik: string) => void;
  kisiler: BirlesikKisi[];
}) {
  const [hedefId, setHedefId] = useState('');
  const [tur, setTur] = useState('Eş');
  const [acik, setAcik] = useState('');
  const [arama, setArama] = useState('');
  const [kaynakFiltre, setKaynakFiltre] = useState<string>('');

  const filtreli = useMemo(() => {
    let sonuc = kisiler;
    if (kaynakFiltre) {
      sonuc = sonuc.filter((k) => k.kaynak === kaynakFiltre);
    }
    if (arama) {
      const q = arama.toLocaleLowerCase('tr');
      sonuc = sonuc.filter((k) => k.ad.toLocaleLowerCase('tr').includes(q));
    }
    return sonuc;
  }, [kisiler, arama, kaynakFiltre]);

  const handleSubmit = () => {
    if (!hedefId) return;
    onKaydet(hedefId, tur, acik);
    setHedefId('');
    setTur('Eş');
    setAcik('');
    setArama('');
    setKaynakFiltre('');
  };

  return (
    <Modal open={open} onClose={onClose} title="İlişki Ekle">
      <FormGroup label="Kişi *">
        <div className="flex gap-2 mb-1">
          <FormInput
            value={arama}
            onChange={(e) => { setArama(e.target.value); setHedefId(''); }}
            placeholder="Kişi ara..."
          />
          <select
            value={kaynakFiltre}
            onChange={(e) => setKaynakFiltre(e.target.value)}
            className="text-[11px] px-2 py-1.5 bg-surface border border-border rounded-lg text-text-muted focus:border-gold focus:outline-none min-w-[100px]"
          >
            <option value="">Tümü</option>
            <option value="muvekkil">Müvekkil</option>
            <option value="karsiTaraf">Karşı Taraf</option>
            <option value="avukat">Avukat</option>
          </select>
        </div>
        {arama && filtreli.length > 0 && !hedefId && (
          <div className="mt-1 max-h-40 overflow-y-auto bg-bg border border-border rounded-lg">
            {filtreli.slice(0, 15).map((k) => (
              <button
                key={k.id}
                onClick={() => { setHedefId(k.id); setArama(k.ad); }}
                className="w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors flex items-center justify-between"
              >
                <span>{k.ad}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${KAYNAK_RENK[k.kaynak] || ''}`}>
                  {k.kaynakLabel}
                </span>
              </button>
            ))}
          </div>
        )}
        {arama && filtreli.length === 0 && !hedefId && (
          <div className="mt-1 text-xs text-text-dim px-3 py-2 bg-surface2 rounded-lg">
            Eşleşen kişi bulunamadı
          </div>
        )}
        {hedefId && (
          <div className="mt-1 text-xs text-green flex items-center gap-1">
            ✓ {arama} seçildi
          </div>
        )}
      </FormGroup>
      <FormGroup label="İlişki Türü">
        <FormSelect value={tur} onChange={(e) => setTur(e.target.value)}>
          {ILISKI_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
        </FormSelect>
      </FormGroup>
      <FormGroup label="Açıklama">
        <FormInput value={acik} onChange={(e) => setAcik(e.target.value)} placeholder="Opsiyonel açıklama" />
      </FormGroup>
      <div className="flex justify-end gap-2 pt-2">
        <BtnOutline onClick={onClose}>İptal</BtnOutline>
        <BtnGold onClick={handleSubmit} disabled={!hedefId}>Kaydet</BtnGold>
      </div>
    </Modal>
  );
}
