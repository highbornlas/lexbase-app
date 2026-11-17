'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useIcra, useIcraKaydet, useIcraSil, useIcraArsivle } from '@/lib/hooks/useIcra';
import { useDava } from '@/lib/hooks/useDavalar';
import { useMuvekkil } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  tamIcraDairesiAdi,
  esasNoGoster,
  alacakliBelirle,
  sureHesapla,
} from '@/lib/utils/uyapHelpers';
import { SureBadge } from '@/components/ui/SureBadge';
import type { TahsilatKaydi } from '@/components/modules/TahsilatModal';
import { dosyaTahsilatiKaydet } from '@/lib/finans/gelirKurallari';
import { useSonErisim } from '@/lib/hooks/useSonErisim';
import { icraDetayHesabi, icraIliskiliKayit, icraMuvekkilAdi } from '@/lib/finans/icraDetay';
import { OzetTab } from '@/components/modules/icra/detay/OzetTab';
import type { AlacakKalemi } from '@/lib/utils/faiz';

function DetailLoading() {
  return <div role="status" className="p-5 text-xs text-text-muted">Bölüm yükleniyor...</div>;
}

const IcraModal = dynamic(() => import('@/components/modules/IcraModal').then(m => m.IcraModal), { loading: DetailLoading });
const TahsilatModal = dynamic(() => import('@/components/modules/TahsilatModal').then(m => m.TahsilatModal), { loading: DetailLoading });
const DosyaEvrakTab = dynamic(() => import('@/components/modules/DosyaEvrakTab').then(m => m.DosyaEvrakTab), { loading: DetailLoading });
const DosyaHarcamaTab = dynamic(() => import('@/components/modules/DosyaHarcamaTab').then(m => m.DosyaHarcamaTab), { loading: DetailLoading });
const AlacakKalemleriPanel = dynamic(() => import('@/components/modules/icra/AlacakKalemleriPanel').then(m => m.AlacakKalemleriPanel), { loading: DetailLoading });
const KapakHesabiPanel = dynamic(() => import('@/components/modules/icra/KapakHesabi').then(m => m.KapakHesabiPanel), { loading: DetailLoading });
const TebligatlarTab = dynamic(() => import('@/components/modules/icra/detay/TebligatlarTab').then(m => m.TebligatlarTab), { loading: DetailLoading });
const TahsilatTab = dynamic(() => import('@/components/modules/icra/detay/TahsilatTab').then(m => m.TahsilatTab), { loading: DetailLoading });
const SurelerTab = dynamic(() => import('@/components/modules/icra/detay/SurelerTab').then(m => m.SurelerTab), { loading: DetailLoading });
const NotlarTab = dynamic(() => import('@/components/modules/icra/detay/NotlarTab').then(m => m.NotlarTab), { loading: DetailLoading });
const AnlasmaTab = dynamic(() => import('@/components/modules/icra/detay/AnlasmaTab').then(m => m.AnlasmaTab), { loading: DetailLoading });

// ── Sekme tanımları ──────────────────────────────────────────
const TABS = [
  { key: 'ozet', label: 'Özet', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { key: 'evrak', label: 'Evraklar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
  { key: 'tebligatlar', label: 'Tebligatlar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg> },
  { key: 'harcama', label: 'Harcamalar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
  { key: 'tahsilat', label: 'Tahsilat', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg> },
  { key: 'sureler', label: 'Süreler', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { key: 'notlar', label: 'Notlar', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { key: 'alacak', label: 'Alacak Kalemleri', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg> },
  { key: 'kapak', label: 'Kapak Hesabı', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/><path d="M14 2v6h6"/><path d="M3 15h6l2-2 2 2h6"/></svg> },
  { key: 'anlasma', label: 'Anlaşma', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> },
];

const DURUM_RENK: Record<string, string> = {
  'Aktif': 'bg-green-dim text-green border-green/20',
  'Takipte': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Haciz Aşaması': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Satış Aşaması': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Kapandı': 'bg-surface2 text-text-dim border-border',
};

// ══════════════════════════════════════════════════════════════
//  İcra Detay Sayfası — Yeniden Tasarım
// ══════════════════════════════════════════════════════════════

export default function IcraDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: icra, isLoading } = useIcra(id);
  const { data: muvekkil } = useMuvekkil(icra?.muvId || null);
  const { data: dava } = useDava(icra?.iliskiliDavaId || null);
  const router = useRouter();
  const icraKaydet = useIcraKaydet();
  const silMut = useIcraSil();
  const arsivleMut = useIcraArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [tahsilatModal, setTahsilatModal] = useState(false);
  const [duzenlenecekTahsilat, setDuzenlenecekTahsilat] = useState<TahsilatKaydi | null>(null);
  const [aksiyonMenuAcik, setAksiyonMenuAcik] = useState(false);
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (icra && !(icra as Record<string, unknown>)._silindi) {
      const baslik = String(esasNoGoster(icra.esasYil, icra.esasNo) || icra.konu || icra.no || icra.id.slice(0, 8));
      kaydetErisim({ id: icra.id, tip: 'icra', baslik, tarih: new Date().toISOString() });
    }
  }, [icra?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Müvekkil adı
  const muvAd = useMemo(() => {
    return icraMuvekkilAdi(muvekkil);
  }, [muvekkil]);

  // Tam icra dairesi adı
  const daireAdi = useMemo(() => {
    if (!icra) return '';
    return tamIcraDairesiAdi(icra.il, icra.daire, icra.adliye);
  }, [icra]);

  // Esas no
  const esasNo = useMemo(() => {
    if (!icra) return '';
    return esasNoGoster(icra.esasYil, icra.esasNo) || icra.esas || '';
  }, [icra]);

  // Alacaklı / Borçlu
  const taraflar = useMemo(() => {
    if (!icra) return { alacakli: '—', borclu: '—' };
    return alacakliBelirle(icra.muvRol, muvAd, icra.borclu || '—');
  }, [icra, muvAd]);

  // İlişkili Dava
  const iliskiliDava = useMemo(() => {
    return icraIliskiliKayit(dava);
  }, [dava]);

  // Hesaplamalar
  const hesap = useMemo(() => {
    return icraDetayHesabi(icra);
  }, [icra]);

  // İtiraz süresi hesaplama
  const itirazBilgi = useMemo(() => {
    if (!icra?.tebligTarihi) {
      if (!icra?.otarih) return null;
      const itirazTarih = icra.itarih || icra.itirazSonTarih;
      if (!itirazTarih) return null;
      const sonTarih = new Date(itirazTarih);
      const bugun = new Date();
      const kalanGun = Math.ceil((sonTarih.getTime() - bugun.getTime()) / 86400000);
      return { kalanGun, sonTarih: itirazTarih, gecmis: kalanGun < 0, acil: kalanGun >= 0 && kalanGun <= 2 };
    }
    const gunSayisi = icra.tur === 'Kambiyo Senetlerine Özgü Takip' ? 5 : 7;
    const sonuc = sureHesapla(icra.tebligTarihi, gunSayisi);
    return { kalanGun: sonuc.kalanGun, sonTarih: sonuc.sonTarih, gecmis: sonuc.gecmis, acil: sonuc.acil };
  }, [icra]);

  // Yaklaşan süreler
  const yaklasanSureler = useMemo(() => {
    if (!icra?.sureler?.length) return [];
    return icra.sureler
      .map((s) => ({ ...s, hesap: sureHesapla(s.baslangic, s.gun) }))
      .filter((s) => s.hesap.kalanGun >= 0 && s.hesap.kalanGun <= 14)
      .sort((a, b) => a.hesap.kalanGun - b.hesap.kalanGun);
  }, [icra]);

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

  if (!icra || (icra as Record<string, unknown>)._silindi) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <div className="text-sm text-text-muted">{(icra as Record<string, unknown> | null)?._silindi ? 'Bu icra dosyası silinmiş' : 'İcra dosyası bulunamadı'}</div>
        <Link href="/icra" className="text-xs text-gold mt-3 inline-block hover:underline">← İcra dosyalarına dön</Link>
      </div>
    );
  }

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════
         STICKY HEADER — Tüm temel bilgiler burada, tekrar yok
         ═══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm pb-4 -mx-2 px-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3 pt-1">
          <Link href="/icra" className="hover:text-gold transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            İcra Dosyaları
          </Link>
          <span className="text-text-dim">/</span>
          <span className="text-text font-medium">{esasNo || icra.no || icra.id.slice(0, 8)}</span>
        </div>

        {/* Ana Başlık Satırı */}
        <div className="flex items-start justify-between gap-4">
          {/* Sol: Dosya kimliği */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
                {daireAdi || '—'}
              </h1>
              {icra.muvRol && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  icra.muvRol === 'alacakli' ? 'bg-green-dim text-green border-green/20' : 'bg-red-dim text-red border-red/20'
                }`}>
                  {icra.muvRol === 'alacakli' ? 'ALACAKLI' : 'BORÇLU'}
                </span>
              )}
              {icra.durum && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${DURUM_RENK[icra.durum] || 'bg-gold-dim text-gold border-gold/20'}`}>
                  {icra.durum}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
              {esasNo && (
                <span className="font-[var(--font-playfair)] text-gold font-bold text-sm">
                  E. {esasNo}
                </span>
              )}
              {icra.tur && (
                <span className="text-text-muted">
                  {icra.tur}
                </span>
              )}
              {icra.tarih && (
                <span className="text-text-dim flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {fmtTarih(icra.tarih)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px]">
              <span className="text-text-muted">
                Alacaklı: <span className="text-text font-medium">{taraflar.alacakli}</span>
              </span>
              <span className="text-text-dim">→</span>
              <span className="text-text-muted">
                Borçlu: <span className="text-text font-medium">{taraflar.borclu}</span>
              </span>
            </div>
          </div>

          {/* Sağ: Aksiyon butonları */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleSabitle({ id: icra.id, tip: 'icra', baslik: String(esasNo || icra.konu || icra.no || icra.id.slice(0, 8)), tarih: new Date().toISOString() })}
              className={`p-2 rounded-lg border transition-all ${isSabitlenen(icra.id) ? 'bg-gold/10 text-gold border-gold/20 shadow-[0_0_8px_rgba(201,168,76,0.15)]' : 'bg-surface text-text-dim border-border hover:border-gold/40 hover:text-gold'}`}
              title={isSabitlenen(icra.id) ? 'Hızlı erişimden kaldır' : 'Hızlı erişime sabitle'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSabitlenen(icra.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
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
                    <button onClick={() => { setAktifTab('tebligatlar'); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                      Tebligat Ekle
                    </button>
                    <div className="my-1 border-t border-border/50" />
                    <button onClick={() => { arsivleMut.mutate(id); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                      Arşive Kaldır
                    </button>
                    <button onClick={async () => {
                      setAksiyonMenuAcik(false);
                      if (confirm(`"${esasNo || 'Bu icra dosyası'}" silinecek. Emin misiniz?`)) {
                        await silMut.mutateAsync(id);
                        router.push('/icra');
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
        {icra.durum === 'Kapandı' && icra.kapanisSebebi && (
          <div className="mt-3 bg-surface2/80 border border-border rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim flex-shrink-0"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span className="text-text-muted">
              Dosya kapatıldı — <span className="text-text font-medium">{icra.kapanisSebebi}</span>
              {icra.kapanisTarih && <span className="text-text-dim ml-1">({fmtTarih(icra.kapanisTarih)})</span>}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         AKILLI WİDGET KARTLARI — Kritik bilgiler + hızlı aksiyonlar
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Toplam Alacak + Tahsilat Oranı */}
        <div className={`rounded-xl p-4 border transition-colors ${
          hesap.tahsilOran >= 100 ? 'bg-green/5 border-green/20' :
          hesap.tahsilOran > 50 ? 'bg-gold-dim border-gold/30' :
          'bg-surface border-border/60'
        }`}>
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Alacak / Tahsilat</div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-sm font-bold text-gold">{fmt(icra.alacak || 0)}</div>
              <div className="text-[10px] text-text-muted mt-0.5">Tahsil: <span className="text-green font-bold">{fmt(hesap.tahsilat)}</span></div>
            </div>
            <span className={`text-lg font-bold font-[var(--font-playfair)] ${
              hesap.tahsilOran >= 100 ? 'text-green' : hesap.tahsilOran > 50 ? 'text-gold' : 'text-red'
            }`}>%{hesap.tahsilOran.toFixed(0)}</span>
          </div>
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hesap.tahsilOran >= 100 ? 'bg-green' : hesap.tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
              style={{ width: `${Math.min(hesap.tahsilOran, 100)}%` }}
            />
          </div>
        </div>

        {/* İtiraz Süresi */}
        <div className={`rounded-xl p-4 border ${
          itirazBilgi && !itirazBilgi.gecmis && itirazBilgi.acil ? 'bg-red/5 border-red/20' :
          itirazBilgi && !itirazBilgi.gecmis ? 'bg-gold-dim border-gold/30 shadow-[0_0_12px_rgba(201,168,76,0.08)]' :
          'bg-surface border-border/60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">İtiraz Süresi</span>
            {itirazBilgi && !itirazBilgi.gecmis && (
              <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" compact />
            )}
          </div>
          {itirazBilgi ? (
            <div>
              <div className="text-sm font-bold text-text">{fmtTarih(itirazBilgi.sonTarih)}</div>
              {!itirazBilgi.gecmis && (
                <div className="text-[10px] text-text-muted mt-1">{itirazBilgi.kalanGun} gün kaldı</div>
              )}
              {itirazBilgi.gecmis && (
                <div className="text-[10px] text-text-dim mt-1">Süre doldu</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-text-dim">
              Tebliğ tarihi girilmemiş
            </div>
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

        {/* İlişkiler */}
        <div className="rounded-xl p-4 border bg-surface border-border/60">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">İlişkiler</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">Müvekkil</span>
              <span className="text-text font-medium truncate ml-2">{muvAd}</span>
            </div>
            {icra.karsav && (
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Karşı Vekil</span>
                <span className="text-text truncate ml-2">{icra.karsav}</span>
              </div>
            )}
            {iliskiliDava ? (
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">İlişkili Dava</span>
                <Link href={`/davalar/${iliskiliDava.id}`} className="text-gold hover:underline font-medium truncate ml-2">
                  {esasNoGoster(iliskiliDava.esasYil, iliskiliDava.esasNo) || iliskiliDava.no || 'Dosya'}
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
            const badge = tab.key === 'sureler' && (icra.sureler || []).length > 0
              ? (icra.sureler || []).length
              : tab.key === 'evrak' && hesap.evrakSayisi > 0
              ? hesap.evrakSayisi
              : tab.key === 'harcama' && (icra.harcamalar || []).length > 0
              ? (icra.harcamalar || []).length
              : tab.key === 'tahsilat' && (icra.tahsilatlar || []).length > 0
              ? (icra.tahsilatlar || []).length
              : tab.key === 'tebligatlar' && (icra.tebligatlar || []).length > 0
              ? (icra.tebligatlar || []).length
              : tab.key === 'notlar' && ((icra.notlar || []).length > 0 || icra.not)
              ? (icra.notlar || []).length + (icra.not ? 1 : 0)
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
          {aktifTab === 'ozet' && <OzetTab icra={icra} muvAd={muvAd} daireAdi={daireAdi} taraflar={taraflar} esasNo={esasNo} hesap={hesap} itirazBilgi={itirazBilgi} iliskiliDava={iliskiliDava} onDuzenle={() => setDuzenleModu(true)} onUpdate={(guncel) => icraKaydet.mutate(guncel)} />}
          {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="icra" muvId={icra.muvId} />}
          {aktifTab === 'tebligatlar' && <TebligatlarTab icra={icra} onUpdate={(guncel) => icraKaydet.mutate(guncel)} />}
          {aktifTab === 'harcama' && (
            <DosyaHarcamaTab
              dosyaId={icra.id}
              dosyaTur="İcra"
              harcamalar={icra.harcamalar || []}
            />
          )}
          {aktifTab === 'tahsilat' && (
            <TahsilatTab
              tahsilatlar={icra.tahsilatlar || []}
              onEkle={() => { setDuzenlenecekTahsilat(null); setTahsilatModal(true); }}
              onDuzenle={(t) => { setDuzenlenecekTahsilat(t); setTahsilatModal(true); }}
              onSil={(tahsilatId) => { icraKaydet.mutate({ ...icra, tahsilatlar: (icra.tahsilatlar || []).filter((t) => t.id !== tahsilatId) }); }}
            />
          )}
          {aktifTab === 'sureler' && (
            <SurelerTab
              sureler={icra.sureler || []}
              onEkle={(s) => { icraKaydet.mutate({ ...icra, sureler: [...(icra.sureler || []), s] }); }}
              onSil={(sId) => { icraKaydet.mutate({ ...icra, sureler: (icra.sureler || []).filter((x) => x.id !== sId) }); }}
            />
          )}
          {aktifTab === 'notlar' && (
            <NotlarTab
              notlar={icra.notlar || []}
              notText={icra.not}
              onEkle={(n) => { icraKaydet.mutate({ ...icra, notlar: [...(icra.notlar || []), n] }); }}
              onSil={(nId) => { icraKaydet.mutate({ ...icra, notlar: (icra.notlar || []).filter((x) => (x.id as string) !== nId) }); }}
            />
          )}
          {aktifTab === 'alacak' && (
            <AlacakKalemleriPanel
              kalemler={(icra.alacakDetay || []) as AlacakKalemi[]}
              onChange={(kalemler) => { icraKaydet.mutate({ ...icra, alacakDetay: kalemler }); }}
              takipTarihi={icra.tarih || ''}
            />
          )}
          {aktifTab === 'kapak' && (
            <KapakHesabiPanel icra={icra} />
          )}
          {aktifTab === 'anlasma' && (
            <AnlasmaTab
              anlasma={icra.anlasma}
              onKaydet={(a) => { icraKaydet.mutate({ ...icra, anlasma: a }); }}
            />
          )}
        </div>
      </div>

      {/* Modaller */}
      {duzenleModu && (
        <IcraModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          icra={icra}
          onCreated={(ic) => {
            icraKaydet.mutate(ic);
            setDuzenleModu(false);
          }}
        />
      )}
      {tahsilatModal && <TahsilatModal
        icraDosyasi
        draftScope={`icra_${icra.id}`}
        open={tahsilatModal}
        onClose={() => setTahsilatModal(false)}
        tahsilat={duzenlenecekTahsilat}
        onKaydet={async (tahsilat) => {
          const yeniListe = dosyaTahsilatiKaydet(icra, { ...tahsilat }) as unknown as TahsilatKaydi[];
          await icraKaydet.mutateAsync({ ...icra, tahsilatlar: yeniListe });
        }}
      />}
    </div>
  );
}
