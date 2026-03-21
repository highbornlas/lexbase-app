'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useArabuluculuk, useArabuluculukKaydet, useArabuluculukSil, useArabuluculukArsivle,
  type Arabuluculuk, type OturumKaydi,
  YASAL_SURE_HAFTA, hesaplaYasalSureBitis,
} from '@/lib/hooks/useArabuluculuk';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { fmt, fmtTarih } from '@/lib/utils';
import { ArabuluculukModal } from '@/components/modules/ArabuluculukModal';
import { useSonErisim } from '@/lib/hooks/useSonErisim';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';

// ── Sekme tanimlari ──────────────────────────────────────────
const TABS = [
  { key: 'ozet', label: 'Ozet', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { key: 'evrak', label: 'Evraklar', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
  { key: 'oturumlar', label: 'Oturumlar', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { key: 'notlar', label: 'Notlar', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
];

const DURUM_RENK: Record<string, string> = {
  'Başvuru': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Arabulucu Atandı': 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  'Görüşme': 'bg-gold-dim text-gold border-gold/20',
  'Anlaşma': 'bg-green-dim text-green border-green/20',
  'Anlaşamama': 'bg-red-dim text-red border-red/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

const TUR_RENK: Record<string, string> = {
  'Ticari': 'text-gold',
  'İş': 'text-blue-400',
  'Tüketici': 'text-green',
  'Aile': 'text-purple-400',
  'Kira': 'text-orange-400',
  'Ortaklık': 'text-cyan-400',
};

// ══════════════════════════════════════════════════════════════
//  Arabuluculuk Detay Sayfasi
// ══════════════════════════════════════════════════════════════

export default function ArabuluculukDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: arb, isLoading } = useArabuluculuk(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const router = useRouter();
  const kaydet = useArabuluculukKaydet();
  const silMut = useArabuluculukSil();
  const arsivleMut = useArabuluculukArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [aksiyonMenuAcik, setAksiyonMenuAcik] = useState(false);
  // Oturum ekleme
  const [yeniOturum, setYeniOturum] = useState({ tarih: new Date().toISOString().split('T')[0], saat: '', sure: '', ozet: '', sonuc: 'Devam' });
  // Not ekleme
  const [yeniNot, setYeniNot] = useState('');
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (arb && !(arb as Record<string, unknown>)._silindi) {
      kaydetErisim({ id: arb.id, tip: 'arabuluculuk', baslik: arb.konu || arb.no || arb.id.slice(0, 8), tarih: new Date().toISOString() });
    }
  }, [arb?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const muvAd = useMemo(() => {
    if (!arb?.muvId || !muvekkillar) return '—';
    const m = muvekkillar.find((m) => m.id === arb.muvId);
    return m ? [m.ad, (m as Record<string, unknown>).soyad].filter(Boolean).join(' ') : '—';
  }, [arb, muvekkillar]);

  const iliskiliDosya = useMemo(() => {
    if (!arb?.iliskiliDosyaId) return null;
    if (arb.iliskiliDosyaTip === 'dava') {
      const d = davalar?.find((x) => x.id === arb.iliskiliDosyaId);
      return d ? { label: `${(d as Record<string, unknown>).esasNo || d.konu || 'Dava'}`, href: `/davalar/${d.id}`, tip: 'Dava' } : null;
    }
    if (arb.iliskiliDosyaTip === 'icra') {
      const ic = icralar?.find((x) => x.id === arb.iliskiliDosyaId);
      return ic ? { label: `${(ic as Record<string, unknown>).esasNo || ic.konu || 'Icra'}`, href: `/icra/${ic.id}`, tip: 'Icra' } : null;
    }
    return null;
  }, [arb, davalar, icralar]);

  // Yasal sure hesaplama
  const sureBitis = useMemo(() => {
    if (!arb) return null;
    return hesaplaYasalSureBitis(arb.tur, arb.ilkOturumTarih, arb.sureUzatmaHafta || 0);
  }, [arb]);
  const kalanGun = sureBitis ? Math.ceil((new Date(sureBitis).getTime() - Date.now()) / 86400000) : null;
  const aktifDurum = arb ? ['Başvuru', 'Arabulucu Atandı', 'Görüşme'].includes(arb.durum || '') : false;

  const oturumlar = arb?.oturumlar || [];
  const notlar = arb?.notlar || [];

  async function handleOturumEkle() {
    if (!arb || !yeniOturum.tarih) return;
    const oturum: OturumKaydi = {
      id: crypto.randomUUID(),
      tarih: yeniOturum.tarih,
      saat: yeniOturum.saat || undefined,
      sure: yeniOturum.sure ? Number(yeniOturum.sure) : undefined,
      ozet: yeniOturum.ozet,
      sonuc: yeniOturum.sonuc,
    };
    const yeniOturumlar = [...oturumlar, oturum];
    await kaydet.mutateAsync({
      ...arb,
      oturumlar: yeniOturumlar,
      oturumSayisi: yeniOturumlar.length,
      sonOturumTarih: yeniOturum.tarih,
    } as Arabuluculuk);
    setYeniOturum({ tarih: new Date().toISOString().split('T')[0], saat: '', sure: '', ozet: '', sonuc: 'Devam' });
  }

  async function handleOturumSil(oturumId: string) {
    if (!arb) return;
    const yeniOturumlar = oturumlar.filter((o) => o.id !== oturumId);
    await kaydet.mutateAsync({
      ...arb,
      oturumlar: yeniOturumlar,
      oturumSayisi: yeniOturumlar.length,
    } as Arabuluculuk);
  }

  async function handleNotEkle() {
    if (!arb || !yeniNot.trim()) return;
    const not = { id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() };
    await kaydet.mutateAsync({ ...arb, notlar: [...notlar, not] } as Arabuluculuk);
    setYeniNot('');
  }

  async function handleNotSil(notId: string) {
    if (!arb) return;
    await kaydet.mutateAsync({ ...arb, notlar: notlar.filter((n) => n.id !== notId) } as Arabuluculuk);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Dosya yukleniyor...</span>
        </div>
      </div>
    );
  }

  if (!arb || (arb as Record<string, unknown>)._silindi) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <div className="text-sm text-text-muted">{(arb as Record<string, unknown> | null)?._silindi ? 'Bu arabuluculuk dosyasi silinmis' : 'Arabuluculuk dosyasi bulunamadi'}</div>
        <Link href="/arabuluculuk" className="text-xs text-gold mt-3 inline-block hover:underline">&larr; Arabuluculuk listesine don</Link>
      </div>
    );
  }

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════
         STICKY HEADER
         ═══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm pb-4 -mx-2 px-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3 pt-1">
          <Link href="/arabuluculuk" className="hover:text-gold transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Arabuluculuk
          </Link>
          <span className="text-text-dim">/</span>
          <span className="text-text font-medium">{arb.no || arb.konu || arb.id.slice(0, 8)}</span>
        </div>

        {/* Ana Baslik Satiri */}
        <div className="flex items-start justify-between gap-4">
          {/* Sol: Dosya kimligi */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
                {arb.konu || '—'}
              </h1>
              {arb.tur && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border bg-surface2/50 border-border ${TUR_RENK[arb.tur] || 'text-text-muted'}`}>
                  {arb.tur}
                </span>
              )}
              {arb.durum && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${DURUM_RENK[arb.durum] || 'bg-gold-dim text-gold border-gold/20'}`}>
                  {arb.durum}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
              {arb.no && (
                <span className="font-[var(--font-playfair)] text-gold font-bold text-sm">
                  {arb.no}
                </span>
              )}
              {arb.arabulucu && (
                <span className="text-text-muted">Arabulucu: <span className="text-text font-medium">{arb.arabulucu}</span></span>
              )}
              {arb.basvuruTarih && (
                <span className="text-text-dim flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {fmtTarih(arb.basvuruTarih)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px]">
              <span className="text-text-muted">
                Muvekkil: <span className="text-text font-medium">{muvAd}</span>
              </span>
              {arb.karsiTaraf && (
                <>
                  <span className="text-text-dim">vs</span>
                  <span className="text-text-muted">
                    Karsi Taraf: <span className="text-text font-medium">{arb.karsiTaraf}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sag: Aksiyon butonlari */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleSabitle({ id: arb.id, tip: 'arabuluculuk', baslik: arb.konu || arb.no || arb.id.slice(0, 8), tarih: new Date().toISOString() })}
              className={`p-2 rounded-lg border transition-all ${isSabitlenen(arb.id) ? 'bg-gold/10 text-gold border-gold/20 shadow-[0_0_8px_rgba(201,168,76,0.15)]' : 'bg-surface text-text-dim border-border hover:border-gold/40 hover:text-gold'}`}
              title={isSabitlenen(arb.id) ? 'Hizli erisimden kaldir' : 'Hizli erisime sabitle'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSabitlenen(arb.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>

            <button
              onClick={() => setDuzenleModu(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-bg font-semibold text-xs hover:bg-gold-light transition-colors shadow-[0_2px_8px_rgba(201,168,76,0.2)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Duzenle
            </button>

            {/* Diger aksiyonlar — 3 nokta menu */}
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
                    <button onClick={() => { setAktifTab('evrak'); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/></svg>
                      Evrak Ekle
                    </button>
                    <button onClick={() => { setAktifTab('oturumlar'); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      Oturum Ekle
                    </button>
                    <div className="my-1 border-t border-border/50" />
                    <button onClick={() => { arsivleMut.mutate(arb); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                      Arsive Kaldir
                    </button>
                    <button onClick={async () => {
                      setAksiyonMenuAcik(false);
                      if (confirm(`"${arb.konu || arb.no || 'Bu dosya'}" silinecek. Emin misiniz?`)) {
                        await silMut.mutateAsync(arb);
                        router.push('/arabuluculuk');
                      }
                    }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-red hover:bg-red/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      Dosyayi Sil
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Yasal Sure Uyarisi */}
        {sureBitis && aktifDurum && (
          <div className={`mt-3 rounded-lg px-4 py-2.5 text-xs border flex items-center justify-between ${
            kalanGun !== null && kalanGun <= 7 ? 'bg-red-dim border-red/20 text-red' :
            kalanGun !== null && kalanGun <= 14 ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
            'bg-blue-400/10 border-blue-400/20 text-blue-400'
          }`}>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span className="font-bold">Yasal Sure:</span> {arb.tur} — {YASAL_SURE_HAFTA[arb.tur || ''] || '?'} hafta
              {(arb.sureUzatmaHafta || 0) > 0 && ` (+${arb.sureUzatmaHafta} hafta uzatma)`}
              <span className="ml-2">Bitis: <span className="font-bold">{new Date(sureBitis).toLocaleDateString('tr-TR')}</span></span>
              {kalanGun !== null && (
                <span className="ml-2 font-bold">
                  {kalanGun > 0 ? `${kalanGun} gun kaldi` : kalanGun === 0 ? 'BUGUN DOLUYOR!' : `${Math.abs(kalanGun)} gun gecti!`}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         WIDGET KARTLARI
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <WidgetCard label="Talep" value={fmt(arb.talep || 0)} color="text-gold" />
        <WidgetCard label="Anlasma Ucreti" value={fmt(arb.anlasmaUcret || 0)} color="text-green" />
        <WidgetCard label="Vekalet Ucreti" value={fmt(arb.ucret || 0)} color="text-text" />
        <WidgetCard label="Oturum Sayisi" value={String(oturumlar.length || arb.oturumSayisi || 0)} color="text-purple-400" />
        <WidgetCard label="Not" value={String(notlar.length)} color="text-text" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SEKME NAVIGASYONU
         ═══════════════════════════════════════════════════════════ */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAktifTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${
                aktifTab === tab.key
                  ? 'text-gold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'oturumlar' && oturumlar.length > 0 && (
                <span className="text-[10px] bg-surface2 text-text-muted px-1 rounded">{oturumlar.length}</span>
              )}
              {tab.key === 'notlar' && notlar.length > 0 && (
                <span className="text-[10px] bg-surface2 text-text-muted px-1 rounded">{notlar.length}</span>
              )}
              {aktifTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Sekme Icerigi */}
        <div className="p-5">
          {aktifTab === 'ozet' && <OzetTab arb={arb} muvAd={muvAd} iliskiliDosya={iliskiliDosya} sureBitis={sureBitis} kalanGun={kalanGun} aktifDurum={aktifDurum} />}
          {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="arabuluculuk" muvId={arb.muvId} />}
          {aktifTab === 'oturumlar' && (
            <OturumlarTab
              oturumlar={oturumlar}
              yeniOturum={yeniOturum}
              setYeniOturum={setYeniOturum}
              onEkle={handleOturumEkle}
              onSil={handleOturumSil}
              isPending={kaydet.isPending}
            />
          )}
          {aktifTab === 'notlar' && (
            <NotlarTab
              notlar={notlar}
              yeniNot={yeniNot}
              setYeniNot={setYeniNot}
              onNotEkle={handleNotEkle}
              onNotSil={handleNotSil}
              isPending={kaydet.isPending}
            />
          )}
        </div>
      </div>

      {/* Duzenleme Modal */}
      {duzenleModu && (
        <ArabuluculukModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          arabuluculuk={arb}
        />
      )}
    </div>
  );
}

// ── Yardimci Bilesenler ──────────────────────────────────────

function WidgetCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 border bg-surface border-border/60">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-gold'}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value?: string | null; color?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium ${color || 'text-text'}`}>{value || '—'}</span>
    </div>
  );
}

// ── Ozet Sekmesi ─────────────────────────────────────────────
function OzetTab({ arb, muvAd, iliskiliDosya, sureBitis, kalanGun, aktifDurum }: {
  arb: Arabuluculuk;
  muvAd: string;
  iliskiliDosya: { label: string; href: string; tip: string } | null;
  sureBitis: string | null;
  kalanGun: number | null;
  aktifDurum: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genel Bilgiler */}
        <div className="bg-surface2/50 border border-border/50 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text mb-3">Genel Bilgiler</h3>
          <InfoRow label="Muvekkil" value={muvAd} />
          <InfoRow label="Tur" value={arb.tur} />
          <InfoRow label="Konu" value={arb.konu} />
          <InfoRow label="Durum" value={arb.durum} />
          <InfoRow label="Basvuru Tarihi" value={fmtTarih(arb.basvuruTarih)} />
          <InfoRow label="Ilk Oturum Tarihi" value={fmtTarih(arb.ilkOturumTarih)} />
          {sureBitis && (
            <InfoRow label="Yasal Sure Bitisi" value={fmtTarih(sureBitis)} color={
              kalanGun !== null && kalanGun <= 7 && aktifDurum ? 'text-red font-bold' :
              kalanGun !== null && kalanGun <= 14 && aktifDurum ? 'text-orange-400 font-bold' :
              'text-text'
            } />
          )}
          {arb.sonTutanakNo && <InfoRow label="Son Tutanak No" value={arb.sonTutanakNo} />}
          {iliskiliDosya && (
            <div className="flex justify-between text-xs pt-2 border-t border-border">
              <span className="text-text-muted">Iliskili Dosya</span>
              <Link href={iliskiliDosya.href} className="text-gold hover:underline font-medium">{iliskiliDosya.tip}: {iliskiliDosya.label}</Link>
            </div>
          )}
        </div>

        {/* Finansal + Taraflar */}
        <div className="space-y-6">
          {/* Taraflar */}
          <div className="bg-surface2/50 border border-border/50 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Taraflar</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Basvuran (Muvekkil)</div>
                <div className="text-xs text-text font-medium">{muvAd}</div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Karsi Taraf</div>
                <div className="text-xs text-text font-medium">{arb.karsiTaraf || '—'}</div>
                {arb.karsiTarafVekil && (
                  <div className="text-[10px] text-text-dim mt-0.5">Vekil: {arb.karsiTarafVekil}</div>
                )}
              </div>
            </div>
          </div>

          {/* Arabulucu Bilgileri */}
          <div className="bg-surface2/50 border border-border/50 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Arabulucu Bilgileri</h3>
            <InfoRow label="Arabulucu" value={arb.arabulucu} />
          </div>

          {/* Finansal Bilgiler */}
          <div className="bg-surface2/50 border border-border/50 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Finansal Bilgiler</h3>
            <InfoRow label="Talep Tutari" value={fmt(arb.talep || 0)} color="text-gold" />
            <InfoRow label="Anlasma Ucreti" value={fmt(arb.anlasmaUcret || 0)} color="text-green" />
            <InfoRow label="Vekalet Ucreti" value={fmt(arb.ucret || 0)} color="text-text" />
            <InfoRow label="Tahsil Edilen" value={fmt(arb.tahsilEdildi || 0)} color="text-green" />
            <InfoRow label="Kalan Alacak" value={fmt((arb.ucret || 0) - (arb.tahsilEdildi || 0))} color="text-red" />
          </div>
        </div>
      </div>

      {/* Sonuc Karti */}
      {(arb.durum === 'Anlaşma' || arb.durum === 'Anlaşamama') && (
        <div className={`border rounded-lg p-5 ${arb.durum === 'Anlaşma' ? 'bg-green/5 border-green/20' : 'bg-red/5 border-red/20'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${arb.durum === 'Anlaşma' ? 'text-green' : 'text-red'}`}>
            {arb.durum === 'Anlaşma' ? 'Anlaşma Sonucu' : 'Anlaşamama Sonucu'}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-text-muted mb-0.5">Sonuc</div>
              <div className={`font-bold ${arb.durum === 'Anlaşma' ? 'text-green' : 'text-red'}`}>{arb.durum}</div>
            </div>
            {arb.sonucTarih && (
              <div>
                <div className="text-text-muted mb-0.5">Sonuc Tarihi</div>
                <div className="text-text font-medium">{fmtTarih(arb.sonucTarih)}</div>
              </div>
            )}
            {arb.durum === 'Anlaşma' && arb.anlasmaUcret && (
              <div>
                <div className="text-text-muted mb-0.5">Anlasma Tutari</div>
                <div className="text-green font-bold">{fmt(arb.anlasmaUcret)}</div>
              </div>
            )}
            {arb.sonTutanakNo && (
              <div>
                <div className="text-text-muted mb-0.5">Tutanak No</div>
                <div className="text-text font-medium">{arb.sonTutanakNo}</div>
              </div>
            )}
          </div>
          {arb.durum === 'Anlaşamama' && iliskiliDosya && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <Link href={iliskiliDosya.href} className="text-xs text-gold hover:underline flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
                Iliskili {iliskiliDosya.tip} Dosyasina Git
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Aciklama */}
      {arb.aciklama && (
        <div className="bg-surface2/50 border border-border/50 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-text mb-2">Aciklama</h3>
          <div className="text-xs text-text-muted whitespace-pre-wrap">{arb.aciklama}</div>
        </div>
      )}
    </div>
  );
}

// ── Oturumlar Sekmesi ────────────────────────────────────────
function OturumlarTab({ oturumlar, yeniOturum, setYeniOturum, onEkle, onSil, isPending }: {
  oturumlar: OturumKaydi[];
  yeniOturum: { tarih: string; saat: string; sure: string; ozet: string; sonuc: string };
  setYeniOturum: (v: { tarih: string; saat: string; sure: string; ozet: string; sonuc: string }) => void;
  onEkle: () => void;
  onSil: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Yeni Oturum Ekle */}
      <div className="bg-surface2/30 border border-border/50 rounded-lg p-4">
        <div className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-3">Yeni Oturum Kaydi</div>
        <div className="grid grid-cols-[120px_80px_80px_1fr_100px_100px] gap-3 items-end">
          <div>
            <label className="text-[10px] text-text-dim block mb-1">Tarih</label>
            <input type="date" value={yeniOturum.tarih} onChange={(e) => setYeniOturum({ ...yeniOturum, tarih: e.target.value })}
              className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-dim block mb-1">Saat</label>
            <input type="time" value={yeniOturum.saat} onChange={(e) => setYeniOturum({ ...yeniOturum, saat: e.target.value })}
              className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-dim block mb-1">Sure (dk)</label>
            <input type="number" value={yeniOturum.sure} onChange={(e) => setYeniOturum({ ...yeniOturum, sure: e.target.value })} placeholder="60"
              className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-dim block mb-1">Ozet</label>
            <input type="text" value={yeniOturum.ozet} onChange={(e) => setYeniOturum({ ...yeniOturum, ozet: e.target.value })} placeholder="Oturum ozeti..."
              className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-dim block mb-1">Sonuc</label>
            <select value={yeniOturum.sonuc} onChange={(e) => setYeniOturum({ ...yeniOturum, sonuc: e.target.value })}
              className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
              <option value="Devam">Devam</option>
              <option value="Ertelendi">Ertelendi</option>
              <option value="Anlaşma">Anlaşma</option>
              <option value="Anlaşamama">Anlaşamama</option>
            </select>
          </div>
          <button type="button" onClick={onEkle} disabled={!yeniOturum.tarih || isPending}
            className="px-3 py-2 bg-gold text-bg font-semibold rounded text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
            {isPending ? '...' : 'Ekle'}
          </button>
        </div>
      </div>

      {/* Oturum Listesi */}
      {oturumlar.length === 0 ? (
        <div className="text-center py-12">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto mb-2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <div className="text-xs text-text-muted">Henuz oturum kaydi eklenmemis</div>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_100px_60px_60px_1fr_80px_60px] gap-2 px-4 py-2.5 border-b border-border text-[10px] text-text-muted font-medium uppercase tracking-wider bg-surface2/30">
            <span>#</span>
            <span>Tarih</span>
            <span>Saat</span>
            <span>Sure</span>
            <span>Ozet</span>
            <span>Sonuc</span>
            <span></span>
          </div>
          {[...oturumlar].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || '')).map((o, idx) => (
            <div key={o.id} className="grid grid-cols-[40px_100px_60px_60px_1fr_80px_60px] gap-2 px-4 py-3 border-b border-border/30 text-xs items-center hover:bg-gold-dim/30 transition-colors group">
              <span className="text-text-dim font-bold">{idx + 1}</span>
              <span className="text-text-dim">{fmtTarih(o.tarih)}</span>
              <span className="text-text-dim">{o.saat || '—'}</span>
              <span className="text-gold font-semibold">{o.sure ? `${o.sure} dk` : '—'}</span>
              <span className="text-text truncate">{o.ozet || '—'}</span>
              <span className={`text-[10px] font-bold ${
                o.sonuc === 'Anlaşma' ? 'text-green' :
                o.sonuc === 'Anlaşamama' ? 'text-red' :
                o.sonuc === 'Ertelendi' ? 'text-orange-400' : 'text-blue-400'
              }`}>{o.sonuc || '—'}</span>
              <button onClick={() => onSil(o.id)}
                className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-surface2/30 text-xs font-semibold text-text">
            Toplam: {oturumlar.length} oturum
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notlar Sekmesi ───────────────────────────────────────────
function NotlarTab({ notlar, yeniNot, setYeniNot, onNotEkle, onNotSil, isPending }: {
  notlar: Array<{ id: string; tarih: string; icerik: string }>;
  yeniNot: string;
  setYeniNot: (v: string) => void;
  onNotEkle: () => void;
  onNotSil: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-surface2/30 border border-border/50 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Not Ekle</div>
        <div className="flex gap-2">
          <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
            placeholder="Not ekle..."
            onKeyDown={(e) => { if (e.key === 'Enter') onNotEkle(); }}
            className="flex-1 px-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
          <button onClick={onNotEkle} disabled={!yeniNot.trim() || isPending}
            className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
            Ekle
          </button>
        </div>
      </div>

      {notlar.length === 0 ? (
        <div className="text-center py-12">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto mb-2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <div className="text-xs text-text-muted">Henuz not eklenmemis</div>
        </div>
      ) : (
        <div className="space-y-2">
          {[...notlar].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')).map((n) => (
            <div key={n.id} className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative group">
              <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
              <div className="flex items-start gap-3 mt-1">
                <div className="flex-1">
                  <div className="text-xs text-text whitespace-pre-wrap">{n.icerik}</div>
                  <div className="text-[10px] text-text-dim mt-2">
                    {new Date(n.tarih).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button onClick={() => onNotSil(n.id)}
                  className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs p-1">
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
