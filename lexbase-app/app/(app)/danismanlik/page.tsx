'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDanismanliklar, useDanismanlikSil, useDanismanlikArsivle, type Danismanlik, DANISMANLIK_DURUMLARI } from '@/lib/hooks/useDanismanlik';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { DanismanlikModal } from '@/components/modules/DanismanlikModal';
import Link from 'next/link';
import { SkeletonTable, SkeletonKPI } from '@/components/ui/SkeletonTable';
import { QuickDateChips } from '@/components/ui/QuickDateChips';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Devam Ediyor': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'İncelemede': 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  'Müvekkil Onayında': 'bg-gold-dim text-gold border-gold/20',
  'Revize Bekliyor': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Gönderildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Tamamlandı': 'bg-green-dim text-green border-green/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

type SortKey = 'tarih' | 'tur' | 'muvekkil' | 'konu' | 'durum' | 'ucret' | 'tahsil' | 'model';
type SortDir = 'asc' | 'desc';

export default function DanismanlikPage() {
  useEffect(() => { document.title = 'Danışmanlık | LexBase'; }, []);

  const { data: danismanliklar, isLoading } = useDanismanliklar();
  const { data: muvekkillar } = useMuvekkillar();
  const silMut = useDanismanlikSil();
  const arsivleMut = useDanismanlikArsivle();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [modelFiltre, setModelFiltre] = useState<'hepsi' | 'tek_seferlik' | 'sureklii'>('hepsi');
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Danismanlik | null>(null);
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);
  const [kebabAcik, setKebabAcik] = useState<string | null>(null);
  const [seciliIdler, setSeciliIdler] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('tarih');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const kebabRef = useRef<HTMLDivElement>(null);

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

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

  // Kebab dışına tıklanınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setKebabAcik(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // KPI
  const kpis = useMemo(() => {
    if (!danismanliklar) return { toplam: 0, devam: 0, tamamlanan: 0, tahsilsiz: 0, aylikSabit: 0, toplamEfor: 0, onayBekleyen: 0, sureklii: 0 };
    const devam = danismanliklar.filter((d) => ['Devam Ediyor', 'İncelemede', 'Revize Bekliyor'].includes(d.durum || '')).length;
    const tamamlanan = danismanliklar.filter((d) => d.durum === 'Tamamlandı').length;
    const tahsilsiz = danismanliklar.reduce((t, d) => {
      if (d.sozlesmeModeli === 'sureklii') return t;
      return t + ((d.ucret || 0) - (d.tahsilEdildi || 0));
    }, 0);
    const aylikSabit = danismanliklar
      .filter((d) => d.sozlesmeModeli === 'sureklii' && d.durum !== 'İptal' && d.durum !== 'Tamamlandı')
      .reduce((t, d) => t + (d.aylikUcret || 0), 0);
    const toplamEfor = danismanliklar.reduce((t, d) => t + (d.toplamEforDk || (d.eforlar || []).reduce((s, e) => s + (e.sure || 0), 0)), 0);
    const onayBekleyen = danismanliklar.filter((d) => d.durum === 'Müvekkil Onayında').length;
    const sureklii = danismanliklar.filter((d) => d.sozlesmeModeli === 'sureklii').length;
    return { toplam: danismanliklar.length, devam, tamamlanan, tahsilsiz, aylikSabit, toplamEfor, onayBekleyen, sureklii };
  }, [danismanliklar]);

  // Filtreleme + Sıralama
  const filtrelenmis = useMemo(() => {
    if (!danismanliklar) return [];
    const filtered = danismanliklar.filter((d) => {
      if (durumFiltre !== 'hepsi' && d.durum !== durumFiltre) return false;
      if (modelFiltre !== 'hepsi' && (d.sozlesmeModeli || 'tek_seferlik') !== modelFiltre) return false;
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        return (
          (d.konu || '').toLocaleLowerCase('tr').includes(q) ||
          (d.tur || '').toLocaleLowerCase('tr').includes(q) ||
          (d.no || '').toLocaleLowerCase('tr').includes(q) ||
          (muvAdMap[d.muvId || ''] || '').toLocaleLowerCase('tr').includes(q)
        );
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let va = '', vb = '';
      switch (sortKey) {
        case 'tarih': va = a.tarih || ''; vb = b.tarih || ''; break;
        case 'tur': va = a.tur || ''; vb = b.tur || ''; break;
        case 'muvekkil': va = muvAdMap[a.muvId || ''] || ''; vb = muvAdMap[b.muvId || ''] || ''; break;
        case 'konu': va = a.konu || ''; vb = b.konu || ''; break;
        case 'durum': va = a.durum || ''; vb = b.durum || ''; break;
        case 'model': va = a.sozlesmeModeli || 'tek_seferlik'; vb = b.sozlesmeModeli || 'tek_seferlik'; break;
        case 'ucret': return dir * ((a.ucret || a.aylikUcret || 0) - (b.ucret || b.aylikUcret || 0));
        case 'tahsil': return dir * ((a.tahsilEdildi || 0) - (b.tahsilEdildi || 0));
      }
      return dir * va.localeCompare(vb, 'tr');
    });
    return filtered;
  }, [danismanliklar, arama, durumFiltre, modelFiltre, muvAdMap, sortKey, sortDir]);

  useEffect(() => { setSayfa(1); }, [arama, durumFiltre, modelFiltre]);

  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * sayfaBoyutu;
    return filtrelenmis.slice(bas, bas + sayfaBoyutu);
  }, [filtrelenmis, sayfa, sayfaBoyutu]);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-text-dim/30 ml-0.5">↕</span>;
    return <span className="text-gold ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  function fmtSure(dk: number) {
    const saat = Math.floor(dk / 60);
    const kalan = dk % 60;
    if (saat === 0) return `${kalan} dk`;
    return kalan > 0 ? `${saat}s ${kalan}dk` : `${saat} saat`;
  }

  const GRID = 'grid-cols-[28px_80px_50px_1fr_1fr_1fr_100px_90px_80px_36px]';

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Danışmanlık
          {danismanliklar && <span className="text-sm font-normal text-text-muted ml-2">({danismanliklar.length})</span>}
        </h1>
        <button
          onClick={() => { setSecili(null); setModalAcik(true); }}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Yeni Danışmanlık
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <KpiCard label="Toplam" value={kpis.toplam.toString()} icon="📋" />
        <KpiCard label="Devam Eden" value={kpis.devam.toString()} icon="🔄" color="text-blue-400" />
        <KpiCard label="Onay Bekleyen" value={kpis.onayBekleyen.toString()} icon="⏳" color="text-gold" />
        <KpiCard label="Aylık Sabit Gelir" value={fmt(kpis.aylikSabit)} icon="💰" color="text-green" />
        <KpiCard label="Toplam Efor" value={fmtSure(kpis.toplamEfor)} icon="⏱️" color="text-purple-400" />
        <KpiCard label="Tahsil Edilmemiş" value={fmt(kpis.tahsilsiz)} icon="💸" color={kpis.tahsilsiz > 0 ? 'text-red' : 'text-green'} />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input type="text" value={arama} onChange={(e) => setArama(e.target.value)}
            placeholder="Konu, tür, müvekkil ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>

        {/* Tek Seferlik / Sürekli filtresi */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([
            { key: 'hepsi' as const, label: `Tümü (${kpis.toplam})` },
            { key: 'tek_seferlik' as const, label: `📄 Tek Seferlik (${kpis.toplam - kpis.sureklii})` },
            { key: 'sureklii' as const, label: `🔄 Sürekli (${kpis.sureklii})` },
          ]).map((f) => (
            <button key={f.key} onClick={() => setModelFiltre(f.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${modelFiltre === f.key ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold">
          <option value="hepsi">Tüm Durumlar</option>
          {DANISMANLIK_DURUMLARI.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Toplu İşlem Barı */}
      {seciliIdler.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-gold-dim border border-gold/20 rounded-lg">
          <span className="text-xs text-gold font-semibold">{seciliIdler.size} kayıt seçili</span>
          <button onClick={() => { seciliIdler.forEach((id) => { const dan = danismanliklar?.find((d) => d.id === id); if (dan) arsivleMut.mutate(dan); }); setSeciliIdler(new Set()); }} className="text-[11px] px-2.5 py-1 bg-surface border border-border rounded text-text hover:border-gold transition-colors">Arşive Kaldır</button>
          <button onClick={() => { if (confirm(`${seciliIdler.size} kayıt silinecek. Emin misiniz?`)) { seciliIdler.forEach((id) => { const dan = danismanliklar?.find((d) => d.id === id); if (dan) silMut.mutate(dan); }); setSeciliIdler(new Set()); } }} className="text-[11px] px-2.5 py-1 bg-surface border border-red/30 rounded text-red hover:bg-red/10 transition-colors">Sil</button>
          <button onClick={() => setSeciliIdler(new Set())} className="ml-auto text-[11px] text-text-dim hover:text-text transition-colors">Seçimi Temizle</button>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={9} />
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm text-text-muted">
            {arama || durumFiltre !== 'hepsi' || modelFiltre !== 'hepsi' ? 'Filtreye uygun kayıt bulunamadı' : 'Henüz danışmanlık kaydı eklenmemiş'}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1 overflow-x-auto">
          {/* Tablo Başlık — Sıralanabilir */}
          <div className={`grid ${GRID} gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider min-w-[930px]`}>
            <label className="flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={seciliIdler.size === sayfadakiler.length && sayfadakiler.length > 0} onChange={tumunuSec} className="accent-[var(--gold)]" />
            </label>
            <button type="button" onClick={() => handleSort('tarih')} className="text-left hover:text-gold transition-colors flex items-center">Tarih{sortIcon('tarih')}</button>
            <button type="button" onClick={() => handleSort('model')} className="text-left hover:text-gold transition-colors flex items-center">Tip{sortIcon('model')}</button>
            <button type="button" onClick={() => handleSort('muvekkil')} className="text-left hover:text-gold transition-colors flex items-center">Müvekkil{sortIcon('muvekkil')}</button>
            <button type="button" onClick={() => handleSort('tur')} className="text-left hover:text-gold transition-colors flex items-center">Tür{sortIcon('tur')}</button>
            <button type="button" onClick={() => handleSort('konu')} className="text-left hover:text-gold transition-colors flex items-center">Konu{sortIcon('konu')}</button>
            <button type="button" onClick={() => handleSort('durum')} className="text-left hover:text-gold transition-colors flex items-center">Durum{sortIcon('durum')}</button>
            <button type="button" onClick={() => handleSort('ucret')} className="text-left hover:text-gold transition-colors flex items-center">Ücret{sortIcon('ucret')}</button>
            <span className="text-center">Efor</span>
            <span></span>
          </div>

          {sayfadakiler.map((d) => {
            const kalan = (d.ucret || 0) - (d.tahsilEdildi || 0);
            const eforDk = d.toplamEforDk || (d.eforlar || []).reduce((t, e) => t + (e.sure || 0), 0);
            const isSureklii = d.sozlesmeModeli === 'sureklii';

            return (
              <div key={d.id} className={`grid ${GRID} gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center group min-w-[930px] ${seciliIdler.has(d.id) ? 'bg-gold-dim/50' : ''}`}>
                <input type="checkbox" checked={seciliIdler.has(d.id)} onChange={() => toggleSecim(d.id)} className="accent-[var(--gold)]" />
                <span className="text-[11px] text-text-dim">{fmtTarih(d.tarih)}</span>
                <span className="text-sm" title={isSureklii ? 'Sürekli Sözleşme' : 'Tek Seferlik'}>
                  {isSureklii ? '🔄' : '📄'}
                </span>
                <span className="text-xs text-text truncate flex items-center gap-1">
                  {d.muvId && muvAdMap[d.muvId] && <span className="text-[8px] font-black w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-green bg-green-dim border-green/30" title="Müvekkil">M</span>}
                  <Link href={`/danismanlik/${d.id}`} className="hover:text-gold hover:underline truncate">
                    {muvAdMap[d.muvId || ''] || '—'}
                  </Link>
                </span>
                <span className="text-xs text-text truncate">{d.tur || '—'}</span>
                <Link href={`/danismanlik/${d.id}`} className="text-xs text-text-muted truncate hover:text-gold">{d.konu || '—'}</Link>
                <span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[d.durum || ''] || 'bg-surface2 text-text-dim border-border'}`}>
                    {d.durum || '—'}
                  </span>
                </span>
                <span className="text-xs font-semibold text-text">
                  {isSureklii ? (
                    <span title="Aylık">{fmt(d.aylikUcret || 0)}<span className="text-[9px] text-text-dim">/ay</span></span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className={kalan > 0 ? 'text-text' : 'text-green'}>{fmt(d.ucret || 0)}</span>
                      {(d.ucret || 0) > 0 && (
                        <div className="w-12 h-1 bg-surface2 rounded-full inline-block" title={`${fmt(d.tahsilEdildi || 0)} / ${fmt(d.ucret || 0)} tahsil edildi`}>
                          <div className="h-full bg-green rounded-full" style={{ width: `${Math.min(100, ((d.tahsilEdildi || 0) / (d.ucret || 1)) * 100)}%` }} />
                        </div>
                      )}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-center text-text-dim">
                  {eforDk > 0 ? fmtSure(eforDk) : '—'}
                </span>

                {/* Kebab Menu */}
                <div className="relative" ref={kebabAcik === d.id ? kebabRef : undefined}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setKebabAcik(kebabAcik === d.id ? null : d.id); }}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface2 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ⋮
                  </button>
                  {kebabAcik === d.id && (
                    <div className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                      <button onClick={() => { setSecili(d); setModalAcik(true); setKebabAcik(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors">
                        ✏️ Düzenle
                      </button>
                      <Link href={`/danismanlik/${d.id}`} onClick={() => setKebabAcik(null)}
                        className="block w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors">
                        📄 Detay
                      </Link>
                      <button onClick={() => { setSecili(d); setModalAcik(true); setKebabAcik(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors">
                        ⏱️ Efor Kaydı Ekle
                      </button>
                      <button onClick={() => { arsivleMut.mutate(d); setKebabAcik(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-text hover:bg-gold-dim transition-colors">
                        📦 Arşive Kaldır
                      </button>
                      <div className="h-px bg-border mx-2 my-1" />
                      <button onClick={() => { if (confirm(`"${d.konu || 'Bu danışmanlık'}" silinecek. Emin misiniz?`)) silMut.mutate(d); setKebabAcik(null); }}
                        className="w-full text-left px-4 py-2 text-xs text-red hover:bg-red-dim transition-colors">
                        🗑️ Sil
                      </button>
                    </div>
                  )}
                </div>
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
              {filtrelenmis.length} kayıt
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

      <DanismanlikModal open={modalAcik} onClose={() => setModalAcik(false)} danismanlik={secili} />
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
