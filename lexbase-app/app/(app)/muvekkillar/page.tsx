'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useMuvekkillar, useMuvekkilSil, type Muvekkil } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTaraflar, useKarsiTarafSil, type KarsiTaraf } from '@/lib/hooks/useKarsiTaraflar';
import { useVekillar, useVekilSil, type Vekil } from '@/lib/hooks/useVekillar';
import { MuvekkilModal } from '@/components/modules/MuvekkilModal';
import { KarsiTarafModal } from '@/components/modules/KarsiTarafModal';
import { VekilModal } from '@/components/modules/VekilModal';
import { ProfilKarti } from '@/components/modules/ProfilKarti';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { BulkActionBar } from '@/components/ui/BulkActionBar';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { exportMuvekkilListePDF, exportKarsiTarafListePDF, exportAvukatListePDF } from '@/lib/export/pdfExport';
import { exportMuvekkilListeXLS, exportKarsiTarafListeXLS, exportAvukatListeXLS } from '@/lib/export/excelExport';
import { YetkiKoruma } from '@/components/ui/YetkiKoruma';
import { EtiketBadge, normalizeEtiket } from '@/components/ui/EtiketSecici';
import { IceAktarmaModal } from '@/components/modules/IceAktarmaModal';
import { useMuvekkilKaydet } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTarafKaydet } from '@/lib/hooks/useKarsiTaraflar';
import { useVekilKaydet } from '@/lib/hooks/useVekillar';
import { createClient } from '@/lib/supabase/client';

type TabKey = 'muvekkillar' | 'karsitaraflar' | 'avukatlar';

/* ── Ad Soyad birleştirici (geriye uyumlu) ── */
function tamAd(kayit: { ad?: string; soyad?: string }): string {
  return [kayit.ad, kayit.soyad].filter(Boolean).join(' ') || '?';
}

/* ── Sıralama Tipleri ── */
type MuvSort = 'ad-asc' | 'ad-desc' | 'tip' | 'tc' | 'yeni' | 'eski';
type KtSort = 'ad-asc' | 'ad-desc' | 'tip' | 'tc' | 'yeni' | 'eski';
type VSort = 'ad-asc' | 'ad-desc' | 'baro' | 'yeni' | 'eski';

const MUV_SORT_LABELS: Record<MuvSort, string> = {
  'ad-asc': 'A → Z',
  'ad-desc': 'Z → A',
  'tip': 'Tip (Gerçek/Tüzel)',
  'tc': 'TC Kimlik No',
  'yeni': 'En Yeni',
  'eski': 'En Eski',
};

const KT_SORT_LABELS: Record<KtSort, string> = {
  'ad-asc': 'A → Z',
  'ad-desc': 'Z → A',
  'tip': 'Tip (Gerçek/Tüzel)',
  'tc': 'TC Kimlik No',
  'yeni': 'En Yeni',
  'eski': 'En Eski',
};

const V_SORT_LABELS: Record<VSort, string> = {
  'ad-asc': 'A → Z',
  'ad-desc': 'Z → A',
  'baro': 'Baro',
  'yeni': 'En Yeni',
  'eski': 'En Eski',
};

/* ── Sıralama Fonksiyonları ── */
function sortMuvekkiller(arr: Muvekkil[], sort: MuvSort): Muvekkil[] {
  const copy = [...arr];
  switch (sort) {
    case 'ad-asc': return copy.sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
    case 'ad-desc': return copy.sort((a, b) => tamAd(b).localeCompare(tamAd(a), 'tr'));
    case 'tip': return copy.sort((a, b) => (a.tip || '').localeCompare(b.tip || '', 'tr'));
    case 'tc': return copy.sort((a, b) => (a.tc || '').localeCompare(b.tc || ''));
    case 'yeni': return copy.sort((a, b) => (b.sira ?? 0) - (a.sira ?? 0));
    case 'eski': return copy.sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    default: return copy;
  }
}

function sortKarsiTaraflar(arr: KarsiTaraf[], sort: KtSort): KarsiTaraf[] {
  const copy = [...arr];
  switch (sort) {
    case 'ad-asc': return copy.sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
    case 'ad-desc': return copy.sort((a, b) => tamAd(b).localeCompare(tamAd(a), 'tr'));
    case 'tip': return copy.sort((a, b) => (a.tip || '').localeCompare(b.tip || '', 'tr'));
    case 'tc': return copy.sort((a, b) => (a.tc || '').localeCompare(b.tc || ''));
    case 'yeni': return copy.sort((a, b) => (b.sira ?? 0) - (a.sira ?? 0));
    case 'eski': return copy.sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    default: return copy;
  }
}

function sortVekiller(arr: Vekil[], sort: VSort): Vekil[] {
  const copy = [...arr];
  switch (sort) {
    case 'ad-asc': return copy.sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
    case 'ad-desc': return copy.sort((a, b) => tamAd(b).localeCompare(tamAd(a), 'tr'));
    case 'baro': return copy.sort((a, b) => (a.baro || '').localeCompare(b.baro || '', 'tr'));
    case 'yeni': return copy.sort((a, b) => (b.sira ?? 0) - (a.sira ?? 0));
    case 'eski': return copy.sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
    default: return copy;
  }
}

/* ── Sort Dropdown Bileşeni ── */
function SortDropdown<T extends string>({
  value,
  labels,
  onChange,
}: {
  value: T;
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1.5 text-[11px] font-medium bg-surface border border-border rounded-lg text-text-muted hover:border-gold/40 hover:text-text transition-colors flex items-center gap-1"
      >
        ↕ {labels[value]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 right-0 top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg py-1 animate-fade-in-up">
            {(Object.keys(labels) as T[]).map((key) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gold-dim transition-colors ${
                  value === key ? 'text-gold font-semibold' : 'text-text-muted hover:text-text'
                }`}
              >
                {labels[key]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RehberPage() {
  /* ── Hooks ── */
  const { data: muvekkillar, isLoading: mLoading } = useMuvekkillar();
  const { data: karsiTaraflar, isLoading: ktLoading } = useKarsiTaraflar();
  const { data: vekillar, isLoading: vLoading } = useVekillar();
  const ktSil = useKarsiTarafSil();
  const vSil = useVekilSil();
  const mSil = useMuvekkilSil();
  const mKaydet = useMuvekkilKaydet();
  const ktKaydet = useKarsiTarafKaydet();
  const vKaydet = useVekilKaydet();

  /* ── Genel State ── */
  const [aktifTab, setAktifTab] = useState<TabKey>('muvekkillar');
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<'hepsi' | 'gercek' | 'tuzel'>('hepsi');
  const [etiketFiltre, setEtiketFiltre] = useState<string | null>(null);

  /* ── Sıralama State ── */
  const [muvSort, setMuvSort] = useState<MuvSort>('ad-asc');
  const [ktSort, setKtSort] = useState<KtSort>('ad-asc');
  const [vSort, setVSort] = useState<VSort>('ad-asc');

  /* ── Çoklu Seçim Modu ── */
  const [bulkMode, setBulkMode] = useState(false);

  /* ── Müvekkil Modal State ── */
  const [mModalOpen, setMModalOpen] = useState(false);
  const [editMuvekkil, setEditMuvekkil] = useState<Muvekkil | null>(null);

  /* ── Karşı Taraf Modal State ── */
  const [ktModalOpen, setKtModalOpen] = useState(false);
  const [editKT, setEditKT] = useState<KarsiTaraf | null>(null);

  /* ── Avukat Modal State ── */
  const [vModalOpen, setVModalOpen] = useState(false);
  const [editVekil, setEditVekil] = useState<Vekil | null>(null);

  /* ── Profil Kartı State ── */
  const [profilKT, setProfilKT] = useState<KarsiTaraf | null>(null);
  const [profilVekil, setProfilVekil] = useState<Vekil | null>(null);

  /* ── Silme Onay State ── */
  const [silOnay, setSilOnay] = useState<{ tip: 'kt' | 'vekil'; id: string; ad: string } | null>(null);

  /* ── İçe Aktarma State ── */
  const [iceAktarmaOpen, setIceAktarmaOpen] = useState(false);

  /* ── Toplu Silme State (şifre onaylı) ── */
  const [topluSilOnay, setTopluSilOnay] = useState(false);
  const [topluSilProgress, setTopluSilProgress] = useState(false);
  const [topluSilSifre, setTopluSilSifre] = useState('');
  const [topluSilHata, setTopluSilHata] = useState('');

  const tabs: { key: TabKey; icon: string; label: string; count?: number }[] = [
    { key: 'muvekkillar', icon: '👤', label: 'Müvekkiller', count: muvekkillar?.length },
    { key: 'karsitaraflar', icon: '⚖️', label: 'Karşı Taraflar', count: karsiTaraflar?.length },
    { key: 'avukatlar', icon: '👔', label: 'Avukatlar', count: vekillar?.length },
  ];

  /* ── Müvekkil Filtreleme + Sıralama ── */
  const mFiltrelenmis = useMemo(() => {
    if (!muvekkillar || aktifTab !== 'muvekkillar') return [];
    const filtered = muvekkillar.filter((m) => {
      if (filtre === 'gercek' && m.tip === 'tuzel') return false;
      if (filtre === 'tuzel' && m.tip !== 'tuzel') return false;
      if (etiketFiltre && !(m.etiketler || []).some((e) => normalizeEtiket(e).ad === etiketFiltre)) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (m.ad || '').toLowerCase().includes(q) ||
          (m.soyad || '').toLowerCase().includes(q) ||
          (m.tc || '').includes(q) ||
          (m.tel || '').includes(q) ||
          (m.mail || '').toLowerCase().includes(q) ||
          (m.vergiNo || '').includes(q)
        );
      }
      return true;
    });
    return sortMuvekkiller(filtered, muvSort);
  }, [muvekkillar, arama, filtre, etiketFiltre, aktifTab, muvSort]);

  /* ── Karşı Taraf Filtreleme + Sıralama ── */
  const ktFiltrelenmis = useMemo(() => {
    if (!karsiTaraflar || aktifTab !== 'karsitaraflar') return [];
    const filtered = karsiTaraflar.filter((kt) => {
      if (filtre === 'gercek' && kt.tip === 'tuzel') return false;
      if (filtre === 'tuzel' && kt.tip !== 'tuzel') return false;
      if (etiketFiltre && !(kt.etiketler || []).some((e) => normalizeEtiket(e).ad === etiketFiltre)) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (kt.ad || '').toLowerCase().includes(q) ||
          (kt.soyad || '').toLowerCase().includes(q) ||
          (kt.tc || '').includes(q) ||
          (kt.tel || '').includes(q) ||
          (kt.mail || '').toLowerCase().includes(q) ||
          (kt.vergiNo || '').includes(q)
        );
      }
      return true;
    });
    return sortKarsiTaraflar(filtered, ktSort);
  }, [karsiTaraflar, arama, filtre, etiketFiltre, aktifTab, ktSort]);

  /* ── Avukat Filtreleme + Sıralama ── */
  const vFiltrelenmis = useMemo(() => {
    if (!vekillar || aktifTab !== 'avukatlar') return [];
    const filtered = vekillar.filter((v) => {
      if (etiketFiltre && !(v.etiketler || []).some((e) => normalizeEtiket(e).ad === etiketFiltre)) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (v.ad || '').toLowerCase().includes(q) ||
          (v.soyad || '').toLowerCase().includes(q) ||
          (v.baro || '').toLowerCase().includes(q) ||
          (v.baroSicil || '').includes(q) ||
          (v.tbbSicil || '').includes(q) ||
          (v.tel || '').includes(q) ||
          (v.mail || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return sortVekiller(filtered, vSort);
  }, [vekillar, arama, etiketFiltre, aktifTab, vSort]);

  /* ── Bulk Selection ── */
  const mBulk = useBulkSelection(mFiltrelenmis);
  const ktBulk = useBulkSelection(ktFiltrelenmis);
  const vBulk = useBulkSelection(vFiltrelenmis);

  const activeBulk = aktifTab === 'muvekkillar' ? mBulk : aktifTab === 'karsitaraflar' ? ktBulk : vBulk;

  /* ── Bürodaki tüm benzersiz etiketler ── */
  const tumEtiketler = useMemo(() => {
    const set = new Set<string>();
    (muvekkillar || []).forEach((m) => (m.etiketler || []).forEach((e) => set.add(normalizeEtiket(e).ad)));
    (karsiTaraflar || []).forEach((k) => (k.etiketler || []).forEach((e) => set.add(normalizeEtiket(e).ad)));
    (vekillar || []).forEach((v) => (v.etiketler || []).forEach((e) => set.add(normalizeEtiket(e).ad)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [muvekkillar, karsiTaraflar, vekillar]);

  /* ── Toplu Silme Handler (şifre onaylı) ── */
  const handleTopluSil = useCallback(async () => {
    setTopluSilHata('');

    // Şifre doğrula
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email) {
      setTopluSilHata('Kullanıcı bilgisi alınamadı.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: topluSilSifre,
    });

    if (error) {
      setTopluSilHata('Şifre hatalı. Lütfen tekrar deneyin.');
      return;
    }

    setTopluSilProgress(true);
    try {
      if (aktifTab === 'muvekkillar') {
        await Promise.allSettled(mBulk.selectedItems.map((m) => mSil.mutateAsync(m.id)));
        mBulk.clearSelection();
      } else if (aktifTab === 'karsitaraflar') {
        await Promise.allSettled(ktBulk.selectedItems.map((k) => ktSil.mutateAsync(k.id)));
        ktBulk.clearSelection();
      } else {
        await Promise.allSettled(vBulk.selectedItems.map((v) => vSil.mutateAsync(v.id)));
        vBulk.clearSelection();
      }
      setBulkMode(false);
    } finally {
      setTopluSilProgress(false);
      setTopluSilOnay(false);
      setTopluSilSifre('');
    }
  }, [topluSilSifre, aktifTab, activeBulk, mBulk, ktBulk, vBulk, mSil, ktSil, vSil]);

  /* ── Silme Handler (tekli) ── */
  function handleSil() {
    if (!silOnay) return;
    if (silOnay.tip === 'kt') {
      ktSil.mutate(silOnay.id);
    } else {
      vSil.mutate(silOnay.id);
    }
    setSilOnay(null);
  }

  /* ── Export handlers ── */
  const handleExportPDF = useCallback(() => {
    if (aktifTab === 'muvekkillar') exportMuvekkilListePDF(mFiltrelenmis);
    else if (aktifTab === 'karsitaraflar') exportKarsiTarafListePDF(ktFiltrelenmis);
    else exportAvukatListePDF(vFiltrelenmis);
  }, [aktifTab, mFiltrelenmis, ktFiltrelenmis, vFiltrelenmis]);

  const handleExportExcel = useCallback(() => {
    if (aktifTab === 'muvekkillar') exportMuvekkilListeXLS(mFiltrelenmis);
    else if (aktifTab === 'karsitaraflar') exportKarsiTarafListeXLS(ktFiltrelenmis);
    else exportAvukatListeXLS(vFiltrelenmis);
  }, [aktifTab, mFiltrelenmis, ktFiltrelenmis, vFiltrelenmis]);

  /* ── Tab Filtre Göster? ── */
  const showTipFiltre = aktifTab === 'muvekkillar' || aktifTab === 'karsitaraflar';

  const activeList = aktifTab === 'muvekkillar' ? mFiltrelenmis : aktifTab === 'karsitaraflar' ? ktFiltrelenmis : vFiltrelenmis;

  return (
    <div>
      {/* Başlık */}
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-1">Rehber</h1>
      <p className="text-sm text-text-muted mb-5">Müvekkiller, karşı taraflar ve avukatlar</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setAktifTab(tab.key); setArama(''); setFiltre('hepsi'); setBulkMode(false); mBulk.clearSelection(); ktBulk.clearSelection(); vBulk.clearSelection(); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              aktifTab === tab.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                aktifTab === tab.key
                  ? 'bg-gold/20 text-gold'
                  : 'bg-surface2 text-text-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         ORTAK TOOLBAR
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
          <div className="text-sm font-semibold text-text">
            {aktifTab === 'muvekkillar' ? 'Müvekkil Listesi' : aktifTab === 'karsitaraflar' ? 'Karşı Taraf Listesi' : 'Avukat / Vekil Listesi'}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Arama */}
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="🔍 Ara..."
              className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors w-48"
            />

            {/* Tip Filtre */}
            {showTipFiltre && (
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['hepsi', 'gercek', 'tuzel'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltre(f)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      filtre === f ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text hover:bg-surface2'
                    }`}
                  >
                    {f === 'hepsi' ? 'Tümü' : f === 'gercek' ? 'Gerçek' : 'Tüzel'}
                  </button>
                ))}
              </div>
            )}

            {/* Etiket Filtre */}
            {tumEtiketler.length > 0 && (
              <div className="flex items-center gap-1">
                {etiketFiltre && (
                  <button
                    onClick={() => setEtiketFiltre(null)}
                    className="px-2 py-1 text-[10px] font-medium text-text-dim hover:text-text bg-surface2 rounded-full border border-border hover:border-red/40 transition-colors"
                    title="Filtreyi kaldır"
                  >
                    ✕
                  </button>
                )}
                <select
                  value={etiketFiltre || ''}
                  onChange={(e) => setEtiketFiltre(e.target.value || null)}
                  className="px-2.5 py-1.5 text-[11px] font-medium bg-surface border border-border rounded-lg text-text-muted hover:border-gold/40 transition-colors"
                >
                  <option value="">🏷 Etiket</option>
                  {tumEtiketler.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sıralama */}
            {aktifTab === 'muvekkillar' && (
              <SortDropdown value={muvSort} labels={MUV_SORT_LABELS} onChange={setMuvSort} />
            )}
            {aktifTab === 'karsitaraflar' && (
              <SortDropdown value={ktSort} labels={KT_SORT_LABELS} onChange={setKtSort} />
            )}
            {aktifTab === 'avukatlar' && (
              <SortDropdown value={vSort} labels={V_SORT_LABELS} onChange={setVSort} />
            )}

            {/* Aktar (Dışa + İçe) */}
            <ExportMenu
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
              onImportCSV={() => setIceAktarmaOpen(true)}
              disabled={activeList.length === 0}
            />

            {/* Çoklu Seç Toggle */}
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                if (bulkMode) {
                  mBulk.clearSelection();
                  ktBulk.clearSelection();
                  vBulk.clearSelection();
                }
              }}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                bulkMode
                  ? 'bg-gold text-bg border-gold'
                  : 'bg-surface border-border text-text-muted hover:border-gold/40 hover:text-text'
              }`}
            >
              ☑ Çoklu Seç
            </button>

            {/* Yeni Ekle Butonu */}
            {aktifTab === 'muvekkillar' && (
              <YetkiKoruma yetki="muvekkil:ekle">
                <button
                  onClick={() => { setEditMuvekkil(null); setMModalOpen(true); }}
                  className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
                >
                  + Yeni Müvekkil
                </button>
              </YetkiKoruma>
            )}
            {aktifTab === 'karsitaraflar' && (
              <button
                onClick={() => { setEditKT(null); setKtModalOpen(true); }}
                className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
              >
                + Yeni Karşı Taraf
              </button>
            )}
            {aktifTab === 'avukatlar' && (
              <button
                onClick={() => { setEditVekil(null); setVModalOpen(true); }}
                className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
              >
                + Yeni Avukat
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
           MÜVEKKİLLER LİSTESİ
           ═══════════════════════════════════════════════════════════ */}
        {aktifTab === 'muvekkillar' && (
          <div className="p-4">
            {mLoading ? (
              <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
            ) : mFiltrelenmis.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-sm text-text-muted">
                  {arama ? 'Arama sonucu bulunamadı' : 'Henüz müvekkil yok'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {mFiltrelenmis.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg p-4 hover:border-gold hover:bg-gold-dim transition-all group"
                  >
                    {/* Checkbox (sadece bulk modda) */}
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={mBulk.isSelected(m.id)}
                        onChange={(e) => { e.stopPropagation(); mBulk.toggle(m.id); }}
                        className="w-4 h-4 rounded border-border accent-gold shrink-0 cursor-pointer"
                      />
                    )}
                    <Link
                      href={`/muvekkillar/${m.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gold-dim border border-gold flex items-center justify-center text-gold text-sm font-bold flex-shrink-0">
                        {m.ad?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors truncate">
                            {tamAd(m)}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            m.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-green bg-green-dim'
                          }`}>
                            {m.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                          {m.tc && <span>TC: {m.tc}</span>}
                          {m.vergiNo && <span>VKN: {m.vergiNo}</span>}
                          {m.tel && <span>📞 {m.tel}</span>}
                          {m.mail && <span>✉️ {m.mail}</span>}
                        </div>
                        {m.etiketler && m.etiketler.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.etiketler.map((e, i) => <EtiketBadge key={i} etiket={e} />)}
                          </div>
                        )}
                      </div>
                      <span className="text-text-dim group-hover:text-gold transition-colors text-lg">›</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
           KARŞI TARAFLAR LİSTESİ
           ═══════════════════════════════════════════════════════════ */}
        {aktifTab === 'karsitaraflar' && (
          <div className="p-4">
            {ktLoading ? (
              <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
            ) : ktFiltrelenmis.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">⚖️</div>
                <p className="text-sm text-text-muted">
                  {arama ? 'Arama sonucu bulunamadı' : 'Henüz karşı taraf kaydı yok'}
                </p>
                {!arama && (
                  <button
                    onClick={() => { setEditKT(null); setKtModalOpen(true); }}
                    className="mt-4 px-4 py-2 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-medium hover:bg-gold/20 transition-colors"
                  >
                    + İlk Karşı Tarafı Ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {ktFiltrelenmis.map((kt) => (
                  <div
                    key={kt.id}
                    className="flex items-center gap-4 bg-surface2 border border-border/50 rounded-lg p-4 hover:border-gold hover:bg-gold-dim transition-all group"
                  >
                    {/* Checkbox (sadece bulk modda) */}
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={ktBulk.isSelected(kt.id)}
                        onChange={(e) => { e.stopPropagation(); ktBulk.toggle(kt.id); }}
                        className="w-4 h-4 rounded border-border accent-gold shrink-0 cursor-pointer"
                      />
                    )}

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      kt.tip === 'tuzel'
                        ? 'bg-blue-400/10 border border-blue-400/30 text-blue-400'
                        : 'bg-red/10 border border-red/30 text-red'
                    }`}>
                      {kt.tip === 'tuzel' ? '🏢' : kt.ad?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* İçerik — Tıklanınca Profil Kartı */}
                    <button
                      onClick={() => setProfilKT(kt)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors truncate">
                          {tamAd(kt)}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          kt.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-red bg-red/10'
                        }`}>
                          {kt.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5 flex-wrap">
                        {kt.tc && <span>TC: {kt.tc}</span>}
                        {kt.vergiNo && <span>VKN: {kt.vergiNo}</span>}
                        {kt.tel && <span>📞 {kt.tel}</span>}
                        {kt.mail && <span>✉️ {kt.mail}</span>}
                        {kt.uets && <span>📨 UETS</span>}
                      </div>
                      {kt.etiketler && kt.etiketler.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {kt.etiketler.map((e, i) => <EtiketBadge key={i} etiket={e} />)}
                        </div>
                      )}
                    </button>

                    {/* Sil (sadece bulk modda değilken) */}
                    {!bulkMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSilOnay({ tip: 'kt', id: kt.id, ad: tamAd(kt) }); }}
                        className="p-2 rounded-lg text-text-dim hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
           AVUKATLAR LİSTESİ
           ═══════════════════════════════════════════════════════════ */}
        {aktifTab === 'avukatlar' && (
          <div className="p-4">
            {vLoading ? (
              <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
            ) : vFiltrelenmis.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">👔</div>
                <p className="text-sm text-text-muted">
                  {arama ? 'Arama sonucu bulunamadı' : 'Henüz avukat kaydı yok'}
                </p>
                {!arama && (
                  <button
                    onClick={() => { setEditVekil(null); setVModalOpen(true); }}
                    className="mt-4 px-4 py-2 bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs font-medium hover:bg-gold/20 transition-colors"
                  >
                    + İlk Avukatı Ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {vFiltrelenmis.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-4 bg-surface2 border border-border/50 rounded-lg p-4 hover:border-gold hover:bg-gold-dim transition-all group"
                  >
                    {/* Checkbox (sadece bulk modda) */}
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={vBulk.isSelected(v.id)}
                        onChange={(e) => { e.stopPropagation(); vBulk.toggle(v.id); }}
                        className="w-4 h-4 rounded border-border accent-gold shrink-0 cursor-pointer"
                      />
                    )}

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gold-dim border border-gold flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                      Av.
                    </div>

                    {/* İçerik — Tıklanınca Profil Kartı */}
                    <button
                      onClick={() => setProfilVekil(v)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors truncate">
                          {tamAd(v)}
                        </span>
                        {v.baro && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-gold bg-gold/10">
                            {v.baro} Barosu
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5 flex-wrap">
                        {v.baroSicil && <span>Sicil: {v.baroSicil}</span>}
                        {v.tbbSicil && <span>TBB: {v.tbbSicil}</span>}
                        {v.tel && <span>📞 {v.tel}</span>}
                        {v.mail && <span>✉️ {v.mail}</span>}
                        {v.uets && <span>📨 UETS</span>}
                      </div>
                      {v.etiketler && v.etiketler.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.etiketler.map((e, i) => <EtiketBadge key={i} etiket={e} />)}
                        </div>
                      )}
                    </button>

                    {/* Sil (sadece bulk modda değilken) */}
                    {!bulkMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSilOnay({ tip: 'vekil', id: v.id, ad: tamAd(v) }); }}
                        className="p-2 rounded-lg text-text-dim hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SİLME ONAY DİYALOGU (Tekli)
         ═══════════════════════════════════════════════════════════ */}
      {silOnay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-text mb-2">Silme Onayı</h3>
            <p className="text-xs text-text-muted mb-4">
              <span className="font-semibold text-text">{silOnay.ad}</span> kaydını silmek istediğinize emin misiniz? Kayıt çöp kutusuna taşınacaktır.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSilOnay(null)}
                className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text hover:bg-surface3 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSil}
                className="px-4 py-2 bg-red text-white rounded-lg text-xs font-semibold hover:bg-red/80 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         TOPLU SİLME ONAY (Şifre Onaylı)
         ═══════════════════════════════════════════════════════════ */}
      {topluSilOnay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-text mb-2">Toplu Silme Onayı</h3>
            <p className="text-xs text-text-muted mb-3">
              <span className="font-semibold text-red">{activeBulk.selectedCount}</span> kaydı silmek istediğinize emin misiniz?
            </p>
            <p className="text-[11px] text-text-dim mb-3">
              Güvenlik için şifrenizi girin:
            </p>
            <input
              type="password"
              value={topluSilSifre}
              onChange={(e) => { setTopluSilSifre(e.target.value); setTopluSilHata(''); }}
              placeholder="Şifreniz"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:border-gold focus:outline-none mb-2"
              onKeyDown={(e) => { if (e.key === 'Enter' && topluSilSifre) handleTopluSil(); }}
            />
            {topluSilHata && (
              <p className="text-[11px] text-red mb-2">{topluSilHata}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => { setTopluSilOnay(false); setTopluSilSifre(''); setTopluSilHata(''); }}
                className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text hover:bg-surface3 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleTopluSil}
                disabled={topluSilProgress || !topluSilSifre}
                className="px-4 py-2 bg-red text-white rounded-lg text-xs font-semibold hover:bg-red/80 transition-colors disabled:opacity-50"
              >
                {topluSilProgress ? 'Siliniyor...' : `${activeBulk.selectedCount} Kaydı Sil`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         BULK ACTION BAR
         ═══════════════════════════════════════════════════════════ */}
      {bulkMode && (
        <BulkActionBar
          selectedCount={activeBulk.selectedCount}
          totalCount={activeList.length}
          allSelected={activeBulk.allSelected}
          onToggleAll={activeBulk.toggleAll}
          onClear={() => { activeBulk.clearSelection(); setBulkMode(false); }}
          onDelete={() => setTopluSilOnay(true)}
          onExportPDF={() => {
            const items = activeBulk.selectedItems as Array<Record<string, unknown>>;
            if (aktifTab === 'muvekkillar') exportMuvekkilListePDF(items);
            else if (aktifTab === 'karsitaraflar') exportKarsiTarafListePDF(items);
            else exportAvukatListePDF(items);
          }}
          onExportExcel={() => {
            const items = activeBulk.selectedItems as Array<Record<string, unknown>>;
            if (aktifTab === 'muvekkillar') exportMuvekkilListeXLS(items);
            else if (aktifTab === 'karsitaraflar') exportKarsiTarafListeXLS(items);
            else exportAvukatListeXLS(items);
          }}
          deleting={topluSilProgress}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
         PROFİL KARTLARI
         ═══════════════════════════════════════════════════════════ */}
      <ProfilKarti
        open={!!profilKT}
        onClose={() => setProfilKT(null)}
        tip="karsiTaraf"
        karsiTaraf={profilKT}
        onDuzenle={() => { setEditKT(profilKT); setKtModalOpen(true); }}
        onSil={() => {
          if (profilKT) {
            setSilOnay({ tip: 'kt', id: profilKT.id, ad: tamAd(profilKT) });
            setProfilKT(null);
          }
        }}
      />
      <ProfilKarti
        open={!!profilVekil}
        onClose={() => setProfilVekil(null)}
        tip="avukat"
        vekil={profilVekil}
        onDuzenle={() => { setEditVekil(profilVekil); setVModalOpen(true); }}
        onSil={() => {
          if (profilVekil) {
            setSilOnay({ tip: 'vekil', id: profilVekil.id, ad: tamAd(profilVekil) });
            setProfilVekil(null);
          }
        }}
      />

      {/* ═══════════════════════════════════════════════════════════
         MODALLER
         ═══════════════════════════════════════════════════════════ */}
      <MuvekkilModal
        open={mModalOpen}
        onClose={() => setMModalOpen(false)}
        muvekkil={editMuvekkil}
      />
      <KarsiTarafModal
        open={ktModalOpen}
        onClose={() => setKtModalOpen(false)}
        karsiTaraf={editKT}
      />
      <VekilModal
        open={vModalOpen}
        onClose={() => setVModalOpen(false)}
        vekil={editVekil}
      />

      {/* İçe Aktarma */}
      <IceAktarmaModal
        open={iceAktarmaOpen}
        onClose={() => setIceAktarmaOpen(false)}
        hedefTip={aktifTab === 'muvekkillar' ? 'muvekkil' : aktifTab === 'karsitaraflar' ? 'karsiTaraf' : 'vekil'}
        mevcutKayitlar={(aktifTab === 'muvekkillar' ? muvekkillar : aktifTab === 'karsitaraflar' ? karsiTaraflar : vekillar) as Record<string, unknown>[] || []}
        onAktar={async (kayitlar) => {
          for (const kayit of kayitlar) {
            const id = crypto.randomUUID();
            if (aktifTab === 'muvekkillar') {
              await mKaydet.mutateAsync({ id, ...kayit } as unknown as Muvekkil);
            } else if (aktifTab === 'karsitaraflar') {
              await ktKaydet.mutateAsync({ id, ...kayit } as unknown as KarsiTaraf);
            } else {
              await vKaydet.mutateAsync({ id, ...kayit } as unknown as Vekil);
            }
          }
        }}
      />
    </div>
  );
}
