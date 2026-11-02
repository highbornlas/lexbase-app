'use client';

import { useRef, useState } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import { useKasaIslemi } from '@/lib/hooks/useKasaIslemi';
import { kasaIslemHatasi, type DosyaMasraf, type DosyaTuru } from '@/lib/data/financeCashTransaction';

const KATEGORILER = ['Harç', 'Posta/Tebligat', 'Bilirkişi', 'Keşif', 'Tanık', 'Yol/Konaklama',
  'Fotokopi/Baskı', 'Vekaletname', 'Haciz Masrafı', 'Diğer'];
function yeniForm() {
  return { id: crypto.randomUUID(), kat: '', acik: '', tarih: new Date().toISOString().slice(0, 10), tutar: '', masrafSahibi: 'muvekkil' };
}

export function DosyaHarcamaTab({ dosyaId, dosyaTur, harcamalar }: {
  dosyaId: string; dosyaTur: DosyaTuru; harcamalar: DosyaMasraf[];
}) {
  const mutation = useKasaIslemi();
  const kilit = useRef(false);
  const beklenen = useRef<DosyaMasraf | null>(null);
  const [acik, setAcik] = useState(false);
  const [form, setForm] = useState(yeniForm);
  const [hata, setHata] = useState('');
  const inputClass = 'w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text';

  function duzenle(h: DosyaMasraf) {
    if (kilit.current) return;
    beklenen.current = h;
    setForm({ id: h.id, kat: h.kat || '', acik: h.acik || '', tarih: h.tarih || '',
      tutar: String(h.tutar), masrafSahibi: h.masrafSahibi || 'muvekkil' });
    setHata(''); setAcik(true);
  }

  async function kaydet() {
    if (kilit.current) return;
    kilit.current = true; setHata('');
    try {
      await mutation.mutateAsync({ islem: 'kaydet', kaynak: 'dosya', dosyaId, dosyaTur,
        hareket: { ...form, tutar: Number(form.tutar) }, beklenen: beklenen.current ? { ...beklenen.current } : null });
      setAcik(false); setForm(yeniForm()); beklenen.current = null;
    } catch (error) { setHata(kasaIslemHatasi(error)); }
    finally { kilit.current = false; }
  }

  async function sil(h: DosyaMasraf) {
    if (kilit.current || !window.confirm('Masraf dosyadan ve müvekkil kasasından birlikte kaldırılacak. Onaylıyor musunuz?')) return;
    kilit.current = true; setHata('');
    try {
      await mutation.mutateAsync({ islem: 'sil', kaynak: 'dosya', dosyaId, dosyaTur, hareket: { ...h }, beklenen: { ...h } });
    } catch (error) { setHata(kasaIslemHatasi(error)); }
    finally { kilit.current = false; }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">{harcamalar.length} masraf kaydı</span>
        <button disabled={mutation.isPending} onClick={() => {
          if (kilit.current) return;
          setAcik(!acik); setHata('');
          if (!acik) { setForm(yeniForm()); beklenen.current = null; }
        }} className="px-3 py-2 text-xs bg-gold text-bg rounded-lg disabled:opacity-40">{acik ? 'Formu Kapat' : '+ Harcama Ekle'}</button>
      </div>
      {hata && <p role="alert" className="text-xs text-red bg-red/10 rounded-lg p-3">{hata}</p>}
      {acik && (
        <fieldset disabled={mutation.isPending} className="bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <legend className="text-xs text-text-muted">{beklenen.current ? 'Masraf Düzenle' : 'Yeni Masraf'}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-text-muted">Masraf kime ait?
              <select value={form.masrafSahibi} onChange={e => setForm({ ...form, masrafSahibi: e.target.value })} className={inputClass}>
                <option value="muvekkil">Müvekkil masrafı (avans kasası)</option>
                <option value="buro">Büro maliyeti (kâr/zarar)</option>
              </select>
            </label>
            <label className="text-xs text-text-muted">Kategori
              <select value={form.kat} onChange={e => setForm({ ...form, kat: e.target.value })} className={inputClass}>
                <option value="">Seçiniz</option>{KATEGORILER.map(k => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label className="text-xs text-text-muted">Tarih
              <input type="date" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} className={inputClass} />
            </label>
            <label className="text-xs text-text-muted">Tutar (TL)
              <input type="number" min="0.01" step="0.01" value={form.tutar} onChange={e => setForm({ ...form, tutar: e.target.value })} className={inputClass} />
            </label>
            <label className="sm:col-span-2 text-xs text-text-muted">Açıklama
              <input value={form.acik} onChange={e => setForm({ ...form, acik: e.target.value })} className={inputClass} />
            </label>
          </div>
          <p className="text-xs text-text-dim">Müvekkil masrafı kasaya aynı kayıt kimliğiyle yansır; büro maliyeti müvekkil kasasından düşülmez.</p>
          <button onClick={kaydet} disabled={mutation.isPending || !form.tarih || !Number.isFinite(Number(form.tutar)) || Number(form.tutar) <= 0}
            className="px-4 py-2 text-xs bg-gold text-bg rounded-lg disabled:opacity-40">{mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </fieldset>
      )}
      {!harcamalar.length && <p className="text-sm text-text-muted py-6 text-center">Henüz masraf kaydı yok.</p>}
      {harcamalar.map(h => (
        <div key={h.id} className="flex flex-wrap items-center gap-3 bg-surface2/50 rounded-lg p-3 text-xs">
          <span className="text-text-muted">{fmtTarih(h.tarih)}</span>
          <span className="text-text-muted">{h.kat}</span>
          <span className="flex-1 text-text">{h.acik || '—'}</span>
          <span className="text-text-dim">{h.masrafSahibi === 'buro' ? 'Büro' : 'Müvekkil'}</span>
          <strong className="text-text">{fmt(h.tutar)}</strong>
          <button disabled={mutation.isPending} onClick={() => duzenle(h)} className="text-gold disabled:opacity-40">Düzenle</button>
          <button disabled={mutation.isPending} onClick={() => sil(h)} className="text-red disabled:opacity-40">Sil</button>
        </div>
      ))}
    </div>
  );
}
