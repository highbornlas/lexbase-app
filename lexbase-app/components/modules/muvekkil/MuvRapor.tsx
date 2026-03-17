'use client';

import { useState, useMemo } from 'react';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';
import { useMuvIletisimler } from '@/lib/hooks/useIletisimler';
import { useMuvBelgeler } from '@/lib/hooks/useBelgeler';
import { fmt } from '@/lib/utils';
import { exportFaaliyetRaporuPDF, exportFinansRaporuPDF } from '@/lib/export/pdfExport';
import { exportFaaliyetRaporuXLS } from '@/lib/export/excelExport';

interface Props {
  muv: Muvekkil;
  finansOzet: Record<string, unknown> | null | undefined;
}

export function MuvRapor({ muv, finansOzet }: Props) {
  const [aktifBolum, setAktifBolum] = useState<'finansal' | 'faaliyet'>('finansal');
  const [baslangic, setBaslangic] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [bitis, setBitis] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-4">
      {/* Bölüm Seçici */}
      <div className="flex gap-2">
        <button
          onClick={() => setAktifBolum('finansal')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
            aktifBolum === 'finansal' ? 'bg-gold text-bg border-gold' : 'bg-surface border-border text-text-muted hover:border-gold/40'
          }`}
        >
          Finansal Rapor
        </button>
        <button
          onClick={() => setAktifBolum('faaliyet')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
            aktifBolum === 'faaliyet' ? 'bg-gold text-bg border-gold' : 'bg-surface border-border text-text-muted hover:border-gold/40'
          }`}
        >
          Faaliyet Raporu
        </button>
      </div>

      {aktifBolum === 'finansal' ? (
        <FinansalRapor muv={muv} finansOzet={finansOzet} />
      ) : (
        <FaaliyetRaporu muvId={muv.id} baslangic={baslangic} bitis={bitis} onBaslangic={setBaslangic} onBitis={setBitis} />
      )}
    </div>
  );
}

/* ── Finansal Rapor ── */
function FinansalRapor({ muv, finansOzet }: { muv: Muvekkil; finansOzet: Record<string, unknown> | null | undefined }) {
  if (!finansOzet) {
    return (
      <div className="text-center py-12 text-text-muted">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-sm">Finansal veri yükleniyor...</div>
      </div>
    );
  }

  const masraflar = finansOzet.masraflar as Record<string, number> | undefined;
  const avanslar = finansOzet.avanslar as Record<string, number> | undefined;
  const tahsilatlar = finansOzet.tahsilatlar as Record<string, number> | undefined;
  const vekalet = finansOzet.vekaletUcreti as Record<string, Record<string, number>> | undefined;
  const bakiye = finansOzet.bakiye as Record<string, number> | undefined;
  const danismanlik = finansOzet.danismanlik as Record<string, number> | undefined;

  const rows = [
    { label: 'Toplam Masraf', value: masraflar?.toplam, color: '' },
    { label: 'Alınan Avans', value: avanslar?.alinan, color: 'text-green' },
    { label: 'Masraf Bakiyesi', value: bakiye?.masrafBakiye, color: (bakiye?.masrafBakiye ?? 0) >= 0 ? 'text-green' : 'text-red' },
    { label: '', value: 0, color: '', divider: true },
    { label: 'Karşı Taraf Tahsilatı', value: tahsilatlar?.karsiTaraf, color: '' },
    { label: 'Anlaşılan Vekalet Ücreti', value: vekalet?.akdi?.anlasilanToplam, color: '' },
    { label: 'Tahsil Edilen Vekalet', value: vekalet?.akdi?.tahsilEdilen, color: 'text-green' },
    { label: 'Kalan Vekalet Alacağı', value: vekalet?.akdi?.kalan, color: 'text-gold' },
    { label: 'Hakediş Toplamı', value: vekalet?.hakedis?.toplam, color: 'text-green' },
    { label: '', value: 0, color: '', divider: true },
    { label: 'Tahsilat Bakiyesi', value: bakiye?.tahsilatBakiye, color: 'text-gold' },
    { label: 'Danışmanlık Geliri', value: danismanlik?.gelir, color: 'text-green' },
    { label: 'GENEL BAKİYE', value: bakiye?.genelBakiye, color: (bakiye?.genelBakiye ?? 0) >= 0 ? 'text-green' : 'text-red', bold: true },
  ];

  return (
    <div className="bg-surface border border-border rounded-lg p-6 max-w-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-text mb-0.5">Finansal Rapor</h3>
          <p className="text-[11px] text-text-dim">{muv.ad} — Cari Özet</p>
        </div>
        <button
          onClick={() => exportFinansRaporuPDF(muv.ad, {
            toplamUcret: (vekalet?.akdi?.anlasilanToplam ?? 0) + (vekalet?.hakedis?.toplam ?? 0),
            toplamTahsilat: (tahsilatlar?.karsiTaraf ?? 0) + (vekalet?.akdi?.tahsilEdilen ?? 0),
            toplamHarcama: masraflar?.toplam ?? 0,
            toplamAvans: avanslar?.alinan ?? 0,
            net: bakiye?.genelBakiye ?? 0,
          })}
          className="px-2 py-1 text-[10px] font-medium text-text-muted border border-border rounded hover:border-gold/40 hover:text-text transition-colors"
        >
          PDF İndir
        </button>
      </div>

      <div className="space-y-0">
        {rows.map((row, i) => {
          if (row.divider) {
            return <div key={i} className="border-t border-border my-3" />;
          }
          return (
            <div key={i} className={`flex justify-between items-baseline py-1.5 ${row.bold ? 'border-t-2 border-gold pt-3 mt-2' : ''}`}>
              <span className={`text-xs ${row.bold ? 'font-bold text-text' : 'text-text-muted'}`}>
                {row.label}
              </span>
              <span className={`text-xs font-semibold ${row.color || 'text-text'} ${row.bold ? 'text-base font-bold' : ''}`}>
                {fmt(row.value ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Faaliyet Raporu ── */
interface FaaliyetItem {
  tarih: string;
  tur: string;
  icon: string;
  aciklama: string;
}

function FaaliyetRaporu({
  muvId,
  baslangic,
  bitis,
  onBaslangic,
  onBitis,
}: {
  muvId: string;
  baslangic: string;
  bitis: string;
  onBaslangic: (v: string) => void;
  onBitis: (v: string) => void;
}) {
  const { data: iletisimler } = useMuvIletisimler(muvId);
  const { data: belgeler } = useMuvBelgeler(muvId);

  const faaliyetler = useMemo(() => {
    const items: FaaliyetItem[] = [];

    (iletisimler || []).forEach((i) => {
      items.push({
        tarih: i.tarih,
        tur: 'iletisim',
        icon: '📞',
        aciklama: `${i.kanal}: ${i.konu}${i.ozet ? ' — ' + i.ozet : ''}`,
      });
    });

    (belgeler || []).forEach((b) => {
      items.push({
        tarih: b.tarih,
        tur: 'belge',
        icon: '📎',
        aciklama: `${b.tur === 'vekaletname' ? 'Vekaletname' : 'Belge'} eklendi: ${b.ad}`,
      });
    });

    return items
      .filter((f) => f.tarih >= baslangic && f.tarih <= bitis)
      .sort((a, b) => b.tarih.localeCompare(a.tarih));
  }, [iletisimler, belgeler, baslangic, bitis]);

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="text-sm font-semibold text-text mb-1">Faaliyet Raporu</h3>
      <p className="text-[11px] text-text-dim mb-4">Tarih aralığındaki tüm faaliyetler</p>

      {/* Hızlı Filtre Chip'leri + Tarih Filtresi */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {([
          { label: 'Bu Ay', fn: () => { const n = new Date(); onBaslangic(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0,10)); onBitis(n.toISOString().slice(0,10)); }},
          { label: 'Geçen Ay', fn: () => { const n = new Date(); const pm = new Date(n.getFullYear(), n.getMonth()-1, 1); onBaslangic(pm.toISOString().slice(0,10)); onBitis(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0,10)); }},
          { label: 'Son 3 Ay', fn: () => { const n = new Date(); n.setMonth(n.getMonth()-3); onBaslangic(n.toISOString().slice(0,10)); onBitis(new Date().toISOString().slice(0,10)); }},
          { label: 'Bu Yıl', fn: () => { const n = new Date(); onBaslangic(new Date(n.getFullYear(), 0, 1).toISOString().slice(0,10)); onBitis(n.toISOString().slice(0,10)); }},
        ] as const).map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.fn}
            className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-border text-text-muted hover:border-gold/40 hover:text-gold transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-5">
        <div>
          <label className="block text-[10px] text-text-muted mb-1">Başlangıç</label>
          <input
            type="date"
            value={baslangic}
            onChange={(e) => onBaslangic(e.target.value)}
            className="h-8 px-2 text-xs bg-bg border border-border rounded-lg text-text focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-text-muted mb-1">Bitiş</label>
          <input
            type="date"
            value={bitis}
            onChange={(e) => onBitis(e.target.value)}
            className="h-8 px-2 text-xs bg-bg border border-border rounded-lg text-text focus:border-gold focus:outline-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted">{faaliyetler.length} faaliyet</span>
          {faaliyetler.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={() => exportFaaliyetRaporuPDF(
                  muvId,
                  faaliyetler.map(f => ({ tarih: f.tarih, tur: f.tur, aciklama: f.aciklama })),
                  baslangic,
                  bitis,
                )}
                className="px-2 py-1 text-[10px] font-medium text-text-muted border border-border rounded hover:border-gold/40 hover:text-text transition-colors"
              >
                PDF
              </button>
              <button
                onClick={() => exportFaaliyetRaporuXLS(
                  muvId,
                  faaliyetler.map(f => ({ tarih: f.tarih, tur: f.tur, aciklama: f.aciklama })),
                )}
                className="px-2 py-1 text-[10px] font-medium text-text-muted border border-border rounded hover:border-gold/40 hover:text-text transition-colors"
              >
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {faaliyetler.length === 0 ? (
        <div className="text-center py-8 text-text-dim text-xs">
          Bu tarih aralığında faaliyet bulunamadı
        </div>
      ) : (
        <div className="space-y-0 border-l-2 border-border ml-2">
          {faaliyetler.map((f, i) => (
            <div key={i} className="flex items-start gap-3 pl-4 py-2 relative">
              <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-border" />
              <div className="text-sm shrink-0">{f.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text">{f.aciklama}</div>
                <div className="text-[10px] text-text-dim mt-0.5">{f.tarih}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
