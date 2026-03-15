'use client';

import { useState, useMemo } from 'react';
import { useBuroGiderleri, useBuroGiderSil, type BuroGider, GIDER_KATEGORILERI } from '@/lib/hooks/useBuroGiderleri';
import { BuroGiderModal } from '@/components/modules/BuroGiderModal';
import { fmt, fmtTarih } from '@/lib/utils';
import { MiniKpi, EmptyState, ODEME_RENK, ODEME_LABEL } from './shared';

const PAGE_SIZE = 25;
const TEKRAR_LABEL: Record<string, string> = { aylik: '🔄 Aylık', yillik: '🔄 Yıllık' };

export function BuroGiderleriTab() {
  const { data: giderler, isLoading } = useBuroGiderleri();
  const silMut = useBuroGiderSil();
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<BuroGider | null>(null);
  const [katFiltre, setKatFiltre] = useState('hepsi');
  const [tekrarFiltre, setTekrarFiltre] = useState<'hepsi' | 'tek' | 'tekrarli'>('hepsi');
  const [arama, setArama] = useState('');
  const [sayfa, setSayfa] = useState(1);

  // Tarih filtresi — default: yıl başı → bugün
  const [tarihBaslangic, setTarihBaslangic] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [tarihBitis, setTarihBitis] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtreleme
  const filtrelenmis = useMemo(() => {
    if (!giderler) return [];
    return giderler
      .filter((g) => {
        // Tarih filtresi
        if (g.tarih) {
          if (tarihBaslangic && g.tarih < tarihBaslangic) return false;
          if (tarihBitis && g.tarih > tarihBitis) return false;
        }
        // Kategori filtresi
        if (katFiltre !== 'hepsi' && g.kategori !== katFiltre) return false;
        // Tekrar filtresi
        if (tekrarFiltre === 'tek' && g.tekrar && g.tekrar !== 'tek') return false;
        if (tekrarFiltre === 'tekrarli' && (!g.tekrar || g.tekrar === 'tek')) return false;
        // Arama
        if (arama) {
          const q = arama.toLocaleLowerCase('tr');
          return (
            (g.aciklama || '').toLocaleLowerCase('tr').includes(q) ||
            (g.kategori || '').toLocaleLowerCase('tr').includes(q) ||
            (g.belgeNo || '').toLocaleLowerCase('tr').includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  }, [giderler, katFiltre, tekrarFiltre, arama, tarihBaslangic, tarihBitis]);

  // Toplam hesapları — filtrelenmiş veriden
  const toplamlar = useMemo(() => {
    if (!filtrelenmis.length) return { tutar: 0, kdv: 0, stopaj: 0, net: 0, bekleyen: 0 };
    return {
      tutar: filtrelenmis.reduce((t, g) => t + (g.tutar || 0), 0),
      kdv: filtrelenmis.reduce((t, g) => t + (g.kdvTutar || 0), 0),
      stopaj: filtrelenmis.reduce((t, g) => t + (g.stopajTutar || 0), 0),
      net: filtrelenmis.reduce((t, g) => t + (g.netTutar || g.tutar || 0), 0),
      bekleyen: filtrelenmis.filter((g) => g.odemeDurumu === 'bekliyor' || g.odemeDurumu === 'gecikti').reduce((t, g) => t + (g.netTutar || g.tutar || 0), 0),
    };
  }, [filtrelenmis]);

  // Kategori bazlı dağılım — filtrelenmiş veriden
  const katDagilim = useMemo(() => {
    if (!filtrelenmis.length) return [];
    const map: Record<string, number> = {};
    filtrelenmis.forEach((g) => {
      const kat = g.kategori || 'Diğer';
      map[kat] = (map[kat] || 0) + (g.tutar || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtrelenmis]);

  // Pagination
  const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / PAGE_SIZE));
  const sayfadakiler = filtrelenmis.slice((sayfa - 1) * PAGE_SIZE, sayfa * PAGE_SIZE);

  return (
    <div>
      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <MiniKpi label="Toplam Gider" value={fmt(toplamlar.tutar)} />
        <MiniKpi label="KDV Toplamı" value={fmt(toplamlar.kdv)} color="text-text-muted" />
        <MiniKpi label="Stopaj Toplamı" value={fmt(toplamlar.stopaj)} color="text-text-muted" />
        <MiniKpi label="Net Ödenen" value={fmt(toplamlar.net)} color="text-red" />
        <MiniKpi label="Bekleyen Ödeme" value={fmt(toplamlar.bekleyen)} color={toplamlar.bekleyen > 0 ? 'text-orange-400' : 'text-green'} />
      </div>

      {/* Tarih Filtresi */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Dönem:</span>
          <input
            type="date"
            value={tarihBaslangic}
            onChange={(e) => { setTarihBaslangic(e.target.value); setSayfa(1); }}
            className="px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          />
          <span className="text-text-dim text-xs">—</span>
          <input
            type="date"
            value={tarihBitis}
            onChange={(e) => { setTarihBitis(e.target.value); setSayfa(1); }}
            className="px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          />
        </div>
        <button
          onClick={() => {
            setTarihBaslangic(`${new Date().getFullYear()}-01-01`);
            setTarihBitis(new Date().toISOString().split('T')[0]);
            setSayfa(1);
          }}
          className="text-[10px] text-gold hover:text-gold-light transition-colors"
        >
          Bu Yıl
        </button>
        <button
          onClick={() => {
            const d = new Date();
            setTarihBaslangic(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
            setTarihBitis(d.toISOString().split('T')[0]);
            setSayfa(1);
          }}
          className="text-[10px] text-gold hover:text-gold-light transition-colors"
        >
          Bu Ay
        </button>
        <button
          onClick={() => {
            setTarihBaslangic('');
            setTarihBitis('');
            setSayfa(1);
          }}
          className="text-[10px] text-text-dim hover:text-text transition-colors"
        >
          Tümü
        </button>
      </div>

      {/* Arama + Filtre + Ekle Butonu */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input
            type="text"
            value={arama}
            onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
            placeholder="Açıklama, kategori, belge no ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>

        <select
          value={katFiltre}
          onChange={(e) => { setKatFiltre(e.target.value); setSayfa(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tüm Kategoriler</option>
          {GIDER_KATEGORILERI.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <select
          value={tekrarFiltre}
          onChange={(e) => { setTekrarFiltre(e.target.value as 'hepsi' | 'tek' | 'tekrarli'); setSayfa(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tümü</option>
          <option value="tek">Tek Seferlik</option>
          <option value="tekrarli">Tekrarlı</option>
        </select>

        <button
          onClick={() => { setSecili(null); setModalAcik(true); }}
          className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Gider Ekle
        </button>
      </div>

      {/* Kategori Dağılımı — Mini bar chart */}
      {katDagilim.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-5">
          <h4 className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Kategori Dağılımı</h4>
          <div className="space-y-2">
            {katDagilim.slice(0, 8).map(([kat, tutar]) => {
              const oran = toplamlar.tutar > 0 ? (tutar / toplamlar.tutar) * 100 : 0;
              return (
                <div key={kat} className="flex items-center gap-3">
                  <span className="text-xs text-text w-[160px] truncate">{kat}</span>
                  <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${oran}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-[80px] text-right">{fmt(tutar)}</span>
                  <span className="text-[10px] text-text-dim w-[40px] text-right">%{oran.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gider Listesi */}
      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <EmptyState icon="📊" message={arama || katFiltre !== 'hepsi' || tarihBaslangic ? 'Filtreye uygun gider bulunamadı' : 'Henüz büro gideri eklenmemiş'} />
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_1fr_90px_70px_70px_90px_90px_36px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
            <span>Tarih</span>
            <span>Kategori</span>
            <span>Açıklama</span>
            <span>Tutar</span>
            <span>KDV</span>
            <span>Stopaj</span>
            <span>Net</span>
            <span>Durum</span>
            <span></span>
          </div>

          {sayfadakiler.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-[80px_1fr_1fr_90px_70px_70px_90px_90px_36px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center group"
            >
              <span className="text-[11px] text-text-dim">{fmtTarih(g.tarih)}</span>
              <span className="text-xs text-text font-medium truncate flex items-center gap-1">
                {g.kategori || '—'}
                {g.tekrar && g.tekrar !== 'tek' && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-blue-400/10 text-blue-400 font-bold whitespace-nowrap">
                    {TEKRAR_LABEL[g.tekrar] || g.tekrar}
                  </span>
                )}
              </span>
              <span className="text-xs text-text-muted truncate">{g.aciklama || '—'}</span>
              <span className="text-xs font-semibold text-text">{fmt(g.tutar || 0)}</span>
              <span className="text-[11px] text-text-dim">{g.kdvTutar ? fmt(g.kdvTutar) : '—'}</span>
              <span className="text-[11px] text-text-dim">{g.stopajTutar ? fmt(g.stopajTutar) : '—'}</span>
              <span className="text-xs font-bold text-text">{fmt(g.netTutar || g.tutar || 0)}</span>
              <span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ODEME_RENK[g.odemeDurumu || 'odendi'] || 'bg-surface2 text-text-dim border-border'}`}>
                  {ODEME_LABEL[g.odemeDurumu || 'odendi'] || '—'}
                </span>
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setSecili(g); setModalAcik(true); }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface2 text-text-dim text-xs"
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${g.aciklama || g.kategori}" silinecek. Emin misiniz?`)) {
                      silMut.mutate(g);
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-dim text-text-dim text-xs"
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-text-dim">
            {filtrelenmis.length} gider
            {toplamSayfa > 1 && ` — Sayfa ${sayfa}/${toplamSayfa}`}
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

      <BuroGiderModal open={modalAcik} onClose={() => setModalAcik(false)} gider={secili} />
    </div>
  );
}
