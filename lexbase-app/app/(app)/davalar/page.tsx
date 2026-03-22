'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDavalar, useDavaArsivle, useDavaSil, type Dava } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { DavaModal } from '@/components/modules/DavaModal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { DurusmaBadge } from '@/components/ui/SureBadge';
import { tamMahkemeAdi, esasNoGoster, dosyaNoOlustur, davaciBelirle, durusmayaKalanGun, davaDosyaBaslik } from '@/lib/utils/uyapHelpers';
import { fmtTarih } from '@/lib/utils';
import { DAVA_DURUMLARI, YARGI_TURLERI, YARGI_BIRIMLERI } from '@/lib/constants/uyap';
import { exportDavaListeUYAPXLS } from '@/lib/export/excelExport';
import { exportDavaListePDF } from '@/lib/export/pdfExport';
import { SkeletonTable, SkeletonKPI } from '@/components/ui/SkeletonTable';
import { safeNum, tahsilatToplam } from '@/lib/utils/finans';
import { CopyNo } from '@/components/ui/CopyNo';
import { ASAMA_RENK, DURUM_RENK } from '@/lib/constants/ui';

// ── Sıralama ─────────────────────────────────────────────────

type SortKey = 'kayitNo' | 'esasNo' | 'mahkeme' | 'davaci' | 'davali' | 'acilisTarihi' | 'asama' | 'durum' | 'durusmaTarihi';
type SortDir = 'asc' | 'desc';

// ── Sütun tanımları ──────────────────────────────────────────

type DavaColKey = 'sira' | 'mahkeme' | 'esasNo' | 'davaci' | 'davali' | 'konu' | 'acilis' | 'durum' | 'asama' | 'durusma' | 'aksiyon';

const DAVA_SUTUNLAR: { key: DavaColKey; label: string; sortKey?: SortKey; varsayilan: boolean }[] = [
  { key: 'sira', label: '#', sortKey: 'kayitNo', varsayilan: true },
  { key: 'mahkeme', label: 'Mahkeme', sortKey: 'mahkeme', varsayilan: true },
  { key: 'esasNo', label: 'Esas No', sortKey: 'esasNo', varsayilan: true },
  { key: 'davaci', label: 'Davacı', sortKey: 'davaci', varsayilan: true },
  { key: 'davali', label: 'Davalı', sortKey: 'davali', varsayilan: true },
  { key: 'konu', label: 'Dava Konusu', varsayilan: true },
  { key: 'acilis', label: 'Dava Açılış Tarihi', sortKey: 'acilisTarihi', varsayilan: true },
  { key: 'durum', label: 'Durum', sortKey: 'durum', varsayilan: true },
  { key: 'asama', label: 'Aşama', sortKey: 'asama', varsayilan: true },
  { key: 'durusma', label: 'Sonraki Duruşma', sortKey: 'durusmaTarihi', varsayilan: true },
  { key: 'aksiyon', label: '', varsayilan: true },
];

const LS_KEY_COLS = 'lb_dava_cols';
const LS_KEY_FILTERS = 'lb_dava_saved_filters';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

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
  useEffect(() => { document.title = 'Davalar | LexBase'; }, []);

  const { data: davalar, isLoading } = useDavalar();
  const { data: muvekkillar } = useMuvekkillar();
  const arsivleMut = useDavaArsivle();
  const silMut = useDavaSil();

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
  const [aksiyonMenuId, setAksiyonMenuId] = useState<string | null>(null);
  const [kpiFiltre, setKpiFiltre] = useState<string | null>(null);

  // Yargı Türü değişince birimi resetle
  const mevcutBirimler = yargiTuru !== 'hepsi' ? (YARGI_BIRIMLERI[yargiTuru] || []) : [];
  const yillar = useMemo(() => {
    const buYil = new Date().getFullYear();
    return Array.from({ length: buYil - 1999 }, (_, i) => (buYil - i).toString());
  }, []);

  // Sayfalama
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);

  // Sütun görünürlük
  const varsayilanSutunlar = DAVA_SUTUNLAR.map((s) => s.key);
  const [gorunenSutunlar, setGorunenSutunlar] = useState<DavaColKey[]>(() => {
    if (typeof window === 'undefined') return varsayilanSutunlar;
    try {
      const saved = localStorage.getItem(LS_KEY_COLS);
      if (!saved) return varsayilanSutunlar;
      const parsed: DavaColKey[] = JSON.parse(saved);
      // Sütun tanımları değiştiyse (yeni sütun eklendi/kaldırıldı) varsayılana dön
      const gecerliAnahtarlar = new Set(varsayilanSutunlar);
      const kaydedilenSet = new Set(parsed);
      const eksik = varsayilanSutunlar.some((k) => !kaydedilenSet.has(k));
      const fazla = parsed.some((k) => !gecerliAnahtarlar.has(k));
      if (eksik || fazla) {
        localStorage.removeItem(LS_KEY_COLS);
        return varsayilanSutunlar;
      }
      return parsed;
    } catch { return varsayilanSutunlar; }
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

  // ── Actionable KPI hesaplama ─────────────────────────────────
  const kpis = useMemo(() => {
    if (!davalar) return { aktifDosya: 0, yaklasanDurusma: 0, kesinSure: 0, avansBiten: 0, hareketsiz: 0, bekleyenTahsilat: 0 };
    const simdi = Date.now();
    const gun15 = 15 * 86400000;
    const gun7 = 7 * 86400000;
    const gun60 = 60 * 86400000;

    let yaklasanDurusma = 0;
    let kesinSure = 0;
    let avansBiten = 0;
    let hareketsiz = 0;
    let bekleyenTahsilat = 0;

    const aktifler = davalar.filter((d) => d.durum !== 'Kapalı');

    aktifler.forEach((d) => {
      // Yaklaşan duruşma (15 gün)
      if (d.durusma) {
        const fark = new Date(d.durusma).getTime() - simdi;
        if (fark >= 0 && fark <= gun15) yaklasanDurusma++;
      }
      // Kesin süreler (7 gün) — sureler array check
      if (d.sureler && Array.isArray(d.sureler)) {
        d.sureler.forEach((s: { baslangic: string; gun: number }) => {
          const bitis = new Date(s.baslangic).getTime() + s.gun * 86400000;
          const kalan = bitis - simdi;
          if (kalan >= 0 && kalan <= gun7) kesinSure++;
        });
      }
      // Avansı biten — harcamalar toplamı > tahsilatlar toplamı
      const topHarcama = (d.harcamalar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
      const topTahsilat = (d.tahsilatlar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
      if (topHarcama > 0 && topTahsilat <= topHarcama) avansBiten++;
      // Ücret alacağı: sözleşme bedeli - tahsil edilen (tek kaynak: tahsilatlar[])
      const sozlesme = safeNum(d.ucret);
      if (sozlesme > 0) {
        const tahsil = d.tahsilatlar?.length ? tahsilatToplam(d.tahsilatlar) : safeNum(d.tahsilEdildi);
        if (sozlesme > tahsil) bekleyenTahsilat += (sozlesme - tahsil);
      }
      // Hareketsiz dosya (60 gün)
      const sonIslem = d.tarih || d.durusma || '';
      if (sonIslem) {
        const fark = simdi - new Date(sonIslem).getTime();
        if (fark > gun60) hareketsiz++;
      }
    });

    return {
      aktifDosya: aktifler.length,
      yaklasanDurusma,
      kesinSure,
      avansBiten,
      hareketsiz,
      bekleyenTahsilat,
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
        if (birimler.length > 0 && d.mtur && !birimler.some((b) => d.mtur?.toLocaleLowerCase('tr').includes(b.toLocaleLowerCase('tr')))) return false;
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
        const q = arama.toLocaleLowerCase('tr');
        const muvAd = muvAdMap[d.muvId || ''] || '';
        const esasStr = esasNoGoster(d.esasYil, d.esasNo);
        const mahkemeStr = tamMahkemeAdi(d.il, d.mno, d.mtur, d.adliye);
        if (!(
          esasStr.toLocaleLowerCase('tr').includes(q) ||
          mahkemeStr.toLocaleLowerCase('tr').includes(q) ||
          muvAd.toLocaleLowerCase('tr').includes(q) ||
          (d.karsi || '').toLocaleLowerCase('tr').includes(q) ||
          (d.konu || '').toLocaleLowerCase('tr').includes(q) ||
          (d.davaTuru || '').toLocaleLowerCase('tr').includes(q) ||
          (d.no || '').toLocaleLowerCase('tr').includes(q)
        )) return false;
      }
      // KPI filtre
      if (kpiFiltre) {
        const simdi = Date.now();
        const gun15 = 15 * 86400000;
        const gun7 = 7 * 86400000;
        const gun60 = 60 * 86400000;
        if (kpiFiltre === 'aktif' && d.durum === 'Kapalı') return false;
        if (kpiFiltre === 'durusma') {
          if (!d.durusma) return false;
          const fark = new Date(d.durusma).getTime() - simdi;
          if (!(fark >= 0 && fark <= gun15)) return false;
        }
        if (kpiFiltre === 'sure') {
          let hasSure = false;
          if (d.sureler && Array.isArray(d.sureler)) {
            d.sureler.forEach((s: { baslangic: string; gun: number }) => {
              const bitis = new Date(s.baslangic).getTime() + s.gun * 86400000;
              if (bitis - simdi >= 0 && bitis - simdi <= gun7) hasSure = true;
            });
          }
          if (!hasSure) return false;
        }
        if (kpiFiltre === 'avans') {
          const topH = (d.harcamalar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
          const topT = (d.tahsilatlar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
          if (!(topH > 0 && topT <= topH)) return false;
        }
        if (kpiFiltre === 'hareketsiz') {
          const sonIslem = d.tarih || d.durusma || '';
          if (!sonIslem || !(simdi - new Date(sonIslem).getTime() > gun60)) return false;
        }
        if (kpiFiltre === 'tahsilat') {
          const sozlesme = safeNum(d.ucret);
          if (sozlesme <= 0) return false;
          const tahsil = d.tahsilatlar?.length ? tahsilatToplam(d.tahsilatlar) : safeNum(d.tahsilEdildi);
          if (!(sozlesme > tahsil)) return false;
        }
      }
      return true;
    });
  }, [davalar, arama, dosyaDurumu, yargiTuru, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis, muvAdMap, kpiFiltre]);

  // ── Sıralama ───────────────────────────────────────────────
  const sirali = useMemo(() => {
    const list = [...filtrelenmis];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'kayitNo': cmp = (a.kayitNo ?? a.sira ?? 0) - (b.kayitNo ?? b.sira ?? 0); break;
        case 'esasNo': cmp = esasNoGoster(a.esasYil, a.esasNo).localeCompare(esasNoGoster(b.esasYil, b.esasNo), 'tr'); break;
        case 'mahkeme': cmp = tamMahkemeAdi(a.il, a.mno, a.mtur, a.adliye).localeCompare(tamMahkemeAdi(b.il, b.mno, b.mtur, b.adliye), 'tr'); break;
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
  const toplamSayfa = Math.max(1, Math.ceil(sirali.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * sayfaBoyutu;
    return sirali.slice(bas, bas + sayfaBoyutu);
  }, [sirali, sayfa, sayfaBoyutu]);

  // Filtre değişince sayfa 1'e dön
  useEffect(() => { setSayfa(1); }, [arama, dosyaDurumu, yargiTuru, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis, kpiFiltre]);

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
    mahkeme: 'minmax(160px,2fr)',
    esasNo: 'minmax(80px,1fr)',
    davaci: 'minmax(100px,1fr)',
    davali: 'minmax(100px,1fr)',
    konu: 'minmax(120px,1.5fr)',
    acilis: '100px',
    durum: '75px',
    asama: '80px',
    durusma: '110px',
    aksiyon: '40px',
  };

  const gridTemplate = useMemo(() => {
    const cols = ['28px']; // checkbox
    gorunenSutunlar.forEach((k) => { if (COL_WIDTHS[k]) cols.push(COL_WIDTHS[k]); });
    return cols.join('_');
  }, [gorunenSutunlar]);

  const gridClass = `grid gap-2 px-4 min-w-[950px]`;
  const gridStyle = { gridTemplateColumns: ['28px', ...gorunenSutunlar.map((k) => COL_WIDTHS[k])].join(' ') };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
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

      {/* ── Actionable KPI Strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Aktif Dosyalar" value={kpis.aktifDosya} icon={svgBriefcase} color="text-blue-400" active={kpiFiltre === 'aktif'} onClick={() => setKpiFiltre(kpiFiltre === 'aktif' ? null : 'aktif')} />
        <KpiCard label="Yaklaşan Duruşma" value={kpis.yaklasanDurusma} icon={svgCalendar} color="text-gold" pulse={kpis.yaklasanDurusma > 0} active={kpiFiltre === 'durusma'} onClick={() => setKpiFiltre(kpiFiltre === 'durusma' ? null : 'durusma')} />
        <KpiCard label="Kesin Süreler" value={kpis.kesinSure} icon={svgHourglass} color={kpis.kesinSure > 0 ? 'text-red' : 'text-text-muted'} pulse={kpis.kesinSure > 0} active={kpiFiltre === 'sure'} onClick={() => setKpiFiltre(kpiFiltre === 'sure' ? null : 'sure')} />
        <KpiCard label="Avansı Bitenler" value={kpis.avansBiten} icon={svgWallet} color={kpis.avansBiten > 0 ? 'text-orange-400' : 'text-text-muted'} active={kpiFiltre === 'avans'} onClick={() => setKpiFiltre(kpiFiltre === 'avans' ? null : 'avans')} />
        <KpiCard label="Hareketsiz Dosya" value={kpis.hareketsiz} icon={svgSleep} color={kpis.hareketsiz > 0 ? 'text-yellow-500' : 'text-text-muted'} active={kpiFiltre === 'hareketsiz'} onClick={() => setKpiFiltre(kpiFiltre === 'hareketsiz' ? null : 'hareketsiz')} />
        <KpiCard label="Ücret Alacağı" value={kpis.bekleyenTahsilat > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(kpis.bekleyenTahsilat) : '₺0'} icon={svgMoney} color={kpis.bekleyenTahsilat > 0 ? 'text-orange-400' : 'text-green'} active={kpiFiltre === 'tahsilat'} onClick={() => setKpiFiltre(kpiFiltre === 'tahsilat' ? null : 'tahsilat')} />
      </div>

      {/* ── KPI Filtre Göstergesi ────────────────────────────── */}
      {kpiFiltre && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gold/10 border border-gold/20 rounded-lg text-xs text-gold">
          <span>🔍</span>
          <span className="font-medium">
            {kpiFiltre === 'aktif' && 'Aktif dosyalar gösteriliyor'}
            {kpiFiltre === 'durusma' && 'Yaklaşan duruşması olanlar gösteriliyor'}
            {kpiFiltre === 'sure' && 'Kesin süre yaklaşanlar gösteriliyor'}
            {kpiFiltre === 'avans' && 'Avansı bitenler gösteriliyor'}
            {kpiFiltre === 'hareketsiz' && 'Hareketsiz dosyalar gösteriliyor'}
            {kpiFiltre === 'tahsilat' && 'Ücret alacağı olanlar gösteriliyor'}
          </span>
          <span className="text-text-dim">({filtrelenmis.length} dosya)</span>
          <button onClick={() => setKpiFiltre(null)} className="ml-auto text-text-dim hover:text-text transition-colors">✕ Temizle</button>
        </div>
      )}

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
          <div className="px-4 py-2.5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2 max-w-3xl">
              {/* Sol Kolon — Yargı Türü, Yargı Birimi, Arama */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Yargı Türü</label>
                  <select value={yargiTuru} onChange={(e) => { setYargiTuru(e.target.value); setYargiBirimi('hepsi'); }} className="w-full px-2 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {YARGI_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Yargı Birimi</label>
                  <select value={yargiBirimi} onChange={(e) => setYargiBirimi(e.target.value)} disabled={yargiTuru === 'hepsi'} className="w-full px-2 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="hepsi">Seçiniz</option>
                    {mevcutBirimler.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Kişi / Genel Arama</label>
                  <div className="relative">
                    <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Taraf adı, mahkeme, konu..." className="w-full px-2 py-1.5 pl-7 bg-bg border border-border rounded text-[11px] text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim text-[10px]">&#x1F50D;</span>
                  </div>
                </div>
              </div>
              {/* Sağ Kolon — Durum, Dosya Yıl/No, Açılış Tarihi */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Dosya Durumu</label>
                  <div className="flex items-center gap-0 bg-bg border border-border rounded overflow-hidden w-fit">
                    <button type="button" onClick={() => setDosyaDurumu('acik')} className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${dosyaDurumu === 'acik' ? 'bg-gold text-bg' : 'text-text-muted hover:text-text'}`}>Açık</button>
                    <button type="button" onClick={() => setDosyaDurumu('kapali')} className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${dosyaDurumu === 'kapali' ? 'bg-gold text-bg' : 'text-text-muted hover:text-text'}`}>Kapalı</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Dosya Yıl / No</label>
                  <div className="flex items-center gap-1">
                    <select value={esasYilFiltre} onChange={(e) => setEsasYilFiltre(e.target.value)} className="w-[72px] px-1.5 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold">
                      <option value="">Yıl</option>
                      {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-text-dim text-[10px]">/</span>
                    <input type="text" value={esasNoFiltre} onChange={(e) => setEsasNoFiltre(e.target.value)} placeholder="No" className="w-16 px-1.5 py-1.5 bg-bg border border-border rounded text-[11px] text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Açılış Tarihi</label>
                  <div className="flex items-center gap-1">
                    <input type="date" value={tarihBaslangic} onChange={(e) => setTarihBaslangic(e.target.value)} className="flex-1 min-w-0 px-1.5 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold" />
                    <span className="text-[9px] text-text-dim">—</span>
                    <input type="date" value={tarihBitis} onChange={(e) => setTarihBitis(e.target.value)} className="flex-1 min-w-0 px-1.5 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Alt Aksiyon Satırı */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
              <div className="text-[11px] text-text-dim">
                {filtreAktif ? `${sirali.length} / ${davalar?.length ?? 0} sonuç` : `${sirali.length} dosya listeleniyor`}
              </div>
              <div className="flex items-center gap-2">
                {filtreAktif && (
                  <button onClick={() => { setArama(''); setDosyaDurumu('acik'); setYargiTuru('hepsi'); setYargiBirimi('hepsi'); setEsasYilFiltre(''); setEsasNoFiltre(''); setTarihBaslangic(''); setTarihBitis(''); }} className="px-3 py-1.5 text-[11px] text-gold hover:text-gold-light transition-colors">
                    Temizle
                  </button>
                )}
                <button type="button" className="px-4 py-1.5 bg-gold text-bg text-[11px] font-medium rounded hover:bg-gold-light transition-colors flex items-center gap-1.5">
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
        <SkeletonTable rows={6} cols={gorunenSutunlar.length || 7} />
      ) : sirali.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">&#x2696;&#xFE0F;</div>
          <div className="text-sm text-text-muted">{filtreAktif ? 'Arama sonucu bulunamadı' : 'Henüz dava kaydı eklenmemiş'}</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto flex-1">
          {/* Sticky Tablo Başlık */}
          <div className={`${gridClass} py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider sticky top-0 z-10 bg-surface`} style={gridStyle}>
            <label className="flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={seciliIdler.size === sayfadakiler.length && sayfadakiler.length > 0} onChange={tumunuSec} className="accent-[var(--gold)]" />
            </label>
            {gorunenSutunlar.map((colKey) => {
              const col = DAVA_SUTUNLAR.find((s) => s.key === colKey);
              if (!col) return null;
              return col.sortKey ? (
                <button key={col.key} type="button" onClick={() => toggleSort(col.sortKey!)} className="text-left hover:text-text transition-colors truncate flex items-center gap-1"><span>{col.label}</span><span className="opacity-50 text-[9px]">{sortIcon(col.sortKey)}</span></button>
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
            const mahkeme = tamMahkemeAdi(d.il, d.mno, d.mtur, d.adliye);
            const esasStr = esasNoGoster(d.esasYil, d.esasNo);
            const vurgu = satirVurgu(d);
            const secili = seciliIdler.has(d.id);
            const globalIdx = (sayfa - 1) * sayfaBoyutu + idx;

            return (
              <div key={d.id} className={`${gridClass} py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center group/row ${vurgu} ${secili ? 'bg-gold-dim/50' : ''}`} style={gridStyle}>
                <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={secili} onChange={() => toggleSecim(d.id)} className="accent-[var(--gold)]" />
                </label>

                {gorunenSutunlar.map((colKey) => {
                  switch (colKey) {
                    case 'sira': return <span key={colKey} className="text-[11px] text-text-dim">{globalIdx + 1}</span>;
                    case 'mahkeme': return (
                      <Link key={colKey} href={`/davalar/${d.id}`} className="text-xs text-text truncate hover:underline font-medium" title={mahkeme || ''}>
                        {mahkeme || <span className="text-text-dim/40">—</span>}
                      </Link>
                    );
                    case 'esasNo': return (
                      <div key={colKey} className="flex items-center min-w-0">
                        <Link href={`/davalar/${d.id}`} className="min-w-0 hover:underline">
                          <span className="font-[var(--font-playfair)] text-sm font-bold text-gold truncate">
                            {esasStr || <span className="text-text-dim/40">—</span>}
                          </span>
                        </Link>
                        <CopyNo text={esasStr} />
                      </div>
                    );
                    case 'konu': return <span key={colKey} className="text-xs text-text truncate" title={d.konu || ''}>{d.konu || <span className="text-text-dim/40">—</span>}</span>;
                    case 'davaci': return (
                      <span key={colKey} className="text-xs text-text truncate flex items-center gap-1" title={davaci}>
                        {d.taraf === 'davacı' && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-green bg-green-dim border-green/30" title="Müvekkil">M</span>}
                        {davaci || <span className="text-text-dim/40">—</span>}
                      </span>
                    );
                    case 'davali': return (
                      <span key={colKey} className="text-xs text-text truncate flex items-center gap-1" title={davali}>
                        {d.taraf === 'davalı' && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-red bg-red-dim border-red/30" title="Müvekkil">M</span>}
                        {davali || <span className="text-text-dim/40">—</span>}
                      </span>
                    );
                    case 'acilis': return (
                      <span key={colKey} className={`text-[11px] ${tarihRenkSinifi(d.tarih)}`} title={tarihTooltip(d.tarih)}>
                        {d.tarih ? fmtTarih(d.tarih) : <span className="text-text-dim/40">—</span>}
                      </span>
                    );
                    case 'asama': return <span key={colKey}><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ASAMA_RENK[d.asama || ''] || 'text-text-dim bg-surface2'}`}>{d.asama || '—'}</span></span>;
                    case 'durum': return <span key={colKey}><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[d.durum || ''] || 'text-text-dim bg-surface2 border-border'}`}>{d.durum || '—'}</span></span>;
                    case 'durusma': return <span key={colKey}><DurusmaBadge tarih={d.durusma} saat={d.durusmaSaati} /></span>;
                    case 'aksiyon': return (
                      <div key={colKey} className="relative flex items-center justify-center">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAksiyonMenuId(aksiyonMenuId === d.id ? null : d.id); }} className="p-1 rounded hover:bg-surface2 text-text-dim hover:text-text transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {aksiyonMenuId === d.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <Link href={`/davalar/${d.id}`} onClick={() => setAksiyonMenuId(null)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface2 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>
                              Dosyaya Git
                            </Link>
                            <button onClick={() => { setSeciliDava(d); setModalAcik(true); setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface2 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Düzenle
                            </button>
                            <div className="my-1 border-t border-border/50" />
                            <button onClick={() => { arsivleMut.mutate(d.id); setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                              Arşive Kaldır
                            </button>
                            <button onClick={() => { if (confirm('Bu davayı silmek istediğinize emin misiniz?')) { silMut.mutate(d.id); } setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-red hover:bg-red/10 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    );
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
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-text-dim">
              {filtreAktif ? `${sirali.length} / ${davalar?.length ?? 0} dava` : `${sirali.length} dava`}
              {toplamSayfa > 1 && ` — Sayfa ${sayfa}/${toplamSayfa}`}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-dim">Göster:</span>
              <select value={sayfaBoyutu} onChange={(e) => { setSayfaBoyutu(Number(e.target.value)); setSayfa(1); }} className="px-1.5 py-0.5 text-[11px] bg-bg border border-border rounded text-text focus:outline-none focus:border-gold">
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
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
//  SVG İkon Sabitleri (KPI arka plan)
// ══════════════════════════════════════════════════════════════

const svgBriefcase = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>;
const svgCalendar = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const svgHourglass = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z"/></svg>;
const svgWallet = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1"/></svg>;
const svgSleep = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><rect x="9" y="8" width="2" height="8" rx="0.5"/><rect x="13" y="8" width="2" height="8" rx="0.5"/></svg>;
const svgMoney = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>;

// ══════════════════════════════════════════════════════════════
//  KPI Kartı (Arka plan SVG ikonlu)
// ══════════════════════════════════════════════════════════════

function KpiCard({ label, value, icon, color, pulse, active, onClick }: { label: string; value: number | string; icon: React.ReactNode; color?: string; pulse?: boolean; active?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`relative bg-surface border rounded-xl px-4 py-3 overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:border-gold/30 hover:scale-[1.02]' : ''} ${active ? 'border-gold ring-1 ring-gold/30 shadow-md' : 'border-border'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {/* Arka plan ikon */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 opacity-[0.07] text-text pointer-events-none">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">{label}</div>
        <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-text'} ${pulse ? 'animate-pulse' : ''}`}>
          {value}
        </div>
      </div>
      {active && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold" />}
    </div>
  );
}
