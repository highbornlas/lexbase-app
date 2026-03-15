'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useIhtarnameler, useIhtarnameSil, useIhtarnameArsivle, type Ihtarname } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { IhtarnameModal } from '@/components/modules/IhtarnameModal';
import { fmt, fmtTarih } from '@/lib/utils';
import { ihtarnameDosyaBaslik } from '@/lib/utils/uyapHelpers';
import Link from 'next/link';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Hazırlandı': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Gönderildi': 'bg-gold-dim text-gold border-gold/20',
  'Tebliğ Edildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Cevap Geldi': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Sonuçlandı': 'bg-green-dim text-green border-green/20',
};

const TUR_BADGE: Record<string, string> = {
  'İhtar': 'text-red',
  'İhbarname': 'text-blue-400',
  'Fesih İhtarı': 'text-orange-400',
  'Ödeme İhtarı': 'text-gold',
  'Tahliye İhtarı': 'text-purple-400',
};

type YonFiltre = 'hepsi' | 'giden' | 'gelen';

// ── Sıralama ─────────────────────────────────────────────────
type SortKey = 'no' | 'yon' | 'tur' | 'muvekkil' | 'gonderen' | 'alici' | 'konu' | 'noterAd' | 'noterNo' | 'durum' | 'ucret' | 'tarih';
type SortDir = 'asc' | 'desc';

export default function IhtarnamePage() {
  const { data: tumIhtarnameler, isLoading } = useIhtarnameler();
  const { data: muvekkillar } = useMuvekkillar();
  const silMut = useIhtarnameSil();
  const arsivleMut = useIhtarnameArsivle();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [yonFiltre, setYonFiltre] = useState<YonFiltre>('hepsi');
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Ihtarname | null>(null);
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);
  const [kebabAcik, setKebabAcik] = useState<string | null>(null);
  const [topluPttLoading, setTopluPttLoading] = useState(false);
  const [topluPttSonuc, setTopluPttSonuc] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('tarih');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const kebabRef = useRef<HTMLDivElement>(null);

  // Aktif (silinmemiş + arşivlenmemiş) ihtarnameler
  const ihtarnameler = useMemo(() => {
    return tumIhtarnameler?.filter((i) => !i._silindi && !i._arsivlendi) ?? [];
  }, [tumIhtarnameler]);

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // Sıralama toggle
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  // Kebab dışına tıklanınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setKebabAcik(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // KPI
  const kpis = useMemo(() => {
    if (!ihtarnameler) return { toplam: 0, tebligBekleyen: 0, tebligEdilen: 0, suresiDolan: 0, toplamUcret: 0, giden: 0, gelen: 0 };
    const tebligBekleyen = ihtarnameler.filter((i) => i.tebligDurum === "PTT'de Bekliyor" || i.durum === 'Gönderildi').length;
    const tebligEdilen = ihtarnameler.filter((i) => i.tebligDurum === 'Tebliğ Edildi' || i.durum === 'Tebliğ Edildi' || i.durum === 'Cevap Geldi' || i.durum === 'Sonuçlandı').length;
    const bugun = new Date().toISOString().split('T')[0];
    const suresiDolan = ihtarnameler.filter((i) => {
      if (!i.sureSonu) return false;
      return i.sureSonu <= bugun && i.durum !== 'Sonuçlandı' && i.durum !== 'Cevap Geldi';
    }).length;
    const toplamUcret = ihtarnameler.reduce((t, i) => t + (i.ucret || 0), 0);
    const giden = ihtarnameler.filter((i) => (i.yon || 'giden') === 'giden').length;
    const gelen = ihtarnameler.filter((i) => i.yon === 'gelen').length;
    return { toplam: ihtarnameler.length, tebligBekleyen, tebligEdilen, suresiDolan, toplamUcret, giden, gelen };
  }, [ihtarnameler]);

  // Filtreleme + Sıralama
  const filtrelenmis = useMemo(() => {
    if (!ihtarnameler) return [];
    const filtered = ihtarnameler.filter((i) => {
      if (durumFiltre !== 'hepsi' && i.durum !== durumFiltre) return false;
      if (yonFiltre !== 'hepsi' && (i.yon || 'giden') !== yonFiltre) return false;
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        return (
          (i.no || '').toLocaleLowerCase('tr').includes(q) ||
          (i.konu || '').toLocaleLowerCase('tr').includes(q) ||
          (i.alici || '').toLocaleLowerCase('tr').includes(q) ||
          (i.gonderen || '').toLocaleLowerCase('tr').includes(q) ||
          (i.noterAd || '').toLocaleLowerCase('tr').includes(q) ||
          (muvAdMap[i.muvId || ''] || '').toLocaleLowerCase('tr').includes(q)
        );
      }
      return true;
    });

    // Sıralama
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let va = '';
      let vb = '';
      switch (sortKey) {
        case 'no': va = a.no || ''; vb = b.no || ''; break;
        case 'yon': va = a.yon || 'giden'; vb = b.yon || 'giden'; break;
        case 'tur': va = a.tur || ''; vb = b.tur || ''; break;
        case 'muvekkil': va = muvAdMap[a.muvId || ''] || ''; vb = muvAdMap[b.muvId || ''] || ''; break;
        case 'gonderen': va = a.gonderen || ''; vb = b.gonderen || ''; break;
        case 'alici': va = a.alici || ''; vb = b.alici || ''; break;
        case 'konu': va = a.konu || ''; vb = b.konu || ''; break;
        case 'noterAd': va = a.noterAd || ''; vb = b.noterAd || ''; break;
        case 'noterNo': va = a.noterNo || ''; vb = b.noterNo || ''; break;
        case 'durum': va = a.durum || ''; vb = b.durum || ''; break;
        case 'ucret': return dir * ((a.ucret || 0) - (b.ucret || 0));
        case 'tarih': va = a.tarih || ''; vb = b.tarih || ''; break;
      }
      return dir * va.localeCompare(vb, 'tr');
    });

    return filtered;
  }, [ihtarnameler, arama, durumFiltre, yonFiltre, muvAdMap, sortKey, sortDir]);

  // Filtre değişince sayfa 1'e dön
  useEffect(() => { setSayfa(1); }, [arama, durumFiltre, yonFiltre]);

  // Sayfalama
  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * sayfaBoyutu;
    return filtrelenmis.slice(bas, bas + sayfaBoyutu);
  }, [filtrelenmis, sayfa, sayfaBoyutu]);

  // Toplu PTT Sorgu
  async function handleTopluPttSorgu() {
    const barkodluIhtarnameler = ihtarnameler.filter((i) => i.pttBarkod?.trim() && i.tebligDurum !== 'Tebliğ Edildi' && i.tebligDurum !== 'İade Döndü');
    if (barkodluIhtarnameler.length === 0) {
      setTopluPttSonuc('Sorgulanacak barkod bulunamadı.');
      return;
    }
    setTopluPttLoading(true);
    setTopluPttSonuc(`${barkodluIhtarnameler.length} barkod sorgulanıyor...`);

    let basarili = 0;
    let basarisiz = 0;

    for (const ihtar of barkodluIhtarnameler) {
      try {
        const res = await fetch('/api/ptt-sorgula', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barkod: ihtar.pttBarkod!.trim() }),
        });
        const data = await res.json();
        if (data.tebligDurum) {
          basarili++;
        } else {
          basarisiz++;
        }
      } catch {
        basarisiz++;
      }
    }
    setTopluPttSonuc(`Tamamlandı: ${basarili} başarılı, ${basarisiz} başarısız`);
    setTopluPttLoading(false);
  }

  // Sıralama ikonu
  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-text-dim/30 ml-0.5">↕</span>;
    return <span className="text-gold ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const GRID = 'grid-cols-[minmax(160px,2fr)_30px_80px_1fr_1fr_1fr_1fr_120px_80px_90px_80px_36px]';

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          İhtarnameler
          {ihtarnameler && <span className="text-sm font-normal text-text-muted ml-2">({ihtarnameler.length})</span>}
        </h1>
        <div className="flex items-center gap-2">
          {/* Toplu PTT Sorgu */}
          <button
            onClick={handleTopluPttSorgu}
            disabled={topluPttLoading}
            className="px-3 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1.5"
            title="Tüm bekleyen barkodları PTT'den sorgula"
          >
            {topluPttLoading ? <span className="animate-spin">⏳</span> : <span>📦</span>}
            {topluPttLoading ? 'Sorgulanıyor...' : 'Toplu PTT Sorgula'}
          </button>
          <button
            onClick={() => { setSecili(null); setModalAcik(true); }}
            className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
          >
            + Yeni İhtarname
          </button>
        </div>
      </div>

      {/* Toplu PTT Sonuç */}
      {topluPttSonuc && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-xs font-medium border ${
          topluPttSonuc.includes('Tamamlandı') ? 'bg-green-dim border-green/20 text-green' :
          topluPttSonuc.includes('bulunamadı') ? 'bg-surface2 border-border text-text-muted' :
          'bg-blue-400/10 border-blue-400/20 text-blue-400'
        }`}>
          {topluPttSonuc}
          <button onClick={() => setTopluPttSonuc('')} className="ml-2 text-text-dim hover:text-text">✕</button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Toplam" value={kpis.toplam.toString()} icon="📨" />
        <KpiCard label="Tebliğ Bekleyen" value={kpis.tebligBekleyen.toString()} icon="📬" color="text-orange-400" />
        <KpiCard label="Tebliğ Edilen" value={kpis.tebligEdilen.toString()} icon="✅" color="text-green" />
        <KpiCard label="Süresi Dolan" value={kpis.suresiDolan.toString()} icon="🚨" color={kpis.suresiDolan > 0 ? 'text-red' : 'text-text-dim'} />
        <KpiCard label="Toplam Ücret" value={fmt(kpis.toplamUcret)} icon="💰" color="text-gold" />
      </div>

      {/* Arama + Filtreler */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Dosya no, konu, alıcı, gönderen, noter ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>

        {/* Giden / Gelen filtresi */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['hepsi', 'giden', 'gelen'] as YonFiltre[]).map((y) => (
            <button
              key={y}
              onClick={() => setYonFiltre(y)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                yonFiltre === y ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'
              }`}
            >
              {y === 'hepsi' ? `Tümü (${kpis.toplam})` : y === 'giden' ? `📤 Giden (${kpis.giden})` : `📥 Gelen (${kpis.gelen})`}
            </button>
          ))}
        </div>

        <select
          value={durumFiltre}
          onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tüm Durumlar</option>
          <option value="Taslak">Taslak</option>
          <option value="Hazırlandı">Hazırlandı</option>
          <option value="Gönderildi">Gönderildi</option>
          <option value="Tebliğ Edildi">Tebliğ Edildi</option>
          <option value="Cevap Geldi">Cevap Geldi</option>
          <option value="Sonuçlandı">Sonuçlandı</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">📨</div>
          <div className="text-sm text-text-muted">
            {arama || durumFiltre !== 'hepsi' || yonFiltre !== 'hepsi' ? 'Arama sonucu bulunamadı' : 'Henüz ihtarname kaydı eklenmemiş'}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1 overflow-x-auto">
          {/* Tablo Başlık — Sıralanabilir */}
          <div className={`grid ${GRID} gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider min-w-[1100px]`}>
            <button type="button" onClick={() => handleSort('no')} className="text-left hover:text-gold transition-colors flex items-center">No{sortIcon('no')}</button>
            <button type="button" onClick={() => handleSort('yon')} className="text-left hover:text-gold transition-colors flex items-center">Yön{sortIcon('yon')}</button>
            <button type="button" onClick={() => handleSort('tur')} className="text-left hover:text-gold transition-colors flex items-center">Tür{sortIcon('tur')}</button>
            <button type="button" onClick={() => handleSort('muvekkil')} className="text-left hover:text-gold transition-colors flex items-center">Müvekkil{sortIcon('muvekkil')}</button>
            <button type="button" onClick={() => handleSort('gonderen')} className="text-left hover:text-gold transition-colors flex items-center">Gönderen{sortIcon('gonderen')}</button>
            <button type="button" onClick={() => handleSort('alici')} className="text-left hover:text-gold transition-colors flex items-center">Alıcı{sortIcon('alici')}</button>
            <button type="button" onClick={() => handleSort('konu')} className="text-left hover:text-gold transition-colors flex items-center">Konu{sortIcon('konu')}</button>
            <button type="button" onClick={() => handleSort('noterAd')} className="text-left hover:text-gold transition-colors flex items-center">Noter{sortIcon('noterAd')}</button>
            <button type="button" onClick={() => handleSort('noterNo')} className="text-left hover:text-gold transition-colors flex items-center">Yevmiye{sortIcon('noterNo')}</button>
            <button type="button" onClick={() => handleSort('durum')} className="text-left hover:text-gold transition-colors flex items-center">Durum{sortIcon('durum')}</button>
            <button type="button" onClick={() => handleSort('tarih')} className="text-left hover:text-gold transition-colors flex items-center">Tarih{sortIcon('tarih')}</button>
            <span></span>
          </div>

          {/* Satırlar */}
          {sayfadakiler.map((i) => (
            <div
              key={i.id}
              className={`grid ${GRID} gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center group min-w-[1100px]`}
            >
              <Link href={`/ihtarname/${i.id}`} className="min-w-0 hover:underline">
                <span className="font-[var(--font-playfair)] text-sm font-bold text-gold truncate block">{ihtarnameDosyaBaslik(i)}</span>
                {i.konu && <span className="text-[10px] text-text-dim truncate block mt-0.5">{i.konu}</span>}
              </Link>
              <span className="text-sm" title={(i.yon || 'giden') === 'giden' ? 'Giden' : 'Gelen'}>{(i.yon || 'giden') === 'giden' ? '📤' : '📥'}</span>
              <span className={`text-[10px] font-bold ${TUR_BADGE[i.tur || ''] || 'text-text-muted'}`}>
                {i.tur || '—'}
              </span>
              <span className="text-xs text-text truncate flex items-center gap-1">
                {i.muvId && muvAdMap[i.muvId] && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-green bg-green-dim border-green/30" title="Müvekkil">M</span>}
                {muvAdMap[i.muvId || ''] || '—'}
              </span>
              <span className="text-xs text-text-muted truncate">{i.gonderen || '—'}</span>
              <span className="text-xs text-text-muted truncate">{i.alici || '—'}</span>
              <Link href={`/ihtarname/${i.id}`} className="text-xs text-text-muted truncate hover:text-gold">{i.konu || '—'}</Link>
              <span className="text-[11px] text-text truncate" title={i.noterAd || ''}>{i.noterAd || '—'}</span>
              <span className="text-[11px] text-text-dim truncate" title={i.noterNo || ''}>{i.noterNo || '—'}</span>
              <span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[i.durum || ''] || 'bg-surface2 text-text-dim border-border'}`}>
                  {i.durum || '—'}
                </span>
              </span>
              <span className="text-[11px] text-text-dim">{fmtTarih(i.tarih)}</span>

              {/* Kebab Menu */}
              <div className="relative" ref={kebabAcik === i.id ? kebabRef : undefined}>
                <button
                  onClick={(e) => { e.stopPropagation(); setKebabAcik(kebabAcik === i.id ? null : i.id); }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface2 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ⋮
                </button>
                {kebabAcik === i.id && (
                  <div className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSecili(i); setModalAcik(true); setKebabAcik(null); }}
                      className="w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors"
                    >
                      ✏️ Düzenle
                    </button>
                    <Link
                      href={`/ihtarname/${i.id}`}
                      onClick={() => setKebabAcik(null)}
                      className="block w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors"
                    >
                      📄 Detay
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); arsivleMut.mutate(i); setKebabAcik(null); }}
                      className="w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors"
                    >
                      📦 Arşive Kaldır
                    </button>
                    <div className="h-px bg-border mx-2 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${i.konu || i.no || 'Bu ihtarname'}" silinecek. Emin misiniz?`)) {
                          silMut.mutate(i);
                        }
                        setKebabAcik(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red hover:bg-red-dim transition-colors"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sayfalama */}
      {!isLoading && filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-text-dim">
              {filtrelenmis.length} ihtarname
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
              {Array.from({ length: Math.min(5, toplamSayfa) }, (_, idx) => {
                let pg: number;
                if (toplamSayfa <= 5) pg = idx + 1;
                else if (sayfa <= 3) pg = idx + 1;
                else if (sayfa >= toplamSayfa - 2) pg = toplamSayfa - 4 + idx;
                else pg = sayfa - 2 + idx;
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

      <IhtarnameModal open={modalAcik} onClose={() => setModalAcik(false)} ihtarname={secili} />
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-gold'}`}>{value}</div>
    </div>
  );
}
