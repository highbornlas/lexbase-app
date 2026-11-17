'use client';

import { useState } from "react";
import { fmt } from "@/lib/utils";
import { SectionHeader, InfoRow } from "./DetailUi";

export function AlacakKalemleriSection({ icra, hesap, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  hesap: { tahsilat: number };
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const k = icra.alacakKalemleri || {};
  const [form, setForm] = useState({
    asilAlacak: String(k.asilAlacak || ''),
    islemisiFaiz: String(k.islemisiFaiz || ''),
    davaMasrafi: String(k.davaMasrafi || ''),
    vekaletUcreti: String(k.vekaletUcreti || ''),
    icraHarci: String(k.icraHarci || ''),
    digerMasraflar: String(k.digerMasraflar || ''),
  });

  function handleDuzenle() {
    if (duzenle) {
      setDuzenle(false);
      return;
    }
    const kk = icra.alacakKalemleri || {};
    setForm({
      asilAlacak: String(kk.asilAlacak || ''),
      islemisiFaiz: String(kk.islemisiFaiz || ''),
      davaMasrafi: String(kk.davaMasrafi || ''),
      vekaletUcreti: String(kk.vekaletUcreti || ''),
      icraHarci: String(kk.icraHarci || ''),
      digerMasraflar: String(kk.digerMasraflar || ''),
    });
    setDuzenle(true);
  }

  const toplam = (Number(form.asilAlacak) || 0) + (Number(form.islemisiFaiz) || 0) + (Number(form.davaMasrafi) || 0) +
    (Number(form.vekaletUcreti) || 0) + (Number(form.icraHarci) || 0) + (Number(form.digerMasraflar) || 0);
  const mevcutToplam = (k.asilAlacak || 0) + (k.islemisiFaiz || 0) + (k.davaMasrafi || 0) +
    (k.vekaletUcreti || 0) + (k.icraHarci || 0) + (k.digerMasraflar || 0);
  const kalan = mevcutToplam - hesap.tahsilat;
  const tahsilOran = mevcutToplam > 0 ? Math.min((hesap.tahsilat / mevcutToplam) * 100, 100) : 0;
  const hasData = Object.values(k).some((v) => typeof v === 'number' && v > 0);

  function handleKaydet() {
    const yeni: typeof k = {};
    if (form.asilAlacak) yeni.asilAlacak = Number(form.asilAlacak);
    if (form.islemisiFaiz) yeni.islemisiFaiz = Number(form.islemisiFaiz);
    if (form.davaMasrafi) yeni.davaMasrafi = Number(form.davaMasrafi);
    if (form.vekaletUcreti) yeni.vekaletUcreti = Number(form.vekaletUcreti);
    if (form.icraHarci) yeni.icraHarci = Number(form.icraHarci);
    if (form.digerMasraflar) yeni.digerMasraflar = Number(form.digerMasraflar);
    onUpdate({ ...icra, alacakKalemleri: yeni });
    setDuzenle(false);
  }

  const KALEMLER: { key: keyof typeof form; label: string }[] = [
    { key: 'asilAlacak', label: 'Asil Alacak' },
    { key: 'islemisiFaiz', label: 'Islemis Faiz' },
    { key: 'davaMasrafi', label: 'Dava Masrafi' },
    { key: 'vekaletUcreti', label: 'Vekalet Ucreti' },
    { key: 'icraHarci', label: 'Icra Harci' },
    { key: 'digerMasraflar', label: 'Diger Masraflar' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Alacak Kalemleri" />
        <button onClick={handleDuzenle} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {duzenle ? 'Iptal' : 'Duzenle'}
        </button>
      </div>
      <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
        {duzenle ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {KALEMLER.map((kl) => (
                <div key={kl.key}>
                  <label className="text-[10px] text-text-muted block mb-1">{kl.label} (TL)</label>
                  <input type="number" value={form[kl.key]} onChange={(e) => setForm((p) => ({ ...p, [kl.key]: e.target.value }))}
                    placeholder="0" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="text-xs text-text-muted">Toplam: <span className="font-bold text-gold">{fmt(toplam)}</span></div>
              <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {k.asilAlacak ? <InfoRow label="Asil Alacak" value={fmt(k.asilAlacak)} /> : null}
              {k.islemisiFaiz ? <InfoRow label="Islemis Faiz" value={fmt(k.islemisiFaiz)} /> : null}
              {k.davaMasrafi ? <InfoRow label="Dava Masrafi" value={fmt(k.davaMasrafi)} /> : null}
              {k.vekaletUcreti ? <InfoRow label="Vekalet Ucreti" value={fmt(k.vekaletUcreti)} /> : null}
              {k.icraHarci ? <InfoRow label="Icra Harci" value={fmt(k.icraHarci)} /> : null}
              {k.digerMasraflar ? <InfoRow label="Diger Masraflar" value={fmt(k.digerMasraflar)} /> : null}
            </div>
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Toplam Alacak: <span className="font-bold text-gold">{fmt(mevcutToplam)}</span></span>
                <span className="text-xs text-text-muted">Tahsil: <span className="font-bold text-green">{fmt(hesap.tahsilat)}</span> / Kalan: <span className="font-bold text-red">{fmt(Math.max(kalan, 0))}</span></span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${tahsilOran >= 100 ? 'bg-green' : tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
                  style={{ width: `${Math.min(tahsilOran, 100)}%` }} />
              </div>
              <div className="text-right mt-1 text-[10px] text-text-dim">%{tahsilOran.toFixed(1)} tahsil edildi</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-text-dim">
            Alacak kalemleri henuz girilmemis.
            <button onClick={handleDuzenle} className="text-gold hover:underline ml-1">Ekle</button>
          </div>
        )}
      </div>
    </div>
  );
}
