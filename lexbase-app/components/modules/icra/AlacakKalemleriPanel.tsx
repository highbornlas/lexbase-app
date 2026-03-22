'use client';

import { useState } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  type AlacakKalemi,
  type FaizTuru,
  KALEM_TURLERI,
  FAIZ_TURLERI,
  UYAP_FAIZ_TURLERI,
  faizTurleriGruplu,
  hesaplaKalemFaiz,
} from '@/lib/utils/faiz';

/* ══════════════════════════════════════════════════════════════
   Alacak Kalemleri Paneli — Çoklu borç kalemi ekleme/düzenleme
   Her kalem ayrı faiz türü ve vade tarihine sahip
   ══════════════════════════════════════════════════════════════ */

interface AlacakKalemleriPanelProps {
  kalemler: AlacakKalemi[];
  onChange: (kalemler: AlacakKalemi[]) => void;
}

const PARA_BIRIMLERI = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
];

const BOS_KALEM = {
  kalemTuru: 'asil_alacak' as AlacakKalemi['kalemTuru'],
  aciklama: '',
  asilTutar: '',
  vadeTarihi: '',
  faizTuru: 'yasal' as FaizTuru,
  ozelFaizOrani: '',
  paraBirimi: 'TRY',
};

export function AlacakKalemleriPanel({ kalemler, onChange }: AlacakKalemleriPanelProps) {
  const [formAcik, setFormAcik] = useState(false);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [form, setForm] = useState(BOS_KALEM);

  const bugun = new Date().toISOString().slice(0, 10);

  function handleKaydet() {
    if (!form.asilTutar || !form.vadeTarihi) return;

    const yeniKalem: AlacakKalemi = {
      id: duzenleId || crypto.randomUUID(),
      kalemTuru: form.kalemTuru,
      aciklama: form.aciklama || KALEM_TURLERI.find((k) => k.value === form.kalemTuru)?.label || 'Alacak',
      asilTutar: Number(form.asilTutar),
      paraBirimi: form.paraBirimi || 'TRY',
      vadeTarihi: form.vadeTarihi,
      faizTuru: form.faizTuru,
      ozelFaizOrani: (form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') ? Number(form.ozelFaizOrani) || undefined : undefined,
    };

    if (duzenleId) {
      onChange(kalemler.map((k) => k.id === duzenleId ? yeniKalem : k));
    } else {
      onChange([...kalemler, yeniKalem]);
    }

    setForm(BOS_KALEM);
    setFormAcik(false);
    setDuzenleId(null);
  }

  function handleDuzenle(k: AlacakKalemi) {
    setForm({
      kalemTuru: k.kalemTuru,
      aciklama: k.aciklama,
      asilTutar: k.asilTutar.toString(),
      vadeTarihi: k.vadeTarihi,
      faizTuru: k.faizTuru,
      ozelFaizOrani: k.ozelFaizOrani?.toString() || '',
      paraBirimi: k.paraBirimi || 'TRY',
    });
    setDuzenleId(k.id);
    setFormAcik(true);
  }

  function handleSil(id: string) {
    onChange(kalemler.filter((k) => k.id !== id));
  }

  const toplamAsil = kalemler.reduce((t, k) => t + k.asilTutar, 0);
  const toplamFaiz = kalemler.reduce((t, k) => t + hesaplaKalemFaiz(k, bugun), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">Alacak Kalemleri ({kalemler.length})</h4>
        <button
          onClick={() => { setFormAcik(!formAcik); setDuzenleId(null); setForm(BOS_KALEM); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            formAcik ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gold border border-gold/30 hover:bg-gold-dim'
          }`}
        >
          {formAcik ? '✕ Kapat' : '+ Kalem Ekle'}
        </button>
      </div>

      {/* Ekleme/Düzenleme Formu */}
      {formAcik && (
        <div className="bg-surface2/50 border border-gold/20 rounded-lg p-4 space-y-3">
          <h5 className="text-xs font-semibold text-gold">{duzenleId ? 'Kalemi Düzenle' : 'Yeni Alacak Kalemi'}</h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Kalem Türü */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Kalem Türü</label>
              <select value={form.kalemTuru} onChange={(e) => setForm({ ...form, kalemTuru: e.target.value as AlacakKalemi['kalemTuru'] })}
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                {KALEM_TURLERI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            {/* Açıklama */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Açıklama</label>
              <input type="text" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                placeholder="Ör: Kira - Ocak 2025"
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
            </div>
            {/* Tutar + Para Birimi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Asıl Tutar *</label>
              <div className="flex gap-1.5">
                <input type="number" step="0.01" min="0" value={form.asilTutar}
                  onChange={(e) => setForm({ ...form, asilTutar: e.target.value })}
                  className="flex-1 text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
                <select value={form.paraBirimi} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })}
                  className="w-20 text-xs px-2 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                  {PARA_BIRIMLERI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {/* Vade Tarihi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Vade / Temerrüt Tarihi *</label>
              <input type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
            </div>
            {/* Faiz Türü */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Faiz Türü</label>
              <select value={form.faizTuru} onChange={(e) => setForm({ ...form, faizTuru: e.target.value as FaizTuru })}
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                {Object.entries(faizTurleriGruplu()).map(([kat, turler]) => (
                  <optgroup key={kat} label={kat}>
                    {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {/* Özel Faiz Oranı (sözleşmeli) */}
            {(form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Yıllık Faiz Oranı (%)</label>
                <input type="number" step="0.01" min="0" value={form.ozelFaizOrani}
                  onChange={(e) => setForm({ ...form, ozelFaizOrani: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleKaydet} disabled={!form.asilTutar || !form.vadeTarihi}
              className="px-4 py-2 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              {duzenleId ? 'Güncelle' : 'Ekle'}
            </button>
            <button onClick={() => { setFormAcik(false); setDuzenleId(null); setForm(BOS_KALEM); }}
              className="px-4 py-2 text-xs text-text-muted hover:text-text transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Kalem Listesi */}
      {kalemler.length === 0 ? (
        <div className="text-center py-6 bg-surface border border-border rounded-lg">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-xs text-text-muted">Henüz alacak kalemi eklenmemiş</div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Kalem</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Vade</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Asıl Tutar</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşlemiş Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Toplam</th>
                <th className="px-2 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const faiz = hesaplaKalemFaiz(k, bugun);
                const faizLabel = UYAP_FAIZ_TURLERI.find((f) => f.id === k.faizTuru)?.ad || k.faizTuru;
                return (
                  <tr key={k.id} className="border-b border-border/50 hover:bg-surface2 transition-colors group">
                    <td className="px-3 py-2">
                      <div className="text-text font-medium">{k.aciklama}</div>
                      <div className="text-[10px] text-text-dim">{KALEM_TURLERI.find((kt) => kt.value === k.kalemTuru)?.label}</div>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{fmtTarih(k.vadeTarihi)}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 border border-border text-text-muted">
                        {faizLabel}
                        {k.faizTuru === 'sozlesmeli' && k.ozelFaizOrani ? ` (${k.ozelFaizOrani}%)` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-text">{fmt(k.asilTutar, k.paraBirimi)}</td>
                    <td className="px-3 py-2 text-right text-orange-400">{faiz > 0 ? fmt(faiz) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-text">{fmt(k.asilTutar + faiz)}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDuzenle(k)} className="text-[10px] text-gold hover:underline">Düzenle</button>
                        <button onClick={() => handleSil(k.id)} className="text-[10px] text-red hover:underline">Sil</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface2 font-bold">
                <td colSpan={3} className="px-3 py-2 text-text-muted text-right">TOPLAM:</td>
                <td className="px-3 py-2 text-right text-text">{fmt(toplamAsil)}</td>
                <td className="px-3 py-2 text-right text-orange-400">{fmt(toplamFaiz)}</td>
                <td className="px-3 py-2 text-right text-gold text-sm">{fmt(toplamAsil + toplamFaiz)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
