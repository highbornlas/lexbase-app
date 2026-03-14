'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDavalar, type Dava } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { DavaModal } from '@/components/modules/DavaModal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { DurusmaBadge } from '@/components/ui/SureBadge';
import { tamMahkemeAdi, esasNoGoster, dosyaNoOlustur, davaciBelirle, durusmayaKalanGun } from '@/lib/utils/uyapHelpers';
import { fmtTarih } from '@/lib/utils';
import { DAVA_DURUMLARI, YARGI_TURLERI, YARGI_BIRIMLERI } from '@/lib/constants/uyap';
import { exportDavaListeUYAPXLS } from '@/lib/export/excelExport';
import { exportDavaListePDF } from '@/lib/export/pdfExport';

// ── Badge renk haritaları ────────────────────────────────────

const ASAMA_RENK: Record<string, string> = {
  'İlk Derece': 'text-blue-400 bg-blue-400/10',
  'İstinaf': 'text-purple-400 bg-purple-400/10',
  'Temyiz (Yargıtay)': 'text-orange-400 bg-orange-400/10',
  'Temyiz (Danıştay)': 'text-orange-400 bg-orange-400/10',
  'Kesinleşti': 'text-green bg-green-dim',
  'Düşürüldü': 'text-text-dim bg-surface2',
};

const DURUM_RENK: Record<string, string> = {
  'Aktif': 'text-green bg-green-dim border-green/20',
  'Devam Ediyor': 'text-green bg-green-dim border-green/20',
  'Beklemede': 'text-gold bg-gold-dim border-gold/20',
  'Kapalı': 'text-text-dim bg-surface2 border-border',
};

// ── Sıralama ─────────────────────────────────────────────────

type SortKey = 'kayitNo' | 'esasNo' | 'mahkeme' | 'davaci' | 'davali' | 'acilisTarihi' | 'asama' | 'durum' | 'durusmaTarihi';
type SortDir = 'asc' | 'desc';

// ── Sütun tanımları ──────────────────────────────────────────

type DavaColKey = 'sira' | 'esasNo' | 'mahkeme' | 'davaci' | 'davali' | 'acilis' | 'asama' | 'durum' | 'durusma';

const DAVA_SUTUNLAR: { key: DavaColKey; label: string; sortKey?: SortKey; varsayilan: boolean }[] = [
  { key: 'sira', label: '#', sortKey: 'kayitNo', varsayilan: true },
  { key: 'esasNo', label: 'Esas No', sortKey: 'esasNo', varsayilan: true },
  { key: 'mahkeme', label: 'Mahkeme', sortKey: 'mahkeme', varsayilan: true },
  { key: 'davaci', label: 'Davacı', sortKey: 'davaci', varsayilan: true },
  { key: 'davali', label: 'Davalı', sortKey: 'davali', varsayilan: true },
  { key: 'acilis', label: 'Açılış', sortKey: 'acilisTarihi', varsayilan: true },
  { key: 'asama', label: 'Aşama', sortKey: 'asama', varsayilan: true },
  { key: 'durum', label: 'Durum', sortKey: 'durum', varsayilan: true },
  { key: 'durusma', label: 'Duruşma', sortKey: 'durusmaTarihi', varsayilan: true },
];

const LS_KEY_COLS = 'lb_dava_cols';
const LS_KEY_FILTERS = 'lb_dava_saved_filters';
const PAGE_SIZE = 25;

// ── Tarih renk yardımcısı ────────────────────────────────────

function tarihRenkSinifi(tarih?: string): string {
  if (!tarih) return 'text-text-dim';
  const gun = Math.floor((Date.now() - new Date(tarih).getTime()) / 86400000);
  if (gun > 365) return 'text-red';
  if (gun > 180) return 'text-orange-400';
  return 'text-text-muted';
}

function tarihTooltip(tarih?: string): string {
  if (!tarih) return '';
  const gun = Math.floor((Date.now() - new Date(tarih).getTime()) / 86400000);
  if (gun > 365) return `${Math.floor(gun / 365)} yıl ${gun % 365} gündür açık`;
  if (gun > 30) return `${Math.floor(gun / 30)} ay ${gun % 30} gündür açık`;
  return `${gun} gündür açık`;
}

// ══════════════════════════════════════════════════════════════
//  Davalar Sayfası
// ══════════════════════════════════════════════════════════════

export default function DavalarPage() {
  const { data: davalar, isLoading } = useDavalar();
  const { data: muvekkillar } = useMuvekkillar();

  // UI state
  const [arama, setArama] = useState('');
  const [dosyaDurumu, setDosyaDurumu] = useState<'acik' | 'kapali'>('acik');
  const [yargiTuru, setYargiTuru] = useState<string>('hepsi');
  const [yargiBirimi, setYargiBirimi] = useState<string>('hepsi');
  const [esasYilFiltre, setEsasYilFiltre] = useState<string>('');
  const [esasNoFiltre, setEsasNoFiltre] = useState<string>('');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('kayitNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliDava, setSeciliDava] = useState<Dava | null>(null);
  const [sorguPaneliAcik, setSorguPaneliAcik] = useState(true);

  // Yargı Türü değişince birimi resetle
  const mevcutBirimler = yargiTuru !== 'hepsi' ? (YARGI_BIRIMLERI[yargiTuru] || []) : [];
  const yillar = useMemo(() => {
    const buYil = new Date().getFullYear();
    return Array.from({ length: buYil - 1999 }, (_, i) => (buYil - i).toString());
  }, []);

  // Sayfalama
  const [sayfa, setSayfa] = useState(1);

  // Sütun görünürlük
  const [gorunenSutunlar, setGorunenSutunlar] = useState<DavaColKey[]>(() => {
    if (typeof window === 'undefined') return DAVA_SUTUNLAR.map((s) => s.key);
    try {
      const saved = localStorage.getItem(LS_KEY_COLS);
      return saved ? JSON.parse(saved) : DAVA_SUTUNLAR.map((s) => s.key);
    } catch { return DAVA_SUTUNLAR.map((s) => s.key); }
  });
  const [sutunMenuAcik, setSutunMenuAcik] = useState(false);
  const sutunMenuRef = useRef<HTMLDivElement>(null);

  // Satır seçimi
  const [seciliIdler, setSeciliIdler] = useState<Set<string>>(new Set());

  // Kayıtlı filtreler
  const [kayitliFiltreMenuAcik, setKayitliFiltreMenuAcik] = useState(false);
  const [filtreAdi, setFiltreAdi] = useState('');
  const kayitliFiltreRef = useRef<HTMLDivElement>(null);
  const [kayitliFiltreler, setKayitliFiltreler] = useState<Array<{ ad: string; filtre: Record<string, string> }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const s = localStorage.getItem(LS_KEY_FILTERS);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  // Persist sütun tercihleri
  useEffect(() => {
    localStorage.setItem(LS_KEY_COLS, JSON.stringify(gorunenSutunlar));
  }, [gorunenSutunlar]);

  // Persist kayıtlı filtreler
  useEffect(() => {
    localStorage.setItem(LS_KEY_FILTERS, JSON.stringify(kayitliFiltreler));
  }, [kayitliFiltreler]);

  // Dış tıklama — menüleri kapat
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (sutunMenuRef.current && !sutunMenuRef.current.contains(e.target as Node)) setSutunMenuAcik(false);
      if (kayitliFiltreRef.current && !kayitliFiltreRef.current.contains(e.target as Node)) setKayitliFiltreMenuAcik(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Müvekkil adı map ───────────────────────────────────────
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // ── KPI hesaplama ──────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!davalar) return { toplam: 0, aktif: 0, yaklasanDurusma: 0, istinaf: 0, temyiz: 0, kapali: 0 };
    let yaklasanDurusma = 0;
    davalar.forEach((d) => {
      const kalan = durusmayaKalanGun(d.durusma);
      if (kalan !== null && kalan >= 0 && kalan <= 7) yaklasanDurusma++;
    });
    return {
      toplam: davalar.length,
      aktif: davalar.filter((d) => d.durum === 'Aktif' || d.durum === 'Devam Ediyor').length,
      yaklasanDurusma,
      istinaf: davalar.filter((d) => d.asama === 'İstinaf').length,
      temyiz: davalar.filter((d) => d.asama?.startsWith('Temyiz')).length,
      kapali: davalar.filter((d) => d.durum === 'Kapalı').length,
    };
  }, [davalar]);

  // ── Filtreleme + Arama ─────────────────────────────────────
  const filtrelenmis = useMemo(() => {
    if (!davalar) return [];
    return davalar.filter((d) => {
      // Dosya durumu toggle
      if (dosyaDurumu === 'acik' && d.durum === 'Kapalı') return false;
      if (dosyaDurumu === 'kapali' && d.durum !== 'Kapalı') return false;
      // Yargı birimi filtresi (mtur alanına karşı)
      if (yargiBirimi !== 'hepsi' && d.mtur !== yargiBirimi) return false;
      // Yargı türü filtresi (birimi seçilmemişse, türün tüm birimleri dahil)
      if (yargiTuru !== 'hepsi' && yargiBirimi === 'hepsi') {
        const birimler = YARGI_BIRIMLERI[yargiTuru] || [];
        if (birimler.length > 0 && d.mtur && !birimler.some((b) => d.mtur?.toLowerCase().includes(b.toLowerCase()))) return false;
      }
      // Esas yıl/no filtresi
      if (esasYilFiltre && d.esasYil !== esasYilFiltre) return false;
      if (esasNoFiltre && !(d.esasNo || '').toString().includes(esasNoFiltre)) return false;
      // Tarih aralığı
      if (tarihBaslangic || tarihBitis) {
        const davaTarih = d.tarih || '';
        if (tarihBaslangic && davaTarih < tarihBaslangic) return false;
        if (tarihBitis && davaTarih > tarihBitis) return false;
      }
      if (arama) {
        const q = arama.toLowerCase();
        const muvAd = muvAdMap[d.muvId || ''] || '';
        const esasStr = esasNoGoster(d.esasYil, d.esasNo);
        const mahkemeStr = tamMahkemeAdi(d.il, d.mno, d.mtur);
        return (
          esasStr.toLowerCase().includes(q) ||
          mahkemeStr.toLowerCase().includes(q) ||
          muvAd.toLowerCase().includes(q) ||
          (d.karsi || '').toLowerCase().includes(q) ||
          (d.konu || '').toLowerCase().includes(q) ||
          (d.davaTuru || '').toLowerCase().includes(q) ||
          (d.no || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [davalar, arama, dosyaDurumu, yargiTuru, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis, muvAdMap]);

  // ── Sıralama ───────────────────────────────────────────────
  const sirali = useMemo(() => {
    const list = [...filtrelenmis];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'kayitNo': cmp = (a.kayitNo ?? a.sira ?? 0) - (b.kayitNo ?? b.sira ?? 0); break;
        case 'esasNo': cmp = esasNoGoster(a.esasYil, a.esasNo).localeCompare(esasNoGoster(b.esasYil, b.esasNo), 'tr'); break;
        case 'mahkeme': cmp = tamMahkemeAdi(a.il, a.mno, a.mtur).localeCompare(tamMahkemeAdi(b.il, b.mno, b.mtur), 'tr'); break;
        case 'davaci': cmp = davaciBelirle(a.taraf, muvAdMap[a.muvId || ''] || '', a.karsi || '').davaci.localeCompare(davaciBelirle(b.taraf, muvAdMap[b.muvId || ''] || '', b.karsi || '').davaci, 'tr'); break;
        case 'davali': cmp = davaciBelirle(a.taraf, muvAdMap[a.muvId || ''] || '', a.karsi || '').davali.localeCompare(davaciBelirle(b.taraf, muvAdMap[b.muvId || ''] || '', b.karsi || '').davali, 'tr'); break;
        case 'acilisTarihi': cmp = (a.tarih || '9999').localeCompare(b.tarih || '9999'); break;
        case 'asama': cmp = (a.asama || '').localeCompare(b.asama || '', 'tr'); break;
        case 'durum': cmp = (a.durum || '').localeCompare(b.durum || '', 'tr'); break;
        case 'durusmaTarihi': cmp = (a.durusma || '9999').localeCompare(b.durusma || '9999'); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [filtrelenmis, sortKey, sortDir, muvAdMap]);

  // ── Sayfalama ──────────────────────────────────────────────
  const toplamSayfa = Math.max(1, Math.ceil(sirali.length / PAGE_SIZE));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * PAGE_SIZE;
    return sirali.slice(bas, bas + PAGE_SIZE);
  }, [sirali, sayfa]);

  // Filtre değişince sayfa 1'e dön
  useEffect(() => { setSayfa(1); }, [arama, dosyaDurumu, yargiTuru, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis]);

  // ── Sıralama toggle ──────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  function sortIcon(key: SortKey) {
    if (sortKey !== key) return ' \u21C5';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  // ── Sütun toggle ──────────────────────────────────────────
  function toggleSutun(key: DavaColKey) {
    setGorunenSutunlar((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // ── Satır seçimi ──────────────────────────────────────────
  function toggleSecim(id: string) {
    setSeciliIdler((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function tumunuSec() {
    if (seciliIdler.size === sayfadakiler.length) setSeciliIdler(new Set());
    else setSeciliIdler(new Set(sayfadakiler.map((d) => d.id)));
  }

  // ── Kayıtlı filtre ───────────────────────────────────────
  function filtreKaydet() {
    if (!filtreAdi.trim()) return;
    const yeni = {
      ad: filtreAdi.trim(),
      filtre: { arama, dosyaDurumu, yargiTuru, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis },
    };
    setKayitliFiltreler((prev) => [...prev.filter((f) => f.ad !== yeni.ad), yeni]);
    setFiltreAdi('');
    setKayitliFiltreMenuAcik(false);
  }
  function filtreUygula(f: Record<string, string>) {
    setArama(f.arama || '');
    setDosyaDurumu((f.dosyaDurumu as 'acik' | 'kapali') || 'acik');
    setYargiTuru(f.yargiTuru || 'hepsi');
    setYargiBirimi(f.yargiBirimi || 'hepsi');
    setEsasYilFiltre(f.esasYilFiltre || '');
    setEsasNoFiltre(f.esasNoFiltre || '');
    setTarihBaslangic(f.tarihBaslangic || '');
    setTarihBitis(f.tarihBitis || '');
    setKayitliFiltreMenuAcik(false);
  }
  function filtreSil(ad: string) {
    setKayitliFiltreler((prev) => prev.filter((f) => f.ad !== ad));
  }

  // ── Row highlight class ────────────────────────────────────
  const satirVurgu = useCallback((d: Dava): string => {
    const kalan = durusmayaKalanGun(d.durusma);
    if (kalan === null || kalan < 0) return '';
    if (kalan <= 3) return 'bg-red/5';
    if (kalan <= 7) return 'bg-gold/5';
    return '';
  }, []);

  // ── Export handlers ────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    if (!sirali.length) return;
    const hedef = seciliIdler.size > 0 ? sirali.filter((d) => seciliIdler.has(d.id)) : sirali;
    exportDavaListeUYAPXLS(hedef as unknown as Array<Record<string, unknown>>, muvAdMap);
  }, [sirali, muvAdMap, seciliIdler]);

  const handleExportPDF = useCallback(() => {
    if (!sirali.length) return;
    const hedef = seciliIdler.size > 0 ? sirali.filter((d) => seciliIdler.has(d.id)) : sirali;
    exportDavaListePDF(hedef as unknown as Array<Record<string, unknown>>, muvAdMap);
  }, [sirali, muvAdMap, seciliIdler]);

  // ── Filtrelerin aktif olup olmadigi ────────────────────────
  const filtreAktif = yargiTuru !== 'hepsi' || yargiBirimi !== 'hepsi' || !!esasYilFiltre || !!esasNoFiltre || !!tarihBaslangic || !!tarihBitis || !!arama;

  // ── Grid template — dinamik sütunlara göre ─────────────────
  const COL_WIDTHS: Record<DavaColKey, string> = {
    sira: '36px',
    esasNo: 'minmax(80px,1fr)',
    mahkeme: 'minmax(140px,2fr)',
    davaci: 'minmax(100px,1fr)',
    davali: 'minmax(100px,1fr)',
    acilis: '90px',
    asama: '80px',
    durum: '75px',
    durusma: '100px',
  };

  const gridTemplate = useMemo(() => {
    const cols = ['28px']; // checkbox
    gorunenSutunlar.forEach((k) => { if (COL_WIDTHS[k]) cols.push(COL_WIDTHS[k]); });
    return cols.join('_');
  }, [gorunenSutunlar]);

  const gridClass = `grid gap-2 px-4 min-w-[950px]`;
  const gridStyle = { gridTemplateColumns: ['28px', ...gorunenSutunlar.map((k) => COL_WIDTHS[k])].join(' ') };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Davalar
          {davalar && <span className="text-sm font-normal text-text-muted ml-2">({davalar.length})</span>}
        </h1>
        <div className="flex items-center gap-2">
          {/* Sütun ayarları */}
          <div className="relative" ref={sutunMenuRef}>
            <button
              onClick={() => setSutunMenuAcik((p) => !p)}
              className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text hover:border-gold transition-colors"
              title="Sütunları ayarla"
            >
              <span className="text-sm">&#x2699;&#xFE0F;</span>
            </button>
            {sutunMenuAcik && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-1.5 text-[10px] text-text-dim uppercase tracking-wider border-b border-border">Sütunlar</div>
                {DAVA_SUTUNLAR.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gorunenSutunlar.includes(s.key)}
                      onChange={() => toggleSutun(s.key)}
                      className="accent-[var(--gold)]"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Kayıtlı filtreler */}
          <div className="relative" ref={kayitliFiltreRef}>
            <button
              onClick={() => setKayitliFiltreMenuAcik((p) => !p)}
              className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text hover:border-gold transition-colors"
              title="Kayıtlı filtreler"
            >
              <span className="text-sm">&#x1F516;</span>
            </button>
            {kayitliFiltreMenuAcik && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-1.5 text-[10px] text-text-dim uppercase tracking-wider border-b border-border">Kayıtlı Filtreler</div>
                {kayitliFiltreler.length === 0 && (
                  <div className="px-3 py-2 text-xs text-text-dim">Henüz kayıtlı filtre yok</div>
                )}
                {kayitliFiltreler.map((f) => (
                  <div key={f.ad} className="flex items-center gap-1 px-3 py-1.5 hover:bg-surface2">
                    <button onClick={() => filtreUygula(f.filtre)} className="flex-1 text-left text-xs text-text hover:text-gold truncate">{f.ad}</button>
                    <button onClick={() => filtreSil(f.ad)} className="text-[10px] text-red hover:text-red/80 flex-shrink-0">&times;</button>
                  </div>
                ))}
                <div className="border-t border-border px-3 py-2 flex gap-1.5">
                  <input
                    type="text"
                    value={filtreAdi}
                    onChange={(e) => setFiltreAdi(e.target.value)}
                    placeholder="Filtre adı..."
                    className="flex-1 px-2 py-1 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
                    onKeyDown={(e) => e.key === 'Enter' && filtreKaydet()}
                  />
                  <button onClick={filtreKaydet} className="px-2 py-1 bg-gold text-bg text-[10px] rounded font-semibold">Kaydet</button>
                </div>
              </div>
            )}
          </div>

          <ExportMenu
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            disabled={!sirali.length}
          />
          <button
            onClick={() => { setSeciliDava(null); setModalAcik(true); }}
            className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
          >
            + Yeni Dava
          </button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        <MiniKpi label="Toplam" value={kpis.toplam} />
        <MiniKpi label="Aktif" value={kpis.aktif} color="text-green" />
        <MiniKpi label="Yaklaşan Duruşma" value={kpis.yaklasanDurusma} color="text-gold" />
        <MiniKpi label="İstinaf" value={kpis.istinaf} color="text-purple-400" />
        <MiniKpi label="Temyiz" value={kpis.temyiz} color="text-orange-400" />
        <MiniKpi label="Kapalı" value={kpis.kapali} color="text-text-muted" />
      </div>

      {/* ── UYAP Dosya Sorgulama Paneli ──────────────────────── */}
      <div className="bg-surface border border-border rounded-lg mb-5 overflow-hidden">
        {/* Panel Başlık */}
        <button
          type="button"
          onClick={() => setSorguPaneliAcik((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-surface2/50 border-b border-border hover:bg-surface2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">&#x1F50D;</span>
            <span className="text-xs font-semibold text-text uppercase tracking-wider">Dosya Sorgulama</span>
            {filtreAktif && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold text-bg font-bold">Filtre Aktif</span>}
          </div>
          <span className="text-text-dim text-xs">{sorguPaneliAcik ? '\u25B2' : '\u25BC'}</span>
        </button>

        {/* Panel İçerik */}
        {sorguPaneliAcik && (
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              {/* Sol Kolon */}
              <div className="space-y-3">
                {/* Yargı Türü */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Yargı Türü</label>
                  <select value={yargiTuru} onChange={(e) => { setYargiTuru(e.target.value); setYargiBirimi('hepsi'); }} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {YARGI_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Yargı Birimi */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Yargı Birimi</label>
                  <select value={yargiBirimi} onChange={(e) => setYargiBirimi(e.target.value)} disabled={yargiTuru === 'hepsi'} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="hepsi">Seçiniz</option>
                    {mevcutBirimler.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* Açılış Tarihi Aralığı */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Açılış Başlangıç Tarihi</label>
                    <input type="date" value={tarihBaslangic} onChange={(e) => setTarihBaslangic(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Açılış Bitiş Tarihi</label>
                    <input type="date" value={tarihBitis} onChange={(e) => setTarihBitis(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
                  </div>
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-3">
                {/* Dosya Durumu — Toggle */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Dosya Durumu</label>
                  <div className="flex items-center gap-0 bg-bg border border-border rounded overflow-hidden w-fit">
                    <button type="button" onClick={() => setDosyaDurumu('acik')} className={`px-4 py-2 text-xs font-medium transition-colors ${dosyaDurumu === 'acik' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text'}`}>Açık</button>
                    <button type="button" onClick={() => setDosyaDurumu('kapali')} className={`px-4 py-2 text-xs font-medium transition-colors ${dosyaDurumu === 'kapali' ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text'}`}>Kapalı</button>
                  </div>
                </div>
                {/* Dosya Yıl / No */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Dosya Yıl / No</label>
                  <div className="flex items-center gap-2">
                    <select value={esasYilFiltre} onChange={(e) => setEsasYilFiltre(e.target.value)} className="w-28 px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                      <option value="">Seçiniz</option>
                      {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-text-dim text-sm">/</span>
                    <input type="text" value={esasNoFiltre} onChange={(e) => setEsasNoFiltre(e.target.value)} placeholder="Dosya No" className="flex-1 px-3 py-2 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                  </div>
                </div>
                {/* Genel Arama */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Kişi / Genel Arama</label>
                  <div className="relative">
                    <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Taraf adı, mahkeme, konu..." className="w-full px-4 py-2 pl-9 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-xs">&#x1F50D;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alt Aksiyon Satırı */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
              <div className="text-[11px] text-text-dim">
                {filtreAktif ? `${sirali.length} / ${davalar?.length ?? 0} sonuç` : `${sirali.length} dosya listeleniyor`}
              </div>
              <div className="flex items-center gap-2">
                {filtreAktif && (
                  <button onClick={() => { setArama(''); setDosyaDurumu('acik'); setYargiTuru('hepsi'); setYargiBirimi('hepsi'); setEsasYilFiltre(''); setEsasNoFiltre(''); setTarihBaslangic(''); setTarihBitis(''); }} className="px-3 py-1.5 text-[11px] text-gold hover:text-gold-light transition-colors">
                    Temizle
                  </button>
                )}
                <button type="button" className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                  <span>&#x1F50D;</span> Sorgula
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Toplu işlem bar ─────────────────────────────────── */}
      {seciliIdler.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-gold-dim border border-gold/20 rounded-lg">
          <span className="text-xs text-gold font-semibold">{seciliIdler.size} dosya seçili</span>
          <button onClick={handleExportExcel} className="text-[11px] px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-gold transition-colors">Excel&apos;e Aktar</button>
          <button onClick={handleExportPDF} className="text-[11px] px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-gold transition-colors">PDF&apos;e Aktar</button>
          <button onClick={() => setSeciliIdler(new Set())} className="ml-auto text-[11px] text-text-dim hover:text-text transition-colors">Seçimi Temizle</button>
        </div>
      )}

      {/* ── Tablo ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : sirali.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">&#x2696;&#xFE0F;</div>
          <div className="text-sm text-text-muted">{filtreAktif ? 'Arama sonucu bulunamadı' : 'Henüz dava kaydı eklenmemiş'}</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto">
          {/* Sticky Tablo Başlık */}
          <div className={`${gridClass} py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider sticky top-0 z-10 bg-surface`} style={gridStyle}>
            <label className="flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={seciliIdler.size === sayfadakiler.length && sayfadakiler.length > 0} onChange={tumunuSec} className="accent-[var(--gold)]" />
            </label>
            {gorunenSutunlar.map((colKey) => {
              const col = DAVA_SUTUNLAR.find((s) => s.key === colKey);
              if (!col) return null;
              return col.sortKey ? (
                <button key={col.key} type="button" onClick={() => toggleSort(col.sortKey!)} className="text-left hover:text-text transition-colors truncate">{col.label}{sortIcon(col.sortKey)}</button>
              ) : (
                <span key={col.key}>{col.label}</span>
              );
            })}
          </div>

          {/* Satırlar */}
          {sayfadakiler.map((d, idx) => {
            const muvAd = muvAdMap[d.muvId || ''] || '';
            const karsiAd = d.karsi || '';
            const { davaci, davali } = davaciBelirle(d.taraf, muvAd, karsiAd);
            const mahkeme = tamMahkemeAdi(d.il, d.mno, d.mtur);
            const esasStr = esasNoGoster(d.esasYil, d.esasNo);
            const vurgu = satirVurgu(d);
            const secili = seciliIdler.has(d.id);
            const globalIdx = (sayfa - 1) * PAGE_SIZE + idx;

            return (
              <div key={d.id} className={`${gridClass} py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center ${vurgu} ${secili ? 'bg-gold-dim/50' : ''}`} style={gridStyle}>
                <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={secili} onChange={() => toggleSecim(d.id)} className="accent-[var(--gold)]" />
                </label>

                {gorunenSutunlar.map((colKey) => {
                  switch (colKey) {
                    case 'sira': return <span key={colKey} className="text-[11px] text-text-dim">{globalIdx + 1}</span>;
                    case 'esasNo': return (
                      <Link key={colKey} href={`/davalar/${d.id}`} className="min-w-0 flex items-center gap-1.5 hover:underline">
                        <span className="font-[var(--font-playfair)] text-sm font-bold text-gold truncate">{esasStr || '—'}</span>
                        {d.davaTuru && <span className="text-[9px] px-1 py-0.5 rounded bg-surface2 text-text-dim border border-border/50 whitespace-nowrap flex-shrink-0">{d.davaTuru}</span>}
                      </Link>
                    );
                    case 'mahkeme': return <Link key={colKey} href={`/davalar/${d.id}`} className="text-xs text-text truncate hover:underline" title={mahkeme || d.konu || ''}>{mahkeme || d.konu || '—'}</Link>;
                    case 'davaci': return <span key={colKey} className="text-xs text-text truncate" title={davaci}>{davaci || '—'}</span>;
                    case 'davali': return <span key={colKey} className="text-xs text-text truncate" title={davali}>{davali || '—'}</span>;
                    case 'acilis': return (
                      <span key={colKey} className={`text-[11px] ${tarihRenkSinifi(d.tarih)}`} title={tarihTooltip(d.tarih)}>
                        {d.tarih ? fmtTarih(d.tarih) : '—'}
                      </span>
                    );
                    case 'asama': return <span key={colKey}><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ASAMA_RENK[d.asama || ''] || 'text-text-dim bg-surface2'}`}>{d.asama || '—'}</span></span>;
                    case 'durum': return <span key={colKey}><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[d.durum || ''] || 'text-text-dim bg-surface2 border-border'}`}>{d.durum || '—'}</span></span>;
                    case 'durusma': return <span key={colKey}><DurusmaBadge tarih={d.durusma} saat={d.durusmaSaati} /></span>;
                    default: return null;
                  }
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sayfalama ───────────────────────────────────────── */}
      {!isLoading && sirali.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-text-dim">
            {filtreAktif ? `${sirali.length} / ${davalar?.length ?? 0} dava` : `${sirali.length} dava`}
            {sirali.length > PAGE_SIZE && ` — Sayfa ${sayfa}/${toplamSayfa}`}
          </div>
          {toplamSayfa > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setSayfa(1)} disabled={sayfa === 1} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&laquo;</button>
              <button onClick={() => setSayfa((p) => Math.max(1, p - 1))} disabled={sayfa === 1} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&lsaquo;</button>
              {Array.from({ length: Math.min(5, toplamSayfa) }, (_, i) => {
                let pg: number;
                if (toplamSayfa <= 5) pg = i + 1;
                else if (sayfa <= 3) pg = i + 1;
                else if (sayfa >= toplamSayfa - 2) pg = toplamSayfa - 4 + i;
                else pg = sayfa - 2 + i;
                return (
                  <button key={pg} onClick={() => setSayfa(pg)} className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${pg === sayfa ? 'border-gold bg-gold text-bg font-bold' : 'border-border bg-surface text-text-muted hover:border-gold'}`}>{pg}</button>
                );
              })}
              <button onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))} disabled={sayfa === toplamSayfa} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&rsaquo;</button>
              <button onClick={() => setSayfa(toplamSayfa)} disabled={sayfa === toplamSayfa} className="px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-muted hover:border-gold disabled:opacity-30 transition-colors">&raquo;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────── */}
      <DavaModal open={modalAcik} onClose={() => setModalAcik(false)} dava={seciliDava} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Mini KPI Kartı
// ══════════════════════════════════════════════════════════════

function MiniKpi({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}
