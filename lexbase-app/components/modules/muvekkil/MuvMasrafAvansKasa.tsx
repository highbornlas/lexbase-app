'use client';

import { useState, useMemo } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  useAvansHareketleri,
  useAvansHareketKaydet,
  useAvansHareketSil,
  hesaplaKasaOzet,
  MASRAF_KATEGORILERI,
  ODEME_YONTEMLERI,
  AVANS_ESIK,
  type AvansHareket,
} from '@/lib/hooks/useAvansKasasi';
import { exportAvansKasaPDF } from '@/lib/export/pdfExport';
import { exportAvansKasaXLS } from '@/lib/export/excelExport';

/* ══════════════════════════════════════════════════════════════
   Masraf & Avans Kasası — Birleşik Panel
   Avans alımı, masraf girişi, iade, tüm hareketler tek yerde
   Masraflar otomatik olarak avans kasasından düşer
   ══════════════════════════════════════════════════════════════ */

interface DosyaSecenegi {
  id: string;
  no: string;
  tur: string;
  label: string;
}

interface Props {
  muvId: string;
  muvAd?: string;
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  onMasrafKaydet: (dosyaId: string, dosyaTur: string, harcama: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
}

type HareketTip = 'alim' | 'masraf' | 'iade';
type Filtre = '' | HareketTip;

const TIP_META: Record<HareketTip, { label: string; renk: string; icon: string; renkBg: string }> = {
  alim:  { label: 'Avans Alımı', renk: 'text-green',      icon: '↓', renkBg: 'text-green bg-green/10 border-green/20' },
  masraf:{ label: 'Masraf',      renk: 'text-red',         icon: '↑', renkBg: 'text-red bg-red/10 border-red/20' },
  iade:  { label: 'İade',        renk: 'text-blue-400',    icon: '↩', renkBg: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
};

export function MuvMasrafAvansKasa({ muvId, muvAd, davalar, icralar, arabuluculuklar, ihtarnameler, onMasrafKaydet }: Props) {
  const { data: hareketler, isLoading } = useAvansHareketleri(muvId);
  const kaydetMut = useAvansHareketKaydet();
  const silMut = useAvansHareketSil();

  const [formAcik, setFormAcik] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('');
  const [silinecek, setSilinecek] = useState<string | null>(null);

  const [form, setForm] = useState({
    tip: 'masraf' as HareketTip,
    tarih: new Date().toISOString().slice(0, 10),
    tutar: '',
    aciklama: '',
    kategori: '',
    odemeYontemi: '',
    dekontNo: '',
    dosyaKey: '',
  });

  // ── Dosya seçenekleri ──
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

  // ── Kasa Özeti ──
  const ozet = useMemo(() => hesaplaKasaOzet(hareketler || []), [hareketler]);

  // ── Filtreleme ──
  const gosterilenler = useMemo(() => {
    if (!hareketler) return [];
    if (!filtre) return hareketler;
    return hareketler.filter((h) => h.tip === filtre);
  }, [hareketler, filtre]);

  // ── Running balance ──
  const runningBalances = useMemo(() => {
    if (!hareketler) return new Map<string, number>();
    const sorted = [...hareketler].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    const map = new Map<string, number>();
    let bakiye = 0;
    sorted.forEach((h) => {
      const tutar = Number(h.tutar || 0);
      if (h.tip === 'alim') bakiye += tutar;
      else bakiye -= tutar;
      map.set(h.id, bakiye);
    });
    return map;
  }, [hareketler]);

  // ── Kaydet ──
  function handleKaydet() {
    if (!form.tutar || Number(form.tutar) <= 0) return;

    const tutar = Number(form.tutar);
    const secilenDosya = dosyaSecenekleri.find((d) => `${d.tur}::${d.id}` === form.dosyaKey);

    // Masraf tipinde dosya seçimi zorunlu
    if (form.tip === 'masraf' && !secilenDosya) return;

    const hareketId = crypto.randomUUID();

    // 1) Avans kasasına hareket olarak kaydet (her zaman)
    const yeniHareket: AvansHareket = {
      id: hareketId,
      muvId,
      tip: form.tip,
      tarih: form.tarih,
      tutar,
      aciklama: form.tip === 'masraf'
        ? `${form.kategori || 'Masraf'}${form.aciklama ? ' — ' + form.aciklama : ''}${secilenDosya ? ` (${secilenDosya.tur} ${secilenDosya.no})` : ''}`
        : (form.aciklama || undefined),
      kategori: form.tip === 'masraf' ? (form.kategori || 'Diğer') : undefined,
      odemeYontemi: form.odemeYontemi || undefined,
      dekontNo: form.dekontNo || undefined,
      dosyaId: secilenDosya?.id,
      dosyaTur: secilenDosya?.tur,
      dosyaNo: secilenDosya?.no,
    };
    kaydetMut.mutate(yeniHareket);

    // 2) Masraf tipinde dosyaya da harcama olarak kaydet (senkronizasyon)
    if (form.tip === 'masraf' && secilenDosya) {
      onMasrafKaydet(secilenDosya.id, secilenDosya.tur, {
        id: hareketId, // Aynı ID ile eşleştir
        kat: form.kategori || 'Diğer',
        acik: form.aciklama,
        tarih: form.tarih,
        tutar,
      });
    }

    // Formu sıfırla
    setForm({
      tip: form.tip, // Aynı tipte kalmaya devam et
      tarih: new Date().toISOString().slice(0, 10),
      tutar: '',
      aciklama: '',
      kategori: '',
      odemeYontemi: '',
      dekontNo: '',
      dosyaKey: '',
    });
    setFormAcik(false);
  }

  // ── Sil ──
  function handleSil(hareket: AvansHareket) {
    silMut.mutate(hareket);
    setSilinecek(null);
  }

  // ── Export ──
  function handleExport(format: 'pdf' | 'excel') {
    const kasaItem = {
      muvAd: muvAd || 'Müvekkil',
      toplamAlim: ozet.toplamAlim,
      toplamMasraf: ozet.toplamMasraf,
      toplamIade: ozet.toplamIade,
      bakiye: ozet.bakiye,
    };
    if (format === 'pdf') {
      exportAvansKasaPDF({ kasalar: [kasaItem], toplamBakiye: ozet.bakiye });
    } else {
      exportAvansKasaXLS([kasaItem]);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Uyarı Bannerları ── */}
      {ozet.bakiye < 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red/10 border border-red/20 rounded-lg">
          <span className="text-lg">🚨</span>
          <div>
            <div className="text-sm font-semibold text-red">Avans kasası eksiye düştü!</div>
            <div className="text-xs text-red/80">Masraflar müvekkilin avansından karşılanamamaktadır. Ek avans talep ediniz.</div>
          </div>
          <div className="ml-auto font-[var(--font-playfair)] text-lg font-bold text-red">{fmt(ozet.bakiye)}</div>
        </div>
      )}
      {ozet.bakiye >= 0 && ozet.bakiye < AVANS_ESIK && ozet.hareketSayisi > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-400/10 border border-orange-400/20 rounded-lg">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-orange-400">Avans bakiyesi düşük</div>
            <div className="text-xs text-orange-400/80">Müvekkilden ek masraf avansı talep etmeniz önerilir.</div>
          </div>
          <div className="ml-auto font-[var(--font-playfair)] text-lg font-bold text-orange-400">{fmt(ozet.bakiye)}</div>
        </div>
      )}

      {/* ── Özet Kartları ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Alınan Avans</div>
          <div className="font-[var(--font-playfair)] text-base text-green font-bold">{fmt(ozet.toplamAlim)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Harcanan Masraf</div>
          <div className="font-[var(--font-playfair)] text-base text-text font-bold">{fmt(ozet.toplamMasraf)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">İade Edilen</div>
          <div className="font-[var(--font-playfair)] text-base text-blue-400 font-bold">{fmt(ozet.toplamIade)}</div>
        </div>
        <div className={`bg-surface border rounded-lg px-4 py-3 ${ozet.bakiye < 0 ? 'border-red/30' : ozet.bakiye < AVANS_ESIK ? 'border-orange-400/30' : 'border-green/30'}`}>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Kasa Bakiyesi</div>
          <div className={`font-[var(--font-playfair)] text-lg font-bold ${ozet.bakiye < 0 ? 'text-red' : ozet.bakiye < AVANS_ESIK ? 'text-orange-400' : 'text-green'}`}>
            {fmt(ozet.bakiye)}
          </div>
        </div>
      </div>

      {/* ── Ekleme Formu ── */}
      {formAcik && (
        <div className="bg-surface2/50 border border-gold/20 rounded-lg p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gold">Yeni Hareket Ekle</h4>

          {/* Tip seçimi — pill buttons */}
          <div className="flex gap-2">
            {(['alim', 'masraf', 'iade'] as HareketTip[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, tip: t })}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  form.tip === t
                    ? TIP_META[t].renkBg + ' border-current'
                    : 'text-text-muted border-border hover:border-text-dim'
                }`}
              >
                {TIP_META[t].icon} {TIP_META[t].label}
              </button>
            ))}
          </div>

          {/* Masraf tipinde dosya seçimi zorunlu uyarısı */}
          {form.tip === 'masraf' && dosyaSecenekleri.length === 0 && (
            <div className="text-xs text-text-muted py-2 px-3 bg-surface border border-border rounded-lg">
              Bu müvekkile ait henüz dosya bulunmuyor. Önce bir dosya (dava, icra vb.) oluşturun.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tarih */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Tarih *</label>
              <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
            </div>
            {/* Tutar */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Tutar (₺) *</label>
              <input type="number" step="0.01" min="0" value={form.tutar}
                onChange={(e) => setForm({ ...form, tutar: e.target.value })} placeholder="0.00"
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
            </div>
            {/* Ödeme Yöntemi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Ödeme Yöntemi</label>
              <select value={form.odemeYontemi} onChange={(e) => setForm({ ...form, odemeYontemi: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                <option value="">Seçin...</option>
                {ODEME_YONTEMLERI.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Dekont No */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Dekont / Makbuz No</label>
              <input type="text" value={form.dekontNo} onChange={(e) => setForm({ ...form, dekontNo: e.target.value })}
                placeholder="Opsiyonel"
                className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
            </div>
            {/* Masraf kategorisi (sadece masraf tipinde) */}
            {form.tip === 'masraf' && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Masraf Kategorisi</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                  <option value="">Seçin...</option>
                  {MASRAF_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            )}
            {/* Dosya seçimi (masraf ve iade için) */}
            {(form.tip === 'masraf' || form.tip === 'iade') && dosyaSecenekleri.length > 0 && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">
                  İlgili Dosya {form.tip === 'masraf' ? '*' : ''}
                </label>
                <select value={form.dosyaKey} onChange={(e) => setForm({ ...form, dosyaKey: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none">
                  {form.tip === 'masraf'
                    ? <option value="">Dosya seçin...</option>
                    : <option value="">Genel (dosya bağımsız)</option>
                  }
                  {dosyaSecenekleri.map((d) => (
                    <option key={`${d.tur}::${d.id}`} value={`${d.tur}::${d.id}`}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Açıklama</label>
            <input type="text" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder={form.tip === 'alim' ? 'Avans alım açıklaması...' : form.tip === 'masraf' ? 'Masraf açıklaması...' : 'İade açıklaması...'}
              className="w-full text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none" />
          </div>

          {/* Masraf senkronizasyon bilgisi */}
          {form.tip === 'masraf' && (
            <div className="flex items-center gap-2 text-[11px] text-text-dim px-3 py-2 bg-surface border border-border rounded-lg">
              <span>🔗</span>
              <span>Masraflar otomatik olarak hem dosya harcamalarına hem avans kasasına kaydedilir.</span>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleKaydet}
              disabled={
                !form.tutar ||
                Number(form.tutar) <= 0 ||
                kaydetMut.isPending ||
                (form.tip === 'masraf' && !form.dosyaKey)
              }
              className="px-4 py-2 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {kaydetMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setFormAcik(false)}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text transition-colors">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Tablo Başlık + Filtreler + Export ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-text">Kasa Hareketleri ({gosterilenler.length})</h3>
          <div className="flex gap-1">
            <button onClick={() => setFiltre('')}
              className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${!filtre ? 'border-gold text-gold bg-gold/10' : 'border-border text-text-dim hover:text-text'}`}>
              Tümü
            </button>
            {(['alim', 'masraf', 'iade'] as HareketTip[]).map((t) => (
              <button key={t} onClick={() => setFiltre(filtre === t ? '' : t)}
                className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${filtre === t ? TIP_META[t].renkBg + ' border-current' : 'border-border text-text-dim hover:text-text'}`}>
                {TIP_META[t].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(hareketler?.length ?? 0) > 0 && (
            <>
              <button onClick={() => handleExport('pdf')}
                className="px-2 py-1 text-[10px] font-medium text-text-muted bg-surface border border-border rounded hover:text-gold hover:border-gold/30 transition-colors">
                PDF
              </button>
              <button onClick={() => handleExport('excel')}
                className="px-2 py-1 text-[10px] font-medium text-text-muted bg-surface border border-border rounded hover:text-gold hover:border-gold/30 transition-colors">
                Excel
              </button>
            </>
          )}
          <button onClick={() => setFormAcik(!formAcik)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              formAcik ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gold border border-gold/30 hover:bg-gold-dim'
            }`}>
            {formAcik ? '✕ Formu Kapat' : '+ Hareket Ekle'}
          </button>
        </div>
      </div>

      {/* ── Hareket Tablosu ── */}
      {gosterilenler.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-3xl mb-2">🏦</div>
          <div className="text-sm font-medium">
            {filtre ? `${TIP_META[filtre].label} kaydı bulunamadı` : 'Henüz kasa hareketi yok'}
          </div>
          <div className="text-xs text-text-dim mt-1">
            {filtre ? 'Farklı bir filtre deneyin' : 'Müvekkilden avans alarak veya masraf girerek başlayın'}
          </div>
          {!formAcik && !filtre && (
            <button onClick={() => { setForm({ ...form, tip: 'alim' }); setFormAcik(true); }}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors">
              + İlk Avansı Ekle
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
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">İşlem</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Açıklama</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted">Dosya</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted text-right">Tutar</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted text-right">Bakiye</th>
                  <th className="px-2 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {gosterilenler.map((h) => {
                  const meta = TIP_META[h.tip] || TIP_META.masraf;
                  const bak = runningBalances.get(h.id) ?? 0;
                  return (
                    <tr key={h.id} className="border-b border-border/50 hover:bg-surface2 transition-colors group">
                      <td className="px-4 py-2.5 text-text-muted text-xs whitespace-nowrap">{fmtTarih(h.tarih)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${meta.renkBg}`}>
                          {meta.icon} {meta.label}
                        </span>
                        {h.kategori && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-surface2 border border-border text-text-dim">
                            {h.kategori}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text text-xs max-w-[220px] truncate">
                        {h.aciklama || '—'}
                        {h.dekontNo && <span className="text-text-dim ml-1">(#{h.dekontNo})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {h.dosyaNo ? (
                          <span className="text-gold font-medium">{h.dosyaTur} — {h.dosyaNo}</span>
                        ) : (
                          <span className="text-text-dim">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold text-xs ${h.tip === 'alim' ? 'text-green' : 'text-red'}`}>
                        {h.tip === 'alim' ? '+' : '−'}{fmt(h.tutar)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium text-xs tabular-nums ${bak < 0 ? 'text-red' : 'text-text'}`}>
                        {fmt(bak)}
                      </td>
                      <td className="px-2 py-2.5">
                        {silinecek === h.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSil(h)} className="text-[10px] text-red hover:underline">Evet</button>
                            <button onClick={() => setSilinecek(null)} className="text-[10px] text-text-dim hover:underline">Hayır</button>
                          </div>
                        ) : (
                          <button onClick={() => setSilinecek(h.id)}
                            className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs">
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface2/50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-text-muted text-right">Toplam:</td>
                  <td className="px-4 py-3 text-right text-gold font-bold text-sm">
                    {fmt(gosterilenler.reduce((s, h) => s + (h.tip === 'alim' ? h.tutar : -h.tutar), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
