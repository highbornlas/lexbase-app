'use client';

import { useState } from "react";
import { fmtTarih } from "@/lib/utils";
import { sureHesapla } from "@/lib/utils/uyapHelpers";
import { SureBadge } from "@/components/ui/SureBadge";
import { EmptyTab } from "./DetailUi";

export function SurelerTab({ sureler, onEkle, onSil }: {
  sureler: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  onEkle: (s: { id: string; tip: string; baslangic: string; gun: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [yeni, setYeni] = useState({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
  const SURE_TURLERI = ['İtiraz Süresi', 'Haciz İsteme Süresi', 'Satış İsteme Süresi', 'Şikayet Süresi', 'Ödeme Süresi', 'Takibin Kesinleşmesi', 'Diğer'];

  function handleKaydet() {
    if (!yeni.tip || !yeni.gun) return;
    onEkle({ id: crypto.randomUUID(), tip: yeni.tip, baslangic: yeni.baslangic, gun: Number(yeni.gun) });
    setYeni({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
    setForm(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-text-muted">{sureler.length > 0 && `${sureler.length} süre tanımlı`}</span>
        <button onClick={() => setForm(!form)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Süre Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Süre</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Süre Türü *</label>
              <select value={yeni.tip} onChange={(e) => setYeni(p => ({ ...p, tip: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                <option value="">Seçiniz...</option>
                {SURE_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Başlangıç Tarihi</label>
              <input type="date" value={yeni.baslangic} onChange={(e) => setYeni(p => ({ ...p, baslangic: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gün Sayısı *</label>
              <input type="number" value={yeni.gun} onChange={(e) => setYeni(p => ({ ...p, gun: e.target.value }))} placeholder="7" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tip || !yeni.gun} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}

      {sureler.length === 0 && !form ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} message="Henüz süre tanımlanmamış" action="+ Süre Ekle" onAction={() => setForm(true)} />
      ) : (
        <div className="space-y-2">
          {sureler.map((s) => {
            const hesapS = sureHesapla(s.baslangic, s.gun);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg group hover:bg-surface2 transition-colors">
                <SureBadge kalanGun={hesapS.kalanGun} compact />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text">{s.tip}</div>
                  <div className="text-[11px] text-text-muted">{fmtTarih(s.baslangic)} → {fmtTarih(hesapS.sonTarih)} ({s.gun} gün)</div>
                </div>
                <SureBadge kalanGun={hesapS.kalanGun} label={s.tip} />
                <button onClick={() => onSil(s.id)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
