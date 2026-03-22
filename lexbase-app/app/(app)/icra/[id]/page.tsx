'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIcra, useIcraKaydet, useIcraSil, useIcraArsivle } from '@/lib/hooks/useIcra';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  tamIcraDairesiAdi,
  esasNoGoster,
  alacakliBelirle,
  sureHesapla,
} from '@/lib/utils/uyapHelpers';
import { SureBadge } from '@/components/ui/SureBadge';
import { IcraModal } from '@/components/modules/IcraModal';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';
import { TahsilatModal, type TahsilatKaydi } from '@/components/modules/TahsilatModal';
import { useSonErisim } from '@/lib/hooks/useSonErisim';
import { AlacakKalemleriPanel } from '@/components/modules/icra/AlacakKalemleriPanel';
import { KapakHesabiPanel } from '@/components/modules/icra/KapakHesabi';
import type { AlacakKalemi } from '@/lib/utils/faiz';

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
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
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
    if (!icra?.muvId || !muvekkillar) return '—';
    const m = muvekkillar.find((m) => m.id === icra.muvId);
    return m ? [m.ad, m.soyad].filter(Boolean).join(' ') : '—';
  }, [icra, muvekkillar]);

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
    if (!icra?.iliskiliDavaId || !davalar) return null;
    return davalar.find((d) => d.id === icra.iliskiliDavaId) || null;
  }, [icra, davalar]);

  // Hesaplamalar
  const hesap = useMemo(() => {
    if (!icra) return { masraf: 0, tahsilat: 0, tahsilOran: 0, kalan: 0, evrakSayisi: 0, net: 0 };
    const masraf = (icra.harcamalar || []).reduce((t, h) => t + (h.tutar || 0), 0);
    const tahsilat = (icra.tahsilatlar || []).reduce((t, h) => t + (h.tutar || 0), 0);
    const alacak = icra.alacak || 0;
    const tahsilOran = alacak > 0 ? Math.min((tahsilat / alacak) * 100, 100) : 0;
    const net = tahsilat - masraf;
    return { masraf, tahsilat, tahsilOran, kalan: alacak - tahsilat, evrakSayisi: (icra.evraklar || []).length, net };
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
            <HarcamaTab
              harcamalar={icra.harcamalar || []}
              onEkle={(h) => { icraKaydet.mutate({ ...icra, harcamalar: [...(icra.harcamalar || []), h] }); }}
              onGuncelle={(h) => { icraKaydet.mutate({ ...icra, harcamalar: (icra.harcamalar || []).map((x) => x.id === h.id ? h : x) }); }}
              onSil={(hId) => { icraKaydet.mutate({ ...icra, harcamalar: (icra.harcamalar || []).filter((x) => x.id !== hId) }); }}
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
      <TahsilatModal
        open={tahsilatModal}
        onClose={() => setTahsilatModal(false)}
        tahsilat={duzenlenecekTahsilat}
        onKaydet={(tahsilat) => {
          const mevcut = icra.tahsilatlar || [];
          const varMi = mevcut.find((t) => t.id === tahsilat.id);
          const yeniListe = varMi
            ? mevcut.map((t) => (t.id === tahsilat.id ? tahsilat : t))
            : [...mevcut, tahsilat];
          icraKaydet.mutate({ ...icra, tahsilatlar: yeniListe });
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ÖZET SEKMESİ — Yeniden yapılandırılmış, tekrarsız
// ══════════════════════════════════════════════════════════════

function OzetTab({
  icra, muvAd, daireAdi, taraflar, esasNo: esas, hesap, itirazBilgi, iliskiliDava, onDuzenle, onUpdate,
}: {
  icra: import('@/lib/hooks/useIcra').Icra;
  muvAd: string;
  daireAdi: string;
  taraflar: { alacakli: string; borclu: string };
  esasNo: string;
  hesap: { masraf: number; tahsilat: number; tahsilOran: number; kalan: number; evrakSayisi: number; net: number };
  itirazBilgi: { kalanGun: number; sonTarih: string; gecmis: boolean; acil: boolean } | null;
  iliskiliDava: import('@/lib/hooks/useDavalar').Dava | null;
  onDuzenle: () => void;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  return (
    <div className="space-y-6">
      {/* İki sütunlu detay grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sol: İcra Bilgileri */}
        <div className="space-y-4">
          <SectionHeader title="İcra Bilgileri" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Takip Türü" value={icra.tur || '—'} />
            <OzetSatir label="Alacak Türü" value={icra.atur || '—'} />
            <OzetSatir label="İl / Adliye" value={[icra.il, icra.adliye].filter(Boolean).join(' / ') || '—'} />
            <OzetSatir label="İcra Dairesi" value={daireAdi || icra.daire || '—'} />
            <OzetSatir label="Esas No" value={esas || '—'} />
            <OzetSatir label="Dayanak" value={icra.dayanak || '—'} />
            <OzetSatir label="Faiz" value={icra.faiz ? `%${icra.faiz}` : '—'} />
            <OzetSatir label="Toplam Alacak" value={icra.alacak ? fmt(icra.alacak) : '—'} />
          </div>
        </div>

        {/* Sağ: Tarihler & Taraflar */}
        <div className="space-y-4">
          <SectionHeader title="Tarihler" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Takip Tarihi" value={fmtTarih(icra.tarih) || '—'} />
            <OzetSatir label="Ödeme Emri" value={fmtTarih(icra.otarih) || '—'} />
            <OzetSatir label="Tebliğ Tarihi" value={fmtTarih(icra.tebligTarihi) || '—'} />
            <OzetSatir label="İtiraz Son Tarih" value={itirazBilgi ? fmtTarih(itirazBilgi.sonTarih) : '—'} />
          </div>

          <SectionHeader title="Taraflar" className="mt-5" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Müvekkil" value={muvAd} />
            <OzetSatir label="Müvekkil Rolü" value={icra.muvRol === 'alacakli' ? 'Alacaklı' : icra.muvRol === 'borclu' ? 'Borçlu' : '—'} />
            <OzetSatir label="Alacaklı" value={taraflar.alacakli} />
            <OzetSatir label="Borçlu" value={taraflar.borclu} />
            <OzetSatir label={icra.muvRol === 'borclu' ? 'Alacaklı TC' : 'Borçlu TC'} value={icra.btc || '—'} />
            <OzetSatir label="Karşı Vekil" value={icra.karsav || '—'} />
            {iliskiliDava && (
              <div>
                <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">İlişkili Dava</div>
                <Link href={`/davalar/${iliskiliDava.id}`} className="text-xs text-gold hover:underline font-medium">
                  {esasNoGoster(iliskiliDava.esasYil, iliskiliDava.esasNo) || iliskiliDava.no || 'Dosya'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İtiraz süresi vurgu kartı */}
      {itirazBilgi && !itirazBilgi.gecmis && (
        <div className={`border rounded-xl p-4 flex items-center justify-between ${itirazBilgi.acil ? 'bg-red/5 border-red/20' : 'bg-gold/5 border-gold/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${itirazBilgi.acil ? 'bg-red/10' : 'bg-gold/10'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={itirazBilgi.acil ? 'text-red' : 'text-gold'}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${itirazBilgi.acil ? 'text-red' : 'text-gold'}`}>İtiraz Süresi</div>
              <div className="text-sm font-bold text-text">Son tarih: {fmtTarih(itirazBilgi.sonTarih)}</div>
            </div>
          </div>
          <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" />
        </div>
      )}

      {/* Alacak Kalemleri */}
      <AlacakKalemleriSection icra={icra} hesap={hesap} onUpdate={onUpdate} />

      {/* Finansal özet çizelgesi */}
      <div>
        <SectionHeader title="Finansal Durum" />
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
          <div className="grid grid-cols-5 gap-4">
            <FinansKart label="Toplam Alacak" value={icra.alacak || 0} color="text-gold" />
            <FinansKart label="Tahsilat" value={hesap.tahsilat} color="text-green" />
            <FinansKart label="Kalan" value={hesap.kalan} color="text-red" />
            <FinansKart label="Masraf" value={hesap.masraf} color="text-text" />
            <div className="border-l border-border pl-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Net Durum</div>
              <div className={`font-[var(--font-playfair)] text-lg font-bold ${hesap.net >= 0 ? 'text-green' : 'text-red'}`}>
                {fmt(hesap.net)}
              </div>
              {(icra.alacak || 0) > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-surface2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hesap.tahsilOran >= 100 ? 'bg-green' : hesap.tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
                    style={{ width: `${Math.min(hesap.tahsilOran, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Haciz Takibi */}
      <HacizTakibiSection icra={icra} onUpdate={onUpdate} />

      {/* Odeme Plani */}
      <OdemePlaniSection icra={icra} onUpdate={onUpdate} />

      {/* Karşı Taraf Bilgileri (role göre borçlu/alacaklı) */}
      <BorcluBilgileriSection icra={icra} onUpdate={onUpdate} karsiRolLabel={icra.muvRol === 'borclu' ? 'Alacaklı' : 'Borçlu'} />

      {/* Notlar önizleme */}
      {icra.not && (
        <div>
          <SectionHeader title="Son Notlar" />
          <div className="mt-2 bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative">
            <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
            <div className="text-xs text-text whitespace-pre-wrap mt-1">
              {icra.not.length > 300 ? icra.not.slice(0, 300) + '...' : icra.not}
            </div>
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
  const SURE_TURLERI = ['İtiraz Süresi', 'Haciz İsteme Süresi', 'Satış İsteme Süresi', 'Şikayet Süresi', 'Ödeme Süresi', 'Takibin Kesinleşmesi', 'Diğer'];

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

  const HARCAMA_KAT = ['Harç', 'Posta/Tebligat', 'Bilirkişi', 'Keşif', 'Tanık', 'Yol/Konaklama', 'Fotokopi/Baskı', 'Vekaletname', 'Haciz Masrafı', 'Diğer'];
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

      {notText && (
        <div className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative">
          <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
          <div className="text-xs text-text whitespace-pre-wrap mt-1">{notText}</div>
        </div>
      )}
      {notlar.length === 0 && !notText && (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} message="Henüz not eklenmemiş" />
      )}
      {notlar.map((n, i) => (
        <div key={(n.id as string) || i} className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative group">
          <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
          <div className="flex items-start gap-3 mt-1">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-text-dim">{fmtTarih(n.tarih as string)}</span>
                {typeof n.yazar === 'string' && <span className="text-[10px] text-text-muted">{n.yazar}</span>}
              </div>
            </div>
            {typeof n.id === 'string' && (
              <button onClick={() => onSil(n.id as string)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0" title="Sil">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
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

// ── Tebligatlar Sekmesi (PTT Barkod Takibi) ─────────────────
function TebligatlarTab({ icra, onUpdate }: { icra: import('@/lib/hooks/useIcra').Icra; onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void }) {
  const [yeniForm, setYeniForm] = useState(false);
  const [form, setForm] = useState({
    tur: 'Ödeme Emri',
    alici: '',
    tarih: new Date().toISOString().split('T')[0],
    pttBarkod: '',
    tebligDurum: 'Gönderilmedi' as string,
    tebligTarih: '',
    not: '',
  });
  const [pttLoading, setPttLoading] = useState<string | null>(null);
  const [pttSonuc, setPttSonuc] = useState<Record<string, string>>({});

  const tebligatlar = icra.tebligatlar || [];

  function handleYeniEkle() {
    if (!form.alici?.trim()) return;
    const yeniTebligat = {
      id: crypto.randomUUID(),
      ...form,
    };
    onUpdate({ ...icra, tebligatlar: [...tebligatlar, yeniTebligat] });
    setForm({ tur: 'Ödeme Emri', alici: '', tarih: new Date().toISOString().split('T')[0], pttBarkod: '', tebligDurum: 'Gönderilmedi', tebligTarih: '', not: '' });
    setYeniForm(false);
  }

  function handleSil(id: string) {
    if (!confirm('Bu tebligat kaydını silmek istediğinize emin misiniz?')) return;
    onUpdate({ ...icra, tebligatlar: tebligatlar.filter((t) => t.id !== id) });
  }

  async function handlePttSorgula(tebligatId: string, barkod: string) {
    if (!barkod?.trim()) return;
    setPttLoading(tebligatId);
    setPttSonuc((prev) => ({ ...prev, [tebligatId]: '' }));
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: barkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: `${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}` }));
        if (data.tebligDurum) {
          const guncelTebligatlar = tebligatlar.map((t) =>
            t.id === tebligatId
              ? {
                  ...t,
                  tebligDurum: data.tebligDurum,
                  ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
                  pttSonSorgu: new Date().toISOString(),
                  pttSonuc: data.durum,
                }
              : t
          );
          onUpdate({ ...icra, tebligatlar: guncelTebligatlar });
        }
      } else {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Otomatik sorgu başarısız. PTT sitesi açılıyor...' }));
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Bağlantı hatası. PTT sitesi açılıyor...' }));
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
    } finally {
      setPttLoading(null);
    }
  }

  const TEBLIGAT_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-4">
      {/* Başlık + Yeni Ekle */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">{tebligatlar.length} tebligat kaydı</div>
        <button
          onClick={() => setYeniForm(!yeniForm)}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          {yeniForm ? 'İptal' : '+ Yeni Tebligat'}
        </button>
      </div>

      {/* Yeni Tebligat Formu */}
      {yeniForm && (
        <div className="bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Tebligat Ekle</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tür</label>
              <select
                value={form.tur}
                onChange={(e) => setForm((p) => ({ ...p, tur: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Ödeme Emri</option>
                <option>İcra Emri</option>
                <option>Haciz İhbarnamesi</option>
                <option>Satış İlanı</option>
                <option>103 Davetiye</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Alıcı *</label>
              <input
                value={form.alici}
                onChange={(e) => setForm((p) => ({ ...p, alici: e.target.value }))}
                placeholder="Tebligat alıcısı"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gönderim Tarihi</label>
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">PTT Barkod No</label>
              <input
                value={form.pttBarkod}
                onChange={(e) => setForm((p) => ({ ...p, pttBarkod: e.target.value }))}
                placeholder="RR123456789TR"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tebliğ Durumu</label>
              <select
                value={form.tebligDurum}
                onChange={(e) => setForm((p) => ({ ...p, tebligDurum: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Gönderilmedi</option>
                <option>PTT&apos;de Bekliyor</option>
                <option>Tebliğ Edildi</option>
                <option>İade Döndü</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Not</label>
              <input
                value={form.not}
                onChange={(e) => setForm((p) => ({ ...p, not: e.target.value }))}
                placeholder="Opsiyonel not"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleYeniEkle}
              disabled={!form.alici?.trim()}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Tebligat Listesi */}
      {tebligatlar.length === 0 && !yeniForm ? (
        <EmptyTab icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>} message="Henüz tebligat kaydı eklenmemiş" action="+ Tebligat Ekle" onAction={() => setYeniForm(true)} />
      ) : (
        <div className="space-y-3">
          {tebligatlar.map((t) => (
            <div key={t.id} className="bg-surface2/50 rounded-xl p-4 border border-border/50 space-y-2 hover:bg-surface2 transition-colors">
              {/* Üst satır: Tür + Alıcı + Durum + Sil */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {t.tur || 'Tebligat'}
                  </span>
                  <span className="text-xs font-medium text-text">{t.alici || '—'}</span>
                  {t.tarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tarih)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TEBLIGAT_DURUM_RENK[t.tebligDurum || 'Gönderilmedi'] || 'bg-surface2 text-text-dim border-border'}`}>
                    {t.tebligDurum || 'Gönderilmedi'}
                  </span>
                  {t.tebligTarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tebligTarih)}</span>}
                  <button onClick={() => handleSil(t.id)} className="text-text-dim hover:text-red transition-colors p-1" title="Sil">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* PTT Barkod Sorgulama */}
              {t.pttBarkod && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim flex-shrink-0"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M6 8v8M10 8v8M14 8v8M18 8v8"/></svg>
                  <span className="text-[11px] font-mono text-text">{t.pttBarkod}</span>
                  <button
                    onClick={() => handlePttSorgula(t.id, t.pttBarkod!)}
                    disabled={pttLoading === t.id}
                    className="ml-auto px-3 py-1 bg-[#E30613] text-white text-[10px] font-bold rounded hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    {pttLoading === t.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    )}
                    {pttLoading === t.id ? 'Sorgulanıyor...' : "PTT'den Sorgula"}
                  </button>
                </div>
              )}

              {/* PTT Sonucu */}
              {pttSonuc[t.id] && (
                <div className={`text-[11px] px-3 py-1.5 rounded border ${
                  pttSonuc[t.id].includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
                  pttSonuc[t.id].includes('İade') ? 'bg-red-dim border-red/20 text-red' :
                  pttSonuc[t.id].includes('hata') || pttSonuc[t.id].includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
                  'bg-blue-400/10 border-blue-400/20 text-blue-400'
                }`}>
                  {pttSonuc[t.id]}
                </div>
              )}

              {/* Son Sorgu Bilgisi */}
              {t.pttSonSorgu && (
                <div className="text-[10px] text-text-dim">
                  Son sorgu: {new Date(t.pttSonSorgu).toLocaleString('tr-TR')}
                  {t.pttSonuc && ` — ${t.pttSonuc}`}
                </div>
              )}

              {/* Not */}
              {t.not && <div className="text-[11px] text-text-muted italic">{t.not}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ALACAK KALEMLERİ SEKSİYONU
// ══════════════════════════════════════════════════════════════
function AlacakKalemleriSection({ icra, hesap, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  hesap: { tahsilat: number };
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const k = icra.alacakKalemleri || {};
  const [form, setForm] = useState({
    asilAlacak: String(k.asilAlacak || ''),
    islemisiFaiz: String(k.islemisiFaiz || ''),
    davaMasrafi: String(k.davaMasrafi || ''),
    vekaletUcreti: String(k.vekaletUcreti || ''),
    icraHarci: String(k.icraHarci || ''),
    digerMasraflar: String(k.digerMasraflar || ''),
  });

  useEffect(() => {
    const kk = icra.alacakKalemleri || {};
    setForm({
      asilAlacak: String(kk.asilAlacak || ''),
      islemisiFaiz: String(kk.islemisiFaiz || ''),
      davaMasrafi: String(kk.davaMasrafi || ''),
      vekaletUcreti: String(kk.vekaletUcreti || ''),
      icraHarci: String(kk.icraHarci || ''),
      digerMasraflar: String(kk.digerMasraflar || ''),
    });
  }, [icra.alacakKalemleri]);

  const toplam = (Number(form.asilAlacak) || 0) + (Number(form.islemisiFaiz) || 0) + (Number(form.davaMasrafi) || 0) +
    (Number(form.vekaletUcreti) || 0) + (Number(form.icraHarci) || 0) + (Number(form.digerMasraflar) || 0);
  const mevcutToplam = (k.asilAlacak || 0) + (k.islemisiFaiz || 0) + (k.davaMasrafi || 0) +
    (k.vekaletUcreti || 0) + (k.icraHarci || 0) + (k.digerMasraflar || 0);
  const kalan = mevcutToplam - hesap.tahsilat;
  const tahsilOran = mevcutToplam > 0 ? Math.min((hesap.tahsilat / mevcutToplam) * 100, 100) : 0;
  const hasData = Object.values(k).some((v) => typeof v === 'number' && v > 0);

  function handleKaydet() {
    const yeni: typeof k = {};
    if (form.asilAlacak) yeni.asilAlacak = Number(form.asilAlacak);
    if (form.islemisiFaiz) yeni.islemisiFaiz = Number(form.islemisiFaiz);
    if (form.davaMasrafi) yeni.davaMasrafi = Number(form.davaMasrafi);
    if (form.vekaletUcreti) yeni.vekaletUcreti = Number(form.vekaletUcreti);
    if (form.icraHarci) yeni.icraHarci = Number(form.icraHarci);
    if (form.digerMasraflar) yeni.digerMasraflar = Number(form.digerMasraflar);
    onUpdate({ ...icra, alacakKalemleri: yeni });
    setDuzenle(false);
  }

  const KALEMLER: { key: keyof typeof form; label: string }[] = [
    { key: 'asilAlacak', label: 'Asil Alacak' },
    { key: 'islemisiFaiz', label: 'Islemis Faiz' },
    { key: 'davaMasrafi', label: 'Dava Masrafi' },
    { key: 'vekaletUcreti', label: 'Vekalet Ucreti' },
    { key: 'icraHarci', label: 'Icra Harci' },
    { key: 'digerMasraflar', label: 'Diger Masraflar' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Alacak Kalemleri" />
        <button onClick={() => setDuzenle(!duzenle)} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {duzenle ? 'Iptal' : 'Duzenle'}
        </button>
      </div>
      <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
        {duzenle ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {KALEMLER.map((kl) => (
                <div key={kl.key}>
                  <label className="text-[10px] text-text-muted block mb-1">{kl.label} (TL)</label>
                  <input type="number" value={form[kl.key]} onChange={(e) => setForm((p) => ({ ...p, [kl.key]: e.target.value }))}
                    placeholder="0" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="text-xs text-text-muted">Toplam: <span className="font-bold text-gold">{fmt(toplam)}</span></div>
              <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {k.asilAlacak ? <InfoRow label="Asil Alacak" value={fmt(k.asilAlacak)} /> : null}
              {k.islemisiFaiz ? <InfoRow label="Islemis Faiz" value={fmt(k.islemisiFaiz)} /> : null}
              {k.davaMasrafi ? <InfoRow label="Dava Masrafi" value={fmt(k.davaMasrafi)} /> : null}
              {k.vekaletUcreti ? <InfoRow label="Vekalet Ucreti" value={fmt(k.vekaletUcreti)} /> : null}
              {k.icraHarci ? <InfoRow label="Icra Harci" value={fmt(k.icraHarci)} /> : null}
              {k.digerMasraflar ? <InfoRow label="Diger Masraflar" value={fmt(k.digerMasraflar)} /> : null}
            </div>
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Toplam Alacak: <span className="font-bold text-gold">{fmt(mevcutToplam)}</span></span>
                <span className="text-xs text-text-muted">Tahsil: <span className="font-bold text-green">{fmt(hesap.tahsilat)}</span> / Kalan: <span className="font-bold text-red">{fmt(Math.max(kalan, 0))}</span></span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${tahsilOran >= 100 ? 'bg-green' : tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
                  style={{ width: `${Math.min(tahsilOran, 100)}%` }} />
              </div>
              <div className="text-right mt-1 text-[10px] text-text-dim">%{tahsilOran.toFixed(1)} tahsil edildi</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-text-dim">
            Alacak kalemleri henuz girilmemis.
            <button onClick={() => setDuzenle(true)} className="text-gold hover:underline ml-1">Ekle</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HACİZ TAKİBİ SEKSİYONU
// ══════════════════════════════════════════════════════════════
const HACIZ_TUR_IKON: Record<string, string> = {
  banka: '\u{1F3E6}', maas: '\u{1F4B0}', tasinir: '\u{1F4E6}', tasinmaz: '\u{1F3E0}', arac: '\u{1F697}', diger: '\u{1F4CB}',
};
const HACIZ_TUR_LABEL: Record<string, string> = {
  banka: 'Banka Haczi', maas: 'Maas Haczi', tasinir: 'Tasinir Haczi', tasinmaz: 'Tasinmaz Haczi', arac: 'Arac Haczi', diger: 'Diger',
};
const HACIZ_DURUM_RENK: Record<string, string> = {
  talep_edildi: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  uygulandi: 'bg-green-dim text-green border-green/20',
  kaldirildi: 'bg-surface2 text-text-dim border-border',
  sonucsuz: 'bg-red-dim text-red border-red/20',
};
const HACIZ_DURUM_LABEL: Record<string, string> = {
  talep_edildi: 'Talep Edildi', uygulandi: 'Uygulandi', kaldirildi: 'Kaldirildi', sonucsuz: 'Sonucsuz',
};

type HacizKaydi = NonNullable<import('@/lib/hooks/useIcra').Icra['hacizler']>[number];

function HacizTakibiSection({ icra, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const [formAcik, setFormAcik] = useState(false);
  const [yeni, setYeni] = useState<Partial<HacizKaydi>>({
    tur: 'banka', tarih: new Date().toISOString().split('T')[0], aciklama: '', kurum: '', durum: 'talep_edildi',
  });

  const hacizler = icra.hacizler || [];

  function handleEkle() {
    if (!yeni.aciklama?.trim()) return;
    const kayit: HacizKaydi = {
      id: crypto.randomUUID(),
      tarih: yeni.tarih || new Date().toISOString().split('T')[0],
      tur: (yeni.tur as HacizKaydi['tur']) || 'diger',
      aciklama: yeni.aciklama || '',
      kurum: yeni.kurum || undefined,
      tutar: yeni.tutar || undefined,
      durum: (yeni.durum as HacizKaydi['durum']) || 'talep_edildi',
    };
    onUpdate({ ...icra, hacizler: [...hacizler, kayit] });
    setYeni({ tur: 'banka', tarih: new Date().toISOString().split('T')[0], aciklama: '', kurum: '', durum: 'talep_edildi' });
    setFormAcik(false);
  }

  function handleDurumDegistir(hacizId: string, yeniDurum: HacizKaydi['durum']) {
    onUpdate({ ...icra, hacizler: hacizler.map((h) => h.id === hacizId ? { ...h, durum: yeniDurum } : h) });
  }

  function handleSil(hacizId: string) {
    onUpdate({ ...icra, hacizler: hacizler.filter((h) => h.id !== hacizId) });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Haciz Takibi" />
        <button onClick={() => setFormAcik(!formAcik)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {formAcik ? 'Iptal' : '+ Yeni Haciz Ekle'}
        </button>
      </div>

      {formAcik && (
        <div className="mt-3 bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Haciz Kaydi</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Haciz Turu *</label>
              <select value={yeni.tur || 'banka'} onChange={(e) => setYeni((p) => ({ ...p, tur: e.target.value as HacizKaydi['tur'] }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                {Object.entries(HACIZ_TUR_LABEL).map(([v, l]) => <option key={v} value={v}>{HACIZ_TUR_IKON[v]} {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tarih</label>
              <input type="date" value={yeni.tarih || ''} onChange={(e) => setYeni((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Durum</label>
              <select value={yeni.durum || 'talep_edildi'} onChange={(e) => setYeni((p) => ({ ...p, durum: e.target.value as HacizKaydi['durum'] }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                {Object.entries(HACIZ_DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Kurum / Banka</label>
              <input type="text" value={yeni.kurum || ''} onChange={(e) => setYeni((p) => ({ ...p, kurum: e.target.value }))}
                placeholder="Banka adi, isveren vs." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tutar (TL)</label>
              <input type="number" value={yeni.tutar || ''} onChange={(e) => setYeni((p) => ({ ...p, tutar: Number(e.target.value) || undefined }))}
                placeholder="0" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Aciklama *</label>
              <input type="text" value={yeni.aciklama || ''} onChange={(e) => setYeni((p) => ({ ...p, aciklama: e.target.value }))}
                placeholder="Haciz aciklamasi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleEkle} disabled={!yeni.aciklama?.trim()} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {hacizler.length === 0 && !formAcik ? (
          <div className="text-center py-6 bg-surface2/30 rounded-xl border border-border/30">
            <div className="text-2xl mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div className="text-xs text-text-dim">Henuz haciz kaydi yok</div>
          </div>
        ) : (
          <div className="space-y-2">
            {hacizler.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-surface2/50 rounded-lg text-xs group hover:bg-surface2 transition-colors">
                <span className="text-lg flex-shrink-0" title={HACIZ_TUR_LABEL[h.tur] || h.tur}>{HACIZ_TUR_IKON[h.tur] || '\u{1F4CB}'}</span>
                <span className="text-text-dim w-20 flex-shrink-0">{fmtTarih(h.tarih)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-text font-medium truncate">{h.aciklama}</div>
                  {h.kurum && <div className="text-[10px] text-text-muted">{h.kurum}</div>}
                </div>
                {h.tutar != null && h.tutar > 0 && <span className="font-bold text-text flex-shrink-0">{fmt(h.tutar)}</span>}
                <select value={h.durum} onChange={(e) => handleDurumDegistir(h.id, e.target.value as HacizKaydi['durum'])}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 bg-transparent cursor-pointer focus:outline-none ${HACIZ_DURUM_RENK[h.durum] || ''}`}>
                  {Object.entries(HACIZ_DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => handleSil(h.id)} className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0" title="Sil">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ODEME PLANI SEKSİYONU
// ══════════════════════════════════════════════════════════════
function OdemePlaniSection({ icra, onUpdate }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  const plan = icra.odemePlani;
  const [setupAcik, setSetupAcik] = useState(false);
  const [form, setForm] = useState({
    toplamTutar: String(plan?.toplamTutar || icra.alacak || ''),
    taksitSayisi: String(plan?.taksitSayisi || '6'),
    baslangicTarihi: plan?.baslangicTarihi || new Date().toISOString().split('T')[0],
  });

  function handlePlanOlustur() {
    const toplamTutar = Number(form.toplamTutar) || 0;
    const taksitSayisi = Number(form.taksitSayisi) || 1;
    if (toplamTutar <= 0 || taksitSayisi <= 0) return;
    const taksitTutar = Math.round((toplamTutar / taksitSayisi) * 100) / 100;
    const taksitler: NonNullable<import('@/lib/hooks/useIcra').Icra['odemePlani']>['taksitler'] = [];
    const baslangic = new Date(form.baslangicTarihi);
    for (let i = 0; i < taksitSayisi; i++) {
      const vade = new Date(baslangic);
      vade.setMonth(vade.getMonth() + i);
      const tutar = i === taksitSayisi - 1 ? Math.round((toplamTutar - taksitTutar * (taksitSayisi - 1)) * 100) / 100 : taksitTutar;
      taksitler.push({
        id: crypto.randomUUID(),
        no: i + 1,
        vadeTarihi: vade.toISOString().split('T')[0],
        tutar,
        odpiYapildiMi: false,
      });
    }
    onUpdate({
      ...icra,
      odemePlani: { aktif: true, toplamTutar, taksitSayisi, baslangicTarihi: form.baslangicTarihi, taksitler },
    });
    setSetupAcik(false);
  }

  function handleToggleAktif() {
    if (plan) {
      onUpdate({ ...icra, odemePlani: { ...plan, aktif: !plan.aktif } });
    }
  }

  function handleTaksitOde(taksitId: string, odendi: boolean) {
    if (!plan) return;
    const guncelTaksitler = plan.taksitler.map((t) =>
      t.id === taksitId ? { ...t, odpiYapildiMi: odendi, odemeTarihi: odendi ? new Date().toISOString().split('T')[0] : undefined } : t
    );
    onUpdate({ ...icra, odemePlani: { ...plan, taksitler: guncelTaksitler } });
  }

  function handlePlanSil() {
    onUpdate({ ...icra, odemePlani: undefined });
  }

  const odenmisTaksit = plan?.taksitler.filter((t) => t.odpiYapildiMi).length || 0;
  const toplamTaksit = plan?.taksitler.length || 0;
  const bugun = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeader title="Odeme Plani" />
        {!plan ? (
          <button onClick={() => setSetupAcik(!setupAcik)} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
            {setupAcik ? 'Iptal' : '+ Odeme Plani Olustur'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <input type="checkbox" checked={plan.aktif} onChange={handleToggleAktif}
                className="rounded border-border text-gold focus:ring-gold" />
              Aktif
            </label>
            <button onClick={handlePlanSil} className="text-xs text-red hover:underline">Plani Sil</button>
          </div>
        )}
      </div>

      {setupAcik && !plan && (
        <div className="mt-3 bg-surface2/50 border border-border rounded-xl p-4 space-y-3">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Yeni Odeme Plani</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Toplam Tutar (TL) *</label>
              <input type="number" value={form.toplamTutar} onChange={(e) => setForm((p) => ({ ...p, toplamTutar: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Taksit Sayisi *</label>
              <input type="number" value={form.taksitSayisi} onChange={(e) => setForm((p) => ({ ...p, taksitSayisi: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Baslangic Tarihi</label>
              <input type="date" value={form.baslangicTarihi} onChange={(e) => setForm((p) => ({ ...p, baslangicTarihi: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handlePlanOlustur} disabled={!form.toplamTutar || !form.taksitSayisi}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">Plan Olustur</button>
          </div>
        </div>
      )}

      {plan && (
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4 space-y-3">
          {/* İlerleme */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Toplam: <span className="font-bold text-gold">{fmt(plan.toplamTutar)}</span></span>
            <span className="text-text-muted">{odenmisTaksit}/{toplamTaksit} taksit odendi</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${odenmisTaksit >= toplamTaksit ? 'bg-green' : 'bg-gold'}`}
              style={{ width: `${toplamTaksit > 0 ? (odenmisTaksit / toplamTaksit) * 100 : 0}%` }} />
          </div>

          {/* Taksit listesi */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {plan.taksitler.map((t) => {
              const gecmis = !t.odpiYapildiMi && t.vadeTarihi < bugun;
              const siradaki = !t.odpiYapildiMi && !gecmis && t.vadeTarihi >= bugun &&
                !plan.taksitler.some((x) => !x.odpiYapildiMi && x.vadeTarihi < t.vadeTarihi && x.vadeTarihi >= bugun);
              return (
                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs transition-colors ${
                  t.odpiYapildiMi ? 'bg-green/5 border border-green/10' :
                  gecmis ? 'bg-red/5 border border-red/20' :
                  siradaki ? 'bg-gold/5 border border-gold/20' :
                  'bg-surface border border-border/30'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={t.odpiYapildiMi} onChange={(e) => handleTaksitOde(t.id, e.target.checked)}
                      className="rounded border-border text-gold focus:ring-gold" />
                    <span className="text-text-dim w-6 text-right font-mono">{t.no}.</span>
                  </label>
                  <span className="text-text-muted w-24 flex-shrink-0">{fmtTarih(t.vadeTarihi)}</span>
                  <span className="font-bold text-text flex-1">{fmt(t.tutar)}</span>
                  {t.odpiYapildiMi && t.odemeTarihi && (
                    <span className="text-[10px] text-green flex-shrink-0">Odeme: {fmtTarih(t.odemeTarihi)}</span>
                  )}
                  {gecmis && <span className="text-[10px] font-bold text-red flex-shrink-0">Gecikti</span>}
                  {siradaki && <span className="text-[10px] font-bold text-gold flex-shrink-0">Siradaki</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!plan && !setupAcik && (
        <div className="mt-3 text-center py-6 bg-surface2/30 rounded-xl border border-border/30">
          <div className="text-xs text-text-dim">Odeme plani tanimlanmamis</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BORCLU BİLGİLERİ SEKSİYONU
// ══════════════════════════════════════════════════════════════
function BorcluBilgileriSection({ icra, onUpdate, karsiRolLabel = 'Borçlu' }: {
  icra: import('@/lib/hooks/useIcra').Icra;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
  karsiRolLabel?: string;
}) {
  const [acik, setAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(false);
  const det = icra.borcluDetay || {};
  const [form, setForm] = useState({
    tcVkn: det.tcVkn || '',
    adres: det.adres || '',
    isveren: det.isveren || '',
    isverenAdres: det.isverenAdres || '',
    bankaHesaplari: (det.bankaHesaplari || []).join('\n'),
    aracPlakalari: (det.aracPlakalari || []).join('\n'),
    tasinmazlar: (det.tasinmazlar || []).join('\n'),
  });

  useEffect(() => {
    const d = icra.borcluDetay || {};
    setForm({
      tcVkn: d.tcVkn || '',
      adres: d.adres || '',
      isveren: d.isveren || '',
      isverenAdres: d.isverenAdres || '',
      bankaHesaplari: (d.bankaHesaplari || []).join('\n'),
      aracPlakalari: (d.aracPlakalari || []).join('\n'),
      tasinmazlar: (d.tasinmazlar || []).join('\n'),
    });
  }, [icra.borcluDetay]);

  const hasData = det.tcVkn || det.adres || det.isveren || (det.bankaHesaplari || []).length > 0 || (det.aracPlakalari || []).length > 0 || (det.tasinmazlar || []).length > 0;

  function handleKaydet() {
    const yeni: NonNullable<import('@/lib/hooks/useIcra').Icra['borcluDetay']> = {};
    if (form.tcVkn.trim()) yeni.tcVkn = form.tcVkn.trim();
    if (form.adres.trim()) yeni.adres = form.adres.trim();
    if (form.isveren.trim()) yeni.isveren = form.isveren.trim();
    if (form.isverenAdres.trim()) yeni.isverenAdres = form.isverenAdres.trim();
    const bh = form.bankaHesaplari.split('\n').map((s) => s.trim()).filter(Boolean);
    if (bh.length) yeni.bankaHesaplari = bh;
    const ap = form.aracPlakalari.split('\n').map((s) => s.trim()).filter(Boolean);
    if (ap.length) yeni.aracPlakalari = ap;
    const tm = form.tasinmazlar.split('\n').map((s) => s.trim()).filter(Boolean);
    if (tm.length) yeni.tasinmazlar = tm;
    onUpdate({ ...icra, borcluDetay: yeni });
    setDuzenle(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => setAcik(!acik)} className="flex items-center gap-2 group">
          <SectionHeader title={`${karsiRolLabel} Bilgileri`} />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-dim transition-transform ${acik ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
          {hasData && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Bilgi var</span>}
        </button>
        {acik && (
          <button onClick={() => setDuzenle(!duzenle)} className="text-xs px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {duzenle ? 'Iptal' : 'Duzenle'}
          </button>
        )}
      </div>

      {acik && (
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
          {duzenle ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">TC / VKN</label>
                  <input type="text" value={form.tcVkn} onChange={(e) => setForm((p) => ({ ...p, tcVkn: e.target.value }))}
                    placeholder="TC Kimlik No veya VKN" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Isveren</label>
                  <input type="text" value={form.isveren} onChange={(e) => setForm((p) => ({ ...p, isveren: e.target.value }))}
                    placeholder="Isveren adi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-text-muted block mb-1">Adres</label>
                  <input type="text" value={form.adres} onChange={(e) => setForm((p) => ({ ...p, adres: e.target.value }))}
                    placeholder="Borclu adresi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-text-muted block mb-1">Isveren Adres</label>
                  <input type="text" value={form.isverenAdres} onChange={(e) => setForm((p) => ({ ...p, isverenAdres: e.target.value }))}
                    placeholder="Isveren adresi" className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Banka Hesaplari (satir satir)</label>
                  <textarea value={form.bankaHesaplari} onChange={(e) => setForm((p) => ({ ...p, bankaHesaplari: e.target.value }))}
                    rows={3} placeholder="Her satira bir hesap..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Arac Plakalari (satir satir)</label>
                  <textarea value={form.aracPlakalari} onChange={(e) => setForm((p) => ({ ...p, aracPlakalari: e.target.value }))}
                    rows={3} placeholder="Her satira bir plaka..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Tasinmazlar (satir satir)</label>
                  <textarea value={form.tasinmazlar} onChange={(e) => setForm((p) => ({ ...p, tasinmazlar: e.target.value }))}
                    rows={3} placeholder="Her satira bir tasinmaz..." className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleKaydet} className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">Kaydet</button>
              </div>
            </div>
          ) : hasData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {det.tcVkn && <InfoRow label="TC / VKN" value={det.tcVkn} />}
                {det.isveren && <InfoRow label="Isveren" value={det.isveren} />}
                {det.adres && <InfoRow label="Adres" value={det.adres} />}
                {det.isverenAdres && <InfoRow label="Isveren Adres" value={det.isverenAdres} />}
              </div>
              {(det.bankaHesaplari || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Banka Hesaplari</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.bankaHesaplari!.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {(det.aracPlakalari || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Arac Plakalari</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.aracPlakalari!.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {(det.tasinmazlar || []).length > 0 && (
                <div>
                  <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Tasinmazlar</div>
                  <div className="flex flex-wrap gap-1.5">
                    {det.tasinmazlar!.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface rounded text-[10px] text-text-muted border border-border/50">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-text-dim">
              Borclu detay bilgisi girilmemis.
              <button onClick={() => setDuzenle(true)} className="text-gold hover:underline ml-1">Bilgi Ekle</button>
            </div>
          )}
        </div>
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
