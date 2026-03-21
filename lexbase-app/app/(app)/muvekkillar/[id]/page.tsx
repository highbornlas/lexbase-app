'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMuvekkil, useMuvDavalar, useMuvIcralar, useMuvArabuluculuklar, useMuvIhtarnameler } from '@/lib/hooks/useMuvekkillar';
import { useFinansOzet } from '@/lib/hooks/useFinans';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { ClientHeader } from '@/components/modules/muvekkil/ClientHeader';
import { CompactStatsRow } from '@/components/modules/muvekkil/CompactStatsRow';
import { GenelBakis } from '@/components/modules/muvekkil/GenelBakis';
import { FinansTab } from '@/components/modules/muvekkil/FinansTab';
import { EvrakNotlarTab } from '@/components/modules/muvekkil/EvrakNotlarTab';
import { MuvDosyalar } from '@/components/modules/muvekkil/MuvDosyalar';
import { MuvekkilModal } from '@/components/modules/MuvekkilModal';
import { DavaModal } from '@/components/modules/DavaModal';
import { IcraModal } from '@/components/modules/IcraModal';
import { ArabuluculukModal } from '@/components/modules/ArabuluculukModal';
import { IhtarnameModal } from '@/components/modules/IhtarnameModal';
import { useMuvekkilKaydet, useMuvekkilSil } from '@/lib/hooks/useMuvekkillar';
import { useDavaKaydet } from '@/lib/hooks/useDavalar';
import { useIcraKaydet } from '@/lib/hooks/useIcra';
import { useArabuluculukKaydet } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameKaydet } from '@/lib/hooks/useIhtarname';
import { useSonErisim } from '@/lib/hooks/useSonErisim';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════
   Müvekkil Detay Sayfası — 4 Ana Sekmeli Yeni Yapı
   ══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'genel', label: 'Genel Bakış', icon: '🏠' },
  { key: 'dosyalar', label: 'Dosyalar', icon: '📁' },
  { key: 'finans', label: 'Finans', icon: '💰' },
  { key: 'evrak', label: 'Evrak & Notlar', icon: '📎' },
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
  const { data: tumDanismanliklar = [] } = useDanismanliklar();

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
  const [aktifTab, setAktifTab] = useState<TabKey>('genel');
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

  /* ── Hesaplamalar ── */
  const davaArr = davalar || [];
  const icraArr = icralar || [];
  const arabArr = arabuluculuklar || [];
  const ihtArr = ihtarnameler || [];

  const dosyaSayisi = davaArr.length + icraArr.length + arabArr.length + ihtArr.length;
  const aktifDosya = useMemo(() => {
    const aktifDurumlar = ['Derdest', 'Aktif', 'derdest', 'Devam Ediyor', 'Başvuru', 'Görüşme', 'Hazırlandı', 'Gönderildi', 'Taslak'];
    const count = (arr: Record<string, unknown>[]) =>
      arr.filter((d) => aktifDurumlar.includes((d.durum as string) || '')).length;
    return count(davaArr) + count(icraArr) + count(arabArr) + count(ihtArr);
  }, [davaArr, icraArr, arabArr, ihtArr]);

  const danismanlikSayisi = useMemo(
    () => tumDanismanliklar.filter((d: Record<string, unknown>) => d.muvId === id).length,
    [tumDanismanliklar, id]
  );

  /* ── Yeni dosya ekleme handler ── */
  const handleYeniEkle = (tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname') => {
    if (tur === 'dava') setYeniDavaOpen(true);
    else if (tur === 'icra') setYeniIcraOpen(true);
    else if (tur === 'arabuluculuk') setYeniArabuluculukOpen(true);
    else setYeniIhtarnameOpen(true);
  };

  /* ── Masraf & Tahsilat handlers ── */
  const turMap: Record<string, { arr: Record<string, unknown>[]; kaydet: { mutate: (v: never) => void } }> = {
    'Dava': { arr: davaArr, kaydet: davaKaydet },
    'İcra': { arr: icraArr, kaydet: icraKaydet },
    'Arabuluculuk': { arr: arabArr, kaydet: arabKaydet },
    'İhtarname': { arr: ihtArr, kaydet: ihtKaydet },
  };

  const handleMasrafKaydet = (dosyaId: string, dosyaTur: string, harcama: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => {
    const hedef = turMap[dosyaTur];
    if (!hedef) return;
    const dosya = hedef.arr.find((d) => d.id === dosyaId);
    if (!dosya) return;
    const mevcutHarcamalar = (dosya.harcamalar || []) as Array<Record<string, unknown>>;
    hedef.kaydet.mutate({ ...dosya, harcamalar: [...mevcutHarcamalar, harcama] } as never);
  };

  const handleTahsilatKaydet = (dosyaId: string, dosyaTur: string, tahsilat: { id: string; tarih: string; tutar: number; aciklama: string }) => {
    const hedef = turMap[dosyaTur];
    if (!hedef) return;
    const dosya = hedef.arr.find((d) => d.id === dosyaId);
    if (!dosya) return;
    const mevcutTahsilatlar = (dosya.tahsilatlar || []) as Array<Record<string, unknown>>;
    hedef.kaydet.mutate({ ...dosya, tahsilatlar: [...mevcutTahsilatlar, tahsilat] } as never);
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

  return (
    <div>
      {/* ── Sticky Profile Header (Kimlik Kartı) ── */}
      <ClientHeader
        muv={muv}
        isSabitlenen={isSabitlenen(muv.id)}
        onToggleSabitle={() => toggleSabitle({ id: muv.id, tip: 'muvekkil', baslik: muv.ad || muv.id.slice(0, 8), tarih: new Date().toISOString() })}
        onEdit={() => setEditOpen(true)}
        onDelete={async () => {
          if (confirm(`"${muv.ad}" silinecek. Emin misiniz?`)) {
            await silMut.mutateAsync(id);
            router.push('/muvekkillar');
          }
        }}
      />

      {/* ── Modal'lar ── */}
      <MuvekkilModal open={editOpen} onClose={() => setEditOpen(false)} muvekkil={muv} />
      <DavaModal open={yeniDavaOpen} onClose={() => setYeniDavaOpen(false)} />
      <IcraModal open={yeniIcraOpen} onClose={() => setYeniIcraOpen(false)} />
      <ArabuluculukModal open={yeniArabuluculukOpen} onClose={() => setYeniArabuluculukOpen(false)} />
      <IhtarnameModal open={yeniIhtarnameOpen} onClose={() => { setYeniIhtarnameOpen(false); setSeciliIhtarname(null); }} ihtarname={seciliIhtarname as import('@/lib/hooks/useIhtarname').Ihtarname | null} />

      {/* ── Compact KPI Row ── */}
      <div className="mt-5">
        <CompactStatsRow
          dosyaSayisi={dosyaSayisi}
          aktifDosya={aktifDosya}
          davaSayisi={davaArr.length}
          icraSayisi={icraArr.length}
          arabSayisi={arabArr.length}
          ihtSayisi={ihtArr.length}
          finansOzet={finansOzet}
        />
      </div>

      {/* ── Tab Navigation — 4 Sekme ── */}
      <div className="flex gap-0 border-b-2 border-border mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            className={`
              px-5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 -mb-[2px] transition-all flex items-center gap-1.5
              ${aktifTab === tab.key
                ? 'text-gold border-gold'
                : 'text-text-muted border-transparent hover:text-text hover:border-border'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div>
        {aktifTab === 'genel' && (
          <GenelBakis
            davalar={davaArr}
            icralar={icraArr}
            arabuluculuklar={arabArr}
            ihtarnameler={ihtArr}
            finansOzet={finansOzet}
            onYeniEkle={handleYeniEkle}
            onIhtarnameClick={(item) => { setSeciliIhtarname(item); setYeniIhtarnameOpen(true); }}
            danismanlikSayisi={danismanlikSayisi}
            iliskiSayisi={(muv.iliskiler || []).length}
          />
        )}
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
        {aktifTab === 'finans' && (
          <FinansTab
            muv={muv}
            davalar={davaArr}
            icralar={icraArr}
            arabuluculuklar={arabArr}
            ihtarnameler={ihtArr}
            finansOzet={finansOzet}
            onMasrafKaydet={handleMasrafKaydet}
            onTahsilatKaydet={handleTahsilatKaydet}
          />
        )}
        {aktifTab === 'evrak' && (
          <EvrakNotlarTab
            muv={muv}
            muvId={id}
            onNotKaydet={(g) => kaydetMutation.mutateAsync(g)}
          />
        )}
      </div>
    </div>
  );
}
