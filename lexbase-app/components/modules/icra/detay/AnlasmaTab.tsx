'use client';

import { useState } from "react";
import { fmt, fmtTarih } from "@/lib/utils";
import { InfoRow, EmptyTab } from "./DetailUi";

export function AnlasmaTab({ anlasma, onKaydet }: {
  anlasma?: Record<string, unknown>;
  onKaydet: (a: Record<string, unknown>) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({
    tur: (anlasma?.tur as string) || '',
    ucret: String(anlasma?.ucret || ''),
    yuzde: String(anlasma?.yuzde || ''),
    taksitSayisi: String(anlasma?.taksitSayisi || ''),
    taksitOdenen: String(anlasma?.taksitOdenen || ''),
    toplam: String(anlasma?.toplam || ''),
    vadeTarihi: (anlasma?.vadeTarihi as string) || '',
    aciklama: (anlasma?.aciklama as string) || '',
  });

  const turLabel: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksitli', basari: 'Başarıya Göre', tahsilat: 'Tahsilata Göre', karma: 'Karma' };
  const hasAnlasma = anlasma && Object.keys(anlasma).length > 0;

  function handleKaydet() {
    const yeni: Record<string, unknown> = { tur: form.tur };
    if (form.ucret) yeni.ucret = Number(form.ucret);
    if (form.yuzde) yeni.yuzde = Number(form.yuzde);
    if (form.taksitSayisi) yeni.taksitSayisi = Number(form.taksitSayisi);
    if (form.taksitOdenen) yeni.taksitOdenen = Number(form.taksitOdenen);
    if (form.toplam) yeni.toplam = Number(form.toplam);
    if (form.vadeTarihi) yeni.vadeTarihi = form.vadeTarihi;
    if (form.aciklama) yeni.aciklama = form.aciklama;
    onKaydet(yeni);
    setDuzenle(false);
  }

  function handleDuzenleBasla() {
    if (hasAnlasma) {
      setForm({
        tur: (anlasma?.tur as string) || '',
        ucret: String(anlasma?.ucret || ''),
        yuzde: String(anlasma?.yuzde || ''),
        taksitSayisi: String(anlasma?.taksitSayisi || ''),
        taksitOdenen: String(anlasma?.taksitOdenen || ''),
        toplam: String(anlasma?.toplam || ''),
        vadeTarihi: (anlasma?.vadeTarihi as string) || '',
        aciklama: (anlasma?.aciklama as string) || '',
      });
    }
    setDuzenle(true);
  }

  if (duzenle) {
    return (
      <div className="space-y-4">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{hasAnlasma ? 'Anlaşma Düzenle' : 'Yeni Anlaşma'}</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret Türü</label>
            <select value={form.tur} onChange={(e) => setForm(p => ({ ...p, tur: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
              <option value="">Seçiniz...</option>
              <option value="pesin">Peşin</option>
              <option value="taksit">Taksitli</option>
              <option value="basari">Başarıya Göre</option>
              <option value="tahsilat">Tahsilata Göre</option>
              <option value="karma">Karma</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret (₺)</label>
            <input type="number" value={form.ucret} onChange={(e) => setForm(p => ({ ...p, ucret: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Toplam Tutar (₺)</label>
            <input type="number" value={form.toplam} onChange={(e) => setForm(p => ({ ...p, toplam: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Yüzde (%)</label>
            <input type="number" value={form.yuzde} onChange={(e) => setForm(p => ({ ...p, yuzde: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          {form.tur === 'taksit' && (
            <>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Taksit Sayısı</label>
                <input type="number" value={form.taksitSayisi} onChange={(e) => setForm(p => ({ ...p, taksitSayisi: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Ödenen Taksit</label>
                <input type="number" value={form.taksitOdenen} onChange={(e) => setForm(p => ({ ...p, taksitOdenen: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Vade Tarihi</label>
            <input type="date" value={form.vadeTarihi} onChange={(e) => setForm(p => ({ ...p, vadeTarihi: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
            <textarea value={form.aciklama} onChange={(e) => setForm(p => ({ ...p, aciklama: e.target.value }))} rows={2} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDuzenle(false)} className="px-4 py-1.5 bg-surface border border-border text-xs text-text-muted rounded-lg hover:text-text transition-colors">İptal</button>
          <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
        </div>
      </div>
    );
  }

  if (!hasAnlasma) {
    return (
      <EmptyTab
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
        message="Henüz vekalet anlaşması tanımlanmamış"
        action="+ Anlaşma Tanımla"
        onAction={handleDuzenleBasla}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Vekalet Anlaşması</div>
        <button onClick={handleDuzenleBasla} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Düzenle
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Ücret Türü" value={turLabel[(anlasma?.tur as string) || ''] || (anlasma?.tur as string) || '—'} />
        {typeof anlasma?.ucret === 'number' && <InfoRow label="Ücret" value={fmt(anlasma.ucret as number)} />}
        {typeof anlasma?.toplam === 'number' && <InfoRow label="Toplam" value={fmt(anlasma.toplam as number)} />}
        {anlasma?.yuzde != null && <InfoRow label="Yüzde" value={`%${String(anlasma.yuzde)}`} />}
        {anlasma?.taksitSayisi != null && <InfoRow label="Taksit Sayısı" value={String(anlasma.taksitSayisi)} />}
        {anlasma?.taksitOdenen != null && <InfoRow label="Ödenen Taksit" value={String(anlasma.taksitOdenen)} />}
        {typeof anlasma?.vadeTarihi === 'string' && anlasma.vadeTarihi && <InfoRow label="Vade Tarihi" value={fmtTarih(anlasma.vadeTarihi)} />}
      </div>
      {typeof anlasma?.aciklama === 'string' && anlasma.aciklama && (
        <div className="p-3 bg-surface2/30 rounded-lg text-xs text-text-muted border border-border/30">{anlasma.aciklama}</div>
      )}
    </div>
  );
}
