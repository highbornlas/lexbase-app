'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useIcralar, useIcraKaydet, type Icra } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { IcraModal } from '@/components/modules/IcraModal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { SureBadge } from '@/components/ui/SureBadge';
import { tamIcraDairesiAdi, esasNoGoster, dosyaNoOlustur, alacakliBelirle, sureHesapla } from '@/lib/utils/uyapHelpers';
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
type IcraColKey = 'sira' | 'esasNo' | 'daire' | 'alacakli' | 'borclu' | 'acilis' | 'teblig' | 'durum' | 'alacak' | 'tahsilat' | 'sure';

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
];

const LS_KEY_COLS = 'lb_icra_cols';
const LS_KEY_FILTERS = 'lb_icra_saved_filters';
const PAGE_SIZE = 25;

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

  const yillar = useMemo(() => {
    const buYil = new Date().getFullYear();
    return Array.from({ length: buYil - 1999 }, (_, i) => (buYil - i).toString());
  }, []);

  // Sayfalama
  const [sayfa, setSayfa] = useState(1);

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

  /* ── KPI ── */
  const kpis = useMemo(() => {
    if (!icralar) return { toplam: 0, aktifTakip: 0, toplamAlacak: 0, tahsilEdilen: 0, kalan: 0, yaklasanSure: 0 };
    const aktifTakip = icralar.filter((i) => i.durum !== 'Kapandı').length;
    const toplamAlacak = icralar.reduce((t, i) => t + (i.alacak || 0), 0);
    const tahsilEdilen = icralar.reduce((t, i) => t + (i.tahsil || 0), 0);
    const yaklasanSure = icralar.filter((ic) => { const s = sureMap[ic.id]; return s && !s.gecmis && s.kalanGun <= 7; }).length;
    return { toplam: icralar.length, aktifTakip, toplamAlacak, tahsilEdilen, kalan: toplamAlacak - tahsilEdilen, yaklasanSure };
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
        const daireStr = tamIcraDairesiAdi(ic.il, ic.daire).toLowerCase();
        if (!daireStr.includes(yargiBirimi.toLowerCase())) return false;
      }
      // Esas yıl/no filtresi
      if (esasYilFiltre && ic.esasYil !== esasYilFiltre) return false;
      if (esasNoFiltre && !(ic.esasNo || '').toString().includes(esasNoFiltre)) return false;
      if (tarihBaslangic && ic.tarih && ic.tarih < tarihBaslangic) return false;
      if (tarihBitis && ic.tarih && ic.tarih > tarihBitis) return false;
      if (arama) {
        const q = arama.toLowerCase();
        const muvAd = muvAdMap[ic.muvId || ''] || '';
        const esasStr = esasNoGoster(ic.esasYil, ic.esasNo) || ic.esas || '';
        const daireStr = tamIcraDairesiAdi(ic.il, ic.daire);
        return (ic.no || '').toLowerCase().includes(q) || esasStr.toLowerCase().includes(q) || (ic.borclu || '').toLowerCase().includes(q) || muvAd.toLowerCase().includes(q) || daireStr.toLowerCase().includes(q) || (ic.tur || '').toLowerCase().includes(q);
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
  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / PAGE_SIZE));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * PAGE_SIZE;
    return filtrelenmis.slice(bas, bas + PAGE_SIZE);
  }, [filtrelenmis, sayfa]);

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
    esasNo: 'minmax(80px,1fr)',
    daire: 'minmax(120px,2fr)',
    alacakli: 'minmax(90px,1fr)',
    borclu: 'minmax(90px,1fr)',
    acilis: '82px',
    teblig: '82px',
    durum: '75px',
    alacak: '90px',
    tahsilat: '80px',
    sure: '60px',
  };

  const gridClass = 'grid gap-2 px-4 min-w-[1050px]';
  const gridStyle = { gridTemplateColumns: ['28px', ...gorunenSutunlar.map((k) => COL_WIDTHS[k])].join(' ') };

  return (
    <div>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
        <MiniKpi label="Toplam" value={kpis.toplam.toString()} />
        <MiniKpi label="Aktif Takip" value={kpis.aktifTakip.toString()} color="text-green" />
        <MiniKpi label="Toplam Alacak" value={fmt(kpis.toplamAlacak)} color="text-gold" />
        <MiniKpi label="Tahsil Edilen" value={fmt(kpis.tahsilEdilen)} color="text-green" />
        <MiniKpi label="Kalan" value={fmt(kpis.kalan)} color="text-red" />
        <MiniKpi label="Yaklaşan Süre" value={kpis.yaklasanSure.toString()} color={kpis.yaklasanSure > 0 ? 'text-orange-400' : 'text-text-muted'} />
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
                {/* İcra Türü */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">İcra Türü</label>
                  <select value={turFiltre} onChange={(e) => setTurFiltre(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {ICRA_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Yargı Birimi */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Yargı Birimi</label>
                  <select value={yargiBirimi} onChange={(e) => setYargiBirimi(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                    <option value="hepsi">Seçiniz</option>
                    {ICRA_YARGI_BIRIMLERI.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* Kişi / Genel Arama */}
                <div>
                  <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-medium">Kişi / Genel Arama</label>
                  <div className="relative">
                    <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Alacaklı, borçlu, daire adı..." className="w-full px-4 py-2 pl-9 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-xs">&#x1F50D;</span>
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
                    <input type="text" value={esasNoFiltre} onChange={(e) => setEsasNoFiltre(e.target.value)} placeholder="Dosya No" className="w-24 px-3 py-2 bg-bg border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                  </div>
                </div>
                {/* Açılış Tarihi Aralığı — altlı üstlü */}
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

            {/* Alt Aksiyon Satırı */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
              <div className="text-[11px] text-text-dim">
                {filtreAktif ? `${filtrelenmis.length} / ${icralar?.length ?? 0} sonuç` : `${filtrelenmis.length} dosya listeleniyor`}
              </div>
              <div className="flex items-center gap-2">
                {filtreAktif && (
                  <button onClick={() => { setArama(''); setDosyaDurumu('acik'); setTurFiltre('hepsi'); setYargiBirimi('hepsi'); setEsasYilFiltre(''); setEsasNoFiltre(''); setTarihBaslangic(''); setTarihBitis(''); }} className="px-3 py-1.5 text-[11px] text-gold hover:text-gold-light transition-colors">
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
        <div className="bg-surface border border-border rounded-lg overflow-hidden overflow-x-auto">
          {/* Sticky Tablo Başlık */}
          <div className={`${gridClass} py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider sticky top-0 z-10 bg-surface`} style={gridStyle}>
            <label className="flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={seciliIdler.size === sayfadakiler.length && sayfadakiler.length > 0} onChange={tumunuSec} className="accent-[var(--gold)]" />
            </label>
            {gorunenSutunlar.map((colKey) => {
              const col = ICRA_SUTUNLAR.find((s) => s.key === colKey);
              if (!col) return null;
              return col.sortKey ? (
                <button key={col.key} type="button" onClick={() => toggleSort(col.sortKey!)} className="text-left hover:text-text transition-colors truncate">{col.label}{sortIcon(col.sortKey)}</button>
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
            const globalIdx = (sayfa - 1) * PAGE_SIZE + idx;

            return (
              <div key={ic.id} className={`${gridClass} py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center ${rowVurgu} ${secili ? 'bg-gold-dim/50' : ''}`} style={gridStyle}>
                <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={secili} onChange={() => toggleSecim(ic.id)} className="accent-[var(--gold)]" />
                </label>

                {gorunenSutunlar.map((colKey) => {
                  switch (colKey) {
                    case 'sira': return <span key={colKey} className="text-[11px] text-text-dim">{globalIdx + 1}</span>;
                    case 'esasNo': return (
                      <Link key={colKey} href={`/icra/${ic.id}`} className="min-w-0 flex items-center gap-1.5 hover:underline">
                        <span className="font-[var(--font-playfair)] text-sm font-bold text-gold truncate">{esasStr || '—'}</span>
                        {ic.tur && <span className="text-[9px] px-1 py-0.5 rounded bg-surface2 text-text-dim border border-border/50 whitespace-nowrap flex-shrink-0">{ic.tur}</span>}
                      </Link>
                    );
                    case 'daire': return <Link key={colKey} href={`/icra/${ic.id}`} className="text-xs text-text truncate hover:underline" title={daireFull}>{daireFull || '—'}</Link>;
                    case 'alacakli': return <span key={colKey} className="text-xs text-text truncate" title={alacakli}>{alacakli || '—'}</span>;
                    case 'borclu': return <span key={colKey} className="text-xs text-text-muted truncate" title={borclu}>{borclu || '—'}</span>;
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
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-text-dim">
            {filtreAktif ? `${filtrelenmis.length} / ${icralar?.length ?? 0} dosya` : `${filtrelenmis.length} dosya`}
            {filtrelenmis.length > PAGE_SIZE && ` — Sayfa ${sayfa}/${toplamSayfa}`}
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

/* ── Mini KPI Bileşeni ── */
function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}
