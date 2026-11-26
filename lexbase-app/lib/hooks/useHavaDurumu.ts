'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPreviouslyGrantedLocation } from '@/lib/weather/location';

/* ══════════════════════════════════════════════════════════════
   Hava Durumu Hook — Open-Meteo API (ücretsiz, API key gereksiz)
   GPS → Profil şehri → Varsayılan İstanbul
   ══════════════════════════════════════════════════════════════ */

/* ── Türkiye Şehirleri ── */
export interface Sehir {
  ad: string;
  lat: number;
  lon: number;
}

export const SEHIRLER: Sehir[] = [
  { ad: 'İstanbul', lat: 41.01, lon: 28.98 },
  { ad: 'Ankara', lat: 39.93, lon: 32.86 },
  { ad: 'İzmir', lat: 38.42, lon: 27.14 },
  { ad: 'Bursa', lat: 40.19, lon: 29.06 },
  { ad: 'Antalya', lat: 36.90, lon: 30.70 },
  { ad: 'Adana', lat: 37.00, lon: 35.33 },
  { ad: 'Konya', lat: 37.87, lon: 32.48 },
  { ad: 'Gaziantep', lat: 37.06, lon: 37.38 },
  { ad: 'Mersin', lat: 36.80, lon: 34.63 },
  { ad: 'Diyarbakır', lat: 37.91, lon: 40.22 },
  { ad: 'Kayseri', lat: 38.73, lon: 35.49 },
  { ad: 'Eskişehir', lat: 39.78, lon: 30.52 },
  { ad: 'Samsun', lat: 41.29, lon: 36.33 },
  { ad: 'Trabzon', lat: 41.00, lon: 39.72 },
  { ad: 'Denizli', lat: 37.77, lon: 29.09 },
  { ad: 'Malatya', lat: 38.35, lon: 38.31 },
  { ad: 'Erzurum', lat: 39.90, lon: 41.27 },
  { ad: 'Van', lat: 38.49, lon: 43.38 },
  { ad: 'Manisa', lat: 38.62, lon: 27.43 },
  { ad: 'Sakarya', lat: 40.68, lon: 30.40 },
  { ad: 'Muğla', lat: 37.22, lon: 28.36 },
  { ad: 'Tekirdağ', lat: 41.00, lon: 27.52 },
  { ad: 'Edirne', lat: 41.67, lon: 26.56 },
  { ad: 'Çanakkale', lat: 40.15, lon: 26.41 },
  { ad: 'Aydın', lat: 37.85, lon: 27.84 },
];

const VARSAYILAN_SEHIR = SEHIRLER[0]; // İstanbul
const LS_SEHIR_KEY = 'lb_sehir';

/* ── WMO Hava Kodu → Türkçe + İkon ── */
interface HavaKodBilgi {
  aciklama: string;
  ikon: string;
  ikonGece: string;
}

const WMO_KODLARI: Record<number, HavaKodBilgi> = {
  0:  { aciklama: 'Açık',                ikon: '☀️', ikonGece: '🌙' },
  1:  { aciklama: 'Çoğunlukla Açık',     ikon: '🌤️', ikonGece: '🌙' },
  2:  { aciklama: 'Parçalı Bulutlu',      ikon: '⛅',  ikonGece: '☁️' },
  3:  { aciklama: 'Bulutlu',              ikon: '☁️',  ikonGece: '☁️' },
  45: { aciklama: 'Sisli',                ikon: '🌫️', ikonGece: '🌫️' },
  48: { aciklama: 'Yoğun Sis',            ikon: '🌫️', ikonGece: '🌫️' },
  51: { aciklama: 'Hafif Çisenti',        ikon: '🌦️', ikonGece: '🌧️' },
  53: { aciklama: 'Çisenti',              ikon: '🌦️', ikonGece: '🌧️' },
  55: { aciklama: 'Yoğun Çisenti',        ikon: '🌧️', ikonGece: '🌧️' },
  56: { aciklama: 'Dondurucu Çisenti',    ikon: '🌧️', ikonGece: '🌧️' },
  57: { aciklama: 'Yoğun Dondurucu Çisenti', ikon: '🌧️', ikonGece: '🌧️' },
  61: { aciklama: 'Hafif Yağmur',         ikon: '🌦️', ikonGece: '🌧️' },
  63: { aciklama: 'Yağmur',               ikon: '🌧️', ikonGece: '🌧️' },
  65: { aciklama: 'Şiddetli Yağmur',      ikon: '🌧️', ikonGece: '🌧️' },
  66: { aciklama: 'Dondurucu Yağmur',     ikon: '🌧️', ikonGece: '🌧️' },
  67: { aciklama: 'Yoğun Dondurucu Yağmur', ikon: '🌧️', ikonGece: '🌧️' },
  71: { aciklama: 'Hafif Kar',            ikon: '🌨️', ikonGece: '🌨️' },
  73: { aciklama: 'Kar Yağışı',           ikon: '❄️',  ikonGece: '❄️' },
  75: { aciklama: 'Yoğun Kar',            ikon: '❄️',  ikonGece: '❄️' },
  77: { aciklama: 'Kar Taneleri',         ikon: '❄️',  ikonGece: '❄️' },
  80: { aciklama: 'Hafif Sağanak',        ikon: '🌦️', ikonGece: '🌧️' },
  81: { aciklama: 'Sağanak Yağış',        ikon: '🌧️', ikonGece: '🌧️' },
  82: { aciklama: 'Şiddetli Sağanak',     ikon: '🌧️', ikonGece: '🌧️' },
  85: { aciklama: 'Hafif Kar Sağanağı',   ikon: '🌨️', ikonGece: '🌨️' },
  86: { aciklama: 'Yoğun Kar Sağanağı',   ikon: '❄️',  ikonGece: '❄️' },
  95: { aciklama: 'Gök Gürültülü Fırtına', ikon: '⛈️', ikonGece: '⛈️' },
  96: { aciklama: 'Dolu ile Fırtına',     ikon: '⛈️',  ikonGece: '⛈️' },
  99: { aciklama: 'Şiddetli Dolu Fırtınası', ikon: '⛈️', ikonGece: '⛈️' },
};

function getWmoInfo(code: number, saatDilimi?: number): HavaKodBilgi {
  const info = WMO_KODLARI[code] ?? { aciklama: 'Bilinmiyor', ikon: '🌡️', ikonGece: '🌡️' };
  if (saatDilimi !== undefined) {
    const saat = saatDilimi;
    if (saat < 6 || saat >= 20) {
      return { ...info, ikon: info.ikonGece };
    }
  }
  return info;
}

/* ── API Response Tipleri ── */
export interface HavaDurumuMevcut {
  sicaklik: number;
  havaKodu: number;
  nem: number;
  ruzgar: number;
  aciklama: string;
  ikon: string;
}

export interface SaatlikTahmin {
  saat: string; // "14:00"
  sicaklik: number;
  havaKodu: number;
  ikon: string;
  aciklama: string;
}

export interface GunlukTahmin {
  gun: string;   // "Pazartesi"
  tarih: string; // "17 Mar"
  minSicaklik: number;
  maxSicaklik: number;
  havaKodu: number;
  ikon: string;
  aciklama: string;
}

export interface HavaDurumuData {
  sehir: string;
  mevcut: HavaDurumuMevcut;
  saatlik: SaatlikTahmin[];
  gunluk: GunlukTahmin[];
}

/* ── Konum Yönetimi ── */
function kayitliSehirAl(): Sehir {
  if (typeof window === 'undefined') return VARSAYILAN_SEHIR;
  try {
    const raw = localStorage.getItem(LS_SEHIR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed as Sehir;
    }
  } catch { /* ignore */ }
  return VARSAYILAN_SEHIR;
}

export function sehirKaydet(sehir: Sehir) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_SEHIR_KEY, JSON.stringify(sehir));
  } catch { /* ignore */ }
}

/** GPS koordinatına en yakın şehri bul */
function enYakinSehir(lat: number, lon: number): Sehir {
  let minDist = Infinity;
  let enYakin = VARSAYILAN_SEHIR;

  for (const s of SEHIRLER) {
    const dist = Math.pow(s.lat - lat, 2) + Math.pow(s.lon - lon, 2);
    if (dist < minDist) {
      minDist = dist;
      enYakin = s;
    }
  }
  return enYakin;
}

/* ── API fetch ── */
async function havaDurumuGetir(lat: number, lon: number, sehirAd: string): Promise<HavaDurumuData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Hava durumu alınamadı');
  const json = await res.json();

  const mevcutSaat = new Date().getHours();

  // Mevcut durum
  const mevcutKod = json.current.weather_code;
  const mevcutInfo = getWmoInfo(mevcutKod, mevcutSaat);
  const mevcut: HavaDurumuMevcut = {
    sicaklik: Math.round(json.current.temperature_2m),
    havaKodu: mevcutKod,
    nem: json.current.relative_humidity_2m,
    ruzgar: Math.round(json.current.wind_speed_10m),
    aciklama: mevcutInfo.aciklama,
    ikon: mevcutInfo.ikon,
  };

  // Saatlik tahmin (bugünün kalan saatleri + yarın sabah)
  const simdi = new Date();
  const buSaat = simdi.getHours();
  const saatlik: SaatlikTahmin[] = [];
  const saatlerArr: string[] = json.hourly.time;
  const saatSicaklikArr: number[] = json.hourly.temperature_2m;
  const saatKodArr: number[] = json.hourly.weather_code;

  for (let i = 0; i < saatlerArr.length && saatlik.length < 24; i++) {
    const saatDate = new Date(saatlerArr[i]);
    if (saatDate.getTime() < simdi.getTime() - 3600000) continue; // geçmiş saatleri atla

    const saatNum = saatDate.getHours();
    const info = getWmoInfo(saatKodArr[i], saatNum);
    saatlik.push({
      saat: `${String(saatNum).padStart(2, '0')}:00`,
      sicaklik: Math.round(saatSicaklikArr[i]),
      havaKodu: saatKodArr[i],
      ikon: info.ikon,
      aciklama: info.aciklama,
    });
  }

  // Günlük tahmin (7 gün)
  const gunAdlari = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const ayAdlari = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  const gunluk: GunlukTahmin[] = json.daily.time.map((tarih: string, i: number) => {
    const d = new Date(tarih + 'T12:00:00');
    const info = getWmoInfo(json.daily.weather_code[i], 12);
    const bugun = simdi.toDateString() === d.toDateString();
    return {
      gun: bugun ? 'Bugün' : gunAdlari[d.getDay()],
      tarih: `${d.getDate()} ${ayAdlari[d.getMonth()]}`,
      minSicaklik: Math.round(json.daily.temperature_2m_min[i]),
      maxSicaklik: Math.round(json.daily.temperature_2m_max[i]),
      havaKodu: json.daily.weather_code[i],
      ikon: info.ikon,
      aciklama: info.aciklama,
    };
  });

  return { sehir: sehirAd, mevcut, saatlik, gunluk };
}

/* ── Konum belirle (GPS → profil → varsayılan) ── */
async function konumBelirle(): Promise<{ sehir: Sehir; gps: boolean }> {
  // Only reuse an existing permission; otherwise keep navigation free of prompts.
  const gps = typeof navigator === 'undefined' ? null : await getPreviouslyGrantedLocation(navigator);
  if (gps) {
    const sehir = enYakinSehir(gps.lat, gps.lon);
    return { sehir: { ad: sehir.ad, lat: gps.lat, lon: gps.lon }, gps: true };
  }

  // 2. Kayıtlı şehir
  const kayitli = kayitliSehirAl();
  return { sehir: kayitli, gps: false };
}

/* ══════════════════════════════════════════════════════════════
   ANA HOOK
   ══════════════════════════════════════════════════════════════ */
export function useHavaDurumu() {
  const [konum, setKonum] = useState<{ sehir: Sehir; gps: boolean } | null>(null);

  // Konum belirleme (sadece 1 kez)
  useEffect(() => {
    konumBelirle().then(setKonum);
  }, []);

  const query = useQuery<HavaDurumuData>({
    queryKey: ['hava-durumu', konum?.sehir.lat, konum?.sehir.lon],
    queryFn: async () => {
      if (!konum) throw new Error('Konum yok');
      return havaDurumuGetir(konum.sehir.lat, konum.sehir.lon, konum.sehir.ad);
    },
    enabled: !!konum,
    staleTime: 1800000,        // 30 dakika
    refetchInterval: 1800000,  // 30 dakikada bir yenile
    retry: 2,
  });

  /** Şehir değiştirme */
  const sehirDegistir = (sehir: Sehir) => {
    sehirKaydet(sehir);
    setKonum({ sehir, gps: false });
  };

  return {
    ...query,
    sehirDegistir,
    mevcutSehir: konum?.sehir ?? VARSAYILAN_SEHIR,
    gpsAktif: konum?.gps ?? false,
  };
}
