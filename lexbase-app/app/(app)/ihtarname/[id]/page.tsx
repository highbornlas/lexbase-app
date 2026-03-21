'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIhtarname, useIhtarnameKaydet, useIhtarnameSil, useIhtarnameArsivle, type Ihtarname } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { IhtarnameModal } from '@/components/modules/IhtarnameModal';
import { fmt, fmtTarih } from '@/lib/utils';
import { ihtarnameDosyaBaslik } from '@/lib/utils/uyapHelpers';
import { useSonErisim } from '@/lib/hooks/useSonErisim';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';

// ── Sekme tanimlari ──────────────────────────────────────────
const TABS = [
  { key: 'ozet', label: 'Ozet', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { key: 'evrak', label: 'Evraklar', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
  { key: 'icerik', label: 'Icerik', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { key: 'teblig', label: 'Teblig & Sure', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg> },
  { key: 'ptt', label: 'PTT Takip', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg> },
  { key: 'cevap', label: 'Cevap', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { key: 'notlar', label: 'Notlar', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
];

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Hazırlandı': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Gönderildi': 'bg-gold-dim text-gold border-gold/20',
  'Tebliğ Edildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Cevap Geldi': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Sonuçlandı': 'bg-green-dim text-green border-green/20',
};

const TUR_RENK: Record<string, string> = {
  'İhtar': 'bg-red-dim text-red border-red/20',
  'İhbarname': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Fesih İhtarı': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Ödeme İhtarı': 'bg-gold-dim text-gold border-gold/20',
  'Tahliye İhtarı': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
};

// ══════════════════════════════════════════════════════════════
//  Ihtarname Detay Sayfasi
// ══════════════════════════════════════════════════════════════

export default function IhtarnameDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ihtarname, isLoading } = useIhtarname(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const router = useRouter();
  const kaydet = useIhtarnameKaydet();
  const silMut = useIhtarnameSil();
  const arsivleMut = useIhtarnameArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [aksiyonMenuAcik, setAksiyonMenuAcik] = useState(false);
  const [pttLoading, setPttLoading] = useState(false);
  const [pttSonuc, setPttSonuc] = useState('');
  const [yeniNot, setYeniNot] = useState('');
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (ihtarname && !(ihtarname as Record<string, unknown>)._silindi) {
      const baslik = String(ihtarnameDosyaBaslik(ihtarname) || ihtarname.konu || ihtarname.no || ihtarname.id.slice(0, 8));
      kaydetErisim({ id: ihtarname.id, tip: 'ihtarname', baslik, tarih: new Date().toISOString() });
    }
  }, [ihtarname?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const muvAd = useMemo(() => {
    if (!ihtarname?.muvId || !muvekkillar) return '—';
    const m = muvekkillar.find((m) => m.id === ihtarname.muvId);
    return m ? [m.ad, (m as Record<string, unknown>).soyad].filter(Boolean).join(' ') : '—';
  }, [ihtarname, muvekkillar]);

  const dosyaBaslik = useMemo(() => {
    if (!ihtarname) return '';
    return ihtarnameDosyaBaslik(ihtarname);
  }, [ihtarname]);

  // Sure sonu hesaplama
  const sureBilgi = useMemo(() => {
    if (!ihtarname?.sureSonu) return null;
    const bugun = new Date();
    const sonTarih = new Date(ihtarname.sureSonu);
    const kalanGun = Math.ceil((sonTarih.getTime() - bugun.getTime()) / 86400000);
    return { kalanGun, gecmis: kalanGun < 0, acil: kalanGun >= 0 && kalanGun <= 3 };
  }, [ihtarname]);

  // Iliskili dosya
  const iliskiliDosya = useMemo(() => {
    if (!ihtarname?.iliskiliDosyaId) return null;
    if (ihtarname.iliskiliDosyaTip === 'dava') {
      const d = davalar?.find((x) => x.id === ihtarname.iliskiliDosyaId);
      if (d) return { tip: 'Dava', ad: `${(d as Record<string, unknown>).esasYil || ''}/${(d as Record<string, unknown>).esasNo || ''} — ${d.konu || ''}`, href: `/davalar/${d.id}` };
    }
    if (ihtarname.iliskiliDosyaTip === 'icra') {
      const i = icralar?.find((x) => x.id === ihtarname.iliskiliDosyaId);
      if (i) return { tip: 'Icra', ad: `${(i as Record<string, unknown>).esas || i.no || ''} — ${(i as Record<string, unknown>).borclu || ''}`, href: `/icra/${i.id}` };
    }
    return null;
  }, [ihtarname, davalar, icralar]);

  // PTT Sorgula
  async function handlePttSorgula() {
    if (!ihtarname?.pttBarkod?.trim()) return;
    setPttLoading(true);
    setPttSonuc('');
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: ihtarname.pttBarkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc(`${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}`);
        if (data.tebligDurum) {
          await kaydet.mutateAsync({
            ...ihtarname,
            tebligDurum: data.tebligDurum,
            ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
            pttSonSorgu: new Date().toISOString(),
            pttSonuc: data.durum,
          });
        }
      } else {
        setPttSonuc('Otomatik sorgu basarisiz. PTT sitesi aciliyor...');
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc('Baglanti hatasi. PTT sitesi aciliyor...');
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod!.trim()}`, '_blank');
    } finally {
      setPttLoading(false);
    }
  }

  // Not ekle
  async function handleNotEkle() {
    if (!ihtarname || !yeniNot.trim()) return;
    const mevcutNotlar = ihtarname.notlar || [];
    const yeniNotObj = { id: crypto.randomUUID(), icerik: yeniNot.trim(), tarih: new Date().toISOString() };
    await kaydet.mutateAsync({ ...ihtarname, notlar: [...mevcutNotlar, yeniNotObj] });
    setYeniNot('');
  }

  // Not sil
  async function handleNotSil(notId: string) {
    if (!ihtarname) return;
    const guncelNotlar = (ihtarname.notlar || []).filter((n) => (n.id as string) !== notId);
    await kaydet.mutateAsync({ ...ihtarname, notlar: guncelNotlar });
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

  if (!ihtarname || (ihtarname as Record<string, unknown>)._silindi) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim mx-auto"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        </div>
        <div className="text-sm text-text-muted">{(ihtarname as Record<string, unknown> | null)?._silindi ? 'Bu ihtarname silinmis' : 'Ihtarname bulunamadi'}</div>
        <Link href="/ihtarname" className="text-xs text-gold mt-3 inline-block hover:underline">&larr; Ihtarnamelere don</Link>
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
          <Link href="/ihtarname" className="hover:text-gold transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Ihtarnameler
          </Link>
          <span className="text-text-dim">/</span>
          <span className="text-text font-medium">{dosyaBaslik || ihtarname.no || ihtarname.id.slice(0, 8)}</span>
        </div>

        {/* Ana Baslik Satiri */}
        <div className="flex items-start justify-between gap-4">
          {/* Sol: Dosya kimligi */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
                {dosyaBaslik || ihtarname.konu || '—'}
              </h1>
              {ihtarname.yon && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  ihtarname.yon === 'giden' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-orange-400/10 text-orange-400 border-orange-400/20'
                }`}>
                  {ihtarname.yon === 'giden' ? 'GIDEN' : 'GELEN'}
                </span>
              )}
              {ihtarname.tur && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${TUR_RENK[ihtarname.tur] || 'bg-surface2 text-text-muted border-border'}`}>
                  {ihtarname.tur}
                </span>
              )}
              {ihtarname.durum && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${DURUM_RENK[ihtarname.durum] || 'bg-gold-dim text-gold border-gold/20'}`}>
                  {ihtarname.durum}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
              {ihtarname.no && (
                <span className="font-[var(--font-playfair)] text-gold font-bold text-sm">
                  {ihtarname.no}
                </span>
              )}
              {ihtarname.konu && dosyaBaslik !== ihtarname.konu && (
                <span className="text-text-muted">{ihtarname.konu}</span>
              )}
              {ihtarname.tarih && (
                <span className="text-text-dim flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {fmtTarih(ihtarname.tarih)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-[11px]">
              <span className="text-text-muted">
                Gonderen: <span className="text-text font-medium">{ihtarname.gonderen || '—'}</span>
              </span>
              <span className="text-text-dim">&rarr;</span>
              <span className="text-text-muted">
                Alici: <span className="text-text font-medium">{ihtarname.alici || '—'}</span>
              </span>
            </div>
          </div>

          {/* Sag: Aksiyon butonlari */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleSabitle({ id: ihtarname.id, tip: 'ihtarname', baslik: String(dosyaBaslik || ihtarname.konu || ihtarname.no || ihtarname.id.slice(0, 8)), tarih: new Date().toISOString() })}
              className={`p-2 rounded-lg border transition-all ${isSabitlenen(ihtarname.id) ? 'bg-gold/10 text-gold border-gold/20 shadow-[0_0_8px_rgba(201,168,76,0.15)]' : 'bg-surface text-text-dim border-border hover:border-gold/40 hover:text-gold'}`}
              title={isSabitlenen(ihtarname.id) ? 'Hizli erisimden kaldir' : 'Hizli erisime sabitle'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSabitlenen(ihtarname.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
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
                    {ihtarname.pttBarkod && (
                      <button onClick={() => { setAktifTab('ptt'); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text hover:bg-surface2 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                        PTT Sorgula
                      </button>
                    )}
                    <div className="my-1 border-t border-border/50" />
                    <button onClick={() => { arsivleMut.mutate(ihtarname); setAksiyonMenuAcik(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-400/10 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>
                      Arsive Kaldir
                    </button>
                    <button onClick={async () => {
                      setAksiyonMenuAcik(false);
                      if (confirm(`"${dosyaBaslik || ihtarname.konu || 'Bu ihtarname'}" silinecek. Emin misiniz?`)) {
                        await silMut.mutateAsync(ihtarname);
                        router.push('/ihtarname');
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
      </div>

      {/* ═══════════════════════════════════════════════════════════
         WIDGET KARTLARI
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Ucret & Tahsilat */}
        <div className="rounded-xl p-4 border bg-surface border-border/60">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Ucret / Tahsilat</div>
          <div className="text-sm font-bold text-gold">{fmt(ihtarname.ucret || 0)}</div>
          {(ihtarname.tahsilEdildi || 0) > 0 && (
            <div className="text-[10px] text-text-muted mt-0.5">Tahsil: <span className="text-green font-bold">{fmt(ihtarname.tahsilEdildi || 0)}</span></div>
          )}
          {(ihtarname.noterMasrafi || 0) > 0 && (
            <div className="text-[10px] text-text-muted mt-0.5">Noter: <span className="text-text font-medium">{fmt(ihtarname.noterMasrafi || 0)}</span></div>
          )}
        </div>

        {/* Teblig Durumu */}
        <div className={`rounded-xl p-4 border ${
          ihtarname.tebligDurum === 'Tebliğ Edildi' ? 'bg-green/5 border-green/20' :
          ihtarname.tebligDurum === "PTT'de Bekliyor" ? 'bg-gold-dim border-gold/30' :
          ihtarname.tebligDurum === 'İade Döndü' ? 'bg-red/5 border-red/20' :
          'bg-surface border-border/60'
        }`}>
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Teblig Durumu</div>
          <div className="text-sm font-bold text-text">{ihtarname.tebligDurum || 'Gönderilmedi'}</div>
          {ihtarname.tebligTarih && (
            <div className="text-[10px] text-text-muted mt-1">Teblig: {fmtTarih(ihtarname.tebligTarih)}</div>
          )}
        </div>

        {/* Cevap Suresi */}
        <div className={`rounded-xl p-4 border ${
          sureBilgi && !sureBilgi.gecmis && sureBilgi.acil ? 'bg-red/5 border-red/20' :
          sureBilgi && !sureBilgi.gecmis ? 'bg-gold-dim border-gold/30 shadow-[0_0_12px_rgba(201,168,76,0.08)]' :
          sureBilgi && sureBilgi.gecmis ? 'bg-surface2 border-border' :
          'bg-surface border-border/60'
        }`}>
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Cevap Suresi</div>
          {sureBilgi ? (
            <div>
              <div className="text-sm font-bold text-text">{fmtTarih(ihtarname.sureSonu)}</div>
              {!sureBilgi.gecmis && (
                <div className={`text-[10px] mt-1 font-medium ${sureBilgi.acil ? 'text-red' : 'text-gold'}`}>
                  {sureBilgi.kalanGun} gun kaldi
                </div>
              )}
              {sureBilgi.gecmis && (
                <div className="text-[10px] text-red mt-1 font-medium">Sure doldu ({Math.abs(sureBilgi.kalanGun)} gun once)</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-text-dim">Teblig bekleniyor</div>
          )}
        </div>

        {/* PTT Barkod */}
        <div className="rounded-xl p-4 border bg-surface border-border/60">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">PTT Barkod</div>
          {ihtarname.pttBarkod ? (
            <div>
              <div className="text-sm font-bold text-text font-mono">{ihtarname.pttBarkod}</div>
              {ihtarname.pttSonuc && <div className="text-[10px] text-text-muted mt-1">{ihtarname.pttSonuc}</div>}
            </div>
          ) : (
            <div className="text-xs text-text-dim">Barkod girilmemis</div>
          )}
        </div>
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
              {tab.key === 'notlar' && (ihtarname.notlar || []).length > 0 && (
                <span className="text-[10px] bg-surface2 text-text-muted px-1 rounded">{ihtarname.notlar!.length}</span>
              )}
              {tab.key === 'cevap' && ihtarname.cevapTarih && (
                <span className="text-[10px] bg-green-dim text-green px-1 rounded">&#10003;</span>
              )}
              {tab.key === 'ptt' && ihtarname.pttBarkod && (
                <span className="text-[10px] bg-orange-400/10 text-orange-400 px-1 rounded">1</span>
              )}
              {aktifTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Sekme Icerigi */}
        <div className="p-5">
          {aktifTab === 'ozet' && <OzetTab ihtarname={ihtarname} muvAd={muvAd} sureBilgi={sureBilgi} iliskiliDosya={iliskiliDosya} />}
          {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="ihtarname" muvId={ihtarname.muvId} />}
          {aktifTab === 'icerik' && <IcerikTab ihtarname={ihtarname} />}
          {aktifTab === 'teblig' && <TebligTab ihtarname={ihtarname} sureBilgi={sureBilgi} />}
          {aktifTab === 'ptt' && <PttTab ihtarname={ihtarname} pttLoading={pttLoading} pttSonuc={pttSonuc} onSorgula={handlePttSorgula} />}
          {aktifTab === 'cevap' && <CevapTab ihtarname={ihtarname} />}
          {aktifTab === 'notlar' && <NotlarTab ihtarname={ihtarname} yeniNot={yeniNot} setYeniNot={setYeniNot} onNotEkle={handleNotEkle} onNotSil={handleNotSil} />}
        </div>
      </div>

      {/* Duzenleme Modal */}
      <IhtarnameModal open={duzenleModu} onClose={() => setDuzenleModu(false)} ihtarname={ihtarname} />
    </div>
  );
}

// ── Alt Componentler ─────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface2/50 border border-border/50 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-text mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyTab({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-xs text-text-muted">{message}</div>
    </div>
  );
}

// ── Ozet Sekmesi ─────────────────────────────────────────────
function OzetTab({ ihtarname, muvAd, sureBilgi, iliskiliDosya }: {
  ihtarname: Ihtarname;
  muvAd: string;
  sureBilgi: { kalanGun: number; gecmis: boolean; acil: boolean } | null;
  iliskiliDosya: { tip: string; ad: string; href: string } | null;
}) {
  return (
    <div className="space-y-5">
      {/* 3-column cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard title="Ihtarname Bilgileri">
          <InfoRow label="Ihtarname No" value={ihtarname.no || '—'} />
          <InfoRow label="Tur" value={ihtarname.tur || '—'} />
          <InfoRow label="Yon" value={(ihtarname.yon || 'giden') === 'giden' ? 'Giden' : 'Gelen'} />
          <InfoRow label="Durum" value={ihtarname.durum || '—'} />
          <InfoRow label="Konu" value={ihtarname.konu || '—'} />
          {iliskiliDosya && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Iliskili Dosya</div>
              <Link href={iliskiliDosya.href} className="text-xs text-gold hover:underline font-medium">
                {iliskiliDosya.tip}: {iliskiliDosya.ad}
              </Link>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Taraflar">
          <InfoRow label="Muvekkil" value={muvAd} />
          <InfoRow label="Gonderen" value={ihtarname.gonderen || '—'} />
          <InfoRow label="Alici" value={ihtarname.alici || '—'} />
          {ihtarname.aliciAdres && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Alici Adresi</div>
              <div className="text-xs text-text">{ihtarname.aliciAdres}</div>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Tarihler & Noter">
          <InfoRow label="Duzenleme Tarihi" value={fmtTarih(ihtarname.tarih) || '—'} />
          <InfoRow label="Gonderim Tarihi" value={fmtTarih(ihtarname.gonderimTarih) || '—'} />
          <InfoRow label="Teblig Tarihi" value={fmtTarih(ihtarname.tebligTarih) || '—'} />
          <InfoRow label="Noter" value={ihtarname.noterAd || '—'} />
          <InfoRow label="Yevmiye No" value={ihtarname.noterNo || '—'} />
        </InfoCard>
      </div>

      {/* Sure uyarisi */}
      {sureBilgi && !sureBilgi.gecmis && (
        <div className={`border rounded-lg p-4 ${sureBilgi.acil ? 'bg-red-dim border-red/20' : 'bg-gold-dim border-gold/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${sureBilgi.acil ? 'text-red' : 'text-gold'}`}>
                Cevap Suresi
              </div>
              <div className="text-xs text-text-muted">
                Son tarih: {fmtTarih(ihtarname.sureSonu)}
                {ihtarname.cevapSuresi && ` (${ihtarname.cevapSuresi} gun)`}
              </div>
            </div>
            <div className={`text-lg font-bold ${sureBilgi.acil ? 'text-red' : 'text-gold'}`}>
              {sureBilgi.kalanGun} gun
            </div>
          </div>
        </div>
      )}

      {sureBilgi && sureBilgi.gecmis && (
        <div className="border border-red/20 rounded-lg p-4 bg-red-dim">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red flex-shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <div className="text-xs font-bold text-red">Cevap Suresi Doldu</div>
              <div className="text-[11px] text-text-muted">
                {fmtTarih(ihtarname.sureSonu)} tarihinde doldu ({Math.abs(sureBilgi.kalanGun)} gun once)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finansal Ozet */}
      <div className="grid grid-cols-4 gap-3">
        <MiniKpi label="Ucret" value={fmt(ihtarname.ucret || 0)} color="text-gold" />
        <MiniKpi label="Noter Masrafi" value={fmt(ihtarname.noterMasrafi || 0)} />
        <MiniKpi label="Toplam Maliyet" value={fmt((ihtarname.ucret || 0) + (ihtarname.noterMasrafi || 0))} color="text-text" />
        <MiniKpi label="Tahsil Edilen" value={fmt(ihtarname.tahsilEdildi || 0)} color="text-green" />
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface2/50 rounded-lg p-3 text-center border border-border/50">
      <div className="text-[10px] text-text-muted mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}

// ── Icerik Sekmesi ───────────────────────────────────────────
function IcerikTab({ ihtarname }: { ihtarname: Ihtarname }) {
  if (!ihtarname.icerik) {
    return <EmptyTab icon="&#128221;" message="Ihtarname icerigi henuz girilmemis. Duzenle butonundan ekleyebilirsiniz." />;
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ihtarname Metni</div>
        <div className="text-[10px] text-text-dim">{ihtarname.icerik.length} karakter</div>
      </div>
      <div className="bg-surface2/50 rounded-lg p-5 text-sm text-text leading-relaxed whitespace-pre-wrap border border-border/50">
        {ihtarname.icerik}
      </div>
    </div>
  );
}

// ── Teblig & Sure Sekmesi ────────────────────────────────────
function TebligTab({ ihtarname, sureBilgi }: {
  ihtarname: Ihtarname;
  sureBilgi: { kalanGun: number; gecmis: boolean; acil: boolean } | null;
}) {
  const TEBLIG_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-5">
      {/* Teblig Durumu */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface2/50 rounded-lg p-4 text-center border border-border/50">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Teblig Durumu</div>
          <span className={`text-xs font-bold px-3 py-1 rounded border inline-block ${TEBLIG_DURUM_RENK[ihtarname.tebligDurum || 'Gönderilmedi'] || ''}`}>
            {ihtarname.tebligDurum || 'Gönderilmedi'}
          </span>
        </div>
        <div className="bg-surface2/50 rounded-lg p-4 text-center border border-border/50">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Teblig Tarihi</div>
          <div className="text-sm font-bold text-text">{fmtTarih(ihtarname.tebligTarih) || '—'}</div>
        </div>
        <div className="bg-surface2/50 rounded-lg p-4 text-center border border-border/50">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Cevap Suresi</div>
          <div className="text-sm font-bold text-text">{ihtarname.cevapSuresi ? `${ihtarname.cevapSuresi} gun` : '—'}</div>
        </div>
      </div>

      {/* Sure Cizgisi */}
      {ihtarname.sureSonu && (
        <div className={`border rounded-lg p-4 ${
          sureBilgi?.gecmis ? 'bg-red-dim border-red/20' :
          sureBilgi?.acil ? 'bg-orange-400/10 border-orange-400/20' :
          'bg-gold-dim border-gold/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-text">Cevap Son Tarihi</div>
            <div className={`text-sm font-bold ${
              sureBilgi?.gecmis ? 'text-red' : sureBilgi?.acil ? 'text-orange-400' : 'text-gold'
            }`}>
              {fmtTarih(ihtarname.sureSonu)}
            </div>
          </div>
          {sureBilgi && (
            <div className={`text-xs ${sureBilgi.gecmis ? 'text-red' : sureBilgi.acil ? 'text-orange-400' : 'text-text-muted'}`}>
              {sureBilgi.gecmis
                ? `Sure ${Math.abs(sureBilgi.kalanGun)} gun once doldu!`
                : `${sureBilgi.kalanGun} gun kaldi`
              }
            </div>
          )}
        </div>
      )}

      {/* Zaman Cizelgesi */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Zaman Cizelgesi</div>
        <div className="relative pl-6 space-y-0">
          <ZamanSatir tarih={ihtarname.tarih} etiket="Duzenleme Tarihi" renk="text-blue-400" aktif />
          <ZamanSatir tarih={ihtarname.gonderimTarih} etiket="Gonderim Tarihi" renk="text-gold" aktif={!!ihtarname.gonderimTarih} />
          <ZamanSatir tarih={ihtarname.tebligTarih} etiket="Teblig Tarihi" renk="text-purple-400" aktif={!!ihtarname.tebligTarih} />
          <ZamanSatir tarih={ihtarname.sureSonu} etiket="Cevap Son Tarihi" renk={sureBilgi?.gecmis ? 'text-red' : sureBilgi?.acil ? 'text-orange-400' : 'text-green'} aktif={!!ihtarname.sureSonu} />
          <ZamanSatir tarih={ihtarname.cevapTarih} etiket="Cevap Tarihi" renk="text-orange-400" aktif={!!ihtarname.cevapTarih} son />
        </div>
      </div>
    </div>
  );
}

function ZamanSatir({ tarih, etiket, renk, aktif, son }: { tarih?: string; etiket: string; renk: string; aktif: boolean; son?: boolean }) {
  return (
    <div className={`relative flex items-center gap-4 py-3 ${!son ? 'border-l-2 border-border' : ''} ${!aktif ? 'opacity-40' : ''}`} style={{ marginLeft: '-1px' }}>
      <div className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-bg ${aktif ? renk.replace('text-', 'bg-') : 'bg-surface2'}`} />
      <div className="flex-1 pl-4">
        <div className="text-xs font-medium text-text">{etiket}</div>
      </div>
      <div className="text-xs text-text-muted font-mono">{tarih ? fmtTarih(tarih) : '—'}</div>
    </div>
  );
}

// ── PTT Takip Sekmesi ────────────────────────────────────────
function PttTab({ ihtarname, pttLoading, pttSonuc, onSorgula }: {
  ihtarname: Ihtarname;
  pttLoading: boolean;
  pttSonuc: string;
  onSorgula: () => void;
}) {
  if (!ihtarname.pttBarkod) {
    return <EmptyTab icon="&#128230;" message="PTT barkod numarasi girilmemis. Duzenle butonundan ekleyebilirsiniz." />;
  }

  const TEBLIG_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">PTT Gonderi Takip</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gold">{ihtarname.pttBarkod}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TEBLIG_DURUM_RENK[ihtarname.tebligDurum || 'Gönderilmedi']}`}>
              {ihtarname.tebligDurum || 'Gönderilmedi'}
            </span>
          </div>
        </div>
        <button
          onClick={onSorgula}
          disabled={pttLoading}
          className="px-4 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          {pttLoading ? <span className="animate-spin">&#9203;</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><path d="M10 12h4"/></svg>}
          {pttLoading ? 'Sorgulaniyor...' : "PTT'den Sorgula"}
        </button>
      </div>

      {pttSonuc && (
        <div className={`text-xs px-4 py-3 rounded-lg border ${
          pttSonuc.includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
          pttSonuc.includes('Iade') ? 'bg-red-dim border-red/20 text-red' :
          pttSonuc.includes('hata') || pttSonuc.includes('basarisiz') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
          'bg-blue-400/10 border-blue-400/20 text-blue-400'
        }`}>
          {pttSonuc}
        </div>
      )}

      {ihtarname.pttSonSorgu && (
        <div className="bg-surface2/50 rounded-lg p-4 space-y-2 border border-border/50">
          <div className="text-xs font-semibold text-text-muted">Son Sorgu Bilgisi</div>
          <InfoRow label="Son Sorgu Tarihi" value={new Date(ihtarname.pttSonSorgu).toLocaleString('tr-TR')} />
          {ihtarname.pttSonuc && <InfoRow label="Sonuc" value={ihtarname.pttSonuc} />}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <a
          href={`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold hover:underline flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
          PTT Gonderi Takip Sitesinde Ac
        </a>
      </div>
    </div>
  );
}

// ── Cevap Sekmesi ────────────────────────────────────────────
function CevapTab({ ihtarname }: { ihtarname: Ihtarname }) {
  if (!ihtarname.cevapTarih && !ihtarname.cevapOzet) {
    return <EmptyTab icon="&#128172;" message="Henuz cevap kaydi yok. Durum 'Cevap Geldi' oldugunda buradan cevap bilgilerini gorebilirsiniz." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface2/50 rounded-lg p-4 border border-border/50">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Cevap Tarihi</div>
          <div className="text-sm font-bold text-text">{fmtTarih(ihtarname.cevapTarih) || '—'}</div>
        </div>
        <div className="bg-surface2/50 rounded-lg p-4 border border-border/50">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Durum</div>
          <div className="text-sm font-bold text-green">Cevap Alindi</div>
        </div>
      </div>
      {ihtarname.cevapOzet && (
        <div>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cevap Ozeti</div>
          <div className="bg-surface2/50 rounded-lg p-4 text-sm text-text whitespace-pre-wrap border border-border/50">
            {ihtarname.cevapOzet}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notlar Sekmesi ───────────────────────────────────────────
function NotlarTab({ ihtarname, yeniNot, setYeniNot, onNotEkle, onNotSil }: {
  ihtarname: Ihtarname;
  yeniNot: string;
  setYeniNot: (v: string) => void;
  onNotEkle: () => void;
  onNotSil: (id: string) => void;
}) {
  const notlar = ihtarname.notlar || [];

  return (
    <div className="space-y-4">
      {/* Yeni Not Ekle */}
      <div className="bg-surface2/30 border border-border/50 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Not Ekle</div>
        <textarea
          value={yeniNot}
          onChange={(e) => setYeniNot(e.target.value)}
          placeholder="Yeni not ekleyin..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={onNotEkle}
            disabled={!yeniNot.trim()}
            className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
          >
            Not Ekle
          </button>
        </div>
      </div>

      {/* Not Listesi */}
      {notlar.length === 0 ? (
        <div className="text-center py-6 text-text-dim text-xs">Henuz not eklenmemis</div>
      ) : (
        <div className="space-y-2">
          {[...notlar].reverse().map((n) => (
            <div key={(n.id as string) || Math.random()} className="bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative group">
              <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
              <div className="mt-1">
                <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-[10px] text-text-dim">{n.tarih ? new Date(n.tarih as string).toLocaleString('tr-TR') : '—'}</div>
                  <button
                    onClick={() => onNotSil(n.id as string)}
                    className="text-[10px] text-red opacity-0 group-hover:opacity-100 transition-opacity hover:text-red/70"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
