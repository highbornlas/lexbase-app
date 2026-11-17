'use client';

import { useState } from "react";
import { fmt, fmtTarih } from "@/lib/utils";
import { SectionHeader } from "./DetailUi";

const HACIZ_TUR_IKON: Record<string, string> = {
  banka: '\u{1F3E6}', maas: '\u{1F4B0}', tasinir: '\u{1F4E6}', tasinmaz: '\u{1F3E0}', arac: '\u{1F697}', diger: '\u{1F4CB}',
};

const HACIZ_TUR_LABEL: Record<string, string> = {
  banka: 'Banka Haczi', maas: 'Maas Haczi', tasinir: 'Tasinir Haczi', tasinmaz: 'Tasinmaz Haczi', arac: 'Arac Haczi', diger: 'Diger',
};

const HACIZ_DURUM_RENK: Record<string, string> = {
  talep_edildi: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  uygulandi: 'bg-green-dim text-green border-green/20',
  kaldirildi: 'bg-surface2 text-text-dim border-border',
  sonucsuz: 'bg-red-dim text-red border-red/20',
};

const HACIZ_DURUM_LABEL: Record<string, string> = {
  talep_edildi: 'Talep Edildi', uygulandi: 'Uygulandi', kaldirildi: 'Kaldirildi', sonucsuz: 'Sonucsuz',
};

type HacizKaydi = NonNullable<import('@/lib/hooks/useIcra').Icra['hacizler']>[number];

export function HacizTakibiSection({ icra, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const [formAcik, setFormAcik] = useState(false);
  const [yeni, setYeni] = useState<Partial<HacizKaydi>>({
    tur: 'banka', tarih: new Date().toISOString().split('T')[0], aciklama: '', kurum: '', durum: 'talep_edildi',
  });

  const hacizler = icra.hacizler || [];

  function handleEkle() {
    if (!yeni.aciklama?.trim()) return;
    const kayit: HacizKaydi = {
      id: crypto.randomUUID(),
      tarih: yeni.tarih || new Date().toISOString().split('T')[0],
      tur: (yeni.tur as HacizKaydi['tur']) || 'diger',
      aciklama: yeni.aciklama || '',
      kurum: yeni.kurum || undefined,
      tutar: yeni.tutar || undefined,
      durum: (yeni.durum as HacizKaydi['durum']) || 'talep_edildi',
    };
    onUpdate({ ...icra, hacizler: [...hacizler, kayit] });
    setYeni({ tur: 'banka', tarih: new Date().toISOString().split('T')[0], aciklama: '', kurum: '', durum: 'talep_edildi' });
    setFormAcik(false);
  }

  function handleDurumDegistir(hacizId: string, yeniDurum: HacizKaydi['durum']) {
    onUpdate({ ...icra, hacizler: hacizler.map((h) => h.id === hacizId ? { ...h, durum: yeniDurum } : h) });
  }

  function handleSil(hacizId: string) {
    onUpdate({ ...icra, hacizler: hacizler.filter((h) => h.id !== hacizId) });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Haciz Takibi" />
        <button onClick={() => setFormAcik(!formAcik)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {formAcik ? 'Iptal' : '+ Yeni Haciz Ekle'}
        </button>
      </div>

      {formAcik && (
        <div className="mt-3 bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Haciz Kaydi</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Haciz Turu *</label>
              <select value={yeni.tur || 'banka'} onChange={(e) => setYeni((p) => ({ ...p, tur: e.target.value as HacizKaydi['tur'] }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                {Object.entries(HACIZ_TUR_LABEL).map(([v, l]) => <option key={v} value={v}>{HACIZ_TUR_IKON[v]} {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tarih</label>
              <input type="date" value={yeni.tarih || ''} onChange={(e) => setYeni((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Durum</label>
              <select value={yeni.durum || 'talep_edildi'} onChange={(e) => setYeni((p) => ({ ...p, durum: e.target.value as HacizKaydi['durum'] }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                {Object.entries(HACIZ_DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Kurum / Banka</label>
              <input type="text" value={yeni.kurum || ''} onChange={(e) => setYeni((p) => ({ ...p, kurum: e.target.value }))}
                placeholder="Banka adi, isveren vs." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tutar (TL)</label>
              <input type="number" value={yeni.tutar || ''} onChange={(e) => setYeni((p) => ({ ...p, tutar: Number(e.target.value) || undefined }))}
                placeholder="0" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Aciklama *</label>
              <input type="text" value={yeni.aciklama || ''} onChange={(e) => setYeni((p) => ({ ...p, aciklama: e.target.value }))}
                placeholder="Haciz aciklamasi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleEkle} disabled={!yeni.aciklama?.trim()} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {hacizler.length === 0 && !formAcik ? (
          <div className="text-center py-6 bg-surface2/30 rounded-xl border border-border/30">
            <div className="text-2xl mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div className="text-xs text-text-dim">Henuz haciz kaydi yok</div>
          </div>
        ) : (
          <div className="space-y-2">
            {hacizler.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg text-xs group hover:bg-surface2 transition-colors">
                <span className="text-lg flex-shrink-0" title={HACIZ_TUR_LABEL[h.tur] || h.tur}>{HACIZ_TUR_IKON[h.tur] || '\u{1F4CB}'}</span>
                <span className="text-text-dim w-20 flex-shrink-0">{fmtTarih(h.tarih)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-text font-medium truncate">{h.aciklama}</div>
                  {h.kurum && <div className="text-[10px] text-text-muted">{h.kurum}</div>}
                </div>
                {h.tutar != null && h.tutar > 0 && <span className="font-bold text-text flex-shrink-0">{fmt(h.tutar)}</span>}
                <select value={h.durum} onChange={(e) => handleDurumDegistir(h.id, e.target.value as HacizKaydi['durum'])}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 bg-transparent cursor-pointer focus:outline-none ${HACIZ_DURUM_RENK[h.durum] || ''}`}>
                  {Object.entries(HACIZ_DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => handleSil(h.id)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
