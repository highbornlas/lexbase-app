'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormGroup, FormInput, FormSelect, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { fmt } from '@/lib/utils';
import { type AlacakKalemi, type FaizTuru, KALEM_TURLERI, faizTurleriGruplu, hesaplaKalemFaiz, FAIZ_ORAN_DB } from '@/lib/utils/faiz';
import { useOzelKalemTurleri, useOzelKalemTuruKaydet } from '@/lib/hooks/useOzelKalemTurleri';

const PARA_BIRIMLERI = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
];

interface AlacakKalemleriAdimProps {
  alacakDetay: AlacakKalemi[];
  onChange: (kalemler: AlacakKalemi[]) => void;
  alacakKalemleri?: Record<string, unknown>;
  onLegacyChange: (v: Record<string, unknown>) => void;
  takipTarihi: string;
}

const BOS_KALEM_FORM = {
  kalemTuru: 'asil_alacak' as AlacakKalemi['kalemTuru'],
  aciklama: '',
  asilTutar: '',
  paraBirimi: 'TRY',
  vadeTarihi: '',
  faizTuru: 'yasal' as FaizTuru,
  ozelFaizOrani: '',
  islemiFaiz: '',
};

export function AlacakKalemleriAdim({ alacakDetay, onChange, alacakKalemleri, onLegacyChange, takipTarihi }: AlacakKalemleriAdimProps) {
  const [formAcik, setFormAcik] = useState(false);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [form, setForm] = useState(BOS_KALEM_FORM);
  const [digerKalemAciklama, setDigerKalemAciklama] = useState('');
  const [kalemTuruEkleAcik, setKalemTuruEkleAcik] = useState(false);
  const [yeniKalemTuru, setYeniKalemTuru] = useState('');

  // Özel kalem türleri
  const { data: ozelKalemTurleri } = useOzelKalemTurleri();
  const ozelKalemKaydet = useOzelKalemTuruKaydet();

  const tumKalemTurleri = useMemo(() => {
    const sabitler = [...KALEM_TURLERI];
    const ozeller = (ozelKalemTurleri || []).map((t) => ({ value: t as AlacakKalemi['kalemTuru'], label: t }));
    return [...sabitler, ...ozeller];
  }, [ozelKalemTurleri]);

  async function handleYeniKalemTuruEkle() {
    if (!yeniKalemTuru.trim()) return;
    try {
      await ozelKalemKaydet.mutateAsync(yeniKalemTuru.trim());
      setForm((prev) => ({ ...prev, kalemTuru: yeniKalemTuru.trim() as AlacakKalemi['kalemTuru'], aciklama: yeniKalemTuru.trim() }));
      setYeniKalemTuru('');
      setKalemTuruEkleAcik(false);
    } catch { /* */ }
  }

  const bugun = new Date().toISOString().slice(0, 10);

  // Auto-calculate işlemiş faiz (vade → takip arası)
  // Hesaplama fonksiyonu — form state dışında, her zaman güncel değerlerle çalışır
  const hesaplaIslemiFaiz = useCallback((vade: string, tutar: string, faizTuru: string, kalemTuru: string, ozelOran: string, takip: string): string => {
    if (!vade || !tutar || !faizTuru || faizTuru === 'yok' || !takip) return '';
    if (vade >= takip) return ''; // Vade tarihi takip tarihinden sonra → işlemiş faiz yok
    const tempKalem: AlacakKalemi = {
      id: 'temp',
      kalemTuru: kalemTuru as AlacakKalemi['kalemTuru'],
      aciklama: '',
      asilTutar: Number(tutar),
      vadeTarihi: vade,
      faizTuru: faizTuru as FaizTuru,
      ozelFaizOrani: ozelOran ? Number(ozelOran) : undefined,
    };
    const faiz = hesaplaKalemFaiz(tempKalem, takip);
    return faiz > 0 ? faiz.toFixed(2) : '';
  }, []);

  // Form alanları veya takipTarihi değiştiğinde işlemiş faizi yeniden hesapla
  useEffect(() => {
    const yeni = hesaplaIslemiFaiz(form.vadeTarihi, form.asilTutar, form.faizTuru, form.kalemTuru, form.ozelFaizOrani, takipTarihi);
    setForm((prev) => {
      if (prev.islemiFaiz === yeni) return prev; // gereksiz re-render önle
      return { ...prev, islemiFaiz: yeni };
    });
  }, [form.vadeTarihi, form.faizTuru, form.asilTutar, form.ozelFaizOrani, form.kalemTuru, takipTarihi, hesaplaIslemiFaiz]);

  // Takip tarihi değiştiğinde mevcut kaydedilmiş kalemlerin işlemiş faizlerini de güncelle
  const sonTakipRef = useRef(takipTarihi);
  useEffect(() => {
    if (takipTarihi && takipTarihi !== sonTakipRef.current && alacakDetay.length > 0) {
      sonTakipRef.current = takipTarihi;
      const guncellenmis = alacakDetay.map((k) => {
        if (!k.vadeTarihi || k.vadeTarihi >= takipTarihi) {
          return { ...k, islemiFaiz: undefined };
        }
        const faiz = hesaplaKalemFaiz(k, takipTarihi);
        return { ...k, islemiFaiz: faiz > 0 ? Math.round(faiz * 100) / 100 : undefined };
      });
      onChange(guncellenmis);
    }
  }, [takipTarihi, alacakDetay, onChange]);

  // Toplam hesapları
  // İşleyen faiz: takip tarihinden bugüne kadar (takipTarihi override ile)
  const toplamAsil = alacakDetay.reduce((t, k) => t + k.asilTutar, 0);
  const toplamIslemiFaiz = alacakDetay.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
  const toplamIsleyenFaiz = alacakDetay.reduce((t, k) => t + hesaplaKalemFaiz(k, bugun, undefined, undefined, takipTarihi || undefined), 0);

  function handleKaydet() {
    if (!form.asilTutar || !form.vadeTarihi) return;

    const yeniKalem: AlacakKalemi = {
      id: duzenleId || crypto.randomUUID(),
      kalemTuru: form.kalemTuru,
      aciklama: form.aciklama || tumKalemTurleri.find((k) => k.value === form.kalemTuru)?.label || 'Alacak',
      asilTutar: Number(form.asilTutar),
      paraBirimi: form.paraBirimi || 'TRY',
      vadeTarihi: form.vadeTarihi,
      faizTuru: form.faizTuru,
      ozelFaizOrani: (form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') ? Number(form.ozelFaizOrani) || undefined : undefined,
      islemiFaiz: Number(form.islemiFaiz) || undefined,
    };

    if (duzenleId) {
      onChange(alacakDetay.map((k) => k.id === duzenleId ? yeniKalem : k));
    } else {
      onChange([...alacakDetay, yeniKalem]);
    }

    // Legacy alacakKalemleri alanını da güncelle (geriye uyumluluk)
    const tumKalemler = duzenleId
      ? alacakDetay.map((k) => k.id === duzenleId ? yeniKalem : k)
      : [...alacakDetay, yeniKalem];
    const topAsil = tumKalemler.reduce((t, k) => t + k.asilTutar, 0);
    const topIslemis = tumKalemler.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
    onLegacyChange({
      ...(alacakKalemleri || {}),
      asilAlacak: topAsil || undefined,
      islemisiFaiz: topIslemis || undefined,
    });

    setForm(BOS_KALEM_FORM);
    setFormAcik(false);
    setDuzenleId(null);
  }

  function handleDuzenle(k: AlacakKalemi) {
    setForm({
      kalemTuru: k.kalemTuru,
      aciklama: k.aciklama,
      asilTutar: k.asilTutar.toString(),
      paraBirimi: k.paraBirimi || 'TRY',
      vadeTarihi: k.vadeTarihi,
      faizTuru: k.faizTuru,
      ozelFaizOrani: k.ozelFaizOrani?.toString() || '',
      islemiFaiz: k.islemiFaiz?.toString() || '',
    });
    setDuzenleId(k.id);
    setFormAcik(true);
  }

  function handleSil(id: string) {
    const yeniListe = alacakDetay.filter((k) => k.id !== id);
    onChange(yeniListe);
    // Legacy güncelle
    const topAsil = yeniListe.reduce((t, k) => t + k.asilTutar, 0);
    const topIslemis = yeniListe.reduce((t, k) => t + (k.islemiFaiz || 0), 0);
    onLegacyChange({
      ...(alacakKalemleri || {}),
      asilAlacak: topAsil || undefined,
      islemisiFaiz: topIslemis || undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Bilgi notu */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-400/5 border border-blue-400/20 rounded-lg">
        <span className="text-sm mt-0.5">ℹ️</span>
        <div className="text-[11px] text-text-muted leading-relaxed">
          <strong className="text-text">Takip sonrası faiz yalnızca asıl alacağa işler.</strong>{' '}
          İşlemiş faize tekrar faiz işlenmez. Her kalemi ayrı faiz türüyle tanımlayabilirsiniz.
        </div>
      </div>

      {/* Başlık + Ekle butonu */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">Alacak Kalemleri ({alacakDetay.length})</h4>
        <button
          type="button"
          onClick={() => { setFormAcik(!formAcik); setDuzenleId(null); setForm(BOS_KALEM_FORM); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            formAcik ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gold border border-gold/30 hover:bg-gold-dim'
          }`}
        >
          {formAcik ? '✕ Kapat' : '+ Kalem Ekle'}
        </button>
      </div>

      {/* Ekleme / Düzenleme Formu */}
      {formAcik && (
        <div className="bg-surface2/50 border border-gold/20 rounded-lg p-4 space-y-3">
          <h5 className="text-xs font-semibold text-gold">{duzenleId ? 'Kalemi Düzenle' : 'Yeni Alacak Kalemi'}</h5>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Alacak Kalemi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Alacak Kalemi</label>
              <div className="flex gap-1">
                <FormSelect value={form.kalemTuru} onChange={(e) => {
                  const v = e.target.value as AlacakKalemi['kalemTuru'];
                  setForm({ ...form, kalemTuru: v });
                  if (v === 'diger') setDigerKalemAciklama('');
                }} className="flex-1">
                  {tumKalemTurleri.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </FormSelect>
                <button
                  type="button"
                  onClick={() => setKalemTuruEkleAcik(!kalemTuruEkleAcik)}
                  className="flex-shrink-0 w-8 h-10 flex items-center justify-center rounded-lg border border-gold/30 text-gold hover:bg-gold-dim transition-colors text-sm"
                  title="Yeni kalem türü ekle"
                >
                  +
                </button>
              </div>
              {kalemTuruEkleAcik && (
                <div className="mt-2 flex gap-2">
                  <FormInput
                    value={yeniKalemTuru}
                    onChange={(e) => setYeniKalemTuru(e.target.value)}
                    placeholder="Yeni kalem türü..."
                    className="flex-1 !h-8 !text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleYeniKalemTuruEkle(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleYeniKalemTuruEkle}
                    disabled={!yeniKalemTuru.trim() || ozelKalemKaydet.isPending}
                    className="px-3 h-8 rounded-lg text-[11px] font-semibold bg-gold text-bg disabled:opacity-50 transition-colors"
                  >
                    {ozelKalemKaydet.isPending ? '...' : 'Ekle'}
                  </button>
                </div>
              )}
              {form.kalemTuru === 'diger' && (
                <FormInput
                  value={digerKalemAciklama}
                  onChange={(e) => { setDigerKalemAciklama(e.target.value); setForm((prev) => ({ ...prev, aciklama: e.target.value })); }}
                  placeholder="Kalem açıklaması yazın..."
                  className="mt-2 !h-8 !text-xs"
                />
              )}
            </div>
            {/* Açıklama */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Açıklama</label>
              <FormInput value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="Ör: Kira - Ocak 2025" />
            </div>
            {/* Asıl Tutar + Para Birimi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Asıl Alacak Tutarı *</label>
              <div className="flex gap-1.5">
                <FormInput type="number" step="0.01" min="0" value={form.asilTutar}
                  onChange={(e) => setForm({ ...form, asilTutar: e.target.value })} className="flex-1" />
                <FormSelect value={form.paraBirimi} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value })} className="!w-20">
                  {PARA_BIRIMLERI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </FormSelect>
              </div>
            </div>
            {/* Vade / Temerrüt Tarihi */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Vade / Temerrüt Tarihi *</label>
              <FormInput type="date" value={form.vadeTarihi} onChange={(e) => setForm({ ...form, vadeTarihi: e.target.value })} />
            </div>
            {/* İşlemiş Faiz (takip öncesi) */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Takip Öncesi İşlemiş Faiz (₺)</label>
              <FormInput type="number" step="0.01" min="0" value={form.islemiFaiz}
                onChange={(e) => setForm({ ...form, islemiFaiz: e.target.value })} placeholder="0.00" />
            </div>
            {/* Takip Sonrası Faiz Türü */}
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Takip Sonrası Faiz Türü</label>
              <FormSelect value={form.faizTuru} onChange={(e) => setForm({ ...form, faizTuru: e.target.value as FaizTuru })}>
                {Object.entries(faizTurleriGruplu()).map(([kat, turler]) => (
                  <optgroup key={kat} label={kat}>
                    {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </optgroup>
                ))}
              </FormSelect>
              {/* Güncel faiz oranı göstergesi */}
              {form.faizTuru && form.faizTuru !== 'yok' && form.faizTuru !== 'sozlesmeli' && form.faizTuru !== 'diger' && (() => {
                const oranlar = FAIZ_ORAN_DB[form.faizTuru];
                if (!oranlar?.length) return null;
                const guncel = oranlar[oranlar.length - 1];
                return guncel ? (
                  <div className="text-[10px] text-gold mt-1">Guncel oran: %{guncel.o}</div>
                ) : null;
              })()}
            </div>
            {/* Özel Faiz Oranı (sözleşmeli) */}
            {(form.faizTuru === 'sozlesmeli' || form.faizTuru === 'diger') && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Yıllık Faiz Oranı (%)</label>
                <FormInput type="number" step="0.01" min="0" value={form.ozelFaizOrani}
                  onChange={(e) => setForm({ ...form, ozelFaizOrani: e.target.value })} />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <BtnGold onClick={handleKaydet} disabled={!form.asilTutar || !form.vadeTarihi}>
              {duzenleId ? 'Güncelle' : 'Ekle'}
            </BtnGold>
            <BtnOutline onClick={() => { setFormAcik(false); setDuzenleId(null); setForm(BOS_KALEM_FORM); }}>
              İptal
            </BtnOutline>
          </div>
        </div>
      )}

      {/* Kalem Listesi */}
      {alacakDetay.length === 0 ? (
        <div className="text-center py-6 bg-surface border border-border rounded-lg">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-xs text-text-muted">Henüz alacak kalemi eklenmemiş</div>
          <div className="text-[10px] text-text-dim mt-1">Her kalem için ayrı faiz türü ve işlemiş faiz tanımlayabilirsiniz</div>
          {!formAcik && (
            <button type="button" onClick={() => setFormAcik(true)}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors">
              + İlk Kalemi Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Kalem</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Vade</th>
                <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Faiz Türü</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Asıl Alacak</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşlemiş Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşleyen Faiz</th>
                <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Toplam</th>
                <th className="px-2 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {alacakDetay.map((k) => {
                const isleyenFaiz = hesaplaKalemFaiz(k, bugun, undefined, undefined, takipTarihi || undefined);
                const islemiFaiz = k.islemiFaiz || 0;
                const toplam = k.asilTutar + islemiFaiz + isleyenFaiz;
                const faizGrup = faizTurleriGruplu();
                const faizAd = Object.values(faizGrup).flat().find((f) => f.id === k.faizTuru)?.ad || k.faizTuru;
                return (
                  <tr key={k.id} className="border-b border-border/50 hover:bg-surface2 transition-colors group">
                    <td className="px-3 py-2">
                      <div className="text-text font-medium">{k.aciklama}</div>
                      <div className="text-[10px] text-text-dim">{tumKalemTurleri.find((kt) => kt.value === k.kalemTuru)?.label || k.kalemTuru}</div>
                    </td>
                    <td className="px-3 py-2 text-text-muted">{k.vadeTarihi}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 border border-border text-text-muted truncate block max-w-[120px]">
                        {faizAd}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-text">{fmt(k.asilTutar, k.paraBirimi)}</td>
                    <td className="px-3 py-2 text-right text-orange-400">{islemiFaiz > 0 ? fmt(islemiFaiz) : '—'}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{isleyenFaiz > 0 ? fmt(isleyenFaiz) : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-text">{fmt(toplam)}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => handleDuzenle(k)} className="text-[10px] text-gold hover:underline">Düzenle</button>
                        <button type="button" onClick={() => handleSil(k.id)} className="text-[10px] text-red hover:underline">Sil</button>
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
                <td className="px-3 py-2 text-right text-orange-400">{fmt(toplamIslemiFaiz)}</td>
                <td className="px-3 py-2 text-right text-orange-300">{fmt(toplamIsleyenFaiz)}</td>
                <td className="px-3 py-2 text-right text-gold text-sm">{fmt(toplamAsil + toplamIslemiFaiz + toplamIsleyenFaiz)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Ek masraflar (legacy uyumluluk) */}
      <div className="border-t border-border/50 pt-4">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Ek Masraflar</div>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Vekalet Ücreti (₺)">
            <FormInput type="number" step="0.01" value={(alacakKalemleri as Record<string, number | undefined>)?.vekaletUcreti || ''}
              onChange={(e) => onLegacyChange({ ...(alacakKalemleri || {}), vekaletUcreti: Number(e.target.value) || undefined })}
              placeholder="0" />
          </FormGroup>
          <FormGroup label="Diğer Masraflar (₺)">
            <FormInput type="number" step="0.01" value={(alacakKalemleri as Record<string, number | undefined>)?.digerMasraflar || ''}
              onChange={(e) => onLegacyChange({ ...(alacakKalemleri || {}), digerMasraflar: Number(e.target.value) || undefined })}
              placeholder="0" />
          </FormGroup>
        </div>
      </div>
    </div>
  );
}
