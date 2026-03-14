'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDanismanliklar, type Danismanlik } from '@/lib/hooks/useDanismanlik';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { DanismanlikModal } from '@/components/modules/DanismanlikModal';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Devam Ediyor': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Müvekkil Onayında': 'bg-gold-dim text-gold border-gold/20',
  'Gönderildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Tamamlandı': 'bg-green-dim text-green border-green/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

export default function DanismanlikPage() {
  const { data: danismanliklar, isLoading } = useDanismanliklar();
  const { data: muvekkillar } = useMuvekkillar();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Danismanlik | null>(null);
  const [sayfa, setSayfa] = useState(1);
  const [sayfaBoyutu, setSayfaBoyutu] = useState(DEFAULT_PAGE_SIZE);

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // KPI
  const kpis = useMemo(() => {
    if (!danismanliklar) return { toplam: 0, devam: 0, tamamlanan: 0, tahsilsiz: 0 };
    const devam = danismanliklar.filter((d) => d.durum === 'Devam Ediyor' || d.durum === 'Müvekkil Onayında').length;
    const tamamlanan = danismanliklar.filter((d) => d.durum === 'Tamamlandı').length;
    const tahsilsiz = danismanliklar.reduce((t, d) => t + ((d.ucret || 0) - (d.tahsilEdildi || 0)), 0);
    return { toplam: danismanliklar.length, devam, tamamlanan, tahsilsiz };
  }, [danismanliklar]);

  // Filtreleme
  const filtrelenmis = useMemo(() => {
    if (!danismanliklar) return [];
    return danismanliklar.filter((d) => {
      if (durumFiltre !== 'hepsi' && d.durum !== durumFiltre) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (d.konu || '').toLowerCase().includes(q) ||
          (d.tur || '').toLowerCase().includes(q) ||
          (muvAdMap[d.muvId || ''] || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  }, [danismanliklar, arama, durumFiltre, muvAdMap]);

  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / sayfaBoyutu));
  const sayfadakiler = useMemo(() => {
    const bas = (sayfa - 1) * sayfaBoyutu;
    return filtrelenmis.slice(bas, bas + sayfaBoyutu);
  }, [filtrelenmis, sayfa, sayfaBoyutu]);

  // Filtre değişince sayfa 1'e dön
  useEffect(() => { setSayfa(1); }, [arama, durumFiltre]);

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
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Toplam" value={kpis.toplam.toString()} icon="📋" />
        <KpiCard label="Devam Eden" value={kpis.devam.toString()} icon="🔄" color="text-blue-400" />
        <KpiCard label="Tamamlanan" value={kpis.tamamlanan.toString()} icon="✅" color="text-green" />
        <KpiCard label="Tahsil Edilmemiş" value={fmt(kpis.tahsilsiz)} icon="💸" color="text-red" />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input type="text" value={arama} onChange={(e) => setArama(e.target.value)}
            placeholder="Konu, tür, müvekkil ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold">
          <option value="hepsi">Tüm Durumlar</option>
          <option value="Devam Ediyor">Devam Ediyor</option>
          <option value="Tamamlandı">Tamamlandı</option>
          <option value="Taslak">Taslak</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <EmptyState icon="📋" message="Danışmanlık kaydı bulunamadı" />
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_100px_100px_100px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
            <span>Tarih</span>
            <span>Tür</span>
            <span>Müvekkil</span>
            <span>Konu</span>
            <span>Durum</span>
            <span>Ücret</span>
            <span>Tahsil</span>
          </div>
          {sayfadakiler.map((d) => {
            const kalan = (d.ucret || 0) - (d.tahsilEdildi || 0);
            return (
              <div key={d.id} onClick={() => { setSecili(d); setModalAcik(true); }} className="grid grid-cols-[80px_1fr_1fr_1fr_100px_100px_100px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center cursor-pointer">
                <span className="text-[11px] text-text-dim">{fmtTarih(d.tarih)}</span>
                <span className="text-xs text-text truncate">{d.tur || '—'}</span>
                <span className="text-xs text-text truncate">{muvAdMap[d.muvId || ''] || '—'}</span>
                <span className="text-xs text-text-muted truncate">{d.konu || '—'}</span>
                <span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[d.durum || ''] || 'bg-surface2 text-text-dim border-border'}`}>
                    {d.durum || '—'}
                  </span>
                </span>
                <span className="text-xs font-semibold text-text">{fmt(d.ucret || 0)}</span>
                <span className={`text-xs font-semibold ${kalan > 0 ? 'text-red' : 'text-green'}`}>
                  {kalan > 0 ? `-${fmt(kalan)}` : fmt(d.tahsilEdildi || 0)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sayfalama ───────────────────────────────────────── */}
      {!isLoading && filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-text-dim">
              {(arama || durumFiltre !== 'hepsi') ? `${filtrelenmis.length} / ${danismanliklar?.length ?? 0} kayıt` : `${filtrelenmis.length} kayıt`}
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

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 bg-surface border border-border rounded-lg">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm text-text-muted">{message}</div>
    </div>
  );
}
