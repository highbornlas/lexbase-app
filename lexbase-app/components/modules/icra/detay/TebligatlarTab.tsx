'use client';

import { useState } from "react";
import { fmtTarih } from "@/lib/utils";
import { EmptyTab } from "./DetailUi";

export function TebligatlarTab({ icra, onUpdate }: { icra: import('@/lib/hooks/useIcra').Icra; onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void }) {
  const [yeniForm, setYeniForm] = useState(false);
  const [form, setForm] = useState({
    tur: 'Ödeme Emri',
    alici: '',
    tarih: new Date().toISOString().split('T')[0],
    pttBarkod: '',
    tebligDurum: 'Gönderilmedi' as string,
    tebligTarih: '',
    not: '',
  });
  const [pttLoading, setPttLoading] = useState<string | null>(null);
  const [pttSonuc, setPttSonuc] = useState<Record<string, string>>({});

  const tebligatlar = icra.tebligatlar || [];

  function handleYeniEkle() {
    if (!form.alici?.trim()) return;
    const yeniTebligat = {
      id: crypto.randomUUID(),
      ...form,
    };
    onUpdate({ ...icra, tebligatlar: [...tebligatlar, yeniTebligat] });
    setForm({ tur: 'Ödeme Emri', alici: '', tarih: new Date().toISOString().split('T')[0], pttBarkod: '', tebligDurum: 'Gönderilmedi', tebligTarih: '', not: '' });
    setYeniForm(false);
  }

  function handleSil(id: string) {
    if (!confirm('Bu tebligat kaydını silmek istediğinize emin misiniz?')) return;
    onUpdate({ ...icra, tebligatlar: tebligatlar.filter((t) => t.id !== id) });
  }

  async function handlePttSorgula(tebligatId: string, barkod: string) {
    if (!barkod?.trim()) return;
    setPttLoading(tebligatId);
    setPttSonuc((prev) => ({ ...prev, [tebligatId]: '' }));
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: barkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: `${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}` }));
        if (data.tebligDurum) {
          const guncelTebligatlar = tebligatlar.map((t) =>
            t.id === tebligatId
              ? {
                  ...t,
                  tebligDurum: data.tebligDurum,
                  ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
                  pttSonSorgu: new Date().toISOString(),
                  pttSonuc: data.durum,
                }
              : t
          );
          onUpdate({ ...icra, tebligatlar: guncelTebligatlar });
        }
      } else {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Otomatik sorgu başarısız. PTT sitesi açılıyor...' }));
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Bağlantı hatası. PTT sitesi açılıyor...' }));
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
    } finally {
      setPttLoading(null);
    }
  }

  const TEBLIGAT_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-4">
      {/* Başlık + Yeni Ekle */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">{tebligatlar.length} tebligat kaydı</div>
        <button
          onClick={() => setYeniForm(!yeniForm)}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          {yeniForm ? 'İptal' : '+ Yeni Tebligat'}
        </button>
      </div>

      {/* Yeni Tebligat Formu */}
      {yeniForm && (
        <div className="bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Tebligat Ekle</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tür</label>
              <select
                value={form.tur}
                onChange={(e) => setForm((p) => ({ ...p, tur: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Ödeme Emri</option>
                <option>İcra Emri</option>
                <option>Haciz İhbarnamesi</option>
                <option>Satış İlanı</option>
                <option>103 Davetiye</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Alıcı *</label>
              <input
                value={form.alici}
                onChange={(e) => setForm((p) => ({ ...p, alici: e.target.value }))}
                placeholder="Tebligat alıcısı"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gönderim Tarihi</label>
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">PTT Barkod No</label>
              <input
                value={form.pttBarkod}
                onChange={(e) => setForm((p) => ({ ...p, pttBarkod: e.target.value }))}
                placeholder="RR123456789TR"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tebliğ Durumu</label>
              <select
                value={form.tebligDurum}
                onChange={(e) => setForm((p) => ({ ...p, tebligDurum: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Gönderilmedi</option>
                <option>PTT&apos;de Bekliyor</option>
                <option>Tebliğ Edildi</option>
                <option>İade Döndü</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Not</label>
              <input
                value={form.not}
                onChange={(e) => setForm((p) => ({ ...p, not: e.target.value }))}
                placeholder="Opsiyonel not"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleYeniEkle}
              disabled={!form.alici?.trim()}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Tebligat Listesi */}
      {tebligatlar.length === 0 && !yeniForm ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>} message="Henüz tebligat kaydı eklenmemiş" action="+ Tebligat Ekle" onAction={() => setYeniForm(true)} />
      ) : (
        <div className="space-y-3">
          {tebligatlar.map((t) => (
            <div key={t.id} className="bg-surface2/50 rounded-xl p-4 border border-border/50 space-y-2 hover:bg-surface2 transition-colors">
              {/* Üst satır: Tür + Alıcı + Durum + Sil */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {t.tur || 'Tebligat'}
                  </span>
                  <span className="text-xs font-medium text-text">{t.alici || '—'}</span>
                  {t.tarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tarih)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TEBLIGAT_DURUM_RENK[t.tebligDurum || 'Gönderilmedi'] || 'bg-surface2 text-text-dim border-border'}`}>
                    {t.tebligDurum || 'Gönderilmedi'}
                  </span>
                  {t.tebligTarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tebligTarih)}</span>}
                  <button onClick={() => handleSil(t.id)} className="text-text-dim hover:text-red transition-colors p-1" title="Sil">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* PTT Barkod Sorgulama */}
              {t.pttBarkod && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim flex-shrink-0"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M6 8v8M10 8v8M14 8v8M18 8v8"/></svg>
                  <span className="text-[11px] font-mono text-text">{t.pttBarkod}</span>
                  <button
                    onClick={() => handlePttSorgula(t.id, t.pttBarkod!)}
                    disabled={pttLoading === t.id}
                    className="ml-auto px-3 py-1 bg-[#E30613] text-white text-[10px] font-bold rounded hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    {pttLoading === t.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    )}
                    {pttLoading === t.id ? 'Sorgulanıyor...' : "PTT'den Sorgula"}
                  </button>
                </div>
              )}

              {/* PTT Sonucu */}
              {pttSonuc[t.id] && (
                <div className={`text-[11px] px-3 py-1.5 rounded border ${
                  pttSonuc[t.id].includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
                  pttSonuc[t.id].includes('İade') ? 'bg-red-dim border-red/20 text-red' :
                  pttSonuc[t.id].includes('hata') || pttSonuc[t.id].includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
                  'bg-blue-400/10 border-blue-400/20 text-blue-400'
                }`}>
                  {pttSonuc[t.id]}
                </div>
              )}

              {/* Son Sorgu Bilgisi */}
              {t.pttSonSorgu && (
                <div className="text-[10px] text-text-dim">
                  Son sorgu: {new Date(t.pttSonSorgu).toLocaleString('tr-TR')}
                  {t.pttSonuc && ` — ${t.pttSonuc}`}
                </div>
              )}

              {/* Not */}
              {t.not && <div className="text-[11px] text-text-muted italic">{t.not}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
