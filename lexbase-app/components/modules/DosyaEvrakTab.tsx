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
  if (tip.includes('excel') || tip.includes('sheet')) return 'text-green';
  if (isUdf(tip)) return 'text-orange-400';
  return 'text-text-dim';
}

function isUdf(tip: string, dosyaAd?: string): boolean {
  if (tip.includes('udf')) return true;
  if (dosyaAd && dosyaAd.toLowerCase().endsWith('.udf')) return true;
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
  const canPreview = isPdf || isImage || isUdfFile;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Önizleme URL'si oluştur (PDF, resim ve UDF için)
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

// ── UDF (UYAP) Parser v4 — UYAP özel XML formatı desteği ────
// UYAP UDF yapısı (ODF DEĞİL):
//   ZIP → content.xml + sign.sgn
//   <template>
//     <content> → <paragraph> → <run> → <text>
//     <properties> → sayfa/doküman özellikleri
//     <elements> → özel elementler
//     <styles> → <style> tanımları
//   </template>
// Ayrıca standart ODF de desteklenir (fallback)

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ln(el: Element): string {
  return el.localName || el.nodeName.split(':').pop() || '';
}

function attr(el: Element, name: string): string | null {
  // Direkt getAttribute
  const direct = el.getAttribute(name);
  if (direct !== null) return direct;
  // Namespace-aware fallback
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const aLocal = a.localName || a.name.split(':').pop() || '';
    if (aLocal === name) return a.value;
  }
  return null;
}

// ── UYAP Format Stilleri ──

interface UyapStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  align?: string;
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  textIndent?: string;
  lineHeight?: string;
}

function parseUyapStyles(doc: Document): Map<string, UyapStyle> {
  const map = new Map<string, UyapStyle>();
  const allEls = doc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    if (ln(el) !== 'style') continue;
    const id = attr(el, 'id') || attr(el, 'name') || attr(el, 'styleId');
    if (!id) continue;
    map.set(id, extractUyapStyleProps(el));
  }
  return map;
}

function extractUyapStyleProps(el: Element): UyapStyle {
  const s: UyapStyle = {};
  // Tüm attributeleri tara
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const name = a.localName || a.name;
    const val = a.value;
    if (name === 'bold' && (val === 'true' || val === '1' || val === 'True')) s.bold = true;
    if (name === 'italic' && (val === 'true' || val === '1' || val === 'True')) s.italic = true;
    if (name === 'underline' && (val === 'true' || val === '1' || val === 'True')) s.underline = true;
    if ((name === 'strikethrough' || name === 'strike') && (val === 'true' || val === '1')) s.strikethrough = true;
    if (name === 'fontSize' || name === 'font-size' || name === 'size') s.fontSize = val;
    if (name === 'fontFamily' || name === 'font-family' || name === 'fontName' || name === 'font') s.fontFamily = val;
    if (name === 'color' || name === 'foreColor' || name === 'foreground') s.color = val;
    if (name === 'bgColor' || name === 'backColor' || name === 'background' || name === 'backgroundColor') s.bgColor = val;
    if (name === 'align' || name === 'alignment' || name === 'textAlign' || name === 'justification') s.align = val;
    if (name === 'leftIndent' || name === 'marginLeft' || name === 'indent') s.marginLeft = val;
    if (name === 'spaceBefore' || name === 'marginTop') s.marginTop = val;
    if (name === 'spaceAfter' || name === 'marginBottom') s.marginBottom = val;
    if (name === 'firstLineIndent' || name === 'textIndent') s.textIndent = val;
    if (name === 'lineSpacing' || name === 'lineHeight') s.lineHeight = val;
  }
  // Çocuk elementlerden de al
  for (let c = 0; c < el.children.length; c++) {
    const child = el.children[c];
    const childProps = extractUyapStyleProps(child);
    Object.assign(s, childProps);
  }
  return s;
}

function uyapStyleToCss(s: UyapStyle, type: 'inline' | 'block' = 'inline'): string {
  const css: string[] = [];
  if (s.bold) css.push('font-weight:bold');
  if (s.italic) css.push('font-style:italic');
  if (s.underline) css.push('text-decoration:underline');
  if (s.strikethrough) css.push('text-decoration:line-through');
  if (s.fontSize) {
    // Font size twips/points/px dönüşüm
    const fs = s.fontSize;
    if (fs.match(/^\d+$/)) {
      const pt = parseInt(fs, 10);
      // Twips ise (büyük sayılar) → pt'ye çevir
      if (pt > 100) css.push(`font-size:${Math.round(pt / 20)}pt`);
      else css.push(`font-size:${pt}pt`);
    } else {
      css.push(`font-size:${fs}`);
    }
  }
  if (s.fontFamily) css.push(`font-family:'${s.fontFamily}',serif`);
  if (s.color && s.color !== '0' && s.color !== '#000000') {
    // UYAP renkleri int olabilir
    const c = s.color;
    if (c.startsWith('#')) css.push(`color:${c}`);
    else if (c.match(/^\d+$/)) {
      const num = parseInt(c, 10);
      if (num > 0) css.push(`color:#${num.toString(16).padStart(6, '0')}`);
    }
  }
  if (s.bgColor && s.bgColor !== 'transparent' && s.bgColor !== '0' && s.bgColor !== '#FFFFFF' && s.bgColor !== '#ffffff') {
    css.push(`background-color:${s.bgColor.startsWith('#') ? s.bgColor : '#' + parseInt(s.bgColor, 10).toString(16).padStart(6, '0')}`);
  }
  if (type === 'block') {
    if (s.align) {
      const alignMap: Record<string, string> = {
        left: 'left', Left: 'left', '0': 'left',
        center: 'center', Center: 'center', '1': 'center',
        right: 'right', Right: 'right', '2': 'right',
        justify: 'justify', Justify: 'justify', both: 'justify', '3': 'justify',
      };
      css.push(`text-align:${alignMap[s.align] || s.align}`);
    }
    if (s.marginLeft) {
      const ml = s.marginLeft;
      if (ml.match(/^\d+$/)) css.push(`padding-left:${Math.round(parseInt(ml, 10) / 20)}pt`);
      else css.push(`padding-left:${ml}`);
    }
    if (s.textIndent) {
      const ti = s.textIndent;
      if (ti.match(/^\d+$/)) css.push(`text-indent:${Math.round(parseInt(ti, 10) / 20)}pt`);
      else css.push(`text-indent:${ti}`);
    }
    if (s.marginTop) {
      const mt = s.marginTop;
      if (mt.match(/^\d+$/)) css.push(`margin-top:${Math.round(parseInt(mt, 10) / 20)}pt`);
      else css.push(`margin-top:${mt}`);
    }
    if (s.marginBottom) {
      const mb = s.marginBottom;
      if (mb.match(/^\d+$/)) css.push(`margin-bottom:${Math.round(parseInt(mb, 10) / 20)}pt`);
      else css.push(`margin-bottom:${mb}`);
    }
    if (s.lineHeight) {
      const lh = s.lineHeight;
      if (lh.match(/^\d+$/)) {
        const val = parseInt(lh, 10);
        if (val > 100) css.push(`line-height:${(val / 240).toFixed(2)}`); // twips → line-height ratio
        else css.push(`line-height:${val}%`);
      } else {
        css.push(`line-height:${lh}`);
      }
    }
  }
  return css.join(';');
}

// ── UYAP Element → HTML Dönüştürücü ──

function uyapRunToHtml(runEl: Element, styles: Map<string, UyapStyle>): string {
  // <run> elementinden stil bilgisi al
  const runStyle = extractUyapStyleProps(runEl);
  const styleId = attr(runEl, 'styleId') || attr(runEl, 'style');
  const baseStyle = styleId ? styles.get(styleId) : undefined;
  const mergedStyle: UyapStyle = { ...baseStyle, ...runStyle };

  // <text> çocuklarını topla
  let text = '';
  for (let i = 0; i < runEl.childNodes.length; i++) {
    const child = runEl.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element;
      const childName = ln(childEl);
      if (childName === 'text') {
        text += childEl.textContent || '';
      } else if (childName === 'tab') {
        text += '\t';
      } else if (childName === 'br' || childName === 'line-break') {
        text += '\n';
      }
    }
  }

  if (!text) return '';

  const css = uyapStyleToCss(mergedStyle, 'inline');
  const htmlText = escHtml(text).replace(/\t/g, '&emsp;&emsp;').replace(/\n/g, '<br/>');
  return css ? `<span style="${css}">${htmlText}</span>` : htmlText;
}

function uyapParagraphToHtml(paraEl: Element, styles: Map<string, UyapStyle>): string {
  // Paragraf stil bilgisi
  const paraStyle = extractUyapStyleProps(paraEl);
  const styleId = attr(paraEl, 'styleId') || attr(paraEl, 'style');
  const baseStyle = styleId ? styles.get(styleId) : undefined;
  const mergedStyle: UyapStyle = { ...baseStyle, ...paraStyle };

  // Çocuk elementleri işle
  let inner = '';
  for (let i = 0; i < paraEl.childNodes.length; i++) {
    const child = paraEl.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent || '';
      if (t.trim()) inner += escHtml(t);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element;
      const childName = ln(childEl);
      if (childName === 'run') {
        inner += uyapRunToHtml(childEl, styles);
      } else if (childName === 'tab') {
        inner += '&emsp;&emsp;';
      } else if (childName === 'spacer') {
        const count = parseInt(attr(childEl, 'count') || attr(childEl, 'length') || '1', 10);
        inner += '&nbsp;'.repeat(count || 1);
      } else if (childName === 'br' || childName === 'line-break') {
        inner += '<br/>';
      }
    }
  }

  const blockCss = uyapStyleToCss(mergedStyle, 'block');
  const inlineCss = uyapStyleToCss(mergedStyle, 'inline');
  const cssArr: string[] = ['margin:0.35em 0'];
  if (blockCss) cssArr.push(blockCss);
  if (inlineCss) cssArr.push(inlineCss);

  return `<p style="${cssArr.join(';')}">${inner || '&nbsp;'}</p>`;
}

function uyapContentToHtml(contentEl: Element, styles: Map<string, UyapStyle>): string {
  let html = '';
  for (let i = 0; i < contentEl.childNodes.length; i++) {
    const child = contentEl.childNodes[i];
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const childEl = child as Element;
    const name = ln(childEl);

    if (name === 'paragraph') {
      html += uyapParagraphToHtml(childEl, styles);
    } else if (name === 'header') {
      // Header bölümü — içindeki paragrafları render et
      let headerHtml = '';
      for (let j = 0; j < childEl.childNodes.length; j++) {
        if (childEl.childNodes[j].nodeType === Node.ELEMENT_NODE) {
          const hChild = childEl.childNodes[j] as Element;
          if (ln(hChild) === 'paragraph') {
            headerHtml += uyapParagraphToHtml(hChild, styles);
          }
        }
      }
      if (headerHtml) {
        html += `<div style="border-bottom:1px solid #3a3832;padding-bottom:0.8em;margin-bottom:1em">${headerHtml}</div>`;
      }
    } else if (name === 'footer') {
      let footerHtml = '';
      for (let j = 0; j < childEl.childNodes.length; j++) {
        if (childEl.childNodes[j].nodeType === Node.ELEMENT_NODE) {
          const fChild = childEl.childNodes[j] as Element;
          if (ln(fChild) === 'paragraph') {
            footerHtml += uyapParagraphToHtml(fChild, styles);
          }
        }
      }
      if (footerHtml) {
        html += `<div style="border-top:1px solid #3a3832;padding-top:0.8em;margin-top:1em">${footerHtml}</div>`;
      }
    } else if (name === 'table') {
      html += uyapTableToHtml(childEl, styles);
    }
  }
  return html;
}

function uyapTableToHtml(tableEl: Element, styles: Map<string, UyapStyle>): string {
  let rows = '';
  for (let i = 0; i < tableEl.children.length; i++) {
    const rowEl = tableEl.children[i];
    if (ln(rowEl) === 'row' || ln(rowEl) === 'table-row' || ln(rowEl) === 'tr') {
      let cells = '';
      for (let j = 0; j < rowEl.children.length; j++) {
        const cellEl = rowEl.children[j];
        const cellName = ln(cellEl);
        if (cellName === 'cell' || cellName === 'table-cell' || cellName === 'td') {
          let cellContent = '';
          for (let k = 0; k < cellEl.children.length; k++) {
            if (ln(cellEl.children[k]) === 'paragraph') {
              cellContent += uyapParagraphToHtml(cellEl.children[k], styles);
            }
          }
          if (!cellContent) cellContent = escHtml(cellEl.textContent || '');
          cells += `<td style="border:1px solid #3a3832;padding:6px 10px;vertical-align:top">${cellContent}</td>`;
        }
      }
      rows += `<tr>${cells}</tr>`;
    }
  }
  return rows ? `<table style="border-collapse:collapse;width:100%;margin:0.8em 0">${rows}</table>` : '';
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
    const uyapStyles = parseUyapStyles(doc);

    // <content> elementini bul
    const allEls = doc.getElementsByTagName('*');
    let contentEl: Element | null = null;
    for (let i = 0; i < allEls.length; i++) {
      if (ln(allEls[i]) === 'content') {
        contentEl = allEls[i];
        break;
      }
    }

    if (contentEl) {
      const html = uyapContentToHtml(contentEl, uyapStyles);
      if (html.trim()) {
        return `<div style="font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;max-width:900px;margin:0 auto;font-size:14px">${html}</div>`;
      }
    }

    // Fallback: tüm <paragraph> elementlerini bul
    let html = '';
    for (let i = 0; i < allEls.length; i++) {
      if (ln(allEls[i]) === 'paragraph') {
        html += uyapParagraphToHtml(allEls[i], uyapStyles);
      }
    }
    if (html.trim()) {
      return `<div style="font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;max-width:900px;margin:0 auto;font-size:14px">${html}</div>`;
    }

    // Son fallback: düz metin
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:'DM Sans',system-ui,sans-serif;line-height:1.8;color:#e0ddd4;padding:2.5rem;font-size:14px">${escHtml(doc.documentElement?.textContent || '')}</pre>`;
  }

  // ── Standart ODF Formatı: office:document-content root ──
  const odfStyles = new Map<string, OdfStyle>();
  if (files['styles.xml']) {
    const stylesDoc = parser.parseFromString(decoder.decode(files['styles.xml']), 'text/xml');
    odfExtractStyles(stylesDoc).forEach((v, k) => odfStyles.set(k, v));
  }
  odfExtractStyles(doc).forEach((v, k) => odfStyles.set(k, v));

  // office:body > office:text bul
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

  const isPdf = belge.tip?.includes('pdf');
  const isImage = belge.tip?.includes('image');
  const isUdfFile = isUdf(belge.tip || '', belge.dosyaAd);

  useEffect(() => {
    setLoading(true);
    setUdfHtml(null);
    setUdfHata(null);
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
              isUdfFile ? 'bg-orange-400/10 text-orange-400' :
              'bg-surface2 text-text-dim'
            }`}>
              <span className="text-[10px] font-bold uppercase">
                {isPdf ? 'PDF' : isUdfFile ? 'UDF' : dosyaUzanti(belge.dosyaAd || '')}
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
            {url && !isUdfFile && (
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
          ) : isImage ? (
            <div className="h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={url}
                alt={belge.ad}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
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
