'use client';

import { useState, useMemo } from 'react';
import { UYAP_FAIZ_TURLERI } from '@/lib/utils/faiz';
import {
  useFaizOranlari,
  useFaizOraniEkle,
  useFaizOraniGuncelle,
  useFaizOraniSil,
  type FaizOraniKayit,
} from '@/lib/hooks/useFaizOranlari';
import { fmtTarih } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   Faiz Oranları Yönetim Paneli — Ayarlar sekmesi
   Tüm faiz türleri için tarihsel oran ekleme/düzenleme/silme
   ══════════════════════════════════════════════════════════════ */

const KAYNAK_ETIKETLERI: Record<string, { label: string; cls: string }> = {
  sistem: { label: 'Sistem', cls: 'text-text-muted bg-surface2' },
  manuel: { label: 'Manuel', cls: 'text-gold bg-gold/10' },
  tcmb_evds: { label: 'TCMB', cls: 'text-green bg-green-dim' },
};

export function FaizOranlariTab() {
  const [seciliTur, setSeciliTur] = useState('yasal');
  const [formAcik, setFormAcik] = useState(false);
  const [duzenleId, setDuzenleId] = useState<number | null>(null);
  const [form, setForm] = useState({ baslangic: '', oran: '', notlar: '' });
  const [silOnay, setSilOnay] = useState<number | null>(null);

  const { data: tumOranlar, isLoading } = useFaizOranlari();
  const ekle = useFaizOraniEkle();
  const guncelle = useFaizOraniGuncelle();
  const sil = useFaizOraniSil();

  // Mevcut türler (DB'deki + UYAP sabit listesi birleşik)
  const turListesi = useMemo(() => {
    const dbTurler = new Set((tumOranlar || []).map((r) => r.tur));
    const uyapTurler = UYAP_FAIZ_TURLERI.filter((t) => t.id !== 'sozlesmeli' && t.id !== 'diger' && t.id !== 'yok');
    const tumTurler = uyapTurler.map((t) => ({
      id: t.id,
      ad: t.ad,
      kategori: t.kategori,
      kayitSayisi: (tumOranlar || []).filter((r) => r.tur === t.id).length,
    }));
    // DB'de olup UYAP listesinde olmayanlar
    for (const tur of dbTurler) {
      if (!tumTurler.some((t) => t.id === tur)) {
        tumTurler.push({ id: tur as typeof tumTurler[0]['id'], ad: tur, kategori: 'Diğer', kayitSayisi: (tumOranlar || []).filter((r) => r.tur === tur).length });
      }
    }
    return tumTurler;
  }, [tumOranlar]);

  // Kategorilere göre grupla
  const kategoriler = useMemo(() => {
    const gruplar: Record<string, typeof turListesi> = {};
    for (const t of turListesi) {
      if (!gruplar[t.kategori]) gruplar[t.kategori] = [];
      gruplar[t.kategori].push(t);
    }
    return gruplar;
  }, [turListesi]);

  // Seçili türün oranları
  const seciliOranlar = useMemo(() => {
    return (tumOranlar || [])
      .filter((r) => r.tur === seciliTur)
      .sort((a, b) => b.baslangic.localeCompare(a.baslangic)); // En yeni üstte
  }, [tumOranlar, seciliTur]);

  const seciliTurBilgi = UYAP_FAIZ_TURLERI.find((t) => t.id === seciliTur);

  function handleFormAc() {
    setForm({ baslangic: '', oran: '', notlar: '' });
    setDuzenleId(null);
    setFormAcik(true);
  }

  function handleDuzenle(kayit: FaizOraniKayit) {
    setForm({ baslangic: kayit.baslangic, oran: kayit.oran.toString(), notlar: kayit.notlar || '' });
    setDuzenleId(kayit.id);
    setFormAcik(true);
  }

  async function handleKaydet() {
    if (!form.baslangic || !form.oran) return;
    try {
      if (duzenleId) {
        await guncelle.mutateAsync({ id: duzenleId, baslangic: form.baslangic, oran: Number(form.oran), notlar: form.notlar || undefined });
      } else {
        await ekle.mutateAsync({ tur: seciliTur, baslangic: form.baslangic, oran: Number(form.oran), kaynak: 'manuel', notlar: form.notlar || undefined });
      }
      setFormAcik(false);
      setDuzenleId(null);
    } catch (e) {
      alert('Kaydetme hatası: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    }
  }

  async function handleSil(id: number) {
    try {
      await sil.mutateAsync(id);
      setSilOnay(null);
    } catch (e) {
      alert('Silme hatası: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    }
  }

  // Güncel oran
  const guncelOran = seciliOranlar[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Faiz Oranları Yönetimi</h2>
        <p className="text-xs text-text-muted mt-1">
          Tüm faiz türleri için tarihsel oranları görüntüleyin, ekleyin veya düzenleyin.
          Eklediğiniz oranlar belirttiğiniz tarihten itibaren geçerli olur.
        </p>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Sol: Faiz Türleri Listesi */}
        <div className="bg-surface2/50 border border-border rounded-lg p-2 self-start sticky top-20 max-h-[70vh] overflow-y-auto">
          {Object.entries(kategoriler).map(([kategori, turler]) => (
            <div key={kategori} className="mb-2">
              <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider px-2 py-1">{kategori}</div>
              {turler.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSeciliTur(t.id); setFormAcik(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-colors flex items-center justify-between ${
                    seciliTur === t.id ? 'bg-gold-dim text-gold font-semibold' : 'text-text-muted hover:bg-surface2 hover:text-text'
                  }`}
                >
                  <span className="truncate">{t.ad}</span>
                  {t.kayitSayisi > 0 && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-surface2 text-text-dim ml-1 flex-shrink-0">
                      {t.kayitSayisi}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Sağ: Seçili Türün Oranları */}
        <div className="space-y-4">
          {/* Başlık */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">{seciliTurBilgi?.ad || seciliTur}</h3>
              {seciliTurBilgi?.madde && (
                <span className="text-[10px] text-text-dim">{seciliTurBilgi.madde}</span>
              )}
              {seciliTurBilgi?.aciklama && (
                <p className="text-[10px] text-text-muted mt-0.5">{seciliTurBilgi.aciklama}</p>
              )}
            </div>
            <button
              onClick={handleFormAc}
              className="px-3 py-1.5 text-xs font-semibold text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
            >
              + Oran Ekle
            </button>
          </div>

          {/* Güncel Oran Kartı */}
          {guncelOran && (
            <div className="bg-gold-dim border border-gold/20 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gold uppercase tracking-wider font-semibold">Güncel Oran</div>
                <div className="text-[10px] text-text-dim">{fmtTarih(guncelOran.baslangic)} tarihinden itibaren</div>
              </div>
              <div className="font-[var(--font-playfair)] text-2xl font-bold text-gold">%{guncelOran.oran}</div>
            </div>
          )}

          {/* Ekleme/Düzenleme Formu */}
          {formAcik && (
            <div className="bg-surface2/50 border border-gold/20 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gold">{duzenleId ? 'Oranı Düzenle' : 'Yeni Oran Ekle'}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Geçerlilik Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={form.baslangic}
                    onChange={(e) => setForm({ ...form, baslangic: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Yıllık Oran (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.oran}
                    onChange={(e) => setForm({ ...form, oran: e.target.value })}
                    placeholder="24.00"
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Açıklama / Kaynak</label>
                  <input
                    type="text"
                    value={form.notlar}
                    onChange={(e) => setForm({ ...form, notlar: e.target.value })}
                    placeholder="Resmi Gazete no, karar tarihi vs."
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleKaydet}
                  disabled={!form.baslangic || !form.oran || ekle.isPending || guncelle.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
                >
                  {ekle.isPending || guncelle.isPending ? 'Kaydediliyor...' : duzenleId ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  onClick={() => { setFormAcik(false); setDuzenleId(null); }}
                  className="px-4 py-2 text-xs text-text-muted hover:text-text transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Oran Listesi Tablosu */}
          {isLoading ? (
            <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>
          ) : seciliOranlar.length === 0 ? (
            <div className="text-center py-8 bg-surface2/50 border border-border rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-xs text-text-muted">Bu faiz türü için henüz oran girilmemiş</div>
              <button
                onClick={handleFormAc}
                className="mt-2 text-xs text-gold hover:underline"
              >
                İlk oranı ekle
              </button>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface2">
                    <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Geçerlilik Tarihi</th>
                    <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Yıllık Oran</th>
                    <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Kaynak</th>
                    <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Açıklama</th>
                    <th className="px-2 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {seciliOranlar.map((kayit, idx) => (
                    <tr key={kayit.id} className={`border-b border-border/50 hover:bg-surface2 transition-colors group ${idx === 0 ? 'bg-gold/5' : ''}`}>
                      <td className="px-3 py-2 text-text">
                        {fmtTarih(kayit.baslangic)}
                        {idx === 0 && <span className="ml-1.5 text-[8px] font-bold text-gold bg-gold/10 px-1 py-0.5 rounded">GÜNCEL</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-text">%{kayit.oran}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${KAYNAK_ETIKETLERI[kayit.kaynak]?.cls || 'text-text-muted bg-surface2'}`}>
                          {KAYNAK_ETIKETLERI[kayit.kaynak]?.label || kayit.kaynak}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-muted truncate max-w-[200px]">{kayit.notlar || '—'}</td>
                      <td className="px-2 py-2">
                        {silOnay === kayit.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSil(kayit.id)} className="text-[10px] text-red font-semibold hover:underline">Evet</button>
                            <button onClick={() => setSilOnay(null)} className="text-[10px] text-text-muted hover:underline">Hayır</button>
                          </div>
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDuzenle(kayit)} className="text-[10px] text-gold hover:underline">Düzenle</button>
                            <button onClick={() => setSilOnay(kayit.id)} className="text-[10px] text-red hover:underline">Sil</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bilgi */}
          <div className="text-[10px] text-text-dim bg-surface2/30 border border-border/50 rounded-lg p-3">
            <strong>Not:</strong> Eklediğiniz oranlar belirttiğiniz tarihten itibaren geçerli olur.
            Sistem, alacak hesabında ilgili dönem için en güncel oranı otomatik kullanır.
            Kaynak olarak &quot;Sistem&quot; etiketli oranlar uygulamayla birlikte gelir,
            &quot;Manuel&quot; etiketli oranlar sizin tarafınızdan eklenmiştir,
            &quot;TCMB&quot; etiketli oranlar TCMB EVDS API&apos;den otomatik çekilmiştir.
          </div>
        </div>
      </div>
    </div>
  );
}
