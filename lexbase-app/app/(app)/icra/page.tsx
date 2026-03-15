'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useIcralar, useIcraKaydet, useIcraArsivle, useIcraSil, type Icra } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { IcraModal } from '@/components/modules/IcraModal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { SureBadge } from '@/components/ui/SureBadge';
import { tamIcraDairesiAdi, esasNoGoster, dosyaNoOlustur, alacakliBelirle, sureHesapla, icraDosyaBaslik } from '@/lib/utils/uyapHelpers';
import { ICRA_TURLERI, ICRA_DURUMLARI, ICRA_YARGI_BIRIMLERI } from '@/lib/constants/uyap';
import { exportIcraListeUYAPXLS } from '@/lib/export/excelExport';
import { exportIcraListePDF } from '@/lib/export/pdfExport';

/* ── Durum renk haritasi ── */
const DURUM_RENK: Record<string, string> = {
  'Aktif': 'text-green bg-green-dim border-green/20',
  'Takipte': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Haciz Aşaması': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Satış Aşaması': 'text-red bg-red-dim border-red/20',
  'Kapandı': 'text-text-dim bg-surface2 border-border',
};

/* ── Siralama tipleri ── */
type SortKey = 'kayitNo' | 'esasNo' | 'daire' | 'alacakli' | 'borclu' | 'acilisTarihi' | 'tebligTarihi' | 'durum' | 'alacak' | 'tahsilat' | 'sure';
type SortDir = 'asc' | 'desc';

/* ── Sütun tanımları ── */
type IcraColKey = 'sira' | 'esasNo' | 'daire' | 'alacakli' | 'borclu' | 'acilis' | 'teblig' | 'durum' | 'alacak' | 'tahsilat' | 'sure' | 'aksiyon';

const ICRA_SUTUNLAR: { key: IcraColKey; label: string; sortKey?: SortKey; varsayilan: boolean }[] = [
  { key: 'sira', label: '#', sortKey: 'kayitNo', varsayilan: true },
  { key: 'esasNo', label: 'Esas No', sortKey: 'esasNo', varsayilan: true },
  { key: 'daire', label: 'İcra Dairesi', sortKey: 'daire', varsayilan: true },
  { key: 'alacakli', label: 'Alacaklı', sortKey: 'alacakli', varsayilan: true },
  { key: 'borclu', label: 'Borçlu', sortKey: 'borclu', varsayilan: true },
  { key: 'acilis', label: 'Açılış', sortKey: 'acilisTarihi', varsayilan: true },
  { key: 'teblig', label: 'Tebliğ', sortKey: 'tebligTarihi', varsayilan: true },
  { key: 'durum', label: 'Durum', sortKey: 'durum', varsayilan: true },
  { key: 'alacak', label: 'Alacak', sortKey: 'alacak', varsayilan: true },
  { key: 'tahsilat', label: 'Tahsilat', sortKey: 'tahsilat', varsayilan: true },
  { key: 'sure', label: 'Süre', sortKey: 'sure', varsayilan: true },
  { key: 'aksiyon', label: '', varsayilan: true },
];

const LS_KEY_COLS = 'lb_icra_cols';
const LS_KEY_FILTERS = 'lb_icra_saved_filters';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

/* ── Süre gün sayisi (tür bazli) ── */
function itirazGunSayisi(tur?: string): number {
  if (tur === 'Kambiyo') return 5;
  return 7;
}

/* ── Satir vurgulama (süre bazli) ── */
function satirVurgu(kalanGun: number | null): string {
  if (kalanGun === null) return '';
  if (kalanGun >= 0 && kalanGun <= 3) return 'bg-red/5';
  if (kalanGun >= 0 && kalanGun <= 7) return 'bg-gold/5';
  return '';
}

/* ── Tarih renk yardımcısı ── */
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

function tebligRenkSinifi(tebligTarihi?: string, tur?: string): string {
  if (!tebligTarihi) return 'text-text-dim';
  const gun = itirazGunSayisi(tur);
  const teblig = new Date(tebligTarihi);
  const sonGun = new Date(teblig.getTime() + gun * 86400000);
  const kalan = Math.ceil((sonGun.getTime() - Date.now()) / 86400000);
  if (kalan < 0) return 'text-text-muted'; // süre geçmiş
  if (kalan <= 2) return 'text-red animate-pulse';
  if (kalan <= 5) return 'text-orange-400';
  return 'text-text-muted';
}

export default function IcraPage() {
  const { data: icralar, isLoading } = useIcralar();
  const { data: muvekkillar } = useMuvekkillar();
  const kaydetMutation = useIcraKaydet();
  const arsivleMut = useIcraArsivle();
  const silMut = useIcraSil();

  const [arama, setArama] = useState('');
  const [dosyaDurumu, setDosyaDurumu] = useState<'acik' | 'kapali'>('acik');
  const [turFiltre, setTurFiltre] = useState<string>('hepsi');
  const [yargiBirimi, setYargiBirimi] = useState<string>('hepsi');
  const [esasYilFiltre, setEsasYilFiltre] = useState<string>('');
  const [esasNoFiltre, setEsasNoFiltre] = useState<string>('');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('kayitNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliIcra, setSeciliIcra] = useState<Icra | null>(null);
  const [sorguPaneliAcik, setSorguPaneliAcik] = useState(true);
  const [aksiyonMenuId, setAksiyonMenuId] = useState<string | null>(null);

  const yillar = useMemo(() => {
    const buYil = new Date().getFullYear();
    return Array.from({ length: buYil - 1999 }, (_, i) => (buYil - i).toString());
  }, []);

  // Sayfalama
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);

  // Sütun görünürlük
  const [gorunenSutunlar, setGorunenSutunlar] = useState<IcraColKey[]>(() => {
    if (typeof window === 'undefined') return ICRA_SUTUNLAR.map((s) => s.key);
    try {
      const saved = localStorage.getItem(LS_KEY_COLS);
      return saved ? JSON.parse(saved) : ICRA_SUTUNLAR.map((s) => s.key);
    } catch { return ICRA_SUTUNLAR.map((s) => s.key); }
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
    try { const s = localStorage.getItem(LS_KEY_FILTERS); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  // Persist
  useEffect(() => { localStorage.setItem(LS_KEY_COLS, JSON.stringify(gorunenSutunlar)); }, [gorunenSutunlar]);
  useEffect(() => { localStorage.setItem(LS_KEY_FILTERS, JSON.stringify(kayitliFiltreler)); }, [kayitliFiltreler]);

  // Dış tıklama
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (sutunMenuRef.current && !sutunMenuRef.current.contains(e.target as Node)) setSutunMenuAcik(false);
      if (kayitliFiltreRef.current && !kayitliFiltreRef.current.contains(e.target as Node)) setKayitliFiltreMenuAcik(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ── Müvekkil adi map ── */
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  /* ── Süre hesaplamalari ── */
  const sureMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof sureHesapla> | null> = {};
    icralar?.forEach((ic) => {
      if (ic.tebligTarihi) map[ic.id] = sureHesapla(ic.tebligTarihi, itirazGunSayisi(ic.tur));
      else map[ic.id] = null;
    });
    return map;
  }, [icralar]);

  /* ── Actionable KPI ── */
  const kpis = useMemo(() => {
    if (!icralar) return { aktifTakip: 0, kritikSure: 0, hacizAsamasi: 0, avansBiten: 0, hareketsiz: 0, bekleyenTahsilat: 0 };
    const simdi = Date.now();
    const gun7 = 7 * 86400000;
    const gun60 = 60 * 86400000;

    let kritikSure = 0;
    let avansBiten = 0;
    let hareketsiz = 0;
    let bekleyenTahsilat = 0;

    const aktifler = icralar.filter((i) => i.durum !== 'Kapandı');

    aktifler.forEach((ic) => {
      // Kritik süreler
      const s = sureMap[ic.id];
      if (s && !s.gecmis && s.kalanGun <= 7) kritikSure++;
      // Avansı biten
      const topHarcama = (ic.harcamalar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
      const topTahsilat = (ic.tahsilatlar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
      if (topHarcama > 0 && topTahsilat <= topHarcama) avansBiten++;
      // Bekleyen alacak (alacak - tahsil)
      const kalan = (ic.alacak || 0) - (ic.tahsil || 0);
      if (kalan > 0) bekleyenTahsilat += kalan;
      // Hareketsiz dosya
      const sonIslem = ic.tarih || '';
      if (sonIslem) {
        const fark = simdi - new Date(sonIslem).getTime();
        if (fark > gun60) hareketsiz++;
      }
    });

    return {
      aktifTakip: aktifler.length,
      kritikSure,
      hacizAsamasi: icralar.filter((i) => i.durum === 'Haciz Aşaması').length,
      avansBiten,
      hareketsiz,
      bekleyenTahsilat,
    };
  }, [icralar, sureMap]);

  /* ── Filtreleme + Siralama ── */
  const filtrelenmis = useMemo(() => {
    if (!icralar) return [];
    let sonuc = icralar.filter((ic) => {
      // Dosya durumu toggle
      if (dosyaDurumu === 'acik' && ic.durum === 'Kapandı') return false;
      if (dosyaDurumu === 'kapali' && ic.durum !== 'Kapandı') return false;
      if (turFiltre !== 'hepsi' && ic.tur !== turFiltre) return false;
      if (yargiBirimi !== 'hepsi') {
        const daireStr = tamIcraDairesiAdi(ic.il, ic.daire).toLocaleLowerCase('tr');
        if (!daireStr.includes(yargiBirimi.toLocaleLowerCase('tr'))) return false;
      }
      // Esas yıl/no filtresi
      if (esasYilFiltre && ic.esasYil !== esasYilFiltre) return false;
      if (esasNoFiltre && !(ic.esasNo || '').toString().includes(esasNoFiltre)) return false;
      if (tarihBaslangic && ic.tarih && ic.tarih < tarihBaslangic) return false;
      if (tarihBitis && ic.tarih && ic.tarih > tarihBitis) return false;
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        const muvAd = muvAdMap[ic.muvId || ''] || '';
        const esasStr = esasNoGoster(ic.esasYil, ic.esasNo) || ic.esas || '';
        const daireStr = tamIcraDairesiAdi(ic.il, ic.daire);
        return (ic.no || '').toLocaleLowerCase('tr').includes(q) || esasStr.toLocaleLowerCase('tr').includes(q) || (ic.borclu || '').toLocaleLowerCase('tr').includes(q) || muvAd.toLocaleLowerCase('tr').includes(q) || daireStr.toLocaleLowerCase('tr').includes(q) || (ic.tur || '').toLocaleLowerCase('tr').includes(q);
      }
      return true;
    });

    sonuc = [...sonuc].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'kayitNo': cmp = (a.kayitNo || a.sira || 0) - (b.kayitNo || b.sira || 0); break;
        case 'esasNo': cmp = (esasNoGoster(a.esasYil, a.esasNo) || a.esas || '').localeCompare(esasNoGoster(b.esasYil, b.esasNo) || b.esas || '', 'tr'); break;
        case 'daire': cmp = tamIcraDairesiAdi(a.il, a.daire).localeCompare(tamIcraDairesiAdi(b.il, b.daire), 'tr'); break;
        case 'alacakli': cmp = alacakliBelirle(a.muvRol, muvAdMap[a.muvId || ''] || '', a.borclu || '').alacakli.localeCompare(alacakliBelirle(b.muvRol, muvAdMap[b.muvId || ''] || '', b.borclu || '').alacakli, 'tr'); break;
        case 'borclu': cmp = alacakliBelirle(a.muvRol, muvAdMap[a.muvId || ''] || '', a.borclu || '').borclu.localeCompare(alacakliBelirle(b.muvRol, muvAdMap[b.muvId || ''] || '', b.borclu || '').borclu, 'tr'); break;
        case 'acilisTarihi': cmp = (a.tarih || '9999').localeCompare(b.tarih || '9999'); break;
        case 'tebligTarihi': cmp = (a.tebligTarihi || '9999').localeCompare(b.tebligTarihi || '9999'); break;
        case 'durum': cmp = (a.durum || '').localeCompare(b.durum || '', 'tr'); break;
        case 'alacak': cmp = (a.alacak || 0) - (b.alacak || 0); break;
        case 'tahsilat': cmp = (a.tahsil || 0) - (b.tahsil || 0); break;
        case 'sure': cmp = (sureMap[a.id]?.kalanGun ?? 9999) - (sureMap[b.id]?.kalanGun ?? 9999); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sonuc;
  }, [icralar, arama, dosyaDurumu, turFiltre, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis, sortKey, sortDir, muvAdMap, sureMap]);

  /* ── Sayfalama ── */
  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * sayfaBoyutu;
    return filtrelenmis.slice(bas, bas + sayfaBoyutu);
  }, [filtrelenmis, sayfa, sayfaBoyutu]);

  useEffect(() => { setSayfa(1); }, [arama, dosyaDurumu, turFiltre, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis]);

  /* ── Siralama toggle ── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  function sortIcon(key: SortKey) {
    if (sortKey !== key) return ' \u21C5';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  /* ── Sütun toggle ── */
  function toggleSutun(key: IcraColKey) {
    setGorunenSutunlar((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  /* ── Satır seçimi ── */
  function toggleSecim(id: string) {
    setSeciliIdler((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function tumunuSec() {
    if (seciliIdler.size === sayfadakiler.length) setSeciliIdler(new Set());
    else setSeciliIdler(new Set(sayfadakiler.map((d) => d.id)));
  }

  /* ── Kayıtlı filtre ── */
  function filtreKaydet() {
    if (!filtreAdi.trim()) return;
    const yeni = { ad: filtreAdi.trim(), filtre: { arama, dosyaDurumu, turFiltre, yargiBirimi, esasYilFiltre, esasNoFiltre, tarihBaslangic, tarihBitis } };
    setKayitliFiltreler((prev) => [...prev.filter((f) => f.ad !== yeni.ad), yeni]);
    setFiltreAdi(''); setKayitliFiltreMenuAcik(false);
  }
  function filtreUygula(f: Record<string, string>) {
    setArama(f.arama || ''); setDosyaDurumu((f.dosyaDurumu as 'acik' | 'kapali') || 'acik'); setTurFiltre(f.turFiltre || 'hepsi'); setYargiBirimi(f.yargiBirimi || 'hepsi'); setEsasYilFiltre(f.esasYilFiltre || ''); setEsasNoFiltre(f.esasNoFiltre || ''); setTarihBaslangic(f.tarihBaslangic || ''); setTarihBitis(f.tarihBitis || '');
    setKayitliFiltreMenuAcik(false);
  }
  function filtreSil(ad: string) { setKayitliFiltreler((prev) => prev.filter((f) => f.ad !== ad)); }

  /* ── Export handlers ── */
  function handleExportExcel() {
    if (!filtrelenmis.length) return;
    const hedef = seciliIdler.size > 0 ? filtrelenmis.filter((d) => seciliIdler.has(d.id)) : filtrelenmis;
    exportIcraListeUYAPXLS(hedef as unknown as Array<Record<string, unknown>>, muvAdMap);
  }
  function handleExportPDF() {
    if (!filtrelenmis.length) return;
    const hedef = seciliIdler.size > 0 ? filtrelenmis.filter((d) => seciliIdler.has(d.id)) : filtrelenmis;
    exportIcraListePDF(hedef as unknown as Array<Record<string, unknown>>, muvAdMap);
  }

  const filtreAktif = arama || turFiltre !== 'hepsi' || yargiBirimi !== 'hepsi' || !!esasYilFiltre || !!esasNoFiltre || tarihBaslangic || tarihBitis;

  /* ── Grid template — dinamik sütunlara göre ── */
  const COL_WIDTHS: Record<IcraColKey, string> = {
    sira: '36px',
    esasNo: 'minmax(200px,3fr)',
    daire: 'minmax(120px,2fr)',
    alacakli: 'minmax(90px,1fr)',
    borclu: 'minmax(90px,1fr)',
    acilis: '82px',
    teblig: '82px',
    durum: '75px',
    alacak: '90px',
    tahsilat: '80px',
    sure: '60px',
    aksiyon: '40px',
  };

  const gridClass = 'grid gap-2 px-4 min-w-[1050px]';
  const gridStyle = { gridTemplateColumns: ['28px', ...gorunenSutunlar.map((k) => COL_WIDTHS[k])].join(' ') };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          İcra Dosyaları
          {icralar && <span className="text-sm font-normal text-text-muted ml-2">({icralar.length})</span>}
        </h1>
        <div className="flex items-center gap-2">
          {/* Sütun ayarları */}
          <div className="relative" ref={sutunMenuRef}>
            <button onClick={() => setSutunMenuAcik((p) => !p)} className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text hover:border-gold transition-colors" title="Sütunları ayarla">
              <span className="text-sm">&#x2699;&#xFE0F;</span>
            </button>
            {sutunMenuAcik && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-1.5 text-[10px] text-text-dim uppercase tracking-wider border-b border-border">Sütunlar</div>
                {ICRA_SUTUNLAR.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface2 cursor-pointer">
                    <input type="checkbox" checked={gorunenSutunlar.includes(s.key)} onChange={() => toggleSutun(s.key)} className="accent-[var(--gold)]" />
                    {s.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Kayıtlı filtreler */}
          <div className="relative" ref={kayitliFiltreRef}>
            <button onClick={() => setKayitliFiltreMenuAcik((p) => !p)} className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text hover:border-gold transition-colors" title="Kayıtlı filtreler">
              <span className="text-sm">&#x1F516;</span>
            </button>
            {kayitliFiltreMenuAcik && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-surface border border-border rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-1.5 text-[10px] text-text-dim uppercase tracking-wider border-b border-border">Kayıtlı Filtreler</div>
                {kayitliFiltreler.length === 0 && <div className="px-3 py-2 text-xs text-text-dim">Henüz kayıtlı filtre yok</div>}
                {kayitliFiltreler.map((f) => (
                  <div key={f.ad} className="flex items-center gap-1 px-3 py-1.5 hover:bg-surface2">
                    <button onClick={() => filtreUygula(f.filtre)} className="flex-1 text-left text-xs text-text hover:text-gold truncate">{f.ad}</button>
                    <button onClick={() => filtreSil(f.ad)} className="text-[10px] text-red hover:text-red/80 flex-shrink-0">&times;</button>
                  </div>
                ))}
                <div className="border-t border-border px-3 py-2 flex gap-1.5">
                  <input type="text" value={filtreAdi} onChange={(e) => setFiltreAdi(e.target.value)} placeholder="Filtre adı..." className="flex-1 px-2 py-1 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold" onKeyDown={(e) => e.key === 'Enter' && filtreKaydet()} />
                  <button onClick={filtreKaydet} className="px-2 py-1 bg-gold text-bg text-[10px] rounded font-semibold">Kaydet</button>
                </div>
              </div>
            )}
          </div>

          <ExportMenu onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} disabled={!filtrelenmis.length} />
          <button onClick={() => { setSeciliIcra(null); setModalAcik(true); }} className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
            + Yeni İcra Dosyası
          </button>
        </div>
      </div>

      {/* ── Actionable KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Aktif Takip" value={kpis.aktifTakip} icon={svgBriefcase} color="text-blue-400" />
        <KpiCard label="Kritik Süreler" value={kpis.kritikSure} icon={svgHourglass} color={kpis.kritikSure > 0 ? 'text-red' : 'text-text-muted'} pulse={kpis.kritikSure > 0} />
        <KpiCard label="Haciz Aşaması" value={kpis.hacizAsamasi} icon={svgGavel} color="text-orange-400" />
        <KpiCard label="Avansı Bitenler" value={kpis.avansBiten} icon={svgWallet} color={kpis.avansBiten > 0 ? 'text-orange-400' : 'text-text-muted'} />
        <KpiCard label="Hareketsiz Dosya" value={kpis.hareketsiz} icon={svgSleep} color={kpis.hareketsiz > 0 ? 'text-yellow-500' : 'text-text-muted'} />
        <KpiCard label="Bekleyen Tahsilat" value={kpis.bekleyenTahsilat > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(kpis.bekleyenTahsilat) : '₺0'} icon={svgMoney} color={kpis.bekleyenTahsilat > 0 ? 'text-red' : 'text-green'} />
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
          <div className="px-4 py-2.5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2 max-w-3xl">
              {/* Sol Kolon — İcra Türü, Yargı Birimi, Arama */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">İcra Türü</label>
                  <select value={turFiltre} onChange={(e) => setTurFiltre(e.target.value)} className="w-full px-2 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {ICRA_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Yargı Birimi</label>
                  <select value={yargiBirimi} onChange={(e) => setYargiBirimi(e.target.value)} className="w-full px-2 py-1.5 bg-bg border border-border rounded text-[11px] text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {ICRA_YARGI_BIRIMLERI.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">Kişi / Genel Arama</label>
                  <div className="relative">
                    <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Alacaklı, borçlu, daire adı..." className="w-full px-2 py-1.5 pl-7 bg-bg border border-border rounded text-[11px] text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
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
                {filtreAktif ? `${filtrelenmis.length} / ${icralar?.length ?? 0} sonuç` : `${filtrelenmis.length} dosya listeleniyor`}
              </div>
              <div className="flex items-center gap-2">
                {filtreAktif && (
                  <button onClick={() => { setArama(''); setDosyaDurumu('acik'); setTurFiltre('hepsi'); setYargiBirimi('hepsi'); setEsasYilFiltre(''); setEsasNoFiltre(''); setTarihBaslangic(''); setTarihBitis(''); }} className="px-3 py-1.5 text-[11px] text-gold hover:text-gold-light transition-colors">
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

      {/* Toplu işlem bar */}
      {seciliIdler.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-gold-dim border border-gold/20 rounded-lg">
          <span className="text-xs text-gold font-semibold">{seciliIdler.size} dosya seçili</span>
          <button onClick={handleExportExcel} className="text-[11px] px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-gold transition-colors">Excel&apos;e Aktar</button>
          <button onClick={handleExportPDF} className="text-[11px] px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-gold transition-colors">PDF&apos;e Aktar</button>
          <button onClick={() => setSeciliIdler(new Set())} className="ml-auto text-[11px] text-text-dim hover:text-text transition-colors">Seçimi Temizle</button>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">&#x1F4CB;</div>
          <div className="text-sm text-text-muted">{filtreAktif ? 'Arama sonucu bulunamadı' : 'Henüz icra dosyası eklenmemiş'}</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden overflow-x-auto flex-1">
          {/* Sticky Tablo Başlık */}
          <div className={`${gridClass} py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider sticky top-0 z-10 bg-surface`} style={gridStyle}>
            <label className="flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={seciliIdler.size === sayfadakiler.length && sayfadakiler.length > 0} onChange={tumunuSec} className="accent-[var(--gold)]" />
            </label>
            {gorunenSutunlar.map((colKey) => {
              const col = ICRA_SUTUNLAR.find((s) => s.key === colKey);
              if (!col) return null;
              return col.sortKey ? (
                <button key={col.key} type="button" onClick={() => toggleSort(col.sortKey!)} className="text-left hover:text-text transition-colors truncate flex items-center gap-1"><span>{col.label}</span><span className="opacity-50 text-[9px]">{sortIcon(col.sortKey)}</span></button>
              ) : <span key={col.key}>{col.label}</span>;
            })}
          </div>

          {/* Satırlar */}
          {sayfadakiler.map((ic, idx) => {
            const tahsilOran = ic.alacak && ic.alacak > 0 ? Math.min(((ic.tahsil || 0) / ic.alacak) * 100, 100) : 0;
            const esasStr = esasNoGoster(ic.esasYil, ic.esasNo) || ic.esas || '';
            const daireFull = tamIcraDairesiAdi(ic.il, ic.daire);
            const muvAd = muvAdMap[ic.muvId || ''] || '';
            const borcluAd = ic.borclu || '';
            const { alacakli, borclu } = alacakliBelirle(ic.muvRol, muvAd, borcluAd);
            const sureInfo = sureMap[ic.id];
            const kalanGun = sureInfo ? sureInfo.kalanGun : null;
            const rowVurgu = kalanGun !== null ? satirVurgu(kalanGun) : '';
            const secili = seciliIdler.has(ic.id);
            const globalIdx = (sayfa - 1) * sayfaBoyutu + idx;

            return (
              <div key={ic.id} className={`${gridClass} py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center ${rowVurgu} ${secili ? 'bg-gold-dim/50' : ''}`} style={gridStyle}>
                <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={secili} onChange={() => toggleSecim(ic.id)} className="accent-[var(--gold)]" />
                </label>

                {gorunenSutunlar.map((colKey) => {
                  switch (colKey) {
                    case 'sira': return <span key={colKey} className="text-[11px] text-text-dim">{globalIdx + 1}</span>;
                    case 'esasNo': return (
                      <Link key={colKey} href={`/icra/${ic.id}`} className="min-w-0 hover:underline">
                        <div className="flex items-center gap-1.5">
                          <span className="font-[var(--font-playfair)] text-sm font-bold text-gold truncate">{icraDosyaBaslik(ic)}</span>
                          {ic.tur && <span className="text-[9px] px-1 py-0.5 rounded bg-surface2 text-text-dim border border-border/50 whitespace-nowrap flex-shrink-0">{ic.tur}</span>}
                        </div>
                        {borcluAd && <div className="text-[10px] text-text-dim truncate mt-0.5">{borcluAd}</div>}
                      </Link>
                    );
                    case 'daire': return <Link key={colKey} href={`/icra/${ic.id}`} className="text-xs text-text truncate hover:underline" title={daireFull}>{daireFull || '—'}</Link>;
                    case 'alacakli': return (
                      <span key={colKey} className="text-xs text-text truncate flex items-center gap-1" title={alacakli}>
                        {ic.muvRol === 'alacakli' && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-green bg-green-dim border-green/30" title="Müvekkil">M</span>}
                        {alacakli || <span className="text-text-dim/40">—</span>}
                      </span>
                    );
                    case 'borclu': return (
                      <span key={colKey} className="text-xs text-text-muted truncate flex items-center gap-1" title={borclu}>
                        {ic.muvRol === 'borclu' && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-red bg-red-dim border-red/30" title="Müvekkil">M</span>}
                        {borclu || <span className="text-text-dim/40">—</span>}
                      </span>
                    );
                    case 'acilis': return <span key={colKey} className={`text-[11px] ${tarihRenkSinifi(ic.tarih)}`} title={tarihTooltip(ic.tarih)}>{ic.tarih ? fmtTarih(ic.tarih) : '—'}</span>;
                    case 'teblig': return <span key={colKey} className={`text-[11px] ${tebligRenkSinifi(ic.tebligTarihi, ic.tur)}`}>{ic.tebligTarihi ? fmtTarih(ic.tebligTarihi) : '—'}</span>;
                    case 'durum': return <span key={colKey}><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[ic.durum || ''] || 'text-text-dim bg-surface2 border-border'}`}>{ic.durum || '—'}</span></span>;
                    case 'alacak': return <span key={colKey} className="text-xs font-semibold text-text font-[var(--font-playfair)]">{fmt(ic.alacak || 0)}</span>;
                    case 'tahsilat': return (
                      <span key={colKey} className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${tahsilOran >= 100 ? 'bg-green' : tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`} style={{ width: `${tahsilOran}%` }} />
                        </div>
                        <span className="text-[10px] text-text-dim w-7 text-right">{Math.round(tahsilOran)}%</span>
                      </span>
                    );
                    case 'sure': return (
                      <span key={colKey} className="flex items-center justify-center">
                        {sureInfo ? <SureBadge kalanGun={sureInfo.kalanGun} compact /> : <span className="text-[10px] text-text-dim">—</span>}
                      </span>
                    );
                    case 'aksiyon': return (
                      <div key={colKey} className="relative flex items-center justify-center">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAksiyonMenuId(aksiyonMenuId === ic.id ? null : ic.id); }} className="p-1 rounded hover:bg-surface2 text-text-dim hover:text-text transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        {aksiyonMenuId === ic.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <Link href={`/icra/${ic.id}`} onClick={() => setAksiyonMenuId(null)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface2 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>
                              Dosyaya Git
                            </Link>
                            <button onClick={() => { setSeciliIcra(ic); setModalAcik(true); setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-text hover:bg-surface2 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Düzenle
                            </button>
                            <div className="my-1 border-t border-border/50" />
                            <button onClick={() => { arsivleMut.mutate(ic.id); setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                              Arşive Kaldır
                            </button>
                            <button onClick={() => { if (confirm('Bu icra dosyasını silmek istediğinize emin misiniz?')) { silMut.mutate(ic.id); } setAksiyonMenuId(null); }} className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-red hover:bg-red/10 transition-colors">
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

      {/* Sayfalama */}
      {!isLoading && filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-text-dim">
              {filtreAktif ? `${filtrelenmis.length} / ${icralar?.length ?? 0} dosya` : `${filtrelenmis.length} dosya`}
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

      <IcraModal open={modalAcik} onClose={() => setModalAcik(false)} icra={seciliIcra} />
    </div>
  );
}

/* ── SVG İkon Sabitleri ── */
const svgBriefcase = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>;
const svgHourglass = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z"/></svg>;
const svgGavel = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 3l5 5-7 7-5-5 7-7z"/><path d="M9 12l-4 4 2 2 4-4"/><path d="M3 21h18"/></svg>;
const svgWallet = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="14" r="1"/></svg>;
const svgSleep = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><rect x="9" y="8" width="2" height="8" rx="0.5"/><rect x="13" y="8" width="2" height="8" rx="0.5"/></svg>;
const svgMoney = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>;

/* ── KPI Kartı ── */
function KpiCard({ label, value, icon, color, pulse }: { label: string; value: number | string; icon: React.ReactNode; color?: string; pulse?: boolean }) {
  return (
    <div className="relative bg-surface border border-border rounded-xl px-4 py-3 overflow-hidden group hover:border-gold/30 transition-colors">
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 opacity-[0.07] text-text pointer-events-none">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-medium">{label}</div>
        <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-text'} ${pulse ? 'animate-pulse' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
