'use client';

import { useState } from "react";
import { fmt, fmtTarih } from "@/lib/utils";
import { SectionHeader } from "./DetailUi";

export function OdemePlaniSection({ icra, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const plan = icra.odemePlani;
  const [setupAcik, setSetupAcik] = useState(false);
  const [form, setForm] = useState({
    toplamTutar: String(plan?.toplamTutar || icra.alacak || ''),
    taksitSayisi: String(plan?.taksitSayisi || '6'),
    baslangicTarihi: plan?.baslangicTarihi || new Date().toISOString().split('T')[0],
  });

  function handlePlanOlustur() {
    const toplamTutar = Number(form.toplamTutar) || 0;
    const taksitSayisi = Number(form.taksitSayisi) || 1;
    if (toplamTutar <= 0 || taksitSayisi <= 0) return;
    const taksitTutar = Math.round((toplamTutar / taksitSayisi) * 100) / 100;
    const taksitler: NonNullable<import('@/lib/hooks/useIcra').Icra['odemePlani']>['taksitler'] = [];
    const baslangic = new Date(form.baslangicTarihi);
    for (let i = 0; i < taksitSayisi; i++) {
      const vade = new Date(baslangic);
      vade.setMonth(vade.getMonth() + i);
      const tutar = i === taksitSayisi - 1 ? Math.round((toplamTutar - taksitTutar * (taksitSayisi - 1)) * 100) / 100 : taksitTutar;
      taksitler.push({
        id: crypto.randomUUID(),
        no: i + 1,
        vadeTarihi: vade.toISOString().split('T')[0],
        tutar,
        odpiYapildiMi: false,
      });
    }
    onUpdate({
      ...icra,
      odemePlani: { aktif: true, toplamTutar, taksitSayisi, baslangicTarihi: form.baslangicTarihi, taksitler },
    });
    setSetupAcik(false);
  }

  function handleToggleAktif() {
    if (plan) {
      onUpdate({ ...icra, odemePlani: { ...plan, aktif: !plan.aktif } });
    }
  }

  function handleTaksitOde(taksitId: string, odendi: boolean) {
    if (!plan) return;
    const guncelTaksitler = plan.taksitler.map((t) =>
      t.id === taksitId ? { ...t, odpiYapildiMi: odendi, odemeTarihi: odendi ? new Date().toISOString().split('T')[0] : undefined } : t
    );
    onUpdate({ ...icra, odemePlani: { ...plan, taksitler: guncelTaksitler } });
  }

  function handlePlanSil() {
    onUpdate({ ...icra, odemePlani: undefined });
  }

  const odenmisTaksit = plan?.taksitler.filter((t) => t.odpiYapildiMi).length || 0;
  const toplamTaksit = plan?.taksitler.length || 0;
  const bugun = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Odeme Plani" />
        {!plan ? (
          <button onClick={() => setSetupAcik(!setupAcik)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
            {setupAcik ? 'Iptal' : '+ Odeme Plani Olustur'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <input type="checkbox" checked={plan.aktif} onChange={handleToggleAktif}
                className="rounded border-border text-gold focus:ring-gold" />
              Aktif
            </label>
            <button onClick={handlePlanSil} className="text-xs text-red hover:underline">Plani Sil</button>
          </div>
        )}
      </div>

      {setupAcik && !plan && (
        <div className="mt-3 bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Odeme Plani</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Toplam Tutar (TL) *</label>
              <input type="number" value={form.toplamTutar} onChange={(e) => setForm((p) => ({ ...p, toplamTutar: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Taksit Sayisi *</label>
              <input type="number" value={form.taksitSayisi} onChange={(e) => setForm((p) => ({ ...p, taksitSayisi: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Baslangic Tarihi</label>
              <input type="date" value={form.baslangicTarihi} onChange={(e) => setForm((p) => ({ ...p, baslangicTarihi: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handlePlanOlustur} disabled={!form.toplamTutar || !form.taksitSayisi}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Plan Olustur</button>
          </div>
        </div>
      )}

      {plan && (
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4 space-y-3">
          {/* İlerleme */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Toplam: <span className="font-bold text-gold">{fmt(plan.toplamTutar)}</span></span>
            <span className="text-text-muted">{odenmisTaksit}/{toplamTaksit} taksit odendi</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${odenmisTaksit >= toplamTaksit ? 'bg-green' : 'bg-gold'}`}
              style={{ width: `${toplamTaksit > 0 ? (odenmisTaksit / toplamTaksit) * 100 : 0}%` }} />
          </div>

          {/* Taksit listesi */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {plan.taksitler.map((t) => {
              const gecmis = !t.odpiYapildiMi && t.vadeTarihi < bugun;
              const siradaki = !t.odpiYapildiMi && !gecmis && t.vadeTarihi >= bugun &&
                !plan.taksitler.some((x) => !x.odpiYapildiMi && x.vadeTarihi < t.vadeTarihi && x.vadeTarihi >= bugun);
              return (
                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs transition-colors ${
                  t.odpiYapildiMi ? 'bg-green/5 border border-green/10' :
                  gecmis ? 'bg-red/5 border border-red/20' :
                  siradaki ? 'bg-gold/5 border border-gold/20' :
                  'bg-surface border border-border/30'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={t.odpiYapildiMi} onChange={(e) => handleTaksitOde(t.id, e.target.checked)}
                      className="rounded border-border text-gold focus:ring-gold" />
                    <span className="text-text-dim w-6 text-right font-mono">{t.no}.</span>
                  </label>
                  <span className="text-text-muted w-24 flex-shrink-0">{fmtTarih(t.vadeTarihi)}</span>
                  <span className="font-bold text-text flex-1">{fmt(t.tutar)}</span>
                  {t.odpiYapildiMi && t.odemeTarihi && (
                    <span className="text-[10px] text-green flex-shrink-0">Odeme: {fmtTarih(t.odemeTarihi)}</span>
                  )}
                  {gecmis && <span className="text-[10px] font-bold text-red flex-shrink-0">Gecikti</span>}
                  {siradaki && <span className="text-[10px] font-bold text-gold flex-shrink-0">Siradaki</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!plan && !setupAcik && (
        <div className="mt-3 text-center py-6 bg-surface2/30 rounded-xl border border-border/30">
          <div className="text-xs text-text-dim">Odeme plani tanimlanmamis</div>
        </div>
      )}
    </div>
  );
}
