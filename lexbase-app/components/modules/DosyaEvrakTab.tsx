'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  useDavaBelgeler,
  useIcraBelgeler,
  useArabuluculukBelgeler,
  useIhtarnameBelgeler,
  useDanismanlikBelgeler,
  useBelgeYukle,
  useBelgeSil,
  belgeIndir,
  fmtBoyut,
  type Belge,
} from '@/lib/hooks/useBelgeler';
import {
  DAVA_EVRAK_TURLERI, ICRA_EVRAK_TURLERI,
  ARABULUCULUK_EVRAK_TURLERI, IHTARNAME_EVRAK_TURLERI, DANISMANLIK_EVRAK_TURLERI,
  DAVA_EVRAK_GRUPLARI, ICRA_EVRAK_GRUPLARI,
  ARABULUCULUK_EVRAK_GRUPLARI, IHTARNAME_EVRAK_GRUPLARI, DANISMANLIK_EVRAK_GRUPLARI,
  type EvrakGrup,
} from '@/lib/constants/uyap';
import { DosyaBelgeModal, type DosyaBelgeFormData } from './DosyaBelgeModal';
import { fmtTarih } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   DosyaEvrakTab — DMS Yeniden Tasarım
   Akordeon kategoriler, Inspector drawer, Sürükle-bırak,
   Gelişmiş filtreleme, Versiyonlama
   ══════════════════════════════════════════════════════════════ */

type DosyaTipi = 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname' | 'danismanlik';

interface Props {
  dosyaId: string;
  dosyaTipi: DosyaTipi;
  muvId?: string;
}

// ── SVG İkonlar ──────────────────────────────────────────────
const SvgFolder = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
);
const SvgFile = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
);
const SvgDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
);
const SvgTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
);
const SvgX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const SvgChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
);
const SvgUpload = ({ className }: { className?: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
);
const SvgSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
);
const SvgEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

// ── Dosya ikon rengi ──
function dosyaIkonRenk(tip: string): string {
  if (tip.includes('pdf')) return 'text-red';
  if (tip.includes('word') || tip.includes('doc')) return 'text-blue-400';
  if (tip.includes('image') || tip.includes('jpg') || tip.includes('png')) return 'text-green';
  if (isTiff(tip)) return 'text-teal-400';
  if (tip.includes('excel') || tip.includes('sheet')) return 'text-green';
  if (isUdf(tip)) return 'text-orange-400';
  return 'text-text-dim';
}

function isUdf(tip: string, dosyaAd?: string): boolean {
  if (tip.includes('udf')) return true;
  if (dosyaAd && dosyaAd.toLowerCase().endsWith('.udf')) return true;
  return false;
}

function isTiff(tip: string, dosyaAd?: string): boolean {
  if (tip.includes('tiff') || tip.includes('tif')) return true;
  if (dosyaAd) {
    const lower = dosyaAd.toLowerCase();
    if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return true;
  }
  return false;
}

function dosyaUzanti(dosyaAd: string): string {
  const parts = dosyaAd.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '—';
}

export function DosyaEvrakTab({ dosyaId, dosyaTipi, muvId }: Props) {
  // Hook'ları koşullu çağıramayız, hepsini çağırıp sonucu seçiyoruz
  const davaQ = useDavaBelgeler(dosyaTipi === 'dava' ? dosyaId : null);
  const icraQ = useIcraBelgeler(dosyaTipi === 'icra' ? dosyaId : null);
  const arbQ = useArabuluculukBelgeler(dosyaTipi === 'arabuluculuk' ? dosyaId : null);
  const ihtQ = useIhtarnameBelgeler(dosyaTipi === 'ihtarname' ? dosyaId : null);
  const danQ = useDanismanlikBelgeler(dosyaTipi === 'danismanlik' ? dosyaId : null);

  const aktifQ = dosyaTipi === 'dava' ? davaQ :
                 dosyaTipi === 'icra' ? icraQ :
                 dosyaTipi === 'arabuluculuk' ? arbQ :
                 dosyaTipi === 'ihtarname' ? ihtQ : danQ;

  const belgeler = aktifQ.data;
  const isLoading = aktifQ.isLoading;

  const yukle = useBelgeYukle();
  const sil = useBelgeSil();

  const [modalAcik, setModalAcik] = useState(false);
  const [arama, setArama] = useState('');
  const [tarihFiltre, setTarihFiltre] = useState<'hepsi' | '7' | '30' | '90'>('hepsi');
  const [silOnay, setSilOnay] = useState<string | null>(null);
  const [indiriliyor, setIndiriliyor] = useState<string | null>(null);
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const [secilenBelge, setSecilenBelge] = useState<Belge | null>(null);
  const [drawerAcik, setDrawerAcik] = useState(false);
  const [pageDragOver, setPageDragOver] = useState(false);
  const [gorunum, setGorunum] = useState<'klasor' | 'liste'>('klasor');
  const [onizlemeBelge, setOnizlemeBelge] = useState<Belge | null>(null);

  const evrakTurleri = dosyaTipi === 'dava' ? DAVA_EVRAK_TURLERI :
                       dosyaTipi === 'icra' ? ICRA_EVRAK_TURLERI :
                       dosyaTipi === 'arabuluculuk' ? ARABULUCULUK_EVRAK_TURLERI :
                       dosyaTipi === 'ihtarname' ? IHTARNAME_EVRAK_TURLERI :
                       DANISMANLIK_EVRAK_TURLERI;

  const evrakGruplari: EvrakGrup[] = dosyaTipi === 'dava' ? DAVA_EVRAK_GRUPLARI :
                                     dosyaTipi === 'icra' ? ICRA_EVRAK_GRUPLARI :
                                     dosyaTipi === 'arabuluculuk' ? ARABULUCULUK_EVRAK_GRUPLARI :
                                     dosyaTipi === 'ihtarname' ? IHTARNAME_EVRAK_GRUPLARI :
                                     DANISMANLIK_EVRAK_GRUPLARI;

  // Filtreleme
  const filtreliBelgeler = useMemo(() => {
    if (!belgeler) return [];
    let sonuc = [...belgeler];

    // Arama filtresi
    if (arama.trim()) {
      const q = arama.toLowerCase();
      sonuc = sonuc.filter(b =>
        b.ad.toLowerCase().includes(q) ||
        b.dosyaAd?.toLowerCase().includes(q) ||
        (b.etiketler || []).some(e => e.toLowerCase().includes(q))
      );
    }

    // Tarih filtresi
    if (tarihFiltre !== 'hepsi') {
      const gun = parseInt(tarihFiltre);
      const sinir = new Date();
      sinir.setDate(sinir.getDate() - gun);
      sonuc = sonuc.filter(b => new Date(b.tarih) >= sinir);
    }

    return sonuc;
  }, [belgeler, arama, tarihFiltre]);

  // Gruplara göre belgeleri ayır
  const grupluBelgeler = useMemo(() => {
    const map: Record<string, Belge[]> = {};
    evrakGruplari.forEach(g => { map[g.key] = []; });

    filtreliBelgeler.forEach(b => {
      const evrakTuru = b.evrakTuru || 'diger';
      const grup = evrakGruplari.find(g => g.turler.includes(evrakTuru));
      const grupKey = grup?.key || 'diger';
      if (!map[grupKey]) map[grupKey] = [];
      map[grupKey].push(b);
    });

    return map;
  }, [filtreliBelgeler, evrakGruplari]);

  // İlk yüklemede, evrak bulunan grupları otomatik aç
  useEffect(() => {
    if (belgeler && belgeler.length > 0 && acikGruplar.size === 0) {
      const acilacak = new Set<string>();
      evrakGruplari.forEach(g => {
        const belgeSayisi = (grupluBelgeler[g.key] || []).length;
        if (belgeSayisi > 0) acilacak.add(g.key);
      });
      if (acilacak.size > 0) setAcikGruplar(acilacak);
    }
  }, [belgeler]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGrup = useCallback((key: string) => {
    setAcikGruplar(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Evrak bilgi
  const evrakBilgi = (key: string): { key: string; label: string; icon: string } => {
    const found = evrakTurleri.find(t => t.key === key);
    if (found) return { key: found.key, label: found.label, icon: (found as { icon?: string }).icon || '📄' };
    return { key: 'diger', label: 'Diğer', icon: '📄' };
  };

  // Evrak yükleme
  const handleYukle = async (form: DosyaBelgeFormData, dosya: File) => {
    const belgeId = crypto.randomUUID();
    try {
      await yukle.mutateAsync({
        dosya,
        belge: {
          id: belgeId,
          muvId: muvId || '',
          ad: form.ad,
          tur: 'diger',
          tarih: form.tarih,
          etiketler: form.etiketler,
          ...(dosyaTipi === 'dava' ? { davaId: dosyaId } :
              dosyaTipi === 'icra' ? { icraId: dosyaId } :
              dosyaTipi === 'arabuluculuk' ? { arabuluculukId: dosyaId } :
              dosyaTipi === 'ihtarname' ? { ihtarnameId: dosyaId } :
              { danismanlikId: dosyaId }),
          evrakTuru: form.evrakTuru,
          aciklama: form.aciklama,
        },
      });
      setModalAcik(false);
    } catch (err) {
      alert((err as Error).message || 'Yükleme başarısız');
    }
  };

  // İndir
  const handleIndir = async (belge: Belge) => {
    try {
      setIndiriliyor(belge.id);
      const url = await belgeIndir(belge.storagePath);
      window.open(url, '_blank');
    } catch {
      alert('İndirme başarısız');
    } finally {
      setIndiriliyor(null);
    }
  };

  // Sil
  const handleSil = async (belge: Belge) => {
    try {
      await sil.mutateAsync({ id: belge.id, storagePath: belge.storagePath });
      setSilOnay(null);
      if (secilenBelge?.id === belge.id) {
        setSecilenBelge(null);
        setDrawerAcik(false);
      }
    } catch {
      alert('Silme başarısız');
    }
  };

  // Drawer aç
  const handleBelgeSec = (belge: Belge) => {
    setSecilenBelge(belge);
    setDrawerAcik(true);
  };

  // Sayfa üzerine sürükle-bırak
  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPageDragOver(true);
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setPageDragOver(false);
    }
  }, []);

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setModalAcik(true);
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        const event = new CustomEvent('dosya-evrak-drop', { detail: file });
        window.dispatchEvent(event);
      }, 100);
    }
  }, []);

  // Versiyonlama: aynı adlı evrakları grupla
  const versiyonMap = useMemo(() => {
    if (!belgeler) return new Map<string, Belge[]>();
    const map = new Map<string, Belge[]>();
    belgeler.forEach(b => {
      // Normalize: dosya adından uzantıyı çıkar, küçük harfe çevir
      const normalized = b.ad.toLowerCase().replace(/\s*(v\d+|versiyon\s*\d+)\s*$/i, '').trim();
      if (!map.has(normalized)) map.set(normalized, []);
      map.get(normalized)!.push(b);
    });
    return map;
  }, [belgeler]);

  const getVersiyon = (belge: Belge): number | null => {
    const normalized = belge.ad.toLowerCase().replace(/\s*(v\d+|versiyon\s*\d+)\s*$/i, '').trim();
    const versiyonlar = versiyonMap.get(normalized);
    if (!versiyonlar || versiyonlar.length <= 1) return null;
    // Tarihe göre sırala, en eski = v1
    const sirali = [...versiyonlar].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
    return sirali.findIndex(v => v.id === belge.id) + 1;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Evraklar yükleniyor...</span>
        </div>
      </div>
    );
  }

  const toplamEvrak = (belgeler || []).length;

  return (
    <div
      className="relative"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Sayfa üzeri sürükle-bırak overlay */}
      {pageDragOver && (
        <div className="absolute inset-0 z-30 bg-gold/5 border-2 border-dashed border-gold rounded-xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <SvgUpload className="text-gold mx-auto mb-2" />
            <div className="text-sm font-semibold text-gold">Evrakı buraya bırakın</div>
            <div className="text-[10px] text-text-muted mt-1">.pdf .doc .docx .jpg .png .xls .xlsx .tiff .bmp .udf</div>
          </div>
        </div>
      )}

      {/* ── ÜST BAR ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium">{toplamEvrak} evrak</span>

          {/* Arama */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"><SvgSearch /></span>
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Evrak ara..."
              className="pl-7 pr-3 py-1.5 text-[11px] bg-surface2/50 border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold w-44 transition-colors"
            />
          </div>

          {/* Tarih Chips */}
          <div className="flex items-center gap-1">
            {([
              { key: 'hepsi' as const, label: 'Tümü' },
              { key: '7' as const, label: '7 gün' },
              { key: '30' as const, label: '30 gün' },
              { key: '90' as const, label: '90 gün' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setTarihFiltre(f.key)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  tarihFiltre === f.key
                    ? 'bg-gold/15 text-gold border-gold/30 font-bold'
                    : 'bg-surface2/50 text-text-dim border-border/50 hover:border-gold/20 hover:text-text-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Görünüm Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button type="button" onClick={() => setGorunum('klasor')}
              className={`px-2.5 py-1.5 text-xs transition-colors ${gorunum === 'klasor' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'}`}
              title="Klasör Görünümü">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l2-2h3l1 1h5a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></svg>
            </button>
            <button type="button" onClick={() => setGorunum('liste')}
              className={`px-2.5 py-1.5 text-xs transition-colors ${gorunum === 'liste' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'}`}
              title="Liste Görünümü">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h10M3 8h10M3 12h10"/></svg>
            </button>
          </div>

          <button
            onClick={() => setModalAcik(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-bg font-semibold text-xs hover:bg-gold-light transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Evrak Yükle
          </button>
        </div>
      </div>

      {/* ── ANA İÇERİK ── */}
      <div className={`flex gap-0 transition-all ${drawerAcik ? '' : ''}`}>
        {/* Sol: Akordeon listesi */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${drawerAcik ? 'pr-4' : ''}`}>
          {toplamEvrak === 0 ? (
            /* Boş durum */
            <div className="border-2 border-dashed border-border rounded-xl py-16 px-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <SvgUpload className="text-gold" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-text mb-1.5">
                {{ dava: 'Dava evrakları', icra: 'İcra evrakları', arabuluculuk: 'Arabuluculuk evrakları', ihtarname: 'İhtarname evrakları', danismanlik: 'Danışmanlık evrakları' }[dosyaTipi]} burada görünecek
              </h3>
              <p className="text-xs text-text-muted mb-5 max-w-sm mx-auto">
                Dilekçeleri, zabıtları, bilirkişi raporlarını ve diğer tüm evrakları buraya yükleyerek dosya gömleği gibi düzenleyin.
              </p>
              <button
                onClick={() => setModalAcik(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-bg font-semibold text-xs rounded-lg hover:bg-gold-light transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
                İlk Evrakı Yükle
              </button>
              <div className="mt-4 text-[10px] text-text-dim">
                veya dosyayı sürükleyip bırakın
              </div>
            </div>
          ) : filtreliBelgeler.length === 0 ? (
            /* Filtre sonucu boş */
            <div className="text-center py-12">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto mb-3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <div className="text-xs text-text-muted">Arama kriterlerine uygun evrak bulunamadı</div>
              <button onClick={() => { setArama(''); setTarihFiltre('hepsi'); }} className="text-[10px] text-gold hover:underline mt-2">
                Filtreleri temizle
              </button>
            </div>
          ) : gorunum === 'liste' ? (
            /* Liste Görünümü */
            <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/50">
              {/* Tablo Başlık */}
              <div className="flex items-center gap-3 px-4 py-2 bg-surface2/30 border-b border-border/40 text-[10px] font-bold text-text-dim uppercase tracking-wider">
                <div className="w-8" />
                <div className="flex-1">Evrak Adı</div>
                <div className="w-28 text-center hidden sm:block">Tür</div>
                <div className="w-20 text-center hidden md:block">Tarih</div>
                <div className="w-16 text-right hidden md:block">Boyut</div>
                <div className="w-16" />
              </div>
              {filtreliBelgeler.map((belge, i) => {
                const tur = evrakBilgi(belge.evrakTuru || 'diger');
                const versiyon = getVersiyon(belge);
                const isSelected = secilenBelge?.id === belge.id;
                return (
                  <div
                    key={belge.id}
                    onClick={() => handleBelgeSec(belge)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                      i < filtreliBelgeler.length - 1 ? 'border-b border-border/20' : ''
                    } ${isSelected ? 'bg-gold/5 border-l-2 border-l-gold' : 'hover:bg-surface2/40 border-l-2 border-l-transparent'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-surface2/80 flex items-center justify-center flex-shrink-0 ${dosyaIkonRenk(belge.tip || '')}`}>
                      <SvgFile className="text-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text truncate">{belge.ad}</span>
                        {versiyon && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 flex-shrink-0">
                            v{versiyon}
                          </span>
                        )}
                      </div>
                      {belge.dosyaAd && (
                        <div className="text-[10px] text-text-dim font-mono truncate mt-0.5">
                          {belge.dosyaAd}
                        </div>
                      )}
                    </div>
                    <div className="w-28 text-center hidden sm:block">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2/60 text-text-dim">
                        {tur.label}
                      </span>
                    </div>
                    <div className="w-20 text-center hidden md:block text-[10px] text-text-dim">
                      {belge.tarih ? fmtTarih(belge.tarih) : '—'}
                    </div>
                    <div className="w-16 text-right hidden md:block text-[10px] text-text-dim">
                      {belge.boyut > 0 ? fmtBoyut(belge.boyut) : '—'}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleIndir(belge); }}
                        disabled={indiriliyor === belge.id}
                        className="p-1.5 rounded hover:bg-surface2 text-text-dim hover:text-gold transition-colors"
                        title="İndir"
                      >
                        {indiriliyor === belge.id ? (
                          <div className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                        ) : <SvgDownload />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Akordeon Gruplar */
            <div className="space-y-2">
              {evrakGruplari.map(grup => {
                const belgeSayisi = (grupluBelgeler[grup.key] || []).length;
                if (belgeSayisi === 0) return null;
                const acik = acikGruplar.has(grup.key);
                const grupBelgeleri = grupluBelgeler[grup.key] || [];

                return (
                  <div key={grup.key} className="border border-border/60 rounded-xl overflow-hidden bg-surface/50 transition-all">
                    {/* Grup Başlığı */}
                    <button
                      onClick={() => toggleGrup(grup.key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface2/30 transition-colors"
                    >
                      <SvgChevron open={acik} />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${grup.renk}`}>
                        <SvgFolder className="text-current" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs font-semibold text-text">{grup.label}</div>
                        <div className="text-[10px] text-text-dim">{grup.aciklama}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface2 text-text-muted border border-border/50">
                        {belgeSayisi}
                      </span>
                    </button>

                    {/* Grup İçeriği — Akordeon */}
                    {acik && (
                      <div className="border-t border-border/40 bg-bg/30">
                        {grupBelgeleri.map((belge, i) => {
                          const tur = evrakBilgi(belge.evrakTuru || 'diger');
                          const versiyon = getVersiyon(belge);
                          const isSelected = secilenBelge?.id === belge.id;

                          return (
                            <div
                              key={belge.id}
                              onClick={() => handleBelgeSec(belge)}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                                i < grupBelgeleri.length - 1 ? 'border-b border-border/20' : ''
                              } ${isSelected ? 'bg-gold/5 border-l-2 border-l-gold' : 'hover:bg-surface2/40 border-l-2 border-l-transparent'}`}
                            >
                              {/* Dosya türü ikonu */}
                              <div className={`w-8 h-8 rounded-lg bg-surface2/80 flex items-center justify-center flex-shrink-0 ${dosyaIkonRenk(belge.tip || '')}`}>
                                <SvgFile className="text-current" />
                              </div>

                              {/* Bilgiler */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-text truncate">{belge.ad}</span>
                                  {versiyon && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 flex-shrink-0">
                                      v{versiyon}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-text-dim mt-0.5">
                                  <span className="px-1.5 py-0.5 rounded bg-surface2/60 text-text-dim">{tur.label}</span>
                                  {belge.tarih && <span>{fmtTarih(belge.tarih)}</span>}
                                  {belge.boyut > 0 && <span>{fmtBoyut(belge.boyut)}</span>}
                                  {belge.dosyaAd && (
                                    <span className="font-mono text-[9px] uppercase text-text-dim/60">
                                      {dosyaUzanti(belge.dosyaAd)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Etiketler */}
                              {belge.etiketler && belge.etiketler.length > 0 && (
                                <div className="hidden lg:flex gap-1 flex-shrink-0">
                                  {belge.etiketler.slice(0, 2).map(e => (
                                    <span key={e} className="text-[9px] px-1.5 py-0.5 bg-gold/10 text-gold rounded-full">{e}</span>
                                  ))}
                                  {belge.etiketler.length > 2 && (
                                    <span className="text-[9px] text-text-dim">+{belge.etiketler.length - 2}</span>
                                  )}
                                </div>
                              )}

                              {/* Hızlı aksiyonlar */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleIndir(belge); }}
                                  disabled={indiriliyor === belge.id}
                                  className="p-1.5 rounded hover:bg-surface2 text-text-dim hover:text-gold transition-colors"
                                  title="İndir"
                                >
                                  {indiriliyor === belge.id ? (
                                    <div className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                                  ) : <SvgDownload />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleBelgeSec(belge); }}
                                  className="p-1.5 rounded hover:bg-surface2 text-text-dim hover:text-blue-400 transition-colors"
                                  title="Detay"
                                >
                                  <SvgEye />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ: Inspector Drawer */}
        {drawerAcik && secilenBelge && (
          <div className="w-80 flex-shrink-0 border-l border-border bg-surface/50 rounded-r-xl overflow-hidden animate-in slide-in-from-right-2 duration-200">
            <InspectorDrawer
              belge={secilenBelge}
              evrakBilgi={evrakBilgi}
              versiyon={getVersiyon(secilenBelge)}
              onKapat={() => { setDrawerAcik(false); setSecilenBelge(null); }}
              onIndir={() => handleIndir(secilenBelge)}
              onSil={() => setSilOnay(secilenBelge.id)}
              onOnizleme={() => setOnizlemeBelge(secilenBelge)}
              indiriliyor={indiriliyor === secilenBelge.id}
            />
          </div>
        )}
      </div>

      {/* Silme onay dialog */}
      {silOnay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl w-80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                <SvgTrash />
              </div>
              <div>
                <div className="text-sm font-semibold text-text">Evrakı Sil</div>
                <div className="text-[11px] text-text-muted">Bu işlem geri alınamaz.</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSilOnay(null)} className="px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors">
                İptal
              </button>
              <button
                onClick={() => {
                  const belge = (belgeler || []).find(b => b.id === silOnay);
                  if (belge) handleSil(belge);
                }}
                className="px-4 py-1.5 bg-red text-white text-xs font-semibold rounded-lg hover:bg-red/90 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Önizleme Modal */}
      {onizlemeBelge && (
        <OnizlemeModal
          belge={onizlemeBelge}
          onKapat={() => setOnizlemeBelge(null)}
        />
      )}

      {/* Yükleme Modal */}
      <DosyaBelgeModal
        open={modalAcik}
        onClose={() => setModalAcik(false)}
        onKaydet={handleYukle}
        dosyaTipi={dosyaTipi}
        yukleniyor={yukle.isPending}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Inspector Drawer — Sağ detay paneli
// ══════════════════════════════════════════════════════════════

function InspectorDrawer({
  belge, evrakBilgi, versiyon, onKapat, onIndir, onSil, onOnizleme, indiriliyor,
}: {
  belge: Belge;
  evrakBilgi: (key: string) => { key: string; label: string; icon: string };
  versiyon: number | null;
  onKapat: () => void;
  onIndir: () => void;
  onSil: () => void;
  onOnizleme: () => void;
  indiriliyor: boolean;
}) {
  const tur = evrakBilgi(belge.evrakTuru || 'diger');
  const isPdf = belge.tip?.includes('pdf');
  const isImage = belge.tip?.includes('image');
  const isUdfFile = isUdf(belge.tip || '', belge.dosyaAd);
  const isTiffFile = isTiff(belge.tip || '', belge.dosyaAd);
  const canPreview = isPdf || isImage || isUdfFile || isTiffFile;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Önizleme URL'si oluştur (PDF, resim, UDF ve TIFF için)
  useEffect(() => {
    if (canPreview) {
      setPreviewLoading(true);
      belgeIndir(belge.storagePath)
        .then(url => setPreviewUrl(url))
        .catch(() => setPreviewUrl(null))
        .finally(() => setPreviewLoading(false));
    } else {
      setPreviewUrl(null);
    }
  }, [belge.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Evrak Detayı</div>
        <button onClick={onKapat} className="p-1 rounded hover:bg-surface2 text-text-dim hover:text-text transition-colors">
          <SvgX />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Önizleme */}
        <div className="rounded-lg border border-border overflow-hidden bg-surface2/30">
          {previewLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : previewUrl && isImage ? (
            <button type="button" onClick={onOnizleme} className="w-full cursor-pointer hover:opacity-80 transition-opacity">
              <img src={previewUrl} alt={belge.ad} className="w-full h-40 object-contain bg-bg" />
            </button>
          ) : previewUrl && isPdf ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <span className="text-red font-bold text-xs">PDF</span>
              </div>
              <button type="button" onClick={onOnizleme} className="text-[10px] text-gold hover:underline">
                Önizleme aç →
              </button>
            </div>
          ) : previewUrl && isUdfFile ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-orange-400/10 flex items-center justify-center">
                <span className="text-orange-400 font-bold text-xs">UDF</span>
              </div>
              <button type="button" onClick={onOnizleme} className="text-[10px] text-gold hover:underline">
                Önizleme aç →
              </button>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center gap-2">
              <div className={`w-12 h-12 rounded-lg bg-surface2 flex items-center justify-center ${dosyaIkonRenk(belge.tip || '')}`}>
                <SvgFile className="text-current w-6 h-6" />
              </div>
              <span className="text-[10px] text-text-dim font-mono uppercase">
                {dosyaUzanti(belge.dosyaAd || '')}
              </span>
            </div>
          )}
        </div>

        {/* Dosya adı + versiyon */}
        <div>
          <div className="text-sm font-semibold text-text mb-1">{belge.ad}</div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              belge.evrakTuru === 'karar' ? 'bg-purple-400/10 text-purple-400 border-purple-400/20' :
              belge.evrakTuru?.includes('dilekce') ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
              'bg-surface2 text-text-muted border-border'
            }`}>
              {tur.label}
            </span>
            {versiyon && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">
                Versiyon {versiyon}
              </span>
            )}
          </div>
        </div>

        {/* Meta veriler */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[11px]">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Meta Bilgiler</h4>
            <div className="flex-1 h-px bg-border/30" />
          </div>
          <MetaRow label="Dosya Adı" value={belge.dosyaAd || '—'} mono />
          <MetaRow label="Tarih" value={fmtTarih(belge.tarih) || '—'} />
          <MetaRow label="Boyut" value={belge.boyut > 0 ? fmtBoyut(belge.boyut) : '—'} />
          <MetaRow label="Format" value={belge.tip || '—'} />
        </div>

        {/* Açıklama */}
        {(() => {
          const aciklama = (belge as Record<string, unknown>).aciklama;
          if (typeof aciklama === 'string' && aciklama) {
            return (
              <div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Açıklama</div>
                <div className="text-xs text-text-muted bg-surface2/30 rounded-lg p-2.5 border border-border/30">
                  {aciklama}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Etiketler */}
        {belge.etiketler && belge.etiketler.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Etiketler</div>
            <div className="flex flex-wrap gap-1">
              {belge.etiketler.map(e => (
                <span key={e} className="text-[10px] px-2 py-0.5 bg-gold/10 text-gold rounded-full border border-gold/20">{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer aksiyonlar */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={onIndir}
          disabled={indiriliyor}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
        >
          {indiriliyor ? (
            <div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin" />
          ) : <SvgDownload />}
          {indiriliyor ? 'İndiriliyor...' : 'İndir'}
        </button>
        <button
          onClick={onSil}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-red hover:bg-red/5 rounded-lg transition-colors border border-transparent hover:border-red/20"
        >
          <SvgTrash /> Evrakı Sil
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-text-dim">{label}</span>
      <span className={`text-text font-medium text-right max-w-[60%] truncate ${mono ? 'font-mono text-[10px]' : ''}`} title={value}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Önizleme Modal — PDF, Resim ve UDF görüntüleyici
// ══════════════════════════════════════════════════════════════

const SvgMaximize = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
);
const SvgMinimize = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6m10-10h-6V4m0 6l7-7M3 21l7-7"/></svg>
);

// ── UDF (UYAP) Parser v6 — Character-based range formatting ────
// UYAP UDF yapısı:
//   ZIP → content.xml + sign.sgn
//   <template>
//     <content>  → CDATA düz metin (tüm belge)
//     <elements> → <paragraph>, <header>, <footer>
//       <paragraph Alignment="1" size="12" startOffset="X" length="Y">
//         <content startOffset="A" length="B" bold="true" .../>  ← inline run (karakter bazlı)
//       </paragraph>
//     <styles>   → <style> tanımları
//   startOffset/length = KARAKTER POZİSYONU (CDATA text üzerinde)
//   </template>

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ln(el: Element): string {
  return el.localName || el.nodeName.split(':').pop() || '';
}

function attr(el: Element, name: string): string | null {
  const direct = el.getAttribute(name);
  if (direct !== null) return direct;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const aLocal = a.localName || a.name.split(':').pop() || '';
    if (aLocal === name) return a.value;
  }
  return null;
}

// ── UYAP Character-Based Parser v7 ──

interface UyapRun {
  charOffset: number;
  charLength: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  superscript?: boolean;
  subscript?: boolean;
}

interface UyapParagraph {
  startChar: number;
  endChar: number;
  runs: UyapRun[];
  alignment?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: string;
  fontFamily?: string;
  firstLineIndent?: string;
  leftIndent?: string;
  lineSpacing?: string;
  isHeader?: boolean;
  isFooter?: boolean;
  // Numbering
  bulleted?: boolean;
  listLevel?: number;
  listId?: string;
  bulletType?: string;
  numberType?: string;
  // Table
  inTable?: boolean;
  tableBorder?: string;
}

function parseBool(val: string | null): boolean {
  return val === 'true' || val === 'True' || val === '1';
}

function getAllAttrs(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const key = a.localName || a.name.split(':').pop() || a.name;
    attrs[key] = a.value;
  }
  return attrs;
}

function parseRunsFromElement(el: Element, para: UyapParagraph) {
  // Çocuk <content> ve <tab> elementleri → inline run'lar
  for (let c = 0; c < el.children.length; c++) {
    const child = el.children[c];
    const childName = ln(child);
    if (childName === 'content' || childName === 'tab') {
      const cAttrs = getAllAttrs(child);
      const cOffset = cAttrs['startOffset'];
      const cLength = cAttrs['length'];
      if (cOffset !== undefined && cLength !== undefined) {
        const off = parseInt(cOffset, 10);
        const len = parseInt(cLength, 10);
        para.runs.push({
          charOffset: off,
          charLength: len,
          bold: parseBool(cAttrs['bold'] || null),
          italic: parseBool(cAttrs['italic'] || null),
          underline: parseBool(cAttrs['underline'] || null),
          strikethrough: parseBool(cAttrs['strikethrough'] || null),
          fontSize: cAttrs['size'] || cAttrs['fontSize'] || para.fontSize,
          fontFamily: cAttrs['family'] || cAttrs['fontFamily'] || para.fontFamily,
          color: cAttrs['color'] || undefined,
          superscript: parseBool(cAttrs['superscript'] || null),
          subscript: parseBool(cAttrs['subscript'] || null),
        });
        para.startChar = Math.min(para.startChar, off);
        para.endChar = Math.max(para.endChar, off + len);
      }
    }
  }
}

function parseParagraphAttrs(el: Element, parentName: string, tableBorder?: string): UyapParagraph {
  const attrs = getAllAttrs(el);
  const isHeader = parentName === 'header';
  const isFooter = parentName === 'footer';

  const para: UyapParagraph = {
    startChar: Infinity,
    endChar: 0,
    runs: [],
    alignment: attrs['Alignment'] || attrs['alignment'] || undefined,
    bold: parseBool(attrs['bold'] || null),
    italic: parseBool(attrs['italic'] || null),
    underline: parseBool(attrs['underline'] || null),
    fontSize: attrs['size'] || attrs['fontSize'] || undefined,
    fontFamily: attrs['family'] || attrs['fontFamily'] || attrs['font'] || undefined,
    firstLineIndent: attrs['FirstLineIndent'] || attrs['firstLineIndent'] || undefined,
    leftIndent: attrs['LeftIndent'] || attrs['leftIndent'] || undefined,
    lineSpacing: attrs['LineSpacing'] || attrs['lineSpacing'] || undefined,
    isHeader,
    isFooter,
    bulleted: parseBool(attrs['Bulleted'] || null),
    listLevel: attrs['ListLevel'] ? parseInt(attrs['ListLevel'], 10) : undefined,
    listId: attrs['ListId'] || undefined,
    bulletType: attrs['BulletType'] || undefined,
    numberType: attrs['SecListTypeLevel1'] || undefined,
    inTable: !!tableBorder,
    tableBorder: tableBorder,
  };

  // Paragraf kendisi startOffset/length taşıyorsa → tek run
  const pOffset = attrs['startOffset'];
  const pLength = attrs['length'];
  if (pOffset !== undefined && pLength !== undefined) {
    const off = parseInt(pOffset, 10);
    const len = parseInt(pLength, 10);
    para.runs.push({
      charOffset: off, charLength: len,
      bold: para.bold, italic: para.italic, underline: para.underline,
      fontSize: para.fontSize, fontFamily: para.fontFamily,
    });
    para.startChar = Math.min(para.startChar, off);
    para.endChar = Math.max(para.endChar, off + len);
  }

  // Çocuk content/tab elementleri
  parseRunsFromElement(el, para);

  return para;
}

function parseUyapParagraphs(doc: Document): UyapParagraph[] {
  const paragraphs: UyapParagraph[] = [];

  // <elements> altındaki tüm elementleri recursive olarak dolaş
  const elementsEl = Array.from(doc.getElementsByTagName('*')).find(e => ln(e) === 'elements');
  if (!elementsEl) return paragraphs;

  function walkElements(parent: Element, context: string, tableBorder?: string) {
    for (let i = 0; i < parent.children.length; i++) {
      const el = parent.children[i];
      const name = ln(el);

      if (name === 'paragraph') {
        const parentName = el.parentElement ? ln(el.parentElement) : context;
        const para = parseParagraphAttrs(el, parentName, tableBorder);
        para.runs.sort((a, b) => a.charOffset - b.charOffset);
        if (para.runs.length > 0) paragraphs.push(para);
      } else if (name === 'table') {
        const tAttrs = getAllAttrs(el);
        const tBorder = tAttrs['border'] || undefined;
        walkElements(el, 'table', tBorder);
      } else if (name === 'header' || name === 'footer' || name === 'row' || name === 'cell') {
        walkElements(el, name, tableBorder);
      }
    }
  }

  // Header/footer da <elements> dışında olabilir, elements içinde de
  walkElements(elementsEl, 'elements');

  // Ayrıca elements dışındaki header/footer'ı da kontrol et
  const allEls = doc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    if (ln(el) === 'header' || ln(el) === 'footer') {
      // elements içindeyse zaten işlendi
      if (elementsEl.contains(el)) continue;
      for (let c = 0; c < el.children.length; c++) {
        if (ln(el.children[c]) === 'paragraph') {
          const para = parseParagraphAttrs(el.children[c], ln(el));
          para.runs.sort((a, b) => a.charOffset - b.charOffset);
          if (para.runs.length > 0) paragraphs.push(para);
        }
      }
    }
  }

  paragraphs.sort((a, b) => a.startChar - b.startChar);
  return paragraphs;
}

function extractCdataText(doc: Document): string {
  const allEls = doc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    if (ln(el) === 'content' && el.parentElement && ln(el.parentElement) === 'template') {
      return el.textContent || '';
    }
  }
  return '';
}

function buildUyapHtml(text: string, paragraphs: UyapParagraph[]): string {
  let html = '';
  const coveredChars = new Set<number>();

  const headerParas = paragraphs.filter(p => p.isHeader);
  const footerParas = paragraphs.filter(p => p.isFooter);
  const bodyParas = paragraphs.filter(p => !p.isHeader && !p.isFooter);

  // Paragrafları grupla: table (border), numbered list, normal
  interface ParaGroup { paras: UyapParagraph[]; type: 'table' | 'list' | 'normal'; tableBorder?: string; }
  const groups: ParaGroup[] = [];

  for (const para of bodyParas) {
    const lastGroup = groups[groups.length - 1];

    if (para.inTable && para.tableBorder) {
      // Table paragrafı — aynı table grubuyla birleştir
      if (lastGroup && lastGroup.type === 'table') {
        lastGroup.paras.push(para);
      } else {
        groups.push({ paras: [para], type: 'table', tableBorder: para.tableBorder });
      }
    } else if (para.bulleted) {
      // Numaralı/madde işaretli paragraf
      if (lastGroup && lastGroup.type === 'list') {
        lastGroup.paras.push(para);
      } else {
        groups.push({ paras: [para], type: 'list' });
      }
    } else {
      // Normal paragraf — ancak list içindeki boş satırları list'e dahil et
      if (lastGroup && lastGroup.type === 'list' && para.leftIndent) {
        lastGroup.paras.push(para); // list devam paragrafı
      } else {
        groups.push({ paras: [para], type: 'normal' });
      }
    }
  }

  // Header render
  if (headerParas.length > 0) {
    for (const para of headerParas) {
      html += renderParagraph(para, text, coveredChars);
    }
  }

  // Numaralı liste counter'ı
  const listCounters: Record<string, number> = {};

  // Body render (gruplar halinde)
  for (const group of groups) {
    if (group.type === 'table') {
      // Çerçeveli kutu (Yargıtay kararları vb.)
      html += '<div style="border:1px solid #5a5850;padding:0.8em 1em;margin:1em 0;background:rgba(255,255,255,0.02)">';
      for (const para of group.paras) {
        html += renderParagraph(para, text, coveredChars);
      }
      html += '</div>';
    } else if (group.type === 'list') {
      for (const para of group.paras) {
        if (para.bulleted && para.numberType?.includes('NUMBER')) {
          // Numaralı paragraf
          const listId = para.listId || '0';
          if (!listCounters[listId]) listCounters[listId] = 0;
          listCounters[listId]++;
          html += renderParagraph(para, text, coveredChars, `${listCounters[listId]})`);
        } else {
          html += renderParagraph(para, text, coveredChars);
        }
      }
    } else {
      for (const para of group.paras) {
        html += renderParagraph(para, text, coveredChars);
      }
    }
  }

  // Footer render
  if (footerParas.length > 0) {
    html += '<div style="border-top:1px solid #4a4840;padding-top:0.8em;margin-top:2em">';
    for (const para of footerParas) {
      html += renderParagraph(para, text, coveredChars);
    }
    html += '</div>';
  }

  // Kaplanmamış karakter aralıkları
  let uncoveredStart = -1;
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && !coveredChars.has(i)) {
      if (uncoveredStart === -1) uncoveredStart = i;
    } else {
      if (uncoveredStart !== -1) {
        const chunk = text.substring(uncoveredStart, i).trim();
        if (chunk) {
          for (const line of chunk.split('\n')) {
            if (line.trim()) html += `<p style="margin:0.3em 0">${escHtml(line)}</p>`;
          }
        }
        uncoveredStart = -1;
      }
    }
  }

  return html;
}

function renderParagraph(para: UyapParagraph, text: string, coveredChars: Set<number>, numberPrefix?: string): string {
  // Paragraf CSS
  const paraCss: string[] = ['margin:0.4em 0'];
  if (para.alignment) {
    const alignMap: Record<string, string> = { '0': 'left', '1': 'center', '2': 'right', '3': 'justify' };
    paraCss.push(`text-align:${alignMap[para.alignment] || para.alignment}`);
  }
  if (para.fontSize) {
    const pt = parseInt(para.fontSize, 10);
    if (!isNaN(pt) && pt > 0) paraCss.push(`font-size:${pt}pt`);
  }
  if (para.fontFamily) paraCss.push(`font-family:'${para.fontFamily}',serif`);
  if (para.firstLineIndent) {
    const fi = parseFloat(para.firstLineIndent);
    if (!isNaN(fi) && fi > 0) paraCss.push(`text-indent:${fi}cm`);
  }
  if (para.leftIndent) {
    const li = parseFloat(para.leftIndent);
    // LeftIndent=25.0 gibi büyük değerler mm cinsinden olabilir, px'e çevir
    if (!isNaN(li) && li > 0) {
      const px = li > 20 ? li * 0.8 : li * 10; // 25 → 20px, 3 → 30px
      paraCss.push(`padding-left:${px}px`);
    }
  }
  if (para.lineSpacing) {
    const ls = parseFloat(para.lineSpacing);
    if (!isNaN(ls) && ls > 0) paraCss.push(`line-height:${ls}`);
  }
  if (para.bold && para.runs.length <= 1) paraCss.push('font-weight:bold');
  if (para.italic && para.runs.length <= 1) paraCss.push('font-style:italic');
  if (para.underline && para.runs.length <= 1) paraCss.push('text-decoration:underline');

  // Run'ları render et
  let paraContent = '';
  let prevEnd = para.startChar;

  for (const run of para.runs) {
    // Run'lar arası boşluk
    if (run.charOffset > prevEnd) {
      const gapText = text.substring(prevEnd, run.charOffset);
      if (gapText) paraContent += formatText(gapText);
    }

    const runText = text.substring(run.charOffset, run.charOffset + run.charLength);
    if (!runText) { prevEnd = run.charOffset + run.charLength; continue; }

    for (let ci = run.charOffset; ci < run.charOffset + run.charLength; ci++) coveredChars.add(ci);

    const htmlText = formatText(runText);

    // Run CSS
    const css: string[] = [];
    if (run.bold) css.push('font-weight:bold');
    if (run.italic) css.push('font-style:italic');
    if (run.underline) css.push('text-decoration:underline');
    if (run.strikethrough) css.push('text-decoration:line-through');
    if (run.superscript) css.push('vertical-align:super;font-size:0.8em');
    if (run.subscript) css.push('vertical-align:sub;font-size:0.8em');
    if (run.fontSize) {
      const pt = parseInt(run.fontSize, 10);
      if (!isNaN(pt) && pt > 0 && run.fontSize !== para.fontSize) css.push(`font-size:${pt}pt`);
    }
    if (run.fontFamily && run.fontFamily !== para.fontFamily) css.push(`font-family:'${run.fontFamily}',serif`);
    if (run.color && run.color !== '0') {
      if (run.color.startsWith('#')) css.push(`color:${run.color}`);
      else { const n = parseInt(run.color, 10); if (n > 0) css.push(`color:#${n.toString(16).padStart(6, '0')}`); }
    }

    paraContent += css.length > 0 ? `<span style="${css.join(';')}">${htmlText}</span>` : htmlText;
    prevEnd = run.charOffset + run.charLength;
  }

  // Paragraf sonundaki kaplanmamış metin
  if (prevEnd < para.endChar) {
    const tailText = text.substring(prevEnd, para.endChar);
    if (tailText) paraContent += formatText(tailText);
  }

  const cleanContent = paraContent.replace(/<br\/?>/g, '').replace(/&nbsp;/g, '').replace(/&emsp;/g, '').replace(/<[^>]*>/g, '').trim();

  // Numara prefix (1), 2), 3) vb.)
  const prefix = numberPrefix ? `<span style="display:inline-block;min-width:2em;font-weight:bold">${numberPrefix}</span>` : '';

  return `<p style="${paraCss.join(';')}">${prefix}${cleanContent ? paraContent : '&nbsp;'}</p>`;
}

function formatText(s: string): string {
  return escHtml(s)
    .replace(/\t/g, '&emsp;&emsp;&emsp;')
    .replace(/\n/g, '<br/>');
}

// ── ODF Fallback (standart ODF dosyaları için) ──

interface OdfStyle { textCss: string; paraCss: string; parent?: string; }

function odfExtractStyles(doc: Document): Map<string, OdfStyle> {
  const map = new Map<string, OdfStyle>();
  const allEls = doc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    if (ln(el) !== 'style') continue;
    const name = attr(el, 'name');
    if (!name) continue;
    let textCss = '', paraCss = '';
    for (let c = 0; c < el.children.length; c++) {
      const child = el.children[c];
      const cn = ln(child);
      if (cn === 'text-properties') {
        const css: string[] = [];
        if (attr(child, 'font-weight') === 'bold') css.push('font-weight:bold');
        if (attr(child, 'font-style') === 'italic') css.push('font-style:italic');
        const ul = attr(child, 'text-underline-style');
        if (ul && ul !== 'none') css.push('text-decoration:underline');
        const fs = attr(child, 'font-size');
        if (fs) css.push(`font-size:${fs}`);
        const color = attr(child, 'color');
        if (color) css.push(`color:${color}`);
        textCss = css.join(';');
      }
      if (cn === 'paragraph-properties') {
        const css: string[] = [];
        const align = attr(child, 'text-align');
        if (align) css.push(`text-align:${align}`);
        const ml = attr(child, 'margin-left');
        if (ml) css.push(`padding-left:${ml}`);
        const ti = attr(child, 'text-indent');
        if (ti) css.push(`text-indent:${ti}`);
        paraCss = css.join(';');
      }
    }
    const parent = attr(el, 'parent-style-name') || undefined;
    map.set(name, { textCss, paraCss, parent });
  }
  return map;
}

function odfResolveStyle(name: string, styles: Map<string, OdfStyle>): string {
  const visited = new Set<string>();
  const parts: string[] = [];
  let current: string | undefined = name;
  while (current && !visited.has(current)) {
    visited.add(current);
    const s = styles.get(current);
    if (!s) break;
    if (s.textCss) parts.unshift(s.textCss);
    if (s.paraCss) parts.unshift(s.paraCss);
    current = s.parent;
  }
  return parts.join(';');
}

function odfToHtml(node: Node, styles: Map<string, OdfStyle>): string {
  if (node.nodeType === Node.TEXT_NODE) return escHtml(node.textContent || '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const name = ln(el);
  if (name === 's') return '&nbsp;'.repeat(parseInt(attr(el, 'c') || '1', 10));
  if (name === 'tab') return '&emsp;&emsp;';
  if (name === 'line-break') return '<br/>';
  let inner = '';
  for (let i = 0; i < el.childNodes.length; i++) inner += odfToHtml(el.childNodes[i], styles);
  if (name === 'span') { const css = odfResolveStyle(attr(el, 'style-name') || '', styles); return css ? `<span style="${css}">${inner}</span>` : inner; }
  if (name === 'p') { const css = odfResolveStyle(attr(el, 'style-name') || '', styles); return `<p style="margin:0.35em 0;${css}">${inner || '&nbsp;'}</p>`; }
  if (name === 'h') { const fs = ({ 1: '1.5em', 2: '1.3em', 3: '1.15em' } as Record<number, string>)[parseInt(attr(el, 'outline-level') || '1', 10)] || '1em'; return `<div style="font-weight:bold;font-size:${fs};margin:1em 0 0.4em">${inner}</div>`; }
  if (name === 'table') return `<table style="border-collapse:collapse;width:100%;margin:0.8em 0">${inner}</table>`;
  if (name === 'table-row') return `<tr>${inner}</tr>`;
  if (name === 'table-cell') return `<td style="border:1px solid #3a3832;padding:6px 10px">${inner}</td>`;
  if (name === 'list') return `<ul style="margin:0.4em 0 0.4em 1.5em">${inner}</ul>`;
  if (name === 'list-item') return `<li>${inner}</li>`;
  return inner;
}

// ── Ana Parser ──

async function parseUdfFile(signedUrl: string): Promise<string> {
  const { unzipSync } = await import('fflate');
  const res = await fetch(signedUrl);
  const buf = await res.arrayBuffer();
  const files = unzipSync(new Uint8Array(buf));

  const decoder = new TextDecoder('utf-8');
  const parser = new DOMParser();

  const contentEntry = files['content.xml'];
  if (!contentEntry) {
    const xmlKey = Object.keys(files).find(k => k.endsWith('.xml') || k.endsWith('.html') || k.endsWith('.htm'));
    if (xmlKey) return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit">${escHtml(decoder.decode(files[xmlKey]))}</pre>`;
    throw new Error('UDF içinde okunabilir içerik bulunamadı');
  }

  const xmlStr = decoder.decode(contentEntry);
  const doc = parser.parseFromString(xmlStr, 'text/xml');
  const rootName = ln(doc.documentElement);

  // ── UYAP Formatı: <template> root ──
  if (rootName === 'template' || rootName === 'document') {
    // 1) CDATA metnini al
    const fullText = extractCdataText(doc);

    // 2) Paragraf/run tanımlarını topla
    const paragraphs = parseUyapParagraphs(doc);

    // 3) Range-based rendering
    if (fullText && paragraphs.length > 0) {
      const html = buildUyapHtml(fullText, paragraphs);
      if (html.trim()) {
        return `<div style="font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;max-width:900px;margin:0 auto;font-size:14px">${html}</div>`;
      }
    }

    // Fallback: CDATA metnini satır bazlı render et
    if (fullText) {
      const lines = fullText.split('\n');
      let html = '';
      for (const line of lines) {
        html += `<p style="margin:0.3em 0">${escHtml(line) || '&nbsp;'}</p>`;
      }
      return `<div style="font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;max-width:900px;margin:0 auto;font-size:14px">${html}</div>`;
    }

    // Son fallback
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;font-size:14px">${escHtml(doc.documentElement?.textContent || '')}</pre>`;
  }

  // ── Standart ODF Formatı ──
  const odfStyles = new Map<string, OdfStyle>();
  if (files['styles.xml']) {
    const stylesDoc = parser.parseFromString(decoder.decode(files['styles.xml']), 'text/xml');
    odfExtractStyles(stylesDoc).forEach((v, k) => odfStyles.set(k, v));
  }
  odfExtractStyles(doc).forEach((v, k) => odfStyles.set(k, v));

  const allEls = doc.getElementsByTagName('*');
  let bodyEl: Element | null = null;
  for (let i = 0; i < allEls.length; i++) {
    const n = ln(allEls[i]);
    if (n === 'text' || n === 'spreadsheet' || n === 'presentation') { bodyEl = allEls[i]; break; }
  }

  if (!bodyEl) {
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit">${escHtml(doc.documentElement?.textContent || '')}</pre>`;
  }

  let html = '';
  for (let i = 0; i < bodyEl.childNodes.length; i++) html += odfToHtml(bodyEl.childNodes[i], odfStyles);
  if (!html.trim()) {
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:inherit">${escHtml(bodyEl.textContent || '')}</pre>`;
  }
  return `<div style="font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;max-width:900px;margin:0 auto;font-size:14px">${html}</div>`;
}

function OnizlemeModal({ belge, onKapat }: { belge: Belge; onKapat: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tamEkran, setTamEkran] = useState(false);
  const [udfHtml, setUdfHtml] = useState<string | null>(null);
  const [udfHata, setUdfHata] = useState<string | null>(null);
  const [tiffDataUrl, setTiffDataUrl] = useState<string | null>(null);
  const [tiffHata, setTiffHata] = useState<string | null>(null);

  const isPdf = belge.tip?.includes('pdf');
  const isImage = belge.tip?.includes('image');
  const isUdfFile = isUdf(belge.tip || '', belge.dosyaAd);
  const isTiffFile = isTiff(belge.tip || '', belge.dosyaAd);

  useEffect(() => {
    setLoading(true);
    setUdfHtml(null);
    setUdfHata(null);
    setTiffDataUrl(null);
    setTiffHata(null);
    belgeIndir(belge.storagePath)
      .then(async (signedUrl) => {
        setUrl(signedUrl);
        // UDF dosyasıysa ZIP'i aç ve content.xml'i parse et
        if (isUdfFile) {
          try {
            const html = await parseUdfFile(signedUrl);
            setUdfHtml(html);
          } catch (err) {
            setUdfHata((err as Error).message || 'UDF dosyası okunamadı');
          }
        }
        // TIFF dosyasıysa decode et
        if (isTiffFile) {
          try {
            const UTIF = await import('utif2');
            const resp = await fetch(signedUrl);
            const buf = await resp.arrayBuffer();
            const ifds = UTIF.decode(buf);
            if (!ifds.length) throw new Error('TIFF sayfası bulunamadı');
            UTIF.decodeImage(buf, ifds[0]);
            const rgba = UTIF.toRGBA8(ifds[0]);
            const w = ifds[0].width;
            const h = ifds[0].height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            const imgData = ctx.createImageData(w, h);
            imgData.data.set(new Uint8Array(rgba.buffer));
            ctx.putImageData(imgData, 0, 0);
            setTiffDataUrl(canvas.toDataURL('image/png'));
          } catch (err) {
            setTiffHata((err as Error).message || 'TIFF dosyası okunamadı');
          }
        }
      })
      .catch(() => setUrl(null))
      .finally(() => setLoading(false));
  }, [belge.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tamEkran) setTamEkran(false);
        else onKapat();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tamEkran, onKapat]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 backdrop-blur-sm" onClick={onKapat}>
      <div
        className={`bg-surface border border-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 transition-all ${
          tamEkran
            ? 'fixed inset-0 rounded-none'
            : 'rounded-2xl w-[90vw] max-w-5xl h-[85vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isPdf ? 'bg-red/10 text-red' :
              isImage ? 'bg-green/10 text-green' :
              isTiffFile ? 'bg-teal-400/10 text-teal-400' :
              isUdfFile ? 'bg-orange-400/10 text-orange-400' :
              'bg-surface2 text-text-dim'
            }`}>
              <span className="text-[10px] font-bold uppercase">
                {isPdf ? 'PDF' : isUdfFile ? 'UDF' : isTiffFile ? 'TIFF' : dosyaUzanti(belge.dosyaAd || '')}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text truncate">{belge.ad}</div>
              {belge.dosyaAd && (
                <div className="text-[10px] text-text-dim font-mono truncate">{belge.dosyaAd}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {url && !isUdfFile && !isTiffFile && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-surface2 text-text-dim hover:text-gold transition-colors"
                title="Yeni sekmede aç"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
              </a>
            )}
            <button
              onClick={() => setTamEkran(!tamEkran)}
              className="p-2 rounded-lg hover:bg-surface2 text-text-dim hover:text-text transition-colors"
              title={tamEkran ? 'Normal boyut' : 'Tam ekran'}
            >
              {tamEkran ? <SvgMinimize /> : <SvgMaximize />}
            </button>
            <button
              onClick={onKapat}
              className="p-2 rounded-lg hover:bg-surface2 text-text-dim hover:text-text transition-colors"
              title="Kapat (ESC)"
            >
              <SvgX />
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 min-h-0 bg-bg/50 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Yükleniyor...</span>
              </div>
            </div>
          ) : !url ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-3">⚠️</div>
                <div className="text-sm text-text-muted">Önizleme yüklenemedi</div>
              </div>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={belge.ad}
            />
          ) : isImage && !isTiffFile ? (
            <div className="h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={url}
                alt={belge.ad}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isTiffFile && tiffDataUrl ? (
            <div className="h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={tiffDataUrl}
                alt={belge.ad}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isTiffFile && tiffHata ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-3">⚠️</div>
                <div className="text-sm text-text-muted mb-1">TIFF dosyası okunamadı</div>
                <div className="text-[10px] text-text-dim">{tiffHata}</div>
              </div>
            </div>
          ) : isUdfFile && udfHtml ? (
            /* UDF Görüntüleyici — ZIP'ten çıkarılmış content.xml render */
            <div className="h-full overflow-auto">
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#1a1916;color:#e0ddd4;margin:0;padding:0;font-family:'DM Sans',system-ui,sans-serif}h3{color:#c9a84c}pre{font-size:12px}</style></head><body>${udfHtml}</body></html>`}
                className="w-full h-full border-0"
                title={belge.ad}
                sandbox="allow-same-origin"
              />
            </div>
          ) : isUdfFile && udfHata ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-3">⚠️</div>
                <div className="text-sm text-text-muted mb-1">UDF dosyası okunamadı</div>
                <div className="text-[10px] text-text-dim">{udfHata}</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-xl bg-surface2 flex items-center justify-center mx-auto mb-3 ${dosyaIkonRenk(belge.tip || '')}`}>
                  <SvgFile className="text-current w-8 h-8" />
                </div>
                <div className="text-sm text-text-muted mb-1">Bu dosya türü önizlenemez</div>
                <div className="text-[10px] text-text-dim">{belge.tip || dosyaUzanti(belge.dosyaAd || '')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
