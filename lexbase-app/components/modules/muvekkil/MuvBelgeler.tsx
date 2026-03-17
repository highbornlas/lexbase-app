'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useMuvBelgeler,
  useBelgeYukle,
  useBelgeSil,
  belgeIndir,
  fmtBoyut,
  useBelgeIstatistik,
  BELGE_TURLERI,
  MAX_BURO_BELGE_SAYI,
  MAX_BURO_TOPLAM_BOYUT,
  type BelgeTur,
  type Belge,
} from '@/lib/hooks/useBelgeler';
import { BelgeModal, type BelgeFormData } from '@/components/modules/BelgeModal';
import { fmtTarih } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   MuvBelgeler — Müvekkil Belge Yönetimi (DMS Tasarımı)
   Akordeon kategoriler, Inspector drawer, Sürükle-bırak,
   Arama, Vekaletname süre takibi
   ══════════════════════════════════════════════════════════════ */

interface Props {
  muvId: string;
}

// ── Belge Grupları ──
interface BelgeGrup {
  key: BelgeTur;
  label: string;
  aciklama: string;
  renk: string;
}

const BELGE_GRUPLARI: BelgeGrup[] = [
  { key: 'vekaletname', label: 'Vekaletnameler', aciklama: 'Genel ve özel vekaletnameler', renk: 'bg-gold/10 text-gold' },
  { key: 'sozlesme', label: 'Sözleşmeler', aciklama: 'Avukatlık sözleşmeleri ve protokoller', renk: 'bg-blue-400/10 text-blue-400' },
  { key: 'kimlik', label: 'Kimlik Belgeleri', aciklama: 'TC kimlik, pasaport, ehliyet', renk: 'bg-green/10 text-green' },
  { key: 'sirkuler', label: 'Sirküler & Ticaret', aciklama: 'İmza sirküleri, ticaret sicil', renk: 'bg-purple-400/10 text-purple-400' },
  { key: 'makbuz', label: 'Makbuz & Dekontlar', aciklama: 'Ödeme makbuzları, banka dekontları', renk: 'bg-orange-400/10 text-orange-400' },
  { key: 'diger', label: 'Diğer Belgeler', aciklama: 'Sınıflandırılmamış belgeler', renk: 'bg-surface2 text-text-muted' },
];

// ── SVG İkonlar ──
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
const SvgShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const SvgClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);

function dosyaIkonRenk(tip: string): string {
  if (tip.includes('pdf')) return 'text-red';
  if (tip.includes('word') || tip.includes('doc')) return 'text-blue-400';
  if (tip.includes('image') || tip.includes('jpg') || tip.includes('png')) return 'text-green';
  return 'text-text-dim';
}

function dosyaUzanti(dosyaAd: string): string {
  const parts = dosyaAd.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '—';
}

export function MuvBelgeler({ muvId }: Props) {
  const { data: belgeler, isLoading } = useMuvBelgeler(muvId);
  const yukleMutation = useBelgeYukle();
  const silMutation = useBelgeSil();
  const { data: istatistik } = useBelgeIstatistik();

  const limitDolu = istatistik ? istatistik.toplamSayi >= MAX_BURO_BELGE_SAYI || istatistik.toplamBoyut >= MAX_BURO_TOPLAM_BOYUT : false;

  const [modalOpen, setModalOpen] = useState(false);
  const [arama, setArama] = useState('');
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());
  const [secilenBelge, setSecilenBelge] = useState<Belge | null>(null);
  const [drawerAcik, setDrawerAcik] = useState(false);
  const [pageDragOver, setPageDragOver] = useState(false);
  const [gorunum, setGorunum] = useState<'klasor' | 'liste'>('klasor');
  const [silOnay, setSilOnay] = useState<string | null>(null);
  const [indiriliyor, setIndiriliyor] = useState<string | null>(null);

  const bugun = new Date().toISOString().slice(0, 10);

  const kalanGun = (bitis?: string) => {
    if (!bitis) return null;
    return Math.ceil((new Date(bitis).getTime() - new Date(bugun).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Filtreleme
  const filtreliBelgeler = useMemo(() => {
    if (!belgeler) return [];
    let sonuc = [...belgeler];
    if (arama.trim()) {
      const q = arama.toLowerCase();
      sonuc = sonuc.filter(b =>
        b.ad.toLowerCase().includes(q) ||
        b.dosyaAd?.toLowerCase().includes(q) ||
        (b.etiketler || []).some(e => e.toLowerCase().includes(q))
      );
    }
    return sonuc;
  }, [belgeler, arama]);

  // Gruplara göre belgeleri ayır
  const grupluBelgeler = useMemo(() => {
    const map: Record<string, Belge[]> = {};
    BELGE_GRUPLARI.forEach(g => { map[g.key] = []; });

    filtreliBelgeler.forEach(b => {
      const tur = b.tur || 'diger';
      if (map[tur]) map[tur].push(b);
      else map['diger'].push(b);
    });

    // Her grupta vekaletnameleri süreye göre, diğerlerini tarihe göre sırala
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => {
        if (a.tur === 'vekaletname' && b.tur === 'vekaletname') {
          const ka = kalanGun(a.meta?.bitis);
          const kb = kalanGun(b.meta?.bitis);
          if (ka !== null && kb !== null) return ka - kb;
          if (ka !== null) return -1;
          if (kb !== null) return 1;
        }
        return (b.tarih || '').localeCompare(a.tarih || '');
      });
    });

    return map;
  }, [filtreliBelgeler]); // eslint-disable-line react-hooks/exhaustive-deps

  // İlk yüklemede, evrak bulunan grupları otomatik aç
  useEffect(() => {
    if (belgeler && belgeler.length > 0 && acikGruplar.size === 0) {
      const acilacak = new Set<string>();
      BELGE_GRUPLARI.forEach(g => {
        if ((grupluBelgeler[g.key] || []).length > 0) acilacak.add(g.key);
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

  // Yükle handler
  const handleYukle = async (formData: BelgeFormData, dosya: File) => {
    const belgeId = crypto.randomUUID();
    await yukleMutation.mutateAsync({
      dosya,
      belge: {
        id: belgeId,
        muvId,
        ad: formData.ad,
        tur: formData.tur,
        tarih: formData.tarih,
        etiketler: formData.etiketler,
        meta: formData.meta,
      },
    });
    setModalOpen(false);
  };

  // İndir
  const handleIndir = async (belge: Belge) => {
    try {
      setIndiriliyor(belge.id);
      const url = await belgeIndir(belge.storagePath);
      window.open(url, '_blank');
    } catch {
      alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIndiriliyor(null);
    }
  };

  // Sil
  const handleSil = async (belge: Belge) => {
    try {
      await silMutation.mutateAsync({ id: belge.id, storagePath: belge.storagePath });
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

  // Sayfa sürükle-bırak
  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPageDragOver(true);
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setPageDragOver(false);
  }, []);

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setModalOpen(true);
      setTimeout(() => {
        const event = new CustomEvent('muv-belge-drop', { detail: file });
        window.dispatchEvent(event);
      }, 100);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Belgeler yükleniyor...</span>
        </div>
      </div>
    );
  }

  const toplamBelge = (belgeler || []).length;

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
            <div className="text-sm font-semibold text-gold">Belgeyi buraya bırakın</div>
            <div className="text-[10px] text-text-muted mt-1">PDF, Word, resim, taranmış belge</div>
          </div>
        </div>
      )}

      {/* ── ÜST BAR ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium">{toplamBelge} belge</span>

          {/* Arama */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"><SvgSearch /></span>
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Belge ara..."
              className="pl-7 pr-3 py-1.5 text-[11px] bg-surface2/50 border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold w-44 transition-colors"
            />
          </div>

          {/* Kullanım istatistikleri */}
          {istatistik && (
            <div className="hidden lg:flex items-center gap-3 text-[10px] text-text-dim">
              <div className="flex items-center gap-1.5">
                <span>{istatistik.toplamSayi}/{MAX_BURO_BELGE_SAYI}</span>
                <div className="w-12 h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      istatistik.toplamSayi / MAX_BURO_BELGE_SAYI > 0.9 ? 'bg-red' :
                      istatistik.toplamSayi / MAX_BURO_BELGE_SAYI > 0.7 ? 'bg-gold' : 'bg-green'
                    }`}
                    style={{ width: `${Math.min(100, (istatistik.toplamSayi / MAX_BURO_BELGE_SAYI) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-border">|</span>
              <span>{fmtBoyut(istatistik.toplamBoyut)}/1GB</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Görünüm Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setGorunum('klasor')}
              className={`px-2 py-1.5 transition-colors ${gorunum === 'klasor' ? 'bg-gold text-bg' : 'bg-surface text-text-dim hover:text-text'}`}
              title="Klasör görünümü"
            >
              <SvgFolder className="text-current" />
            </button>
            <button
              onClick={() => setGorunum('liste')}
              className={`px-2 py-1.5 transition-colors ${gorunum === 'liste' ? 'bg-gold text-bg' : 'bg-surface text-text-dim hover:text-text'}`}
              title="Liste görünümü"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            disabled={limitDolu}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)] ${
              limitDolu
                ? 'bg-surface2 text-text-dim cursor-not-allowed'
                : 'bg-gold text-bg hover:bg-gold-light'
            }`}
            title={limitDolu ? 'Depolama limiti dolmuştur' : undefined}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Belge Yükle
          </button>
        </div>
      </div>

      {/* ── ANA İÇERİK ── */}
      <div className={`flex gap-0 transition-all`}>
        {/* Sol: Akordeon listesi */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${drawerAcik ? 'pr-4' : ''}`}>
          {toplamBelge === 0 ? (
            /* Boş durum */
            <div className="border-2 border-dashed border-border rounded-xl py-16 px-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <SvgUpload className="text-gold" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-text mb-1.5">Müvekkil belgeleri burada görünecek</h3>
              <p className="text-xs text-text-muted mb-5 max-w-sm mx-auto">
                Vekaletname, sözleşme, kimlik belgesi ve diğer müvekkile ait tüm belgeleri buraya yükleyin.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                disabled={limitDolu}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-bg font-semibold text-xs rounded-lg hover:bg-gold-light transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)] disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
                İlk Belgeyi Yükle
              </button>
              <div className="mt-4 text-[10px] text-text-dim">
                veya dosyayı sürükleyip bırakın
              </div>
            </div>
          ) : filtreliBelgeler.length === 0 ? (
            /* Arama sonucu boş */
            <div className="text-center py-12">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto mb-3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <div className="text-xs text-text-muted">Arama kriterlerine uygun belge bulunamadı</div>
              <button onClick={() => setArama('')} className="text-[10px] text-gold hover:underline mt-2">
                Aramayı temizle
              </button>
            </div>
          ) : gorunum === 'liste' ? (
            /* Düz Liste Görünümü */
            <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/50">
              {/* Tablo Başlık */}
              <div className="flex items-center gap-3 px-4 py-2 bg-surface2/30 border-b border-border/40 text-[10px] font-bold text-text-dim uppercase tracking-wider">
                <div className="w-8" />
                <div className="flex-1">Belge Adı</div>
                <div className="w-24 text-center hidden sm:block">Tür</div>
                <div className="w-20 text-center hidden md:block">Tarih</div>
                <div className="w-16 text-right hidden md:block">Boyut</div>
                <div className="w-16" />
              </div>
              {filtreliBelgeler.map((belge, i) => {
                const isSelected = secilenBelge?.id === belge.id;
                const kalan = belge.tur === 'vekaletname' ? kalanGun(belge.meta?.bitis) : null;
                const turLabel = BELGE_TURLERI.find(t => t.key === belge.tur);
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
                        {kalan !== null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0 ${
                            kalan <= 0 ? 'bg-red/10 text-red border border-red/20' :
                            kalan <= 15 ? 'bg-gold/10 text-gold border border-gold/20' :
                            'bg-green/10 text-green border border-green/20'
                          }`}>
                            <SvgClock />
                            {kalan <= 0 ? 'Dolmuş' : `${kalan}g`}
                          </span>
                        )}
                      </div>
                      {belge.dosyaAd && (
                        <div className="text-[10px] text-text-dim font-mono truncate mt-0.5">
                          {belge.dosyaAd}
                        </div>
                      )}
                    </div>
                    <div className="w-24 text-center hidden sm:block">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2/60 text-text-dim">
                        {turLabel?.label || belge.tur}
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
            /* Akordeon Gruplar (Klasör Görünümü) */
            <div className="space-y-2">
              {BELGE_GRUPLARI.map(grup => {
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

                    {/* Grup İçeriği */}
                    {acik && (
                      <div className="border-t border-border/40 bg-bg/30">
                        {grupBelgeleri.map((belge, i) => {
                          const kalan = belge.tur === 'vekaletname' ? kalanGun(belge.meta?.bitis) : null;
                          const isSelected = secilenBelge?.id === belge.id;
                          const turLabel = BELGE_TURLERI.find(t => t.key === belge.tur);

                          return (
                            <div
                              key={belge.id}
                              onClick={() => handleBelgeSec(belge)}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                                i < grupBelgeleri.length - 1 ? 'border-b border-border/20' : ''
                              } ${isSelected ? 'bg-gold/5 border-l-2 border-l-gold' : 'hover:bg-surface2/40 border-l-2 border-l-transparent'}`}
                            >
                              {/* Dosya ikonu */}
                              <div className={`w-8 h-8 rounded-lg bg-surface2/80 flex items-center justify-center flex-shrink-0 ${dosyaIkonRenk(belge.tip || '')}`}>
                                <SvgFile className="text-current" />
                              </div>

                              {/* Bilgiler */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-text truncate">{belge.ad}</span>
                                  {/* Vekaletname süre badge */}
                                  {kalan !== null && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0 ${
                                      kalan <= 0 ? 'bg-red/10 text-red border border-red/20' :
                                      kalan <= 15 ? 'bg-gold/10 text-gold border border-gold/20' :
                                      'bg-green/10 text-green border border-green/20'
                                    }`}>
                                      <SvgClock />
                                      {kalan <= 0 ? 'Süresi dolmuş' : `${kalan} gün`}
                                    </span>
                                  )}
                                  {/* Özel yetki badge */}
                                  {belge.tur === 'vekaletname' && belge.meta?.ozel && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20 flex items-center gap-0.5 flex-shrink-0">
                                      <SvgShield /> Özel
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-text-dim mt-0.5">
                                  <span className="px-1.5 py-0.5 rounded bg-surface2/60 text-text-dim">{turLabel?.label || belge.tur}</span>
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
              kalanGun={kalanGun}
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
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0 text-red">
                <SvgTrash />
              </div>
              <div>
                <div className="text-sm font-semibold text-text">Belgeyi Sil</div>
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

      {/* Belge Modal */}
      <BelgeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onKaydet={handleYukle}
        yukleniyor={yukleMutation.isPending}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Inspector Drawer — Sağ detay paneli (Müvekkil Belgeleri)
// ══════════════════════════════════════════════════════════════

function InspectorDrawer({
  belge, kalanGun, onKapat, onIndir, onSil, indiriliyor,
}: {
  belge: Belge;
  kalanGun: (bitis?: string) => number | null;
  onKapat: () => void;
  onIndir: () => void;
  onSil: () => void;
  indiriliyor: boolean;
}) {
  const turLabel = BELGE_TURLERI.find(t => t.key === belge.tur);
  const isPdf = belge.tip?.includes('pdf');
  const isImage = belge.tip?.includes('image');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const kalan = belge.tur === 'vekaletname' ? kalanGun(belge.meta?.bitis) : null;

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
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Belge Detayı</div>
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

        {/* Dosya adı + tür */}
        <div>
          <div className="text-sm font-semibold text-text mb-1">{belge.ad}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              belge.tur === 'vekaletname' ? 'bg-gold/10 text-gold border-gold/20' :
              belge.tur === 'sozlesme' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
              belge.tur === 'kimlik' ? 'bg-green/10 text-green border-green/20' :
              'bg-surface2 text-text-muted border-border'
            }`}>
              {turLabel?.label || belge.tur}
            </span>
            {kalan !== null && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                kalan <= 0 ? 'bg-red/10 text-red border border-red/20' :
                kalan <= 15 ? 'bg-gold/10 text-gold border border-gold/20' :
                'bg-green/10 text-green border border-green/20'
              }`}>
                <SvgClock />
                {kalan <= 0 ? 'Süresi dolmuş' : `${kalan} gün kaldı`}
              </span>
            )}
            {belge.tur === 'vekaletname' && belge.meta?.ozel && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20 flex items-center gap-0.5">
                <SvgShield /> Özel Yetkili
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

        {/* Vekaletname özel bilgiler */}
        {belge.tur === 'vekaletname' && belge.meta && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px]">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Vekaletname Bilgileri</h4>
              <div className="flex-1 h-px bg-border/30" />
            </div>
            {belge.meta.noter && <MetaRow label="Noter" value={belge.meta.noter} />}
            {belge.meta.yevmiye && <MetaRow label="Yevmiye No" value={belge.meta.yevmiye} mono />}
            {belge.meta.vekil && <MetaRow label="Vekil" value={belge.meta.vekil} />}
            {belge.meta.bitis && <MetaRow label="Bitiş Tarihi" value={fmtTarih(belge.meta.bitis)} />}
            {belge.meta.ozel && belge.meta.ozelAcik && (
              <div>
                <div className="text-[10px] text-text-dim mb-1">Özel Yetki</div>
                <div className="text-xs text-purple-400 bg-purple-400/5 rounded-lg p-2 border border-purple-400/10">
                  {belge.meta.ozelAcik}
                </div>
              </div>
            )}
          </div>
        )}

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
          <SvgTrash /> Belgeyi Sil
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
