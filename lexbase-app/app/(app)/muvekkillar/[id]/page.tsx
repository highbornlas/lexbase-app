'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMuvekkil, useMuvDavalar, useMuvIcralar, useMuvArabuluculuklar, useMuvIhtarnameler } from '@/lib/hooks/useMuvekkillar';
import { useFinansOzet } from '@/lib/hooks/useFinans';
import { MuvKpiCards } from '@/components/modules/muvekkil/MuvKpiCards';
import { MuvKimlik } from '@/components/modules/muvekkil/MuvKimlik';
import { MuvDosyalar } from '@/components/modules/muvekkil/MuvDosyalar';
import { MuvRapor } from '@/components/modules/muvekkil/MuvRapor';
import { MuvekkilModal } from '@/components/modules/MuvekkilModal';
import { DavaModal } from '@/components/modules/DavaModal';
import { IcraModal } from '@/components/modules/IcraModal';
import { ArabuluculukModal } from '@/components/modules/ArabuluculukModal';
import { IhtarnameModal } from '@/components/modules/IhtarnameModal';
import { MuvNotlar } from '@/components/modules/muvekkil/MuvNotlar';
import { MuvMasrafAvans } from '@/components/modules/muvekkil/MuvMasrafAvans';
import { MuvAlacak } from '@/components/modules/muvekkil/MuvAlacak';
import { MuvIletisimGecmisi } from '@/components/modules/muvekkil/MuvIletisimGecmisi';
import { MuvIliskiler } from '@/components/modules/muvekkil/MuvIliskiler';
import { MuvPlanlama } from '@/components/modules/muvekkil/MuvPlanlama';
import { MuvDanismanlik } from '@/components/modules/muvekkil/MuvDanismanlik';
import { MuvBelgeler } from '@/components/modules/muvekkil/MuvBelgeler';
import { useMuvekkilKaydet, useMuvekkilSil } from '@/lib/hooks/useMuvekkillar';
import { useDavaKaydet } from '@/lib/hooks/useDavalar';
import { useIcraKaydet } from '@/lib/hooks/useIcra';
import { useArabuluculukKaydet } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameKaydet } from '@/lib/hooks/useIhtarname';
import { useSonErisim } from '@/lib/hooks/useSonErisim';

/* ══════════════════════════════════════════════════════════════
   Müvekkil Detay Sayfası — 11 Sekmeli ERP Yapısı
   ══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'dosyalar', label: '📁 Dosyalar' },
  { key: 'kimlik', label: '🪪 Kimlik & İletişim' },
  { key: 'masraf', label: '💸 Masraf & Avans' },
  { key: 'alacak', label: '💰 Alacak' },
  { key: 'iletisim', label: '📞 İletişim Geçmişi' },
  { key: 'iliskiler', label: '🔗 İlişkiler' },
  { key: 'planlama', label: '📋 Planlama' },
  { key: 'danismanlik', label: '💼 Danışmanlık' },
  { key: 'belgeler', label: '📎 Belgeler' },
  { key: 'rapor', label: '📊 Rapor' },
  { key: 'notlar', label: '📝 Notlar' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function MuvekkilDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  /* ── Veri Hook'ları ── */
  const { data: muv, isLoading } = useMuvekkil(id);
  const { data: finansOzet } = useFinansOzet(id);
  const { data: davalar } = useMuvDavalar(id);
  const { data: icralar } = useMuvIcralar(id);
  const { data: arabuluculuklar } = useMuvArabuluculuklar(id);
  const { data: ihtarnameler } = useMuvIhtarnameler(id);

  /* ── Navigation ── */
  const router = useRouter();

  /* ── Mutation ── */
  const kaydetMutation = useMuvekkilKaydet();
  const silMut = useMuvekkilSil();
  const davaKaydet = useDavaKaydet();
  const icraKaydet = useIcraKaydet();
  const arabKaydet = useArabuluculukKaydet();
  const ihtKaydet = useIhtarnameKaydet();

  /* ── UI State ── */
  const [aktifTab, setAktifTab] = useState<TabKey>('dosyalar');
  const [editOpen, setEditOpen] = useState(false);
  const [yeniDavaOpen, setYeniDavaOpen] = useState(false);
  const [yeniIcraOpen, setYeniIcraOpen] = useState(false);
  const [yeniArabuluculukOpen, setYeniArabuluculukOpen] = useState(false);
  const [yeniIhtarnameOpen, setYeniIhtarnameOpen] = useState(false);
  const [seciliIhtarname, setSeciliIhtarname] = useState<Record<string, unknown> | null>(null);
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (muv && !(muv as Record<string, unknown>)._silindi) {
      kaydetErisim({ id: muv.id, tip: 'muvekkil', baslik: muv.ad || muv.id.slice(0, 8), tarih: new Date().toISOString() });
    }
  }, [muv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dosya sayıları (KPI) ── */
  const davaArr = davalar || [];
  const icraArr = icralar || [];
  const arabArr = arabuluculuklar || [];
  const ihtArr = ihtarnameler || [];

  const dosyaSayisi = davaArr.length + icraArr.length + arabArr.length + ihtArr.length;
  const aktifDosya = useMemo(() => {
    const aktifDurumlar = ['Aktif', 'derdest', 'Devam Ediyor', 'Başvuru', 'Görüşme', 'Hazırlandı', 'Gönderildi', 'Taslak'];
    const count = (arr: Record<string, unknown>[]) =>
      arr.filter((d) => aktifDurumlar.includes((d.durum as string) || '')).length;
    return count(davaArr) + count(icraArr) + count(arabArr) + count(ihtArr);
  }, [davaArr, icraArr, arabArr, ihtArr]);

  /* ── Yeni dosya ekleme handler ── */
  const handleYeniEkle = (tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname') => {
    if (tur === 'dava') setYeniDavaOpen(true);
    else if (tur === 'icra') setYeniIcraOpen(true);
    else if (tur === 'arabuluculuk') setYeniArabuluculukOpen(true);
    else setYeniIhtarnameOpen(true);
  };

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (!muv || (muv as Record<string, unknown>)._silindi) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-4xl">🔍</div>
        <div className="text-text-muted text-sm">
          {(muv as Record<string, unknown> | null)?._silindi ? 'Bu müvekkil silinmiş' : 'Müvekkil bulunamadı'}
        </div>
        <Link href="/muvekkillar" className="text-gold text-sm hover:text-gold-light">
          ← Müvekkil Listesine Dön
        </Link>
      </div>
    );
  }

  const tipLabel = muv.tip === 'tuzel' ? 'TÜZEL KİŞİ' : 'GERÇEK KİŞİ';
  const tipColor = muv.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 'text-green bg-green-dim border-green/20';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-dim mb-4">
        <Link href="/muvekkillar" className="hover:text-gold transition-colors">Müvekkiller</Link>
        <span>›</span>
        <span className="text-text-muted">{muv.ad}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {muv.kayitNo && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                M-{String(muv.kayitNo).padStart(3, '0')}
              </span>
            )}
            <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
              {[muv.ad, muv.soyad].filter(Boolean).join(' ')}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tipColor}`}>
              {tipLabel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            {muv.tc && <span>TC: {muv.tc}</span>}
            {muv.vergiNo && <span>VKN: {muv.vergiNo}</span>}
            {muv.tel && <span>📞 {muv.tel}</span>}
            {muv.mail && <span>✉️ {muv.mail}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSabitle({ id: muv.id, tip: 'muvekkil', baslik: muv.ad || muv.id.slice(0, 8), tarih: new Date().toISOString() })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isSabitlenen(muv.id) ? 'bg-gold/10 text-gold border-gold/20' : 'text-text-muted border-border hover:border-gold hover:text-gold'}`}
            title={isSabitlenen(muv.id) ? 'Hızlı erişimden kaldır' : 'Hızlı erişime sabitle'}
          >
            {isSabitlenen(muv.id) ? '⭐' : '☆'}
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-text-muted border border-border rounded-lg hover:border-gold hover:text-gold transition-colors"
          >
            ✏️ Düzenle
          </button>
          <button
            onClick={async () => {
              if (confirm(`"${muv.ad}" silinecek. Emin misiniz?`)) {
                await silMut.mutateAsync(id);
                router.push('/muvekkillar');
              }
            }}
            className="px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red-dim transition-colors"
            title="Sil"
          >
            🗑️ Sil
          </button>
        </div>
      </div>

      {/* Modal'lar */}
      <MuvekkilModal open={editOpen} onClose={() => setEditOpen(false)} muvekkil={muv} />
      <DavaModal open={yeniDavaOpen} onClose={() => setYeniDavaOpen(false)} />
      <IcraModal open={yeniIcraOpen} onClose={() => setYeniIcraOpen(false)} />
      <ArabuluculukModal open={yeniArabuluculukOpen} onClose={() => setYeniArabuluculukOpen(false)} />
      <IhtarnameModal open={yeniIhtarnameOpen} onClose={() => { setYeniIhtarnameOpen(false); setSeciliIhtarname(null); }} ihtarname={seciliIhtarname as import('@/lib/hooks/useIhtarname').Ihtarname | null} />

      {/* KPI Cards */}
      <MuvKpiCards
        dosyaSayisi={dosyaSayisi}
        aktifDosya={aktifDosya}
        finansOzet={finansOzet}
      />

      {/* Tab Navigation */}
      <div className="flex gap-0 border-b-2 border-border mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            className={`
              px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-[2px] transition-all
              ${aktifTab === tab.key
                ? 'text-gold border-gold'
                : 'text-text-muted border-transparent hover:text-text hover:border-border'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {aktifTab === 'dosyalar' && (
          <MuvDosyalar
            davalar={davaArr}
            icralar={icraArr}
            arabuluculuklar={arabArr}
            ihtarnameler={ihtArr}
            onYeniEkle={handleYeniEkle}
            onIhtarnameClick={(item) => { setSeciliIhtarname(item); setYeniIhtarnameOpen(true); }}
          />
        )}
        {aktifTab === 'kimlik' && <MuvKimlik muv={muv} />}
        {aktifTab === 'masraf' && (
          <MuvMasrafAvans
            davalar={davaArr}
            icralar={icraArr}
            arabuluculuklar={arabArr}
            ihtarnameler={ihtArr}
            finansOzet={finansOzet}
            onMasrafKaydet={(dosyaId, dosyaTur, harcama) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const turMap: Record<string, { arr: Record<string, unknown>[]; kaydet: { mutate: (v: any) => void } }> = {
                'Dava': { arr: davaArr, kaydet: davaKaydet },
                'İcra': { arr: icraArr, kaydet: icraKaydet },
                'Arabuluculuk': { arr: arabArr, kaydet: arabKaydet },
                'İhtarname': { arr: ihtArr, kaydet: ihtKaydet },
              };
              const hedef = turMap[dosyaTur];
              if (!hedef) return;
              const dosya = hedef.arr.find((d) => d.id === dosyaId);
              if (!dosya) return;
              const mevcutHarcamalar = (dosya.harcamalar || []) as Array<Record<string, unknown>>;
              hedef.kaydet.mutate({ ...dosya, harcamalar: [...mevcutHarcamalar, harcama] } as never);
            }}
          />
        )}
        {aktifTab === 'alacak' && (
          <MuvAlacak
            davalar={davaArr}
            icralar={icraArr}
            arabuluculuklar={arabArr}
            ihtarnameler={ihtArr}
            finansOzet={finansOzet}
            onTahsilatKaydet={(dosyaId, dosyaTur, tahsilat) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const turMap: Record<string, { arr: Record<string, unknown>[]; kaydet: { mutate: (v: any) => void } }> = {
                'Dava': { arr: davaArr, kaydet: davaKaydet },
                'İcra': { arr: icraArr, kaydet: icraKaydet },
                'Arabuluculuk': { arr: arabArr, kaydet: arabKaydet },
                'İhtarname': { arr: ihtArr, kaydet: ihtKaydet },
              };
              const hedef = turMap[dosyaTur];
              if (!hedef) return;
              const dosya = hedef.arr.find((d) => d.id === dosyaId);
              if (!dosya) return;
              const mevcutTahsilatlar = (dosya.tahsilatlar || []) as Array<Record<string, unknown>>;
              hedef.kaydet.mutate({ ...dosya, tahsilatlar: [...mevcutTahsilatlar, tahsilat] } as never);
            }}
          />
        )}
        {aktifTab === 'iletisim' && <MuvIletisimGecmisi muvId={id} />}
        {aktifTab === 'iliskiler' && <MuvIliskiler muv={muv} />}
        {aktifTab === 'planlama' && <MuvPlanlama muvId={id} />}
        {aktifTab === 'danismanlik' && <MuvDanismanlik muvId={id} />}
        {aktifTab === 'belgeler' && <MuvBelgeler muvId={id} />}
        {aktifTab === 'rapor' && <MuvRapor muv={muv} finansOzet={finansOzet} />}
        {aktifTab === 'notlar' && <MuvNotlar muv={muv} onKaydet={(g) => kaydetMutation.mutateAsync(g)} />}
      </div>
    </div>
  );
}

/* ── Placeholder (henüz geliştirilmemiş sekmeler) ── */
function PlaceholderTab({ icon, baslik, aciklama }: { icon: string; baslik: string; aciklama: string }) {
  return (
    <div className="text-center py-16 text-text-muted bg-surface border border-border rounded-lg">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-semibold mb-1">{baslik}</div>
      <div className="text-xs text-text-dim">{aciklama}</div>
    </div>
  );
}

