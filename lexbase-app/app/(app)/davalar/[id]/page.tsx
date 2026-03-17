'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDava, useDavaKaydet, useDavaSil, useDavaArsivle } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  tamMahkemeAdi,
  esasNoGoster,
  davaciBelirle,
  durusmaTarihSaatGoster,
  durusmayaKalanGun,
  sureHesapla,
} from '@/lib/utils/uyapHelpers';
import { SureBadge, DurusmaBadge } from '@/components/ui/SureBadge';
import { DavaModal } from '@/components/modules/DavaModal';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';
import { TahsilatModal, type TahsilatKaydi } from '@/components/modules/TahsilatModal';
import { useSonErisim } from '@/lib/hooks/useSonErisim';

// ── Sekme tanımları ──────────────────────────────────────────
const TABS = [
  { key: 'ozet', label: 'Özet', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { key: 'evrak', label: 'Evraklar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
  { key: 'harcama', label: 'Harcamalar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
  { key: 'tahsilat', label: 'Tahsilat', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg> },
  { key: 'sureler', label: 'Süreler', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { key: 'notlar', label: 'Notlar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { key: 'anlasma', label: 'Anlaşma', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
];

const ASAMA_RENK: Record<string, string> = {
  'İlk Derece': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'İstinaf': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Temyiz (Yargıtay)': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Temyiz (Danıştay)': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Kesinleşti': 'bg-green-dim text-green border-green/20',
  'Düşürüldü': 'bg-surface2 text-text-dim border-border',
};

const DURUM_RENK: Record<string, string> = {
  'Derdest': 'bg-green-dim text-green border-green/20',
  'Aktif': 'bg-green-dim text-green border-green/20',
  'Devam Ediyor': 'bg-green-dim text-green border-green/20',
  'Hazırlık Aşamasında': 'bg-gold-dim text-gold border-gold/20',
  'Beklemede': 'bg-gold-dim text-gold border-gold/20',
  'Kapalı': 'bg-surface2 text-text-dim border-border',
};

// ══════════════════════════════════════════════════════════════
//  Dava Detay Sayfası — Yeniden Tasarım
// ══════════════════════════════════════════════════════════════

export default function DavaDetay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: dava, isLoading } = useDava(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: icralar } = useIcralar();
  const router = useRouter();
  const davaKaydet = useDavaKaydet();
  const silMut = useDavaSil();
  const arsivleMut = useDavaArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [tahsilatModal, setTahsilatModal] = useState(false);
  const [duzenlenecekTahsilat, setDuzenlenecekTahsilat] = useState<TahsilatKaydi | null>(null);
  const [aksiyonMenuAcik, setAksiyonMenuAcik] = useState(false);
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (dava && !(dava as Record<string, unknown>)._silindi) {
      const baslik = String(esasNoGoster(dava.esasYil, dava.esasNo) || dava.konu || dava.no || dava.id.slice(0, 8));
      kaydetErisim({ id: dava.id, tip: 'dava', baslik, tarih: new Date().toISOString() });
    }
  }, [dava?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Türetilmiş veriler
  const muvAd = useMemo(() => {
    if (!dava?.muvId || !muvekkillar) return '—';
    const m = muvekkillar.find((m) => m.id === dava.muvId);
    return m ? [m.ad, m.soyad].filter(Boolean).join(' ') : '—';
  }, [dava, muvekkillar]);

  const mahkemeAdi = useMemo(() => {
    if (!dava) return '';
    return tamMahkemeAdi(dava.il, dava.mno, dava.mtur, dava.adliye);
  }, [dava]);

  const esasNo = useMemo(() => {
    if (!dava) return '';
    return esasNoGoster(dava.esasYil, dava.esasNo);
  }, [dava]);

  const taraflar = useMemo(() => {
    if (!dava) return { davaci: '—', davali: '—' };
    return davaciBelirle(dava.taraf, muvAd, dava.karsi || '—');
  }, [dava, muvAd]);

  const durusmaKalan = useMemo(() => {
    if (!dava?.durusma) return null;
    return durusmayaKalanGun(dava.durusma);
  }, [dava]);

  const iliskiliIcra = useMemo(() => {
    if (!dava?.iliskiliIcraId || !icralar) return null;
    return icralar.find((ic) => ic.id === dava.iliskiliIcraId) || null;
  }, [dava, icralar]);

  const hesap = useMemo(() => {
    if (!dava) return { masraf: 0, tahsilat: 0, hakedis: 0, vekalet: 0, evrakSayisi: 0, net: 0 };
    const masraf = (dava.harcamalar || []).reduce((t, h) => t + (h.tutar || 0), 0);
    const tahsilat = (dava.tahsilatlar || []).filter((t) => t.tur === 'tahsilat').reduce((t, h) => t + (h.tutar || 0), 0);
    const hakedis = (dava.tahsilatlar || []).filter((t) => t.tur === 'hakediş').reduce((t, h) => t + (h.tutar || 0), 0);
    const vekalet = (dava.tahsilatlar || []).filter((t) => t.tur === 'akdi_vekalet').reduce((t, h) => t + (h.tutar || 0), 0);
    const evrakSayisi = (dava.evraklar || []).length;
    const net = tahsilat + hakedis + vekalet - masraf;
    return { masraf, tahsilat, hakedis, vekalet, evrakSayisi, net };
  }, [dava]);

  // Yaklaşan süreler
  const yaklasanSureler = useMemo(() => {
    if (!dava?.sureler?.length) return [];
    return dava.sureler
      .map((s) => ({ ...s, hesap: sureHesapla(s.baslangic, s.gun) }))
      .filter((s) => s.hesap.kalanGun >= 0 && s.hesap.kalanGun <= 14)
      .sort((a, b) => a.hesap.kalanGun - b.hesap.kalanGun);
  }, [dava]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Dosya yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!dava || (dava as Record<string, unknown>)._silindi) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">❌</div>
        <div className="text-sm text-text-muted">{(dava as Record<string, unknown> | null)?._silindi ? 'Bu dava silinmiş' : 'Dava bulunamadı'}</div>
        <Link href="/davalar" className="text-xs text-gold mt-3 inline-block hover:underline">← Davalara dön</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ═══════════════════════════════════════════════════════════
         STICKY HEADER — Tüm temel bilgiler burada, tekrar yok
         ═══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm pb-4 -mx-2 px-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3 pt-1">
          <Link href="/davalar" className="hover:text-gold transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Davalar
          </Link>
          <span className="text-text-dim">/</span>
          <span className="text-text font-medium">{esasNo || dava.konu || dava.no || dava.id.slice(0, 8)}</span>
        </div>

        {/* Ana Başlık Satırı */}
        <div className="flex items-start justify-between gap-4">
          {/* Sol: Dosya kimliği */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
                {mahkemeAdi || '—'}
              </h1>
              {dava.asama && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${ASAMA_RENK[dava.asama] || 'bg-surface2 text-text-muted border-border'}`}>
                  {dava.asama}
                </span>
              )}
              {dava.durum && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${DURUM_RENK[dava.durum] || 'bg-surface2 text-text-dim border-border'}`}>
                  {dava.durum}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
              {esasNo && (
                <span className="font-[var(--font-playfair)] text-gold font-bold text-sm">
                  E. {esasNo}
                </span>
              )}
              {dava.konu && (
                <span className="text-text-muted">
                  {dava.konu}
                </span>
              )}
              {dava.tarih && (
                <span className="text-text-dim flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {fmtTarih(dava.tarih)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px]">
              <span className="text-text-muted">
                Davacı: <span className="text-text font-medium">{taraflar.davaci}</span>
              </span>
              <span className="text-text-dim">vs</span>
              <span className="text-text-muted">
                Davalı: <span className="text-text font-medium">{taraflar.davali}</span>
              </span>
            </div>
          </div>

          {/* Sağ: Aksiyon butonları */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleSabitle({ id: dava.id, tip: 'dava', baslik: String(esasNo || dava.konu || dava.no || dava.id.slice(0, 8)), tarih: new Date().toISOString() })}
              className={`p-2 rounded-lg border transition-all ${isSabitlenen(dava.id) ? 'bg-gold/10 text-gold border-gold/20 shadow-[0_0_8px_rgba(201,168,76,0.15)]' : 'bg-surface text-text-dim border-border hover:border-gold/40 hover:text-gold'}`}
              title={isSabitlenen(dava.id) ? 'Hızlı erişimden kaldır' : 'Hızlı erişime sabitle'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSabitlenen(dava.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>

            <button
              onClick={() => setDuzenleModu(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-bg font-semibold text-xs hover:bg-gold-light transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Düzenle
            </button>

            {/* Diğer aksiyonlar — 3 nokta menü */}
            <div className="relative">
              <button
                onClick={() => setAksiyonMenuAcik(!aksiyonMenuAcik)}
                className="p-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text hover:border-gold/40 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
              {aksiyonMenuAcik && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAksiyonMenuAcik(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button onClick={() => { setTahsilatModal(true); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>
                      Tahsilat Ekle
                    </button>
                    <button onClick={() => { setAktifTab('evrak'); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></svg>
                      Evrak Ekle
                    </button>
                    <div className="my-1 border-t border-border/50" />
                    <button onClick={() => { arsivleMut.mutate(id); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                      Arşive Kaldır
                    </button>
                    <button onClick={async () => {
                      setAksiyonMenuAcik(false);
                      if (confirm(`"${esasNo || dava.konu || 'Bu dava'}" silinecek. Emin misiniz?`)) {
                        await silMut.mutateAsync(id);
                        router.push('/davalar');
                      }
                    }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red hover:bg-red/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      Dosyayı Sil
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Kapanış uyarısı */}
        {dava.durum === 'Kapalı' && dava.kapanisSebebi && (
          <div className="mt-3 bg-surface2/80 border border-border rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim flex-shrink-0"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span className="text-text-muted">
              Dosya kapatıldı — <span className="text-text font-medium">{dava.kapanisSebebi}</span>
              {dava.kapanisTarih && <span className="text-text-dim ml-1">({fmtTarih(dava.kapanisTarih)})</span>}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         AKILLI WİDGET KARTLARI — Kritik bilgiler + hızlı aksiyonlar
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Sonraki Duruşma */}
        <div className={`rounded-xl p-4 border transition-colors ${
          durusmaKalan !== null && durusmaKalan >= 0 && durusmaKalan <= 7
            ? 'bg-gold-dim border-gold/30 shadow-[0_0_12px_rgba(201,168,76,0.08)]'
            : durusmaKalan !== null && durusmaKalan >= 0
            ? 'bg-surface border-border'
            : 'bg-surface border-border/60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sonraki Duruşma</span>
            {durusmaKalan !== null && durusmaKalan >= 0 && (
              <SureBadge kalanGun={durusmaKalan} label="duruşma" compact />
            )}
          </div>
          {dava.durusma ? (
            <div>
              <div className="text-sm font-bold text-text">{durusmaTarihSaatGoster(dava.durusma, dava.durusmaSaati)}</div>
              {durusmaKalan !== null && durusmaKalan >= 0 && (
                <div className="text-[10px] text-text-muted mt-1">{durusmaKalan} gün kaldı</div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setDuzenleModu(true)}
              className="flex items-center gap-1.5 text-xs text-text-dim hover:text-gold transition-colors group"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-gold"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
              <span>Duruşma tarihi ekle</span>
            </button>
          )}
        </div>

        {/* Yaklaşan Süreler */}
        <div className={`rounded-xl p-4 border ${
          yaklasanSureler.length > 0 ? 'bg-red/5 border-red/20' : 'bg-surface border-border/60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Süreler</span>
            {yaklasanSureler.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red/15 text-red border border-red/20">
                {yaklasanSureler.length} aktif
              </span>
            )}
          </div>
          {yaklasanSureler.length > 0 ? (
            <div className="space-y-1">
              {yaklasanSureler.slice(0, 2).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-text truncate mr-2">{s.tip}</span>
                  <SureBadge kalanGun={s.hesap.kalanGun} compact />
                </div>
              ))}
              {yaklasanSureler.length > 2 && (
                <button onClick={() => setAktifTab('sureler')} className="text-[10px] text-gold hover:underline">
                  +{yaklasanSureler.length - 2} süre daha
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAktifTab('sureler')}
              className="flex items-center gap-1.5 text-xs text-text-dim hover:text-gold transition-colors group"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-gold"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              <span>Süre tanımla</span>
            </button>
          )}
        </div>

        {/* Finansal Durum */}
        <div className="rounded-xl p-4 border bg-surface border-border/60">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Finansal Durum</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Masraf</span>
              <span className="text-text font-medium">{fmt(hesap.masraf)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Tahsilat</span>
              <span className="text-green font-medium">{fmt(hesap.tahsilat + hesap.hakedis + hesap.vekalet)}</span>
            </div>
            <div className="border-t border-border/50 pt-1.5 flex justify-between text-xs">
              <span className="text-text-muted font-semibold">Net</span>
              <span className={`font-bold ${hesap.net >= 0 ? 'text-green' : 'text-red'}`}>{fmt(hesap.net)}</span>
            </div>
          </div>
        </div>

        {/* İlişkiler */}
        <div className="rounded-xl p-4 border bg-surface border-border/60">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">İlişkiler</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Müvekkil</span>
              <span className="text-text font-medium truncate ml-2">{muvAd}</span>
            </div>
            {dava.karsav && (
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Karşı Vekil</span>
                <span className="text-text truncate ml-2">{dava.karsav}</span>
              </div>
            )}
            {iliskiliIcra ? (
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">İlişkili İcra</span>
                <Link href={`/icra/${iliskiliIcra.id}`} className="text-gold hover:underline font-medium truncate ml-2">
                  {esasNoGoster(iliskiliIcra.esasYil, iliskiliIcra.esasNo) || iliskiliIcra.no || 'Dosya'}
                </Link>
              </div>
            ) : null}
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Evrak</span>
              <span className="text-text font-medium">{hesap.evrakSayisi} dosya</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SEKME NAVİGASYONU — Sayfanın ana motoru
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-surface border border-border rounded-t-xl">
        <div className="flex overflow-x-auto scrollbar-none border-b border-border">
          {TABS.map((tab) => {
            const isActive = aktifTab === tab.key;
            const badge = tab.key === 'sureler' && (dava.sureler || []).length > 0
              ? (dava.sureler || []).length
              : tab.key === 'evrak' && hesap.evrakSayisi > 0
              ? hesap.evrakSayisi
              : tab.key === 'harcama' && (dava.harcamalar || []).length > 0
              ? (dava.harcamalar || []).length
              : tab.key === 'tahsilat' && (dava.tahsilatlar || []).length > 0
              ? (dava.tahsilatlar || []).length
              : tab.key === 'notlar' && ((dava.notlar || []).length > 0 || dava.not)
              ? (dava.notlar || []).length + (dava.not ? 1 : 0)
              : 0;

            return (
              <button
                key={tab.key}
                onClick={() => setAktifTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
                  isActive
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-surface2/50'
                }`}
              >
                <span className={isActive ? 'text-gold' : 'text-text-dim'}>{tab.svg}</span>
                {tab.label}
                {badge > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-gold/15 text-gold' : 'bg-surface2 text-text-dim'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sekme İçeriği */}
        <div className="p-5">
          {aktifTab === 'ozet' && <OzetTab dava={dava} muvAd={muvAd} mahkeme={mahkemeAdi} taraflar={taraflar} esasNo={esasNo} hesap={hesap} iliskiliIcra={iliskiliIcra} onDuzenle={() => setDuzenleModu(true)} />}
          {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="dava" muvId={dava.muvId} />}
          {aktifTab === 'harcama' && (
            <HarcamaTab
              harcamalar={dava.harcamalar || []}
              onEkle={(h) => { davaKaydet.mutate({ ...dava, harcamalar: [...(dava.harcamalar || []), h] }); }}
              onGuncelle={(h) => { davaKaydet.mutate({ ...dava, harcamalar: (dava.harcamalar || []).map((x) => x.id === h.id ? h : x) }); }}
              onSil={(hId) => { davaKaydet.mutate({ ...dava, harcamalar: (dava.harcamalar || []).filter((x) => x.id !== hId) }); }}
            />
          )}
          {aktifTab === 'tahsilat' && (
            <TahsilatTab
              tahsilatlar={dava.tahsilatlar || []}
              onEkle={() => { setDuzenlenecekTahsilat(null); setTahsilatModal(true); }}
              onDuzenle={(t) => { setDuzenlenecekTahsilat(t); setTahsilatModal(true); }}
              onSil={(tahsilatId) => { davaKaydet.mutate({ ...dava, tahsilatlar: (dava.tahsilatlar || []).filter((t) => t.id !== tahsilatId) }); }}
            />
          )}
          {aktifTab === 'sureler' && (
            <SurelerTab
              sureler={dava.sureler || []}
              onEkle={(s) => { davaKaydet.mutate({ ...dava, sureler: [...(dava.sureler || []), s] }); }}
              onSil={(sId) => { davaKaydet.mutate({ ...dava, sureler: (dava.sureler || []).filter((x) => x.id !== sId) }); }}
            />
          )}
          {aktifTab === 'notlar' && (
            <NotlarTab
              notlar={dava.notlar || []}
              notText={dava.not}
              onEkle={(n) => { davaKaydet.mutate({ ...dava, notlar: [...(dava.notlar || []), n] }); }}
              onSil={(nId) => { davaKaydet.mutate({ ...dava, notlar: (dava.notlar || []).filter((x) => (x.id as string) !== nId) }); }}
            />
          )}
          {aktifTab === 'anlasma' && (
            <AnlasmaTab
              anlasma={dava.anlasma}
              onKaydet={(a) => { davaKaydet.mutate({ ...dava, anlasma: a }); }}
            />
          )}
        </div>
      </div>

      {/* Modaller */}
      {duzenleModu && (
        <DavaModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          dava={dava}
          onCreated={(d) => { davaKaydet.mutate(d); setDuzenleModu(false); }}
        />
      )}
      <TahsilatModal
        open={tahsilatModal}
        onClose={() => setTahsilatModal(false)}
        tahsilat={duzenlenecekTahsilat}
        onKaydet={(tahsilat) => {
          const mevcut = dava.tahsilatlar || [];
          const varMi = mevcut.find((t) => t.id === tahsilat.id);
          const yeniListe = varMi ? mevcut.map((t) => (t.id === tahsilat.id ? tahsilat : t)) : [...mevcut, tahsilat];
          davaKaydet.mutate({ ...dava, tahsilatlar: yeniListe });
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ÖZET SEKMESİ — Yeniden yapılandırılmış, tekrarsız
// ══════════════════════════════════════════════════════════════

function OzetTab({
  dava, muvAd, mahkeme, taraflar, esasNo: esas, hesap, iliskiliIcra, onDuzenle,
}: {
  dava: import('@/lib/hooks/useDavalar').Dava;
  muvAd: string;
  mahkeme: string;
  taraflar: { davaci: string; davali: string };
  esasNo: string;
  hesap: { masraf: number; tahsilat: number; hakedis: number; vekalet: number; evrakSayisi: number; net: number };
  iliskiliIcra: import('@/lib/hooks/useIcra').Icra | null;
  onDuzenle: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* İki sütunlu detay grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sol: Dava Bilgileri */}
        <div className="space-y-4">
          <SectionHeader title="Dava Bilgileri" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Yargı Birimi" value={dava.mtur || '—'} />
            <OzetSatir label="Dava Konusu" value={dava.konu || '—'} />
            <OzetSatir label="İl / Adliye" value={[dava.il, dava.adliye].filter(Boolean).join(' / ') || '—'} />
            <OzetSatir label="Mahkeme" value={mahkeme || '—'} />
            <OzetSatir label="Esas No" value={esas || '—'} />
            <OzetSatir label="Dava Tarihi" value={fmtTarih(dava.tarih) || '—'} />
            <OzetSatir label="Dava Değeri" value={dava.deger ? fmt(dava.deger) : '—'} />
            <OzetSatir label="Hakim" value={dava.hakim || '—'} />
            <OzetSatir label="Müvekkilin Tarafı" value={
              dava.taraf === 'davaci' ? 'Davacı' :
              dava.taraf === 'davali' ? 'Davalı' :
              dava.taraf === 'mudahil' ? 'Müdahil' : dava.taraf || '—'
            } />
          </div>
        </div>

        {/* Sağ: Karar & Taraflar */}
        <div className="space-y-4">
          <SectionHeader title="Karar Bilgileri" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Aşama" value={dava.asama || '—'} />
            <OzetSatir label="Durum" value={dava.durum || '—'} />
            <OzetSatir label="Karar No" value={dava.kararYil && dava.kararNo ? `${dava.kararYil}/${dava.kararNo}` : '—'} />
            <OzetSatir label="Karar Tarihi" value={fmtTarih(dava.ktarih) || '—'} />
            <OzetSatir label="Kesinleşme" value={fmtTarih(dava.kesin) || '—'} />
          </div>

          <SectionHeader title="Taraflar" className="mt-5" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Müvekkil" value={muvAd} />
            <OzetSatir label="Karşı Taraf" value={dava.karsi || '—'} />
            <OzetSatir label="Davacı" value={taraflar.davaci} />
            <OzetSatir label="Davalı" value={taraflar.davali} />
            <OzetSatir label="Karşı Vekil" value={dava.karsav || '—'} />
            {iliskiliIcra && (
              <div>
                <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">İlişkili İcra</div>
                <Link href={`/icra/${iliskiliIcra.id}`} className="text-xs text-gold hover:underline font-medium">
                  {esasNoGoster(iliskiliIcra.esasYil, iliskiliIcra.esasNo) || iliskiliIcra.no || 'Dosya'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duruşma vurgu kartı */}
      {dava.durusma && (
        <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <div>
              <div className="text-[10px] text-gold uppercase tracking-wider font-bold">Sonraki Duruşma</div>
              <div className="text-sm font-bold text-text">{durusmaTarihSaatGoster(dava.durusma, dava.durusmaSaati)}</div>
            </div>
          </div>
          <DurusmaBadge tarih={dava.durusma} saat={dava.durusmaSaati} />
        </div>
      )}

      {/* Finansal özet çizelgesi */}
      <div>
        <SectionHeader title="Finansal Durum" />
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
          <div className="grid grid-cols-5 gap-4">
            <FinansKart label="Masraf" value={hesap.masraf} color="text-text" />
            <FinansKart label="Tahsilat" value={hesap.tahsilat} color="text-green" />
            <FinansKart label="Hakediş" value={hesap.hakedis} color="text-gold" />
            <FinansKart label="Akdi Vekalet" value={hesap.vekalet} color="text-blue-400" />
            <div className="border-l border-border pl-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Net Durum</div>
              <div className={`font-[var(--font-playfair)] text-lg font-bold ${hesap.net >= 0 ? 'text-green' : 'text-red'}`}>
                {fmt(hesap.net)}
              </div>
              {/* Oran çubuğu */}
              {(hesap.masraf > 0 || hesap.tahsilat + hesap.hakedis + hesap.vekalet > 0) && (
                <div className="mt-2 h-1.5 rounded-full bg-surface2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hesap.net >= 0 ? 'bg-green' : 'bg-red'}`}
                    style={{ width: `${Math.min(100, Math.abs(hesap.net) / Math.max(hesap.masraf, hesap.tahsilat + hesap.hakedis + hesap.vekalet, 1) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notlar önizleme */}
      {dava.not && (
        <div>
          <SectionHeader title="Son Notlar" />
          <div className="mt-2 p-3 bg-surface2/30 rounded-lg text-xs text-text-muted whitespace-pre-wrap border border-border/30">
            {dava.not.length > 300 ? dava.not.slice(0, 300) + '...' : dava.not}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Yardımcı Componentler ────────────────────────────────────

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</h4>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function OzetSatir({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-text font-medium truncate" title={value}>{value}</div>
    </div>
  );
}

function FinansKart({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{fmt(value)}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

// ── Süreler Sekmesi ──────────────────────────────────────────
function SurelerTab({ sureler, onEkle, onSil }: {
  sureler: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  onEkle: (s: { id: string; tip: string; baslangic: string; gun: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [yeni, setYeni] = useState({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
  const SURE_TURLERI = ['Cevap Süresi', 'İstinaf Süresi', 'Temyiz Süresi', 'İtiraz Süresi', 'Islah Süresi', 'Bilirkişi İtiraz', 'Tanık Listesi', 'Delil Bildirimi', 'Diğer'];

  function handleKaydet() {
    if (!yeni.tip || !yeni.gun) return;
    onEkle({ id: crypto.randomUUID(), tip: yeni.tip, baslangic: yeni.baslangic, gun: Number(yeni.gun) });
    setYeni({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
    setForm(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-text-muted">{sureler.length > 0 && `${sureler.length} süre tanımlı`}</span>
        <button onClick={() => setForm(!form)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Süre Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Süre</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Süre Türü *</label>
              <select value={yeni.tip} onChange={(e) => setYeni(p => ({ ...p, tip: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                <option value="">Seçiniz...</option>
                {SURE_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Başlangıç Tarihi</label>
              <input type="date" value={yeni.baslangic} onChange={(e) => setYeni(p => ({ ...p, baslangic: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gün Sayısı *</label>
              <input type="number" value={yeni.gun} onChange={(e) => setYeni(p => ({ ...p, gun: e.target.value }))} placeholder="7" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tip || !yeni.gun} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}

      {sureler.length === 0 && !form ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} message="Henüz süre tanımlanmamış" action="+ Süre Ekle" onAction={() => setForm(true)} />
      ) : (
        <div className="space-y-2">
          {sureler.map((s) => {
            const hesapS = sureHesapla(s.baslangic, s.gun);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg group hover:bg-surface2 transition-colors">
                <SureBadge kalanGun={hesapS.kalanGun} compact />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text">{s.tip}</div>
                  <div className="text-[11px] text-text-muted">{fmtTarih(s.baslangic)} → {fmtTarih(hesapS.sonTarih)} ({s.gun} gün)</div>
                </div>
                <SureBadge kalanGun={hesapS.kalanGun} label={s.tip} />
                <button onClick={() => onSil(s.id)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Harcama Sekmesi ──────────────────────────────────────────
function HarcamaTab({ harcamalar, onEkle, onGuncelle, onSil }: {
  harcamalar: Array<{ id: string; kat?: string; acik?: string; tarih?: string; tutar: number }>;
  onEkle: (h: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
  onGuncelle: (h: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [duzenle, setDuzenle] = useState<string | null>(null);
  const [yeni, setYeni] = useState({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' });

  const HARCAMA_KAT = ['Harç', 'Posta/Tebligat', 'Bilirkişi', 'Keşif', 'Tanık', 'Yol/Konaklama', 'Fotokopi/Baskı', 'Vekaletname', 'Diğer'];
  const toplam = harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);

  function handleKaydet() {
    if (!yeni.tutar) return;
    if (duzenle) {
      onGuncelle({ id: duzenle, kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
      setDuzenle(null);
    } else {
      onEkle({ id: crypto.randomUUID(), kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
    }
    setYeni({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' });
    setForm(false);
  }

  function handleDuzenle(h: typeof harcamalar[0]) {
    setYeni({ kat: h.kat || '', acik: h.acik || '', tarih: h.tarih || '', tutar: String(h.tutar) });
    setDuzenle(h.id);
    setForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-text-muted">
          {harcamalar.length > 0 && <>Toplam: <span className="font-bold text-text">{fmt(toplam)}</span> · {harcamalar.length} kayıt</>}
        </span>
        <button onClick={() => { setForm(!form); setDuzenle(null); setYeni({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' }); }}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Harcama Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{duzenle ? 'Harcama Düzenle' : 'Yeni Harcama'}</div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Kategori</label>
              <select value={yeni.kat} onChange={(e) => setYeni(p => ({ ...p, kat: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                <option value="">Seçiniz...</option>
                {HARCAMA_KAT.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tarih</label>
              <input type="date" value={yeni.tarih} onChange={(e) => setYeni(p => ({ ...p, tarih: e.target.value }))} className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tutar (₺) *</label>
              <input type="number" value={yeni.tutar} onChange={(e) => setYeni(p => ({ ...p, tutar: e.target.value }))} placeholder="0.00" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
              <input type="text" value={yeni.acik} onChange={(e) => setYeni(p => ({ ...p, acik: e.target.value }))} placeholder="Harcama açıklaması" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tutar} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">{duzenle ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </div>
      )}

      {harcamalar.length === 0 && !form ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>} message="Henüz harcama kaydı yok" action="+ Harcama Ekle" onAction={() => setForm(true)} />
      ) : (
        <div className="space-y-1.5">
          {harcamalar.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg text-xs group hover:bg-surface2 transition-colors">
              <span className="text-text-dim w-20 flex-shrink-0">{fmtTarih(h.tarih)}</span>
              {h.kat && <span className="px-2 py-0.5 bg-surface rounded text-text-muted text-[10px] flex-shrink-0">{h.kat}</span>}
              <span className="flex-1 text-text truncate">{h.acik || '—'}</span>
              <span className="font-bold text-text flex-shrink-0">{fmt(h.tutar)}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                <button onClick={() => handleDuzenle(h)} className="text-text-dim hover:text-gold p-1" title="Düzenle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => onSil(h.id)} className="text-text-dim hover:text-red p-1" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tahsilat Sekmesi ─────────────────────────────────────────
function TahsilatTab({ tahsilatlar, onEkle, onDuzenle, onSil }: {
  tahsilatlar: Array<TahsilatKaydi>;
  onEkle: () => void;
  onDuzenle: (t: TahsilatKaydi) => void;
  onSil: (id: string) => void;
}) {
  const turLabel: Record<string, string> = {
    tahsilat: 'Tahsilat', akdi_vekalet: 'Akdi Vekalet', 'hakediş': 'Hakediş', aktarim: 'Aktarım', iade: 'İade',
  };
  const toplam = tahsilatlar.reduce((t, h) => t + (h.tutar || 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-text-muted">
          {tahsilatlar.length > 0 && <>Toplam: <span className="font-bold text-green">{fmt(toplam)}</span> · {tahsilatlar.length} kayıt</>}
        </div>
        <button onClick={onEkle} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">+ Tahsilat Ekle</button>
      </div>
      {tahsilatlar.length === 0 ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>} message="Henüz tahsilat kaydı yok" action="+ Tahsilat Ekle" onAction={onEkle} />
      ) : (
        <div className="space-y-1.5">
          {tahsilatlar.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg text-xs group hover:bg-surface2 transition-colors">
              <span className="text-text-dim w-20 flex-shrink-0">{fmtTarih(t.tarih)}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                t.tur === 'tahsilat' ? 'bg-green-dim text-green' :
                t.tur === 'akdi_vekalet' ? 'bg-blue-400/10 text-blue-400' :
                t.tur === 'hakediş' ? 'bg-gold-dim text-gold' :
                'bg-surface text-text-muted'
              }`}>{turLabel[t.tur] || t.tur}</span>
              <span className="flex-1 text-text truncate">{t.acik || '—'}</span>
              {t.makbuzKesildi && <span className="text-[10px] text-green flex-shrink-0" title="Makbuz kesildi">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </span>}
              <span className={`font-bold flex-shrink-0 ${t.tur === 'aktarim' || t.tur === 'iade' ? 'text-red' : 'text-green'}`}>{fmt(t.tutar)}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                <button onClick={() => onDuzenle(t)} className="text-text-dim hover:text-gold p-1" title="Düzenle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => onSil(t.id)} className="text-text-dim hover:text-red p-1" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notlar Sekmesi ───────────────────────────────────────────
function NotlarTab({ notlar, notText, onEkle, onSil }: {
  notlar: Record<string, unknown>[];
  notText?: string;
  onEkle: (n: { id: string; tarih: string; icerik: string }) => void;
  onSil: (id: string) => void;
}) {
  const [yeniNot, setYeniNot] = useState('');

  function handleEkle() {
    if (!yeniNot.trim()) return;
    onEkle({ id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() });
    setYeniNot('');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
          placeholder="Not ekle..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleEkle(); }}
          className="flex-1 px-4 py-2.5 bg-surface2/50 border border-border rounded-xl text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
        <button onClick={handleEkle} disabled={!yeniNot.trim()} className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-xl text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">+ Ekle</button>
      </div>

      {notText && <div className="p-3 bg-surface2/30 rounded-lg text-xs text-text whitespace-pre-wrap border border-border/30">{notText}</div>}
      {notlar.length === 0 && !notText && (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} message="Henüz not eklenmemiş" />
      )}
      {notlar.map((n, i) => (
        <div key={(n.id as string) || i} className="flex items-start gap-3 p-3 bg-surface2/50 rounded-lg group hover:bg-surface2 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-text-dim">{fmtTarih(n.tarih as string)}</span>
              {typeof n.yazar === 'string' && <span className="text-[11px] text-text-muted">{n.yazar}</span>}
            </div>
            <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
          </div>
          {typeof n.id === 'string' && (
            <button onClick={() => onSil(n.id as string)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0" title="Sil">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Anlaşma Sekmesi ──────────────────────────────────────────
function AnlasmaTab({ anlasma, onKaydet }: {
  anlasma?: Record<string, unknown>;
  onKaydet: (a: Record<string, unknown>) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({
    tur: (anlasma?.tur as string) || '',
    ucret: String(anlasma?.ucret || ''),
    yuzde: String(anlasma?.yuzde || ''),
    taksitSayisi: String(anlasma?.taksitSayisi || ''),
    taksitOdenen: String(anlasma?.taksitOdenen || ''),
    toplam: String(anlasma?.toplam || ''),
    vadeTarihi: (anlasma?.vadeTarihi as string) || '',
    aciklama: (anlasma?.aciklama as string) || '',
  });

  const turLabel: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksitli', basari: 'Başarıya Göre', tahsilat: 'Tahsilata Göre', karma: 'Karma' };
  const hasAnlasma = anlasma && Object.keys(anlasma).length > 0;

  function handleKaydet() {
    const yeni: Record<string, unknown> = { tur: form.tur };
    if (form.ucret) yeni.ucret = Number(form.ucret);
    if (form.yuzde) yeni.yuzde = Number(form.yuzde);
    if (form.taksitSayisi) yeni.taksitSayisi = Number(form.taksitSayisi);
    if (form.taksitOdenen) yeni.taksitOdenen = Number(form.taksitOdenen);
    if (form.toplam) yeni.toplam = Number(form.toplam);
    if (form.vadeTarihi) yeni.vadeTarihi = form.vadeTarihi;
    if (form.aciklama) yeni.aciklama = form.aciklama;
    onKaydet(yeni);
    setDuzenle(false);
  }

  function handleDuzenleBasla() {
    if (hasAnlasma) {
      setForm({
        tur: (anlasma?.tur as string) || '',
        ucret: String(anlasma?.ucret || ''),
        yuzde: String(anlasma?.yuzde || ''),
        taksitSayisi: String(anlasma?.taksitSayisi || ''),
        taksitOdenen: String(anlasma?.taksitOdenen || ''),
        toplam: String(anlasma?.toplam || ''),
        vadeTarihi: (anlasma?.vadeTarihi as string) || '',
        aciklama: (anlasma?.aciklama as string) || '',
      });
    }
    setDuzenle(true);
  }

  if (duzenle) {
    return (
      <div className="space-y-4">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{hasAnlasma ? 'Anlaşma Düzenle' : 'Yeni Anlaşma'}</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret Türü</label>
            <select value={form.tur} onChange={(e) => setForm(p => ({ ...p, tur: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
              <option value="">Seçiniz...</option>
              <option value="pesin">Peşin</option>
              <option value="taksit">Taksitli</option>
              <option value="basari">Başarıya Göre</option>
              <option value="tahsilat">Tahsilata Göre</option>
              <option value="karma">Karma</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret (₺)</label>
            <input type="number" value={form.ucret} onChange={(e) => setForm(p => ({ ...p, ucret: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Toplam Tutar (₺)</label>
            <input type="number" value={form.toplam} onChange={(e) => setForm(p => ({ ...p, toplam: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Yüzde (%)</label>
            <input type="number" value={form.yuzde} onChange={(e) => setForm(p => ({ ...p, yuzde: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          {form.tur === 'taksit' && (
            <>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Taksit Sayısı</label>
                <input type="number" value={form.taksitSayisi} onChange={(e) => setForm(p => ({ ...p, taksitSayisi: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Ödenen Taksit</label>
                <input type="number" value={form.taksitOdenen} onChange={(e) => setForm(p => ({ ...p, taksitOdenen: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Vade Tarihi</label>
            <input type="date" value={form.vadeTarihi} onChange={(e) => setForm(p => ({ ...p, vadeTarihi: e.target.value }))} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
            <textarea value={form.aciklama} onChange={(e) => setForm(p => ({ ...p, aciklama: e.target.value }))} rows={2} className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDuzenle(false)} className="px-4 py-1.5 bg-surface border border-border text-xs text-text-muted rounded-lg hover:text-text transition-colors">İptal</button>
          <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
        </div>
      </div>
    );
  }

  if (!hasAnlasma) {
    return (
      <EmptyTab
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
        message="Henüz vekalet anlaşması tanımlanmamış"
        action="+ Anlaşma Tanımla"
        onAction={handleDuzenleBasla}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Vekalet Anlaşması</div>
        <button onClick={handleDuzenleBasla} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Düzenle
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Ücret Türü" value={turLabel[(anlasma?.tur as string) || ''] || (anlasma?.tur as string) || '—'} />
        {typeof anlasma?.ucret === 'number' && <InfoRow label="Ücret" value={fmt(anlasma.ucret as number)} />}
        {typeof anlasma?.toplam === 'number' && <InfoRow label="Toplam" value={fmt(anlasma.toplam as number)} />}
        {anlasma?.yuzde != null && <InfoRow label="Yüzde" value={`%${String(anlasma.yuzde)}`} />}
        {anlasma?.taksitSayisi != null && <InfoRow label="Taksit Sayısı" value={String(anlasma.taksitSayisi)} />}
        {anlasma?.taksitOdenen != null && <InfoRow label="Ödenen Taksit" value={String(anlasma.taksitOdenen)} />}
        {typeof anlasma?.vadeTarihi === 'string' && anlasma.vadeTarihi && <InfoRow label="Vade Tarihi" value={fmtTarih(anlasma.vadeTarihi)} />}
      </div>
      {typeof anlasma?.aciklama === 'string' && anlasma.aciklama && (
        <div className="p-3 bg-surface2/30 rounded-lg text-xs text-text-muted border border-border/30">{anlasma.aciklama}</div>
      )}
    </div>
  );
}

// ── Boş Sekme ────────────────────────────────────────────────
function EmptyTab({ icon, message, action, onAction }: { icon: React.ReactNode; message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-xs text-text-muted mb-3">{message}</div>
      {action && onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}
