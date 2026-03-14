'use client';

import { useState, useMemo } from 'react';
import { useArabuluculuklar, type Arabuluculuk } from '@/lib/hooks/useArabuluculuk';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { ArabuluculukModal } from '@/components/modules/ArabuluculukModal';
import { fmt, fmtTarih } from '@/lib/utils';

const DURUM_RENK: Record<string, string> = {
  'Başvuru': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Görüşme': 'bg-gold-dim text-gold border-gold/20',
  'Anlaşma': 'bg-green-dim text-green border-green/20',
  'Anlaşamama': 'bg-red-dim text-red border-red/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

const TUR_RENK: Record<string, string> = {
  'Ticari': 'text-gold',
  'İş': 'text-blue-400',
  'Tüketici': 'text-green',
  'Aile': 'text-purple-400',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

export default function ArabuluculukPage() {
  const { data: arabuluculuklar, isLoading } = useArabuluculuklar();
  const { data: muvekkillar } = useMuvekkillar();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Arabuluculuk | null>(null);
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // KPI
  const kpis = useMemo(() => {
    if (!arabuluculuklar) return { toplam: 0, devam: 0, anlasma: 0, anlasmaOran: 0, toplamTalep: 0 };
    const devam = arabuluculuklar.filter((a) => a.durum === 'Başvuru' || a.durum === 'Görüşme').length;
    const anlasma = arabuluculuklar.filter((a) => a.durum === 'Anlaşma').length;
    const sonuclanan = arabuluculuklar.filter((a) => a.durum === 'Anlaşma' || a.durum === 'Anlaşamama').length;
    const anlasmaOran = sonuclanan > 0 ? Math.round((anlasma / sonuclanan) * 100) : 0;
    const toplamTalep = arabuluculuklar.reduce((t, a) => t + (a.talep || 0), 0);
    return { toplam: arabuluculuklar.length, devam, anlasma, anlasmaOran, toplamTalep };
  }, [arabuluculuklar]);

  // Filtreleme
  const filtrelenmis = useMemo(() => {
    if (!arabuluculuklar) return [];
    return arabuluculuklar.filter((a) => {
      if (durumFiltre !== 'hepsi' && a.durum !== durumFiltre) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (a.no || '').toLowerCase().includes(q) ||
          (a.konu || '').toLowerCase().includes(q) ||
          (a.arabulucu || '').toLowerCase().includes(q) ||
          (a.karsiTaraf || '').toLowerCase().includes(q) ||
          (muvAdMap[a.muvId || ''] || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => (b.basvuruTarih || '').localeCompare(a.basvuruTarih || ''));
  }, [arabuluculuklar, arama, durumFiltre, muvAdMap]);

  // Sayfa sıfırlama (filtre değişince)
  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const baslangic = (sayfa - 1) * sayfaBoyutu;
    return filtrelenmis.slice(baslangic, baslangic + sayfaBoyutu);
  }, [filtrelenmis, sayfa, sayfaBoyutu]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Arabuluculuk
          {arabuluculuklar && <span className="text-sm font-normal text-text-muted ml-2">({arabuluculuklar.length})</span>}
        </h1>
        <button
          onClick={() => { setSecili(null); setModalAcik(true); }}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Yeni Arabuluculuk
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Toplam" value={kpis.toplam.toString()} icon="🤝" />
        <KpiCard label="Devam Eden" value={kpis.devam.toString()} icon="🔄" color="text-blue-400" />
        <KpiCard label="Anlaşma" value={kpis.anlasma.toString()} icon="✅" color="text-green" />
        <KpiCard label="Anlaşma Oranı" value={`%${kpis.anlasmaOran}`} icon="📊" color="text-gold" />
        <KpiCard label="Toplam Talep" value={fmt(kpis.toplamTalep)} icon="💰" color="text-text" />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
            placeholder="Dosya no, konu, arabulucu, karşı taraf ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <select
          value={durumFiltre}
          onChange={(e) => { setDurumFiltre(e.target.value); setSayfa(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tüm Durumlar</option>
          <option value="Başvuru">Başvuru</option>
          <option value="Görüşme">Görüşme</option>
          <option value="Anlaşma">Anlaşma</option>
          <option value="Anlaşamama">Anlaşamama</option>
          <option value="İptal">İptal</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">🤝</div>
          <div className="text-sm text-text-muted">
            {arama || durumFiltre !== 'hepsi' ? 'Arama sonucu bulunamadı' : 'Henüz arabuluculuk kaydı eklenmemiş'}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1">
          {/* Tablo Başlık */}
          <div className="grid grid-cols-[60px_80px_1fr_1fr_1fr_80px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
            <span>No</span>
            <span>Tür</span>
            <span>Müvekkil</span>
            <span>Konu</span>
            <span>Arabulucu</span>
            <span>Oturum</span>
            <span>Durum</span>
            <span>Talep</span>
            <span>Tarih</span>
          </div>

          {/* Satırlar */}
          {sayfadakiler.map((a) => (
            <div
              key={a.id}
              onClick={() => { setSecili(a); setModalAcik(true); }}
              className="grid grid-cols-[60px_80px_1fr_1fr_1fr_80px_100px_100px_80px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center cursor-pointer"
            >
              <span className="text-xs font-bold text-gold truncate">{a.no || '—'}</span>
              <span className={`text-[10px] font-bold ${TUR_RENK[a.tur || ''] || 'text-text-muted'}`}>
                {a.tur || '—'}
              </span>
              <span className="text-xs text-text truncate">{muvAdMap[a.muvId || ''] || '—'}</span>
              <span className="text-xs text-text-muted truncate">{a.konu || '—'}</span>
              <span className="text-xs text-text-muted truncate">{a.arabulucu || '—'}</span>
              <span className="text-xs text-text-dim text-center">{a.oturumSayisi ?? '—'}</span>
              <span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[a.durum || ''] || 'bg-surface2 text-text-dim border-border'}`}>
                  {a.durum || '—'}
                </span>
              </span>
              <span className="text-xs font-semibold text-text">{a.talep ? fmt(a.talep) : '—'}</span>
              <span className="text-[11px] text-text-dim">{fmtTarih(a.basvuruTarih)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-text-dim">
              {filtrelenmis.length} dosya{toplamSayfa > 1 && ` — Sayfa ${sayfa}/${toplamSayfa}`}
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

      <ArabuluculukModal open={modalAcik} onClose={() => setModalAcik(false)} arabuluculuk={secili} />
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
