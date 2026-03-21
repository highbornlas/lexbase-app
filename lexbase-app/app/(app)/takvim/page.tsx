'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useTumEtkinlikler,
  useEtkinlikler,
  useEtkinlikKaydet,
  cakismaTespit,
  TUR_RENK,
  TUR_IKON,
  type Etkinlik,
} from '@/lib/hooks/useEtkinlikler';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { EtkinlikModal } from '@/components/modules/EtkinlikModal';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { fmtTarih } from '@/lib/utils';
import { ayTatilleri, tatilRenkSiniflari, isGunuMu, type TatilBilgi } from '@/lib/data/tatiller';
import { generateICS, generateCSV, downloadFile } from '@/lib/utils/takvimExport';

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const SAAT_DILIM = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

type Gorunum = 'ay' | 'hafta' | 'gun';
type FiltreTur = '' | 'Duruşma' | 'Görev' | 'Son Gün' | 'İtiraz Son Gün' | 'Oturum' | 'İhtarname Süresi' | 'Teslim Tarihi' | 'Toplantı' | 'Müvekkil Görüşmesi' | 'sanal' | 'gercek';

// ── Yardımcılar ──
function tarihStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function haftaninPazartesi(d: Date): Date {
  const klon = new Date(d);
  const gun = klon.getDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  klon.setDate(klon.getDate() + fark);
  return klon;
}
function gunEkle(d: Date, n: number): Date {
  const klon = new Date(d);
  klon.setDate(klon.getDate() + n);
  return klon;
}

// ── İş Günü Hesaplayıcı ──
function isGunuHesapla(baslangic: string, gunSayisi: number): string {
  let d = new Date(baslangic + 'T00:00:00');
  let kalan = gunSayisi;
  while (kalan > 0) {
    d = gunEkle(d, 1);
    const ts = tarihStr(d);
    if (isGunuMu(ts)) kalan--;
  }
  return tarihStr(d);
}

export default function TakvimPage() {
  useEffect(() => { document.title = 'Takvim | LexBase'; }, []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tumEtkinlikler = useTumEtkinlikler();
  const { isLoading } = useEtkinlikler();
  const etkinlikKaydet = useEtkinlikKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: personeller } = usePersoneller();

  const bugun = new Date();
  const bugunS = tarihStr(bugun);

  // ── URL Params ──
  const urlTarih = searchParams.get('tarih');
  const urlTur = searchParams.get('tur') as FiltreTur | null;
  const urlGorunum = searchParams.get('gorunum') as Gorunum | null;

  const [yil, setYil] = useState(() => urlTarih ? parseInt(urlTarih.split('-')[0]) : bugun.getFullYear());
  const [ay, setAy] = useState(() => urlTarih ? parseInt(urlTarih.split('-')[1]) - 1 : bugun.getMonth());
  const [gorunum, setGorunum] = useState<Gorunum>(urlGorunum || 'ay');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliEtkinlik, setSeciliEtkinlik] = useState<Etkinlik | null>(null);
  const [seciliGun, setSeciliGun] = useState<string | null>(urlTarih || null);
  const [prefillTarih, setPrefillTarih] = useState<string>('');
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<FiltreTur>(urlTur || '');
  const [haftaBaslangic, setHaftaBaslangic] = useState(() => haftaninPazartesi(urlTarih ? new Date(urlTarih + 'T00:00:00') : bugun));

  // İş günü hesaplayıcı state
  const [igBaslangic, setIgBaslangic] = useState(bugunS);
  const [igGun, setIgGun] = useState(15);
  const [igAcik, setIgAcik] = useState(false);

  // Sürükle-bırak state
  const [suruklenen, setSuruklenen] = useState<string | null>(null);

  // URL params sync
  useEffect(() => {
    if (urlTarih && urlTarih !== seciliGun) {
      setSeciliGun(urlTarih);
      const [y, m] = urlTarih.split('-').map(Number);
      setYil(y);
      setAy(m - 1);
      setHaftaBaslangic(haftaninPazartesi(new Date(urlTarih + 'T00:00:00')));
    }
    if (urlTur) setFiltre(urlTur);
    if (urlGorunum) setGorunum(urlGorunum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL'de yeni etkinlik parametresi
  useEffect(() => {
    if (searchParams.get('yeni') === '1') {
      setSeciliEtkinlik(null);
      setModalAcik(true);
      router.replace('/takvim');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Yardımcı map'ler ──
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  const personelAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    personeller?.forEach((p) => { map[p.id] = p.ad || p.email || '?'; });
    return map;
  }, [personeller]);

  // ── Filtrelenmiş etkinlikler ──
  const filtrelenmis = useMemo(() => {
    let liste = tumEtkinlikler;
    if (arama.trim()) {
      const q = arama.toLocaleLowerCase('tr');
      liste = liste.filter((e) =>
        (e.baslik || '').toLocaleLowerCase('tr').includes(q) ||
        (e.yer || '').toLocaleLowerCase('tr').includes(q) ||
        (e.not as string || '').toLocaleLowerCase('tr').includes(q) ||
        (e.muvId && muvAdMap[e.muvId]?.toLocaleLowerCase('tr').includes(q))
      );
    }
    if (filtre === 'sanal') liste = liste.filter((e) => e.sanal);
    else if (filtre === 'gercek') liste = liste.filter((e) => !e.sanal);
    else if (filtre) liste = liste.filter((e) => e.tur === filtre);
    return liste;
  }, [tumEtkinlikler, arama, filtre, muvAdMap]);

  // ── KPI Hesaplama ──
  const kpiData = useMemo(() => {
    const ayBaslangic = `${yil}-${String(ay + 1).padStart(2, '0')}-01`;
    const aySon = `${yil}-${String(ay + 1).padStart(2, '0')}-${new Date(yil, ay + 1, 0).getDate()}`;
    const ayEtkinlik = filtrelenmis.filter((e) => e.tarih && e.tarih >= ayBaslangic && e.tarih <= aySon);
    const toplam = ayEtkinlik.length;
    const durusma = ayEtkinlik.filter((e) => e.tur === 'Duruşma').length;
    const sonGun = ayEtkinlik.filter((e) => e.tur === 'Son Gün' || e.tur === 'İtiraz Son Gün').length;
    const gecikmisSure = filtrelenmis.filter((e) =>
      e.tarih && e.tarih < bugunS &&
      (e.tur === 'Son Gün' || e.tur === 'İtiraz Son Gün' || e.tur === 'İhtarname Süresi')
    ).length;
    const gelecekGunler = new Set(filtrelenmis.filter((e) => e.tarih && e.tarih >= bugunS).map((e) => e.tarih!));
    let cakismaSayisi = 0;
    for (const gun of gelecekGunler) {
      cakismaSayisi += cakismaTespit(filtrelenmis, gun).length;
    }
    return { toplam, durusma, sonGun, gecikmisSure, cakismaSayisi };
  }, [filtrelenmis, yil, ay, bugunS]);

  // ── Tatil map'leri ──
  const tatilMap = useMemo(() => ayTatilleri(yil, ay), [yil, ay]);

  // ── Aylık grid ──
  const grid = useMemo(() => {
    const ilkGun = new Date(yil, ay, 1);
    const baslangicGunu = (ilkGun.getDay() + 6) % 7;
    const toplamGun = new Date(yil, ay + 1, 0).getDate();
    const hucreler: Array<{
      gun: number | null; tarih: string; etkinlikler: Etkinlik[];
      tatiller: TatilBilgi[]; haftaSonu: boolean;
    }> = [];
    for (let i = 0; i < baslangicGunu; i++) {
      hucreler.push({ gun: null, tarih: '', etkinlikler: [], tatiller: [], haftaSonu: false });
    }
    for (let g = 1; g <= toplamGun; g++) {
      const tarih = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
      hucreler.push({
        gun: g, tarih,
        etkinlikler: filtrelenmis.filter((e) => e.tarih === tarih),
        tatiller: tatilMap[tarih] || [],
        haftaSonu: new Date(yil, ay, g).getDay() === 0 || new Date(yil, ay, g).getDay() === 6,
      });
    }
    return hucreler;
  }, [yil, ay, filtrelenmis, tatilMap]);

  // ── Haftalık veri ──
  const haftaGunleri = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = gunEkle(haftaBaslangic, i);
      const t = tarihStr(d);
      return {
        tarih: t, gunAd: GUNLER[i], gun: d.getDate(), ay: d.getMonth(),
        etkinlikler: filtrelenmis.filter((e) => e.tarih === t).sort((a, b) => (a.saat || '').localeCompare(b.saat || '')),
        tatiller: (ayTatilleri(d.getFullYear(), d.getMonth())[t] || []) as TatilBilgi[],
        haftaSonu: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [haftaBaslangic, filtrelenmis]);

  // ── Günlük veri ──
  const gunlukVeri = useMemo(() => {
    const t = seciliGun || bugunS;
    const etkinlikler = filtrelenmis
      .filter((e) => e.tarih === t)
      .sort((a, b) => (a.saat || '99:99').localeCompare(b.saat || '99:99'));
    const d = new Date(t + 'T00:00:00');
    const tatiller = (ayTatilleri(d.getFullYear(), d.getMonth())[t] || []) as TatilBilgi[];
    const cakismalar = cakismaTespit(filtrelenmis, t);
    return { tarih: t, etkinlikler, tatiller, cakismalar };
  }, [seciliGun, bugunS, filtrelenmis]);

  // ── Sidebar seçili gün ──
  const seciliGunDetay = useMemo(() => {
    if (!seciliGun) return null;
    const etkinlikler = filtrelenmis
      .filter((e) => e.tarih === seciliGun)
      .sort((a, b) => (a.saat || '99:99').localeCompare(b.saat || '99:99'));
    const d = new Date(seciliGun + 'T00:00:00');
    const tatiller = (ayTatilleri(d.getFullYear(), d.getMonth())[seciliGun] || []) as TatilBilgi[];
    const cakismalar = cakismaTespit(filtrelenmis, seciliGun);
    return { etkinlikler, tatiller, cakismalar };
  }, [seciliGun, filtrelenmis]);

  // ── Yaklaşan ──
  const yaklasan = useMemo(() => {
    const sinir = new Date();
    sinir.setDate(sinir.getDate() + 21);
    return filtrelenmis
      .filter((e) => e.tarih && e.tarih >= bugunS && e.tarih <= tarihStr(sinir))
      .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || '') || (a.saat || '').localeCompare(b.saat || ''))
      .slice(0, 15);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrelenmis]);

  // ── Mini takvim ──
  const miniGrid = useMemo(() => {
    const bas = (new Date(yil, ay, 1).getDay() + 6) % 7;
    const top = new Date(yil, ay + 1, 0).getDate();
    const h: Array<number | null> = [];
    for (let i = 0; i < bas; i++) h.push(null);
    for (let g = 1; g <= top; g++) h.push(g);
    return h;
  }, [yil, ay]);

  // ── İş günü sonucu ──
  const igSonuc = useMemo(() => {
    if (!igBaslangic || !igGun || igGun <= 0) return '';
    return isGunuHesapla(igBaslangic, igGun);
  }, [igBaslangic, igGun]);

  // ── Navigasyon ──
  const oncekiAy = useCallback(() => { if (ay === 0) { setAy(11); setYil(yil - 1); } else setAy(ay - 1); }, [ay, yil]);
  const sonrakiAy = useCallback(() => { if (ay === 11) { setAy(0); setYil(yil + 1); } else setAy(ay + 1); }, [ay, yil]);
  const bugunGit = useCallback(() => {
    setYil(bugun.getFullYear()); setAy(bugun.getMonth()); setSeciliGun(bugunS);
    setHaftaBaslangic(haftaninPazartesi(bugun));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const oncekiHafta = useCallback(() => setHaftaBaslangic((p) => gunEkle(p, -7)), []);
  const sonrakiHafta = useCallback(() => setHaftaBaslangic((p) => gunEkle(p, 7)), []);
  const oncekiGun = useCallback(() => {
    const m = seciliGun ? new Date(seciliGun + 'T00:00:00') : bugun;
    setSeciliGun(tarihStr(gunEkle(m, -1)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliGun]);
  const sonrakiGun = useCallback(() => {
    const m = seciliGun ? new Date(seciliGun + 'T00:00:00') : bugun;
    setSeciliGun(tarihStr(gunEkle(m, 1)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliGun]);

  // ── Dışa aktarım ──
  function icsExport() { downloadFile(generateICS(filtrelenmis, muvAdMap), `lexbase-takvim-${bugunS}.ics`, 'text/calendar'); }
  function csvExport() { downloadFile(generateCSV(filtrelenmis, muvAdMap), `lexbase-takvim-${bugunS}.csv`, 'text/csv'); }

  // ── Sürükle-bırak ──
  function handleDragStart(id: string) { setSuruklenen(id); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  async function handleDrop(hedefTarih: string) {
    if (!suruklenen) return;
    const etkinlik = filtrelenmis.find((e) => e.id === suruklenen);
    if (!etkinlik || etkinlik.sanal) { setSuruklenen(null); return; }
    try { await etkinlikKaydet.mutateAsync({ ...etkinlik, tarih: hedefTarih }); } catch (err) {
      console.warn('Etkinlik taşıma hatası:', err);
      alert('Etkinlik taşınırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
    setSuruklenen(null);
  }

  // ── Aksiyonlar ──
  function etkinlikAc(e: Etkinlik) { setSeciliEtkinlik(e); setModalAcik(true); }
  function hucreAc(tarih: string) { setSeciliGun(tarih); }
  function yeniEtkinlik(tarih?: string) { setSeciliEtkinlik(null); setPrefillTarih(tarih || ''); setModalAcik(true); }
  function gunGoruntule(tarih: string) { setSeciliGun(tarih); setGorunum('gun'); }
  function miniGunTikla(gun: number) {
    const t = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
    setSeciliGun(t); setHaftaBaslangic(haftaninPazartesi(new Date(t + 'T00:00:00')));
  }

  const filtreler: Array<{ value: FiltreTur; label: string }> = [
    { value: '', label: 'Tümü' }, { value: 'gercek', label: 'Manuel' }, { value: 'sanal', label: 'Otomatik' },
    { value: 'Duruşma', label: '⚖️ Duruşma' }, { value: 'Görev', label: '📋 Görev' },
    { value: 'Son Gün', label: '⏰ Son Gün' }, { value: 'İtiraz Son Gün', label: '⚠️ İtiraz' },
    { value: 'Toplantı', label: '👥 Toplantı' },
  ];

  // ── Render helpers ──
  function renderChip(e: Etkinlik, compact = false) {
    const isDashed = e.sanal || (e.adliTatilUzama && e.id.endsWith('-uzama'));
    const cls = e.adliTatilUzama && e.id.endsWith('-uzama')
      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      : TUR_RENK[e.tur || ''] || TUR_RENK['Diğer'];
    return (
      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); etkinlikAc(e); }}
        draggable={!e.sanal} onDragStart={() => !e.sanal && handleDragStart(e.id)}
        className={`text-[9px] px-1 py-0.5 rounded mb-0.5 truncate border cursor-pointer hover:opacity-80 ${cls} ${isDashed ? 'border-dashed' : ''} ${!e.sanal ? 'cursor-grab active:cursor-grabbing' : ''}`}
        title={`${e.saat ? e.saat + ' ' : ''}${e.baslik}${e.adliTatilUzama ? ' (Adli tatil)' : ''}`}
      >
        {e.saat && <span className="font-bold">{e.saat} </span>}
        {!compact && (TUR_IKON[e.tur || ''] || '') + ' '}
        {e.baslik}
      </div>
    );
  }

  function renderKart(e: Etkinlik) {
    return (
      <div key={e.id} onClick={() => etkinlikAc(e)}
        className={`p-2.5 rounded-lg cursor-pointer hover:ring-1 hover:ring-gold/20 transition-all ${e.sanal ? 'bg-surface2/70 border border-dashed border-border' : 'bg-surface2'}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
            e.adliTatilUzama && e.id.endsWith('-uzama') ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : TUR_RENK[e.tur || ''] || TUR_RENK['Diğer']
          }`}>{TUR_IKON[e.tur || ''] || '📌'} {e.tur || 'Diğer'}</span>
          {e.saat && <span className="text-[10px] text-text-muted font-mono">{e.saat}{e.bitisSaati ? `–${e.bitisSaati}` : ''}</span>}
          {e.sanal && <span className="text-[8px] bg-blue-400/10 text-blue-400 px-1 py-0.5 rounded">oto</span>}
        </div>
        <div className="text-xs font-medium text-text">{e.baslik || '—'}</div>
        {e.muvId && muvAdMap[e.muvId] && <div className="text-[10px] text-text-muted mt-0.5">👤 {muvAdMap[e.muvId]}</div>}
        {e.yer && <div className="text-[10px] text-text-dim mt-0.5">📍 {e.yer}</div>}
        {e.adliTatilUzama && !e.id.endsWith('-uzama') && <div className="text-[9px] text-amber-500 mt-1">⚠️ Süre {e.adliTatilUzama} tarihine uzar</div>}
        {e.katilimcilar && e.katilimcilar.length > 0 && <div className="text-[10px] text-text-dim mt-0.5">👥 {e.katilimcilar.map((id) => personelAdMap[id] || '?').join(', ')}</div>}
        {e.kaynakUrl && e.sanal && <a href={e.kaynakUrl} className="text-[9px] text-gold hover:underline mt-1 inline-block" onClick={(ev) => ev.stopPropagation()}>Dosyaya git →</a>}
      </div>
    );
  }

  if (isLoading) {
    return (<div className="p-6"><h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">Takvim</h1><SkeletonTable rows={8} cols={7} /></div>);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] print:min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 print:mb-1">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">Takvim</h1>
        <div className="flex items-center gap-2 print:hidden">
          <div className="relative">
            <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Etkinlik ara..."
              className="w-44 pl-7 pr-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold/40" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim text-xs">🔍</span>
          </div>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={icsExport} className="px-2.5 py-1.5 text-[10px] text-text-muted hover:text-text hover:bg-surface2 transition-colors" title="Google Calendar / Outlook">📤 ICS</button>
            <div className="w-px bg-border h-4"></div>
            <button onClick={csvExport} className="px-2.5 py-1.5 text-[10px] text-text-muted hover:text-text hover:bg-surface2 transition-colors">📥 CSV</button>
            <div className="w-px bg-border h-4"></div>
            <button onClick={() => window.print()} className="px-2.5 py-1.5 text-[10px] text-text-muted hover:text-text hover:bg-surface2 transition-colors">🖨️</button>
          </div>
          <button onClick={() => yeniEtkinlik()} className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">+ Yeni Etkinlik</button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-3 print:hidden">
        {[
          { label: 'Bu Ay Toplam', value: kpiData.toplam, renk: 'text-text' },
          { label: 'Duruşma', value: kpiData.durusma, renk: 'text-red' },
          { label: 'Son Gün / İtiraz', value: kpiData.sonGun, renk: 'text-orange-400' },
          { label: 'Gecikmiş Süre', value: kpiData.gecikmisSure, renk: kpiData.gecikmisSure > 0 ? 'text-red' : 'text-green' },
          { label: 'Çakışma', value: kpiData.cakismaSayisi, renk: kpiData.cakismaSayisi > 0 ? 'text-red' : 'text-green' },
        ].map((k) => (
          <div key={k.label} className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className={`font-[var(--font-playfair)] text-xl font-bold ${k.renk}`}>{k.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtreler + Görünüm Toggle */}
      <div className="flex items-center justify-between mb-3 print:hidden">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filtreler.map((f) => (
            <button key={f.value} onClick={() => setFiltre(f.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${filtre === f.value ? 'bg-gold/20 text-gold border-gold/30' : 'bg-surface2 text-text-muted border-border hover:text-text'}`}
            >{f.label}</button>
          ))}
          {(arama || filtre) && <button onClick={() => { setArama(''); setFiltre(''); }} className="px-2 py-1 text-[11px] text-red">✕ Temizle</button>}
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          {(['ay', 'hafta', 'gun'] as const).map((g) => (
            <button key={g} onClick={() => {
              setGorunum(g);
              if (g === 'hafta') setHaftaBaslangic(haftaninPazartesi(seciliGun ? new Date(seciliGun + 'T00:00:00') : bugun));
              if (g === 'gun' && !seciliGun) setSeciliGun(bugunS);
            }} className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${gorunum === g ? 'bg-gold text-bg' : 'text-text-muted hover:text-text hover:bg-surface2'}`}
            >{g === 'ay' ? 'Ay' : g === 'hafta' ? 'Hafta' : 'Gün'}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4 flex-1 print:grid-cols-1">
        {/* ═══ ANA ALAN ═══ */}
        <div className="bg-surface border border-border rounded-lg p-4 print:border-0 print:p-0">

          {/* ── AYLIK ── */}
          {gorunum === 'ay' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={oncekiAy} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors print:hidden">‹ Önceki</button>
              <div className="flex items-center gap-3">
                <h2 className="font-[var(--font-playfair)] text-lg text-text font-bold">{AYLAR[ay]} {yil}</h2>
                <button onClick={bugunGit} className="px-2 py-1 text-[10px] bg-gold-dim text-gold rounded border border-gold/20 hover:bg-gold hover:text-bg transition-colors print:hidden">Bugün</button>
              </div>
              <button onClick={sonrakiAy} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors print:hidden">Sonraki ›</button>
            </div>
            <div className="grid grid-cols-7 gap-px mb-1">
              {GUNLER.map((g, i) => <div key={g} className={`text-center text-[11px] font-medium py-1 ${i >= 5 ? 'text-text-dim' : 'text-text-muted'}`}>{g}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {grid.map((hucre, i) => {
                const isBugun = hucre.tarih === bugunS;
                const isSecili = hucre.tarih === seciliGun;
                const hasResmi = hucre.tatiller.some((t) => t.tip === 'resmi' || t.tip === 'dini');
                const hasAdli = hucre.tatiller.some((t) => t.tip === 'adli');
                const hasTatil = hucre.tatiller.length > 0;
                return (
                  <div key={i} onClick={() => hucre.gun !== null && hucreAc(hucre.tarih)}
                    onDragOver={handleDragOver} onDrop={() => hucre.gun !== null && handleDrop(hucre.tarih)}
                    className={`min-h-[90px] p-1 border rounded cursor-pointer transition-colors ${
                      hucre.gun === null ? 'bg-transparent border-transparent'
                      : isSecili ? 'bg-gold-dim border-gold/40 ring-1 ring-gold/20'
                      : isBugun ? 'bg-gold-dim border-gold/30'
                      : hasResmi ? 'bg-red/5 border-red/10'
                      : hasAdli ? 'bg-blue-400/5 border-blue-400/10'
                      : hucre.haftaSonu ? 'bg-surface2/30 border-border/20 hover:bg-surface2/50'
                      : 'bg-surface2/50 border-border/30 hover:bg-surface2'
                    } ${suruklenen && hucre.gun !== null ? 'ring-1 ring-dashed ring-gold/30' : ''}`}
                  >
                    {hucre.gun !== null && (<>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] font-medium cursor-pointer hover:underline ${isBugun ? 'text-gold font-bold' : hasResmi ? 'text-red font-bold' : hucre.haftaSonu ? 'text-text-dim' : 'text-text-muted'}`}
                          onClick={(ev) => { ev.stopPropagation(); gunGoruntule(hucre.tarih); }}>{hucre.gun}</span>
                        {hasTatil && <span className="text-[8px] leading-none" title={hucre.tatiller.map((t) => t.ad).join(', ')}>{hasResmi ? '🔴' : hasAdli ? '🔵' : '🟢'}</span>}
                      </div>
                      {hucre.tatiller.filter((t) => t.tip === 'resmi' || t.tip === 'dini').slice(0, 1).map((t, ti) => (
                        <div key={ti} className="text-[8px] text-red/80 truncate mb-0.5 leading-tight">{t.ad}</div>
                      ))}
                      {hasAdli && !hasResmi && (
                        <div className="text-[8px] text-blue-400/80 truncate mb-0.5 leading-tight">⚖️ Adli Tatil</div>
                      )}
                      {hucre.etkinlikler.slice(0, 3).map((e) => renderChip(e))}
                      {hucre.etkinlikler.length > 3 && <div className="text-[9px] text-text-dim text-center font-medium">+{hucre.etkinlikler.length - 3} daha</div>}
                    </>)}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* ── HAFTALIK ── */}
          {gorunum === 'hafta' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={oncekiHafta} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text">‹ Önceki</button>
              <div className="flex items-center gap-3">
                <h2 className="font-[var(--font-playfair)] text-base text-text font-bold">{fmtTarih(tarihStr(haftaBaslangic))} — {fmtTarih(tarihStr(gunEkle(haftaBaslangic, 6)))}</h2>
                <button onClick={bugunGit} className="px-2 py-1 text-[10px] bg-gold-dim text-gold rounded border border-gold/20 hover:bg-gold hover:text-bg">Bugün</button>
              </div>
              <button onClick={sonrakiHafta} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text">Sonraki ›</button>
            </div>
            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px mb-1">
              <div></div>
              {haftaGunleri.map((g) => (
                <div key={g.tarih} onClick={() => { setSeciliGun(g.tarih); setGorunum('gun'); }}
                  className={`text-center py-1.5 rounded cursor-pointer transition-colors ${g.tarih === bugunS ? 'bg-gold-dim' : g.haftaSonu ? 'bg-surface2/30' : 'hover:bg-surface2/50'}`}>
                  <div className={`text-[10px] font-medium ${g.tarih === bugunS ? 'text-gold' : 'text-text-muted'}`}>{g.gunAd}</div>
                  <div className={`text-sm font-bold ${g.tarih === bugunS ? 'text-gold' : 'text-text'}`}>{g.gun}</div>
                  {g.tatiller.some((t) => t.tip === 'resmi' || t.tip === 'dini') && (
                    <div className="text-[7px] text-red truncate px-1">{g.tatiller.find((t) => t.tip === 'resmi' || t.tip === 'dini')?.ad}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              {SAAT_DILIM.map((saat) => (
                <div key={saat} className="grid grid-cols-[60px_repeat(7,1fr)] gap-px border-b border-border/30 last:border-0">
                  <div className="text-[10px] text-text-dim py-2 px-2 text-right font-mono border-r border-border/30">{saat}</div>
                  {haftaGunleri.map((g) => {
                    const sb = `${String(parseInt(saat.split(':')[0]) + 1).padStart(2, '0')}:00`;
                    const se = g.etkinlikler.filter((e) => e.saat && e.saat >= saat && e.saat < sb);
                    return (
                      <div key={`${g.tarih}-${saat}`}
                        onClick={() => { setPrefillTarih(g.tarih); setSeciliEtkinlik(null); setModalAcik(true); }}
                        onDragOver={handleDragOver} onDrop={() => handleDrop(g.tarih)}
                        className={`min-h-[36px] px-0.5 py-0.5 cursor-pointer transition-colors ${g.tarih === bugunS ? 'bg-gold-dim/30 hover:bg-gold-dim/50' : g.haftaSonu ? 'bg-surface2/20 hover:bg-surface2/40' : 'hover:bg-surface2/30'}`}
                      >{se.map((e) => renderChip(e, true))}</div>
                    );
                  })}
                </div>
              ))}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px border-t border-border">
                <div className="text-[10px] text-text-dim py-2 px-2 text-right font-mono border-r border-border/30">Tüm gün</div>
                {haftaGunleri.map((g) => (
                  <div key={`${g.tarih}-all`} className="px-0.5 py-0.5 min-h-[28px]">
                    {g.etkinlikler.filter((e) => !e.saat).map((e) => renderChip(e, true))}
                  </div>
                ))}
              </div>
            </div>
          </>)}

          {/* ── GÜNLÜK ── */}
          {gorunum === 'gun' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={oncekiGun} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text">‹ Önceki</button>
              <div className="flex items-center gap-3">
                <h2 className="font-[var(--font-playfair)] text-lg text-text font-bold">
                  {fmtTarih(gunlukVeri.tarih)} · {GUNLER[(() => { const d = new Date(gunlukVeri.tarih + 'T00:00:00').getDay(); return d === 0 ? 6 : d - 1; })()]}
                </h2>
                <button onClick={bugunGit} className="px-2 py-1 text-[10px] bg-gold-dim text-gold rounded border border-gold/20 hover:bg-gold hover:text-bg">Bugün</button>
              </div>
              <button onClick={sonrakiGun} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text">Sonraki ›</button>
            </div>
            {gunlukVeri.tatiller.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {gunlukVeri.tatiller.map((t, i) => (
                  <span key={i} className={`text-[10px] px-2 py-1 rounded border ${tatilRenkSiniflari(t.tip)}`}>
                    {t.tip === 'resmi' ? '🔴' : t.tip === 'dini' ? '🌙' : t.tip === 'adli' ? '⚖️' : '📌'} {t.ad}
                  </span>
                ))}
              </div>
            )}
            {gunlukVeri.cakismalar.length > 0 && (
              <div className="space-y-1 mb-3">
                {gunlukVeri.cakismalar.map((c, i) => (
                  <div key={i} className={`text-[10px] px-2 py-1.5 rounded border ${c.seviye === 'kirmizi' ? 'bg-red/10 text-red border-red/20' : 'bg-amber-400/10 text-amber-500 border-amber-400/20'}`}>
                    {c.seviye === 'kirmizi' ? '🔴 Fiziken İmkânsız Çakışma' : '🟡 Aynı Adliye Çakışması'}
                    <span className="ml-2 opacity-70">{c.etkinlik1.saat} — {c.etkinlik1.baslik?.substring(0, 25)} vs {c.etkinlik2.baslik?.substring(0, 25)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border border-border rounded-lg overflow-hidden">
              {SAAT_DILIM.map((saat) => {
                const sb = `${String(parseInt(saat.split(':')[0]) + 1).padStart(2, '0')}:00`;
                const se = gunlukVeri.etkinlikler.filter((e) => e.saat && e.saat >= saat && e.saat < sb);
                return (
                  <div key={saat} className="flex border-b border-border/30 last:border-0">
                    <div className="w-16 text-[11px] text-text-dim py-3 px-2 text-right font-mono border-r border-border/30 flex-shrink-0">{saat}</div>
                    <div className="flex-1 min-h-[48px] px-2 py-1 hover:bg-surface2/30 cursor-pointer transition-colors"
                      onClick={() => yeniEtkinlik(gunlukVeri.tarih)} onDragOver={handleDragOver} onDrop={() => handleDrop(gunlukVeri.tarih)}>
                      {se.map((e) => (
                        <div key={e.id} onClick={(ev) => { ev.stopPropagation(); etkinlikAc(e); }}
                          draggable={!e.sanal} onDragStart={() => !e.sanal && handleDragStart(e.id)}
                          className={`px-2.5 py-2 rounded-lg mb-1 cursor-pointer border transition-all hover:ring-1 hover:ring-gold/20 ${e.sanal ? 'border-dashed border-border bg-surface2/70' : 'border-border bg-surface2'} ${!e.sanal ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TUR_RENK[e.tur || ''] || TUR_RENK['Diğer']}`}>{TUR_IKON[e.tur || ''] || '📌'} {e.tur}</span>
                            <span className="text-[10px] text-text-muted font-mono">{e.saat}{e.bitisSaati ? ` – ${e.bitisSaati}` : ''}</span>
                            {e.sanal && <span className="text-[8px] bg-blue-400/10 text-blue-400 px-1 py-0.5 rounded">oto</span>}
                          </div>
                          <div className="text-xs font-medium text-text mt-1">{e.baslik}</div>
                          {e.yer && <div className="text-[10px] text-text-dim mt-0.5">📍 {e.yer}</div>}
                          {e.muvId && muvAdMap[e.muvId] && <div className="text-[10px] text-text-muted mt-0.5">👤 {muvAdMap[e.muvId]}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {gunlukVeri.etkinlikler.filter((e) => !e.saat).length > 0 && (
                <div className="flex border-t border-border">
                  <div className="w-16 text-[11px] text-text-dim py-3 px-2 text-right font-mono border-r border-border/30 flex-shrink-0">Tüm gün</div>
                  <div className="flex-1 px-2 py-1 space-y-1">{gunlukVeri.etkinlikler.filter((e) => !e.saat).map(renderKart)}</div>
                </div>
              )}
            </div>
          </>)}
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <div className="space-y-4 print:hidden">
          {/* Mini Takvim */}
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <button onClick={oncekiAy} className="text-text-muted hover:text-text text-xs">‹</button>
              <span className="text-[11px] font-semibold text-text">{AYLAR[ay]} {yil}</span>
              <button onClick={sonrakiAy} className="text-text-muted hover:text-text text-xs">›</button>
            </div>
            <div className="grid grid-cols-7 gap-0">
              {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((g, i) => <div key={i} className="text-center text-[8px] text-text-dim py-0.5">{g}</div>)}
              {miniGrid.map((g, i) => {
                if (g === null) return <div key={`e-${i}`}></div>;
                const t = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
                const isB = t === bugunS; const isS = t === seciliGun;
                const hasE = filtrelenmis.some((e) => e.tarih === t);
                return (
                  <button key={i} onClick={() => miniGunTikla(g)}
                    className={`text-[10px] py-0.5 rounded transition-colors relative ${isS ? 'bg-gold text-bg font-bold' : isB ? 'bg-gold-dim text-gold font-bold' : 'text-text-muted hover:text-text hover:bg-surface2'}`}>
                    {g}{hasE && !isS && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* İş Günü Hesaplayıcı */}
          <div className="bg-surface border border-border rounded-lg p-3">
            <button onClick={() => setIgAcik(!igAcik)} className="flex items-center justify-between w-full text-[11px] font-semibold text-text-muted hover:text-text">
              <span>🧮 İş Günü Hesaplayıcı</span><span className="text-text-dim">{igAcik ? '▾' : '▸'}</span>
            </button>
            {igAcik && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] text-text-dim block mb-0.5">Başlangıç</label>
                    <input type="date" value={igBaslangic} onChange={(e) => setIgBaslangic(e.target.value)} className="w-full px-2 py-1 bg-surface2 border border-border rounded text-[10px] text-text focus:outline-none focus:border-gold/40" /></div>
                  <div><label className="text-[9px] text-text-dim block mb-0.5">İş Günü Sayısı</label>
                    <input type="number" value={igGun} onChange={(e) => setIgGun(parseInt(e.target.value) || 0)} min={1} max={365} className="w-full px-2 py-1 bg-surface2 border border-border rounded text-[10px] text-text focus:outline-none focus:border-gold/40" /></div>
                </div>
                {igSonuc && (
                  <div className="bg-gold-dim border border-gold/20 rounded px-2 py-1.5 text-center">
                    <div className="text-[10px] text-text-muted">Sonuç Tarih</div>
                    <div className="text-sm font-bold text-gold font-mono">{fmtTarih(igSonuc)}</div>
                    <button onClick={() => { setSeciliGun(igSonuc); const [sy, sm] = igSonuc.split('-').map(Number); setYil(sy); setAy(sm - 1); setGorunum('ay'); }}
                      className="text-[9px] text-gold hover:underline mt-0.5">Takvimde göster →</button>
                  </div>
                )}
                <div className="text-[8px] text-text-dim leading-tight">Hafta sonu + resmi/dini tatiller hariç. Adli tatil tek başına iş günü engeli değildir.</div>
              </div>
            )}
          </div>

          {/* Seçili Gün Detayı */}
          {seciliGun && seciliGunDetay && gorunum !== 'gun' && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text">📆 {fmtTarih(seciliGun)}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => gunGoruntule(seciliGun)} className="px-2 py-1 text-[10px] bg-surface2 text-text-muted rounded hover:text-text" title="Günlük görünüm">👁️</button>
                  <button onClick={() => yeniEtkinlik(seciliGun)} className="px-2 py-1 text-[10px] bg-gold text-bg rounded font-semibold hover:bg-gold-light">+ Ekle</button>
                </div>
              </div>
              {seciliGunDetay.tatiller.length > 0 && (
                <div className="space-y-1 mb-3">
                  {seciliGunDetay.tatiller.map((t, i) => (
                    <div key={i} className={`text-[10px] px-2 py-1 rounded border ${tatilRenkSiniflari(t.tip)}`}>
                      {t.tip === 'resmi' ? '🔴' : t.tip === 'dini' ? '🌙' : t.tip === 'adli' ? '⚖️' : '📌'} {t.ad}
                    </div>
                  ))}
                </div>
              )}
              {seciliGunDetay.cakismalar.length > 0 && (
                <div className="space-y-1 mb-3">
                  {seciliGunDetay.cakismalar.map((c, i) => (
                    <div key={i} className={`text-[10px] px-2 py-1.5 rounded border ${c.seviye === 'kirmizi' ? 'bg-red/10 text-red border-red/20' : 'bg-amber-400/10 text-amber-500 border-amber-400/20'}`}>
                      {c.seviye === 'kirmizi' ? '🔴 Fiziken İmkânsız' : '🟡 Aynı Adliye'}
                      <div className="text-[9px] mt-0.5 opacity-80">{c.etkinlik1.saat} — {c.etkinlik1.baslik?.substring(0, 25)} vs {c.etkinlik2.baslik?.substring(0, 25)}</div>
                    </div>
                  ))}
                </div>
              )}
              {seciliGunDetay.etkinlikler.length === 0
                ? <div className="text-center py-4 text-text-muted text-xs">Bu günde etkinlik yok</div>
                : <div className="space-y-2">{seciliGunDetay.etkinlikler.map(renderKart)}</div>
              }
            </div>
          )}

          {/* Yaklaşan */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text mb-3">📅 Yaklaşan</h3>
            {yaklasan.length === 0 ? <div className="text-center py-6 text-text-muted text-xs">Yaklaşan etkinlik yok</div> : (
              <div className="space-y-2">
                {yaklasan.map((e) => {
                  const gun = Math.ceil((new Date(e.tarih!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={e.id} onClick={() => {
                      setSeciliGun(e.tarih || null);
                      if (e.tarih) { const [eY, eA] = e.tarih.split('-').map(Number); if (eY !== yil || eA - 1 !== ay) { setYil(eY); setAy(eA - 1); } setHaftaBaslangic(haftaninPazartesi(new Date(e.tarih + 'T00:00:00'))); }
                    }} className={`p-2 rounded-lg cursor-pointer hover:ring-1 hover:ring-gold/20 transition-all ${e.sanal ? 'bg-surface2/70 border border-dashed border-border' : 'bg-surface2'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TUR_RENK[e.tur || ''] || TUR_RENK['Diğer']}`}>{TUR_IKON[e.tur || ''] || '📌'} {e.tur || 'Diğer'}</span>
                        <span className={`text-[10px] font-bold ${gun <= 0 ? 'text-red' : gun <= 1 ? 'text-orange-400' : gun <= 3 ? 'text-gold' : 'text-text-dim'}`}>
                          {gun <= 0 ? 'BUGÜN' : gun === 1 ? 'YARIN' : `${gun} gün`}
                        </span>
                        {e.sanal && <span className="text-[8px] bg-blue-400/10 text-blue-400 px-1 py-0.5 rounded ml-auto">oto</span>}
                      </div>
                      <div className="text-[11px] font-medium text-text truncate">{e.baslik || '—'}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{fmtTarih(e.tarih)} {e.saat && `· ${e.saat}`}{e.muvId && muvAdMap[e.muvId] && ` · ${muvAdMap[e.muvId]}`}</div>
                      {e.adliTatilUzama && !e.id.endsWith('-uzama') && <div className="text-[9px] text-amber-500 mt-0.5">⚠️ Süre {e.adliTatilUzama}&apos;e uzar</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lejant */}
          <div className="bg-surface border border-border rounded-lg p-3">
            <h4 className="text-[11px] font-semibold text-text-muted mb-2">Gösterim</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[['bg-red', 'Duruşma'], ['bg-indigo-400', 'Görev'], ['bg-orange-400', 'Son Gün'], ['bg-rose-500', 'İtiraz'],
                ['bg-purple-400', 'Toplantı'], ['bg-emerald-400', 'Oturum'], ['bg-amber-500', 'İhtarname'], ['bg-cyan-400', 'Teslim']
              ].map(([r, l]) => <div key={l} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${r}`}></span><span className="text-[10px] text-text-muted">{l}</span></div>)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3">
              {[['🔴', 'Resmi tatil'], ['🔵', 'Adli tatil'], ['🟢', 'Hukuk günü']].map(([i, l]) => <div key={l} className="flex items-center gap-1.5"><span className="text-[9px]">{i}</span><span className="text-[10px] text-text-dim">{l}</span></div>)}
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-5 h-2 border border-dashed border-text-dim rounded"></div><span className="text-[10px] text-text-dim">Otomatik</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[10px]">↕️</span><span className="text-[10px] text-text-dim">Sürükle-bırak</span></div>
            </div>
          </div>
        </div>
      </div>

      <EtkinlikModal open={modalAcik} onClose={() => { setModalAcik(false); setSeciliEtkinlik(null); setPrefillTarih(''); }} etkinlik={seciliEtkinlik} prefillTarih={prefillTarih} />
    </div>
  );
}
