'use client';

import { useState, useMemo } from 'react';
import { fmt } from '@/lib/utils';

/* ── Masraf kategorileri ── */
const KATEGORILER = ['Harçlar', 'Posta/Tebligat', 'Bilirkişi', 'Tanık', 'Yol/Konaklama', 'Vekaletname Harcı', 'Keşif', 'Fotokopi/Baskı', 'Haciz Masrafı', 'Diğer'] as const;

interface MasrafKayit {
  id: string;
  tarih: string;
  tutar: number;
  kat: string;
  acik: string;
  dosyaNo: string;
  dosyaId: string;
  dosyaTur: string;
}

interface DosyaSecenegi {
  id: string;
  no: string;
  tur: string;       // 'Dava' | 'İcra' | 'Arabuluculuk' | 'İhtarname'
  label: string;     // Görüntülenen ad
}

interface Props {
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  finansOzet: Record<string, unknown> | null | undefined;
  onMasrafKaydet: (dosyaId: string, dosyaTur: string, harcama: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
}

export function MuvMasrafAvans({ davalar, icralar, arabuluculuklar, ihtarnameler, finansOzet, onMasrafKaydet }: Props) {
  const [katFiltre, setKatFiltre] = useState<string>('');
  const [formAcik, setFormAcik] = useState(false);
  const [yeni, setYeni] = useState({ dosyaKey: '', kat: '', acik: '', tarih: new Date().toISOString().slice(0, 10), tutar: '' });

  /* ── Müvekkile ait tüm dosyalar (seçenek listesi) ── */
  const dosyaSecenekleri = useMemo(() => {
    const result: DosyaSecenegi[] = [];
    davalar.forEach((d) => {
      const no = (d.no as string) || (d.esasNo as string) || '';
      result.push({ id: d.id as string, no, tur: 'Dava', label: `📂 Dava — ${no || (d.id as string).slice(0, 8)}` });
    });
    icralar.forEach((d) => {
      const no = (d.no as string) || (d.dosyaNo as string) || '';
      result.push({ id: d.id as string, no, tur: 'İcra', label: `⚖️ İcra — ${no || (d.id as string).slice(0, 8)}` });
    });
    arabuluculuklar.forEach((d) => {
      const no = (d.no as string) || (d.dosyaNo as string) || '';
      result.push({ id: d.id as string, no, tur: 'Arabuluculuk', label: `🤝 Arabuluculuk — ${no || (d.id as string).slice(0, 8)}` });
    });
    ihtarnameler.forEach((d) => {
      const no = (d.no as string) || (d.konu as string) || '';
      result.push({ id: d.id as string, no, tur: 'İhtarname', label: `📨 İhtarname — ${no || (d.id as string).slice(0, 8)}` });
    });
    return result;
  }, [davalar, icralar, arabuluculuklar, ihtarnameler]);

  /* ── Tüm harcamaları birleştir ── */
  const tumMasraflar = useMemo(() => {
    const result: MasrafKayit[] = [];
    const dosyaGruplari = [
      { items: davalar, tur: 'Dava' },
      { items: icralar, tur: 'İcra' },
      { items: arabuluculuklar, tur: 'Arabuluculuk' },
      { items: ihtarnameler, tur: 'İhtarname' },
    ];

    dosyaGruplari.forEach(({ items, tur }) => {
      items.forEach((dosya) => {
        const harcamalar = (dosya.harcamalar || []) as Array<Record<string, string>>;
        harcamalar.forEach((h) => {
          result.push({
            id: h.id || '',
            tarih: h.tarih || '',
            tutar: parseFloat(h.tutar) || 0,
            kat: h.kat || 'Harcama',
            acik: h.acik || '',
            dosyaNo: (dosya.no as string) || '—',
            dosyaId: dosya.id as string,
            dosyaTur: tur,
          });
        });
      });
    });

    result.sort((a, b) => b.tarih.localeCompare(a.tarih));
    return result;
  }, [davalar, icralar, arabuluculuklar, ihtarnameler]);

  /* ── Filtreleme ── */
  const gosterilenler = katFiltre
    ? tumMasraflar.filter((m) => m.kat === katFiltre)
    : tumMasraflar;

  /* ── Özet hesapları ── */
  const avanslar = finansOzet?.avanslar as Record<string, number> | undefined;
  const toplamMasraf = tumMasraflar.reduce((s, m) => s + m.tutar, 0);
  const alinanAvans = avanslar?.alinan ?? 0;
  const emanetBakiye = alinanAvans - toplamMasraf;

  /* ── Benzersiz kategoriler ── */
  const mevcutKategoriler = useMemo(() => {
    const set = new Set(tumMasraflar.map((m) => m.kat));
    return Array.from(set).sort();
  }, [tumMasraflar]);

  const turRenk: Record<string, string> = {
    'Dava': 'text-blue-400 bg-blue-400/10',
    'İcra': 'text-orange-400 bg-orange-400/10',
    'Arabuluculuk': 'text-green bg-green-dim',
    'İhtarname': 'text-purple-400 bg-purple-400/10',
  };

  /* ── Kaydet ── */
  function handleKaydet() {
    const secilenDosya = dosyaSecenekleri.find((d) => `${d.tur}::${d.id}` === yeni.dosyaKey);
    if (!secilenDosya || !yeni.tutar) return;

    onMasrafKaydet(secilenDosya.id, secilenDosya.tur, {
      id: crypto.randomUUID(),
      kat: yeni.kat || 'Diğer',
      acik: yeni.acik,
      tarih: yeni.tarih,
      tutar: Number(yeni.tutar),
    });

    setYeni({ dosyaKey: '', kat: '', acik: '', tarih: new Date().toISOString().slice(0, 10), tutar: '' });
    setFormAcik(false);
  }

  return (
    <div className="space-y-5">
      {/* Emanet Kasa Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Alınan Avans</div>
          <div className="font-[var(--font-playfair)] text-xl text-green font-bold">{fmt(alinanAvans)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Toplam Masraf</div>
          <div className="font-[var(--font-playfair)] text-xl text-text font-bold">{fmt(toplamMasraf)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Emanet Bakiye</div>
          <div className={`font-[var(--font-playfair)] text-xl font-bold ${emanetBakiye >= 0 ? 'text-green' : 'text-red'}`}>
            {fmt(emanetBakiye)}
          </div>
        </div>
      </div>

      {/* Masraf Ekleme Formu */}
      {formAcik && (
        <div className="bg-surface2/50 border border-gold/20 rounded-lg p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gold">Yeni Masraf / Avans Ekle</h4>

          {dosyaSecenekleri.length === 0 ? (
            <div className="text-xs text-text-muted py-3">
              Bu müvekkile ait henüz dosya bulunmuyor. Önce bir dosya (dava, icra vb.) oluşturun.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dosya Seçimi */}
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Dosya *</label>
                  <select
                    value={yeni.dosyaKey}
                    onChange={(e) => setYeni({ ...yeni, dosyaKey: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  >
                    <option value="">Dosya seçin...</option>
                    {dosyaSecenekleri.map((d) => (
                      <option key={`${d.tur}::${d.id}`} value={`${d.tur}::${d.id}`}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori */}
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Kategori</label>
                  <select
                    value={yeni.kat}
                    onChange={(e) => setYeni({ ...yeni, kat: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  >
                    <option value="">Seçin...</option>
                    {KATEGORILER.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {/* Tarih */}
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Tarih</label>
                  <input
                    type="date"
                    value={yeni.tarih}
                    onChange={(e) => setYeni({ ...yeni, tarih: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Tutar */}
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yeni.tutar}
                    onChange={(e) => setYeni({ ...yeni, tutar: e.target.value })}
                    placeholder="0.00"
                    className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Açıklama</label>
                <input
                  type="text"
                  value={yeni.acik}
                  onChange={(e) => setYeni({ ...yeni, acik: e.target.value })}
                  placeholder="Masraf açıklaması..."
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
                />
              </div>

              {/* Butonlar */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleKaydet}
                  disabled={!yeni.dosyaKey || !yeni.tutar}
                  className="px-4 py-2 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
                <button
                  onClick={() => { setFormAcik(false); setYeni({ dosyaKey: '', kat: '', acik: '', tarih: new Date().toISOString().slice(0, 10), tutar: '' }); }}
                  className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text transition-colors"
                >
                  İptal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Masraf Tablosu Başlık + Butonlar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">Masraf Kayıtları ({gosterilenler.length})</h3>
          {mevcutKategoriler.length > 0 && (
            <select
              value={katFiltre}
              onChange={(e) => setKatFiltre(e.target.value)}
              className="text-[11px] px-2 py-1 bg-surface border border-border rounded text-text-muted focus:border-gold focus:outline-none"
            >
              <option value="">Tüm Kategoriler</option>
              {mevcutKategoriler.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setFormAcik(!formAcik)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            formAcik
              ? 'bg-gold/10 text-gold border border-gold/30'
              : 'text-gold border border-gold/30 hover:bg-gold-dim'
          }`}
        >
          {formAcik ? '✕ Formu Kapat' : '+ Masraf / Avans Ekle'}
        </button>
      </div>

      {/* Masraf Tablosu */}
      {gosterilenler.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">💸</div>
          <div className="text-sm font-medium">Henüz masraf kaydı yok</div>
          <div className="text-xs text-text-dim mt-1">Dosyalara yapılan masraflar burada listelenecek</div>
          {!formAcik && (
            <button
              onClick={() => setFormAcik(true)}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
            >
              + İlk Masrafı Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Tarih</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Kategori</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Açıklama</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Dosya</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Tür</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {gosterilenler.map((h, i) => (
                  <tr key={`${h.dosyaId}-${h.id}-${i}`} className="border-b border-border/50 hover:bg-surface2 transition-colors">
                    <td className="px-4 py-2.5 text-text-muted text-xs">{h.tarih || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface2 border border-border text-text-muted">
                        {h.kat}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text text-xs">{h.acik || '—'}</td>
                    <td className="px-4 py-2.5 text-gold text-xs font-medium">{h.dosyaNo}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${turRenk[h.dosyaTur] || 'text-text-dim bg-surface2'}`}>
                        {h.dosyaTur}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-text font-semibold text-xs">{fmt(h.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-text-muted text-right">Toplam:</td>
                  <td className="px-4 py-3 text-right text-gold font-bold text-sm">
                    {fmt(gosterilenler.reduce((s, h) => s + h.tutar, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
