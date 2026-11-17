'use client';

import { useState } from "react";
import { SectionHeader, InfoRow } from "./DetailUi";

export function BorcluBilgileriSection({ icra, onUpdate, karsiRolLabel = 'Borçlu' }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
  karsiRolLabel?: string;
}) {
  const [acik, setAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(false);
  const det = icra.borcluDetay || {};
  const [form, setForm] = useState({
    tcVkn: det.tcVkn || '',
    adres: det.adres || '',
    isveren: det.isveren || '',
    isverenAdres: det.isverenAdres || '',
    bankaHesaplari: (det.bankaHesaplari || []).join('\n'),
    aracPlakalari: (det.aracPlakalari || []).join('\n'),
    tasinmazlar: (det.tasinmazlar || []).join('\n'),
  });

  function handleDuzenle() {
    if (duzenle) {
      setDuzenle(false);
      return;
    }
    const d = icra.borcluDetay || {};
    setForm({
      tcVkn: d.tcVkn || '',
      adres: d.adres || '',
      isveren: d.isveren || '',
      isverenAdres: d.isverenAdres || '',
      bankaHesaplari: (d.bankaHesaplari || []).join('\n'),
      aracPlakalari: (d.aracPlakalari || []).join('\n'),
      tasinmazlar: (d.tasinmazlar || []).join('\n'),
    });
    setDuzenle(true);
  }

  const hasData = det.tcVkn || det.adres || det.isveren || (det.bankaHesaplari || []).length > 0 || (det.aracPlakalari || []).length > 0 || (det.tasinmazlar || []).length > 0;

  function handleKaydet() {
    const yeni: NonNullable<import('@/lib/hooks/useIcra').Icra['borcluDetay']> = {};
    if (form.tcVkn.trim()) yeni.tcVkn = form.tcVkn.trim();
    if (form.adres.trim()) yeni.adres = form.adres.trim();
    if (form.isveren.trim()) yeni.isveren = form.isveren.trim();
    if (form.isverenAdres.trim()) yeni.isverenAdres = form.isverenAdres.trim();
    const bh = form.bankaHesaplari.split('\n').map((s) => s.trim()).filter(Boolean);
    if (bh.length) yeni.bankaHesaplari = bh;
    const ap = form.aracPlakalari.split('\n').map((s) => s.trim()).filter(Boolean);
    if (ap.length) yeni.aracPlakalari = ap;
    const tm = form.tasinmazlar.split('\n').map((s) => s.trim()).filter(Boolean);
    if (tm.length) yeni.tasinmazlar = tm;
    onUpdate({ ...icra, borcluDetay: yeni });
    setDuzenle(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => setAcik(!acik)} className="flex items-center gap-2 group">
          <SectionHeader title={`${karsiRolLabel} Bilgileri`} />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-dim transition-transform ${acik ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
          {hasData && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Bilgi var</span>}
        </button>
        {acik && (
          <button onClick={handleDuzenle} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {duzenle ? 'Iptal' : 'Duzenle'}
          </button>
        )}
      </div>

      {acik && (
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
          {duzenle ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">TC / VKN</label>
                  <input type="text" value={form.tcVkn} onChange={(e) => setForm((p) => ({ ...p, tcVkn: e.target.value }))}
                    placeholder="TC Kimlik No veya VKN" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Isveren</label>
                  <input type="text" value={form.isveren} onChange={(e) => setForm((p) => ({ ...p, isveren: e.target.value }))}
                    placeholder="Isveren adi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-text-muted block mb-1">Adres</label>
                  <input type="text" value={form.adres} onChange={(e) => setForm((p) => ({ ...p, adres: e.target.value }))}
                    placeholder="Borclu adresi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-text-muted block mb-1">Isveren Adres</label>
                  <input type="text" value={form.isverenAdres} onChange={(e) => setForm((p) => ({ ...p, isverenAdres: e.target.value }))}
                    placeholder="Isveren adresi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Banka Hesaplari (satir satir)</label>
                  <textarea value={form.bankaHesaplari} onChange={(e) => setForm((p) => ({ ...p, bankaHesaplari: e.target.value }))}
                    rows={3} placeholder="Her satira bir hesap..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Arac Plakalari (satir satir)</label>
                  <textarea value={form.aracPlakalari} onChange={(e) => setForm((p) => ({ ...p, aracPlakalari: e.target.value }))}
                    rows={3} placeholder="Her satira bir plaka..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Tasinmazlar (satir satir)</label>
                  <textarea value={form.tasinmazlar} onChange={(e) => setForm((p) => ({ ...p, tasinmazlar: e.target.value }))}
                    rows={3} placeholder="Her satira bir tasinmaz..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
              </div>
            </div>
          ) : hasData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {det.tcVkn && <InfoRow label="TC / VKN" value={det.tcVkn} />}
                {det.isveren && <InfoRow label="Isveren" value={det.isveren} />}
                {det.adres && <InfoRow label="Adres" value={det.adres} />}
                {det.isverenAdres && <InfoRow label="Isveren Adres" value={det.isverenAdres} />}
              </div>
              {(det.bankaHesaplari || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Banka Hesaplari</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.bankaHesaplari!.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {(det.aracPlakalari || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Arac Plakalari</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.aracPlakalari!.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {(det.tasinmazlar || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Tasinmazlar</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.tasinmazlar!.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-text-dim">
              Borclu detay bilgisi girilmemis.
              <button onClick={handleDuzenle} className="text-gold hover:underline ml-1">Bilgi Ekle</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
