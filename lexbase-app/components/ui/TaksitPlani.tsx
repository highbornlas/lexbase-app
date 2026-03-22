'use client';

import { useState } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import { odemePlaniOlustur, odemePlaniOzet, type OdemePlani, type Taksit } from '@/lib/utils/taksit';

/* ══════════════════════════════════════════════════════════════
   Taksit Planı Bileşeni — Tüm modüllerde kullanılır
   Dava, İcra, Danışmanlık, Arabuluculuk, İhtarname
   ══════════════════════════════════════════════════════════════ */

interface TaksitPlaniProps {
  plan?: OdemePlani | null;
  onChange: (plan: OdemePlani) => void;
  maxTutar?: number; // Sözleşme bedeli — varsayılan toplam tutar
}

export function TaksitPlaniPanel({ plan, onChange, maxTutar }: TaksitPlaniProps) {
  const [formAcik, setFormAcik] = useState(false);
  const [yeniPlan, setYeniPlan] = useState({
    tutar: maxTutar?.toString() || '',
    sayisi: '3',
    baslangic: new Date().toISOString().slice(0, 10),
  });

  const ozet = odemePlaniOzet(plan);
  const bugun = new Date().toISOString().slice(0, 10);

  // Yeni plan oluştur
  function handleOlustur() {
    const tutar = Number(yeniPlan.tutar);
    const sayisi = Number(yeniPlan.sayisi);
    if (tutar <= 0 || sayisi <= 0) return;
    const yeni = odemePlaniOlustur(tutar, sayisi, yeniPlan.baslangic);
    onChange(yeni);
    setFormAcik(false);
  }

  // Taksit ödendi işaretle
  function handleTaksitOde(taksitId: string) {
    if (!plan) return;
    const guncelTaksitler = plan.taksitler.map((t) =>
      t.id === taksitId ? { ...t, odpiYapildiMi: true, odemeTarihi: bugun } : t
    );
    onChange({ ...plan, taksitler: guncelTaksitler });
  }

  // Taksit geri al
  function handleTaksitGeriAl(taksitId: string) {
    if (!plan) return;
    const guncelTaksitler = plan.taksitler.map((t) =>
      t.id === taksitId ? { ...t, odpiYapildiMi: false, odemeTarihi: undefined } : t
    );
    onChange({ ...plan, taksitler: guncelTaksitler });
  }

  // Plan yok — oluşturma formu göster
  if (!plan?.aktif) {
    return (
      <div className="space-y-3">
        {!formAcik ? (
          <button
            onClick={() => setFormAcik(true)}
            className="w-full px-4 py-3 text-xs font-semibold text-gold border border-gold/30 border-dashed rounded-lg hover:bg-gold-dim transition-colors"
          >
            + Taksitli Ödeme Planı Oluştur
          </button>
        ) : (
          <div className="bg-surface2/50 border border-gold/20 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gold">Taksit Planı Oluştur</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Toplam Tutar (₺)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={yeniPlan.tutar}
                  onChange={(e) => setYeniPlan({ ...yeniPlan, tutar: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Taksit Sayısı</label>
                <input
                  type="number" min="1" max="60"
                  value={yeniPlan.sayisi}
                  onChange={(e) => setYeniPlan({ ...yeniPlan, sayisi: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted block mb-1">İlk Taksit Tarihi</label>
                <input
                  type="date"
                  value={yeniPlan.baslangic}
                  onChange={(e) => setYeniPlan({ ...yeniPlan, baslangic: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleOlustur} disabled={!yeniPlan.tutar || !yeniPlan.sayisi}
                className="px-4 py-2 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
                Plan Oluştur
              </button>
              <button onClick={() => setFormAcik(false)}
                className="px-4 py-2 text-xs text-text-muted hover:text-text transition-colors">
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Plan var — göster
  return (
    <div className="space-y-3">
      {/* Özet Kartları */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Toplam</div>
          <div className="text-sm font-bold text-text">{fmt(ozet.toplam)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Ödenen</div>
          <div className="text-sm font-bold text-green">{fmt(ozet.odenen)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Kalan</div>
          <div className="text-sm font-bold text-orange-400">{fmt(ozet.kalan)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Geciken</div>
          <div className={`text-sm font-bold ${ozet.geciken > 0 ? 'text-red' : 'text-green'}`}>{ozet.geciken}</div>
        </div>
      </div>

      {/* İlerleme barı */}
      <div className="bg-surface2 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-green rounded-full transition-all"
          style={{ width: `${ozet.toplam > 0 ? (ozet.odenen / ozet.toplam) * 100 : 0}%` }}
        />
      </div>

      {/* Taksit Listesi */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface2">
              <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">#</th>
              <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Vade</th>
              <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Tutar</th>
              <th className="px-3 py-2 text-center text-[10px] text-text-muted font-medium">Durum</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {plan.taksitler.map((t) => {
              const geciktiMi = !t.odpiYapildiMi && t.vadeTarihi < bugun;
              return (
                <tr key={t.id} className={`border-b border-border/50 ${geciktiMi ? 'bg-red/5' : t.odpiYapildiMi ? 'bg-green/5' : ''}`}>
                  <td className="px-3 py-2 text-text-muted">{t.no}</td>
                  <td className="px-3 py-2 text-text">{fmtTarih(t.vadeTarihi)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-text">{fmt(t.tutar)}</td>
                  <td className="px-3 py-2 text-center">
                    {t.odpiYapildiMi ? (
                      <span className="text-[10px] px-2 py-0.5 bg-green/10 text-green border border-green/20 rounded-md">
                        ✓ Ödendi {t.odemeTarihi ? `(${fmtTarih(t.odemeTarihi)})` : ''}
                      </span>
                    ) : geciktiMi ? (
                      <span className="text-[10px] px-2 py-0.5 bg-red/10 text-red border border-red/20 rounded-md">
                        ⚠ Gecikti
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-surface2 text-text-muted border border-border rounded-md">
                        Bekliyor
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.odpiYapildiMi ? (
                      <button onClick={() => handleTaksitGeriAl(t.id)}
                        className="text-[10px] text-text-dim hover:text-red transition-colors">
                        Geri Al
                      </button>
                    ) : (
                      <button onClick={() => handleTaksitOde(t.id)}
                        className="text-[10px] text-gold hover:text-gold-light font-semibold transition-colors">
                        Ödendi
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Plan kaldır */}
      <button
        onClick={() => onChange({ ...plan, aktif: false, taksitler: [] })}
        className="text-[10px] text-text-dim hover:text-red transition-colors"
      >
        Planı Kaldır
      </button>
    </div>
  );
}
