'use client';

import { useState, useMemo } from 'react';
import { useGelirHesapla, GELIR_KAYNAKLARI, type GelirKaydi } from '@/lib/hooks/useGelirHesapla';
import { fmt, fmtTarih } from '@/lib/utils';
import { MiniKpi, EmptyState } from './shared';

const PAGE_SIZE = 25;
const KAYNAK_RENK: Record<string, string> = {
  'Dava': 'text-blue-400 bg-blue-400/10',
  'İcra': 'text-orange-400 bg-orange-400/10',
  'Danışmanlık': 'text-purple-400 bg-purple-400/10',
  'Arabuluculuk': 'text-green bg-green-dim',
  'İhtarname': 'text-pink-400 bg-pink-400/10',
};

export function GelirlerTab() {
  const tumGelirler = useGelirHesapla();
  const [arama, setArama] = useState('');
  const [kaynakFiltre, setKaynakFiltre] = useState('hepsi');
  const [makbuzFiltre, setMakbuzFiltre] = useState<'hepsi' | 'makbuzlu' | 'makbuzsuz'>('hepsi');
  const [sayfa, setSayfa] = useState(1);

  // Tarih filtresi — default: yıl başı → bugün
  const [tarihBaslangic, setTarihBaslangic] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [tarihBitis, setTarihBitis] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtreleme
  const filtrelenmis = useMemo(() => {
    return tumGelirler.filter((g) => {
      // Tarih filtresi
      if (g.tarih) {
        if (tarihBaslangic && g.tarih < tarihBaslangic) return false;
        if (tarihBitis && g.tarih > tarihBitis) return false;
      }
      // Kaynak filtresi
      if (kaynakFiltre !== 'hepsi' && g.kaynak !== kaynakFiltre) return false;
      // Makbuz filtresi
      if (makbuzFiltre === 'makbuzlu' && !g.makbuzKesildi) return false;
      if (makbuzFiltre === 'makbuzsuz' && g.makbuzKesildi) return false;
      // Arama
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        return (
          g.muvAd.toLocaleLowerCase('tr').includes(q) ||
          g.dosyaNo.toLocaleLowerCase('tr').includes(q) ||
          g.tur.toLocaleLowerCase('tr').includes(q) ||
          (g.makbuzNo || '').toLocaleLowerCase('tr').includes(q)
        );
      }
      return true;
    });
  }, [tumGelirler, tarihBaslangic, tarihBitis, kaynakFiltre, makbuzFiltre, arama]);

  // KPI toplamlar — filtrelenmiş veriden
  const toplamlar = useMemo(() => {
    return {
      brut: filtrelenmis.reduce((t, g) => t + g.brutTutar, 0),
      kdv: filtrelenmis.reduce((t, g) => t + g.kdvTutar, 0),
      stopaj: filtrelenmis.reduce((t, g) => t + g.stopajTutar, 0),
      net: filtrelenmis.reduce((t, g) => t + g.netTutar, 0),
      adet: filtrelenmis.length,
    };
  }, [filtrelenmis]);

  // Kaynak dağılımı
  const kaynakDagilim = useMemo(() => {
    const map: Record<string, number> = {};
    filtrelenmis.forEach((g) => {
      map[g.kaynak] = (map[g.kaynak] || 0) + g.brutTutar;
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
        <MiniKpi label="Toplam Brüt Gelir" value={fmt(toplamlar.brut)} color="text-green" />
        <MiniKpi label="KDV Toplamı" value={fmt(toplamlar.kdv)} color="text-text-muted" />
        <MiniKpi label="Stopaj Toplamı" value={fmt(toplamlar.stopaj)} color="text-text-muted" />
        <MiniKpi label="Net Gelir" value={fmt(toplamlar.net)} color="text-gold" />
        <MiniKpi label="İşlem Sayısı" value={String(toplamlar.adet)} />
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
          onClick={() => { setTarihBaslangic(`${new Date().getFullYear()}-01-01`); setTarihBitis(new Date().toISOString().split('T')[0]); setSayfa(1); }}
          className="text-[10px] text-gold hover:text-gold-light transition-colors"
        >
          Bu Yıl
        </button>
        <button
          onClick={() => { const d = new Date(); setTarihBaslangic(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`); setTarihBitis(d.toISOString().split('T')[0]); setSayfa(1); }}
          className="text-[10px] text-gold hover:text-gold-light transition-colors"
        >
          Bu Ay
        </button>
        <button
          onClick={() => { setTarihBaslangic(''); setTarihBitis(''); setSayfa(1); }}
          className="text-[10px] text-text-dim hover:text-text transition-colors"
        >
          Tümü
        </button>
      </div>

      {/* Arama + Filtreler */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input
            type="text"
            value={arama}
            onChange={(e) => { setArama(e.target.value); setSayfa(1); }}
            placeholder="Müvekkil, dosya no, tür, makbuz no ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>

        <select
          value={kaynakFiltre}
          onChange={(e) => { setKaynakFiltre(e.target.value); setSayfa(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tüm Kaynaklar</option>
          {GELIR_KAYNAKLARI.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <select
          value={makbuzFiltre}
          onChange={(e) => { setMakbuzFiltre(e.target.value as 'hepsi' | 'makbuzlu' | 'makbuzsuz'); setSayfa(1); }}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tümü</option>
          <option value="makbuzlu">Makbuzlu</option>
          <option value="makbuzsuz">Makbuzsuz / Avans</option>
        </select>
      </div>

      {/* Kaynak Dağılımı */}
      {kaynakDagilim.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-5">
          <h4 className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Kaynak Dağılımı</h4>
          <div className="space-y-2">
            {kaynakDagilim.map(([kaynak, tutar]) => {
              const oran = toplamlar.brut > 0 ? (tutar / toplamlar.brut) * 100 : 0;
              return (
                <div key={kaynak} className="flex items-center gap-3">
                  <span className={`text-xs w-[120px] truncate px-1.5 py-0.5 rounded ${KAYNAK_RENK[kaynak] || 'text-text-dim'}`}>{kaynak}</span>
                  <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-green rounded-full transition-all" style={{ width: `${oran}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-[80px] text-right">{fmt(tutar)}</span>
                  <span className="text-[10px] text-text-dim w-[40px] text-right">%{oran.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gelir Tablosu */}
      {filtrelenmis.length === 0 ? (
        <EmptyState icon="💰" message={arama || kaynakFiltre !== 'hepsi' ? 'Filtreye uygun gelir bulunamadı' : 'Henüz gelir kaydı bulunmuyor. Dosyalarda tahsilat girdiğinizde burada görünecektir.'} />
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[70px_70px_1fr_1fr_80px_90px_70px_70px_80px_60px] gap-1.5 px-4 py-2.5 border-b border-border text-[10px] text-text-muted font-medium uppercase tracking-wider">
            <span>Tarih</span>
            <span>Kaynak</span>
            <span>Dosya No</span>
            <span>Müvekkil</span>
            <span>Tür</span>
            <span>Brüt</span>
            <span>KDV</span>
            <span>Stopaj</span>
            <span>Net</span>
            <span>Makbuz</span>
          </div>

          {sayfadakiler.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-[70px_70px_1fr_1fr_80px_90px_70px_70px_80px_60px] gap-1.5 px-4 py-2.5 border-b border-border/50 hover:bg-gold-dim transition-colors items-center text-xs"
            >
              <span className="text-[11px] text-text-dim">{fmtTarih(g.tarih)}</span>
              <span>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${KAYNAK_RENK[g.kaynak] || 'text-text-dim bg-surface2'}`}>
                  {g.kaynak}
                </span>
              </span>
              <span className="text-gold font-medium truncate">{g.dosyaNo || '—'}</span>
              <span className="text-text truncate">{g.muvAd}</span>
              <span className="text-text-muted text-[11px] truncate">{g.tur}</span>
              <span className="font-semibold text-text">{fmt(g.brutTutar)}</span>
              <span className="text-text-dim text-[11px]">{g.kdvTutar > 0 ? fmt(g.kdvTutar) : '—'}</span>
              <span className="text-text-dim text-[11px]">{g.stopajTutar > 0 ? fmt(g.stopajTutar) : '—'}</span>
              <span className="font-bold text-green">{fmt(g.netTutar)}</span>
              <span className="text-center">
                {g.makbuzKesildi ? (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-dim text-green" title={g.makbuzNo || 'Makbuz kesildi'}>
                    📄 {g.makbuzNo ? g.makbuzNo.slice(0, 6) : '✓'}
                  </span>
                ) : (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-surface2 text-text-dim" title="Makbuz kesilmedi (avans)">
                    —
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtrelenmis.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-text-dim">
            {filtrelenmis.length} gelir kaydı
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
    </div>
  );
}
