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
  return 'text-text-dim';
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
            <div className="text-[10px] text-text-muted mt-1">PDF, Word, resim, taranmış belge</div>
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
  belge, evrakBilgi, versiyon, onKapat, onIndir, onSil, indiriliyor,
}: {
  belge: Belge;
  evrakBilgi: (key: string) => { key: string; label: string; icon: string };
  versiyon: number | null;
  onKapat: () => void;
  onIndir: () => void;
  onSil: () => void;
  indiriliyor: boolean;
}) {
  const tur = evrakBilgi(belge.evrakTuru || 'diger');
  const isPdf = belge.tip?.includes('pdf');
  const isImage = belge.tip?.includes('image');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Önizleme URL'si oluştur (PDF ve resim için)
  useEffect(() => {
    if (isPdf || isImage) {
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
            <img src={previewUrl} alt={belge.ad} className="w-full h-40 object-contain bg-bg" />
          ) : previewUrl && isPdf ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                <span className="text-red font-bold text-xs">PDF</span>
              </div>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gold hover:underline">
                Tam önizleme aç →
              </a>
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
