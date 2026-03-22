// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TCMB EVDS API'den faiz oranlarını çekip Supabase'e kaydeden Edge Function
 *
 * Her gün sabah 10:00'da (pg_cron) otomatik çalışır.
 * Oran değiştiğinde yeni kayıt ekler, değişmediyse bir şey yapmaz.
 *
 * Kullanım:
 * - Otomatik: pg_cron ile günde 1 kez
 * - Manuel: POST /functions/v1/tcmb-faiz-guncelle
 * - Body: { "turler": ["reeskont_avans"] } (opsiyonel, boşsa hepsini günceller)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVDS_BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis";

// ── EVDS Seri Eşleştirmeleri ─────────────────────────────────
// Her bir faiz türü için: EVDS seri kodu, response field adı, açıklama
// fieldAd: EVDS3'te nokta → alt çizgi (TP.X.Y → TP_X_Y)
interface SeriTanim {
  seriKod: string;
  fieldAd: string;
  aciklama: string;
  aylik?: boolean; // true ise aylık veri (mevduat oranları gibi)
}

const EVDS_SERI_KODLARI: Record<string, SeriTanim> = {
  // ── Reeskont & Avans (günlük) ──
  reeskont_avans: {
    seriKod: "TP.REESAVANS.AFO",
    fieldAd: "TP_REESAVANS_AFO",
    aciklama: "TCMB Avans Faiz Oranı",
  },
  reeskont_iskonto: {
    seriKod: "TP.REESAVANS.RIO",
    fieldAd: "TP_REESAVANS_RIO",
    aciklama: "TCMB Reeskont İskonto Oranı",
  },
  politika_faizi: {
    seriKod: "TP.APIFON4",
    fieldAd: "TP_APIFON4",
    aciklama: "TCMB Ağırlıklı Ortalama Fonlama Maliyeti",
  },

  // ── Bankalarca Mevduat Azami Faiz (aylık) ──
  banka_1yil_ustu_tl: {
    seriKod: "TP.TRY.MT05.S",
    fieldAd: "TP_TRY_MT05_S",
    aciklama: "Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (TL)",
    aylik: true,
  },
  banka_1yil_ustu_usd: {
    seriKod: "TP.USD.MT05.S",
    fieldAd: "TP_USD_MT05_S",
    aciklama: "Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (USD)",
    aylik: true,
  },
  banka_1yil_ustu_eur: {
    seriKod: "TP.EUR.MT05.S",
    fieldAd: "TP_EUR_MT05_S",
    aciklama: "Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (EUR)",
    aylik: true,
  },
  banka_1yil_alti_tl: {
    seriKod: "TP.TRY.MT04.S",
    fieldAd: "TP_TRY_MT04_S",
    aciklama: "Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (TL)",
    aylik: true,
  },
  banka_1yil_alti_usd: {
    seriKod: "TP.USD.MT04.S",
    fieldAd: "TP_USD_MT04_S",
    aciklama: "Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (USD)",
    aylik: true,
  },
  banka_1yil_alti_eur: {
    seriKod: "TP.EUR.MT04.S",
    fieldAd: "TP_EUR_MT04_S",
    aciklama: "Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (EUR)",
    aylik: true,
  },

  // ── Kamu Bankalarınca Mevduat Azami Faiz (aylık) ──
  kamu_banka_1yil_ustu_tl: {
    seriKod: "TP.TRY.MT05.K",
    fieldAd: "TP_TRY_MT05_K",
    aciklama: "Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (TL)",
    aylik: true,
  },
  kamu_banka_1yil_ustu_usd: {
    seriKod: "TP.USD.MT05.K",
    fieldAd: "TP_USD_MT05_K",
    aciklama: "Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (USD)",
    aylik: true,
  },
  kamu_banka_1yil_ustu_eur: {
    seriKod: "TP.EUR.MT05.K",
    fieldAd: "TP_EUR_MT05_K",
    aciklama: "Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (EUR)",
    aylik: true,
  },
  kamu_banka_1yil_alti_tl: {
    seriKod: "TP.TRY.MT04.K",
    fieldAd: "TP_TRY_MT04_K",
    aciklama: "Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (TL)",
    aylik: true,
  },
  kamu_banka_1yil_alti_usd: {
    seriKod: "TP.USD.MT04.K",
    fieldAd: "TP_USD_MT04_K",
    aciklama: "Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (USD)",
    aylik: true,
  },
  kamu_banka_1yil_alti_eur: {
    seriKod: "TP.EUR.MT04.K",
    fieldAd: "TP_EUR_MT04_K",
    aciklama: "Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (EUR)",
    aylik: true,
  },

  // ── İşletme Kredisi (aylık) ──
  banka_isletme_kredi: {
    seriKod: "TP.IKF.7",
    fieldAd: "TP_IKF_7",
    aciklama: "Bankalarca İşletme Kredilerine Uygulanan Azami Faiz (TL)",
    aylik: true,
  },

  // ── TÜFE & ÜFE Endeksleri (aylık) — endeks değeri, yıllık değişim hesaplanır ──
  tufe: {
    seriKod: "TP.TUKFIY2025.GENEL",
    fieldAd: "TP_TUKFIY2025_GENEL",
    aciklama: "TÜFE Genel Endeks (2025=100)",
    aylik: true,
  },
  ufe: {
    seriKod: "TP.TUFE1YI.T1",
    fieldAd: "TP_TUFE1YI_T1",
    aciklama: "ÜFE Yurt İçi Üretici Fiyat Endeksi",
    aylik: true,
  },
};

// Ticari temerrüt faizi = reeskont avans (3095 s.K. m.2)
const ESLESME: Record<string, string[]> = {
  reeskont_avans: ["reeskont_avans", "ticari"],
};

// TÜFE/ÜFE endeks → yıllık değişim hesaplaması gerekir
const ENDEKS_TURLERI = new Set(["tufe", "ufe"]);

interface EvdsResponse {
  totalCount: number;
  items: Array<Record<string, string>>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evdsApiKey = Deno.env.get("TCMB_EVDS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!evdsApiKey) {
      return new Response(
        JSON.stringify({
          error: "TCMB_EVDS_API_KEY ayarlanmamış",
          info: "Supabase Secrets'a TCMB_EVDS_API_KEY ekleyin.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let turler: string[] | undefined;
    try {
      const body = await req.json();
      turler = body?.turler;
    } catch {
      // Body yok, hepsini güncelle
    }

    const sonuclar: Array<{
      tur: string;
      durum: "guncellendi" | "degismedi" | "hata";
      detay?: string;
    }> = [];

    const evdsTurleri = turler
      ? turler.filter((t) => EVDS_SERI_KODLARI[t])
      : Object.keys(EVDS_SERI_KODLARI);

    for (const tur of evdsTurleri) {
      const seri = EVDS_SERI_KODLARI[tur];
      if (!seri) continue;

      try {
        const bugun = new Date();
        // Endeks: 14 ay, aylık seriler: 3 ay, günlük: 60 gün
        const gunGeri = ENDEKS_TURLERI.has(tur) ? 430 : seri.aylik ? 120 : 60;
        const baslangic = new Date(bugun.getTime() - gunGeri * 86400000);

        const startDate = formatEvdsDate(baslangic);
        const endDate = formatEvdsDate(bugun);

        const url = `${EVDS_BASE}/series=${seri.seriKod}&startDate=${startDate}&endDate=${endDate}&type=json`;

        const response = await fetch(url, {
          headers: { key: evdsApiKey },
        });

        if (!response.ok) {
          sonuclar.push({ tur, durum: "hata", detay: `EVDS API ${response.status}` });
          continue;
        }

        const data: EvdsResponse = await response.json();
        if (!data.items?.length) {
          sonuclar.push({ tur, durum: "degismedi", detay: "Veri bulunamadı" });
          continue;
        }

        // ── ENDEKS türleri: yıllık değişim hesapla ──
        if (ENDEKS_TURLERI.has(tur)) {
          const result = await handleEndeks(supabase, tur, seri, data.items);
          sonuclar.push(result);
          continue;
        }

        // ── Aylık seriler: her ay bir kayıt ──
        if (seri.aylik) {
          const result = await handleAylik(supabase, tur, seri, data.items);
          sonuclar.push(result);
          continue;
        }

        // ── Günlük seriler: oran değişim noktaları ──
        const result = await handleGunluk(supabase, tur, seri, data.items);
        sonuclar.push(result);
      } catch (e) {
        sonuclar.push({
          tur,
          durum: "hata",
          detay: e instanceof Error ? e.message : "Bilinmeyen hata",
        });
      }
    }

    // ── TCMB Web Scraper: Kredi Kartı Azami Faiz Oranları ──
    try {
      const kkSonuclar = await scrapeKrediKartiFaiz(supabase);
      sonuclar.push(...kkSonuclar);
    } catch (e) {
      const hata = e instanceof Error ? e.message : "Bilinmeyen hata";
      sonuclar.push({ tur: "kredi_karti_scraper", durum: "hata", detay: hata });
      // Uyarı kaydet
      await uyariKaydet(supabase, "hata", "tcmb_scraper",
        "Kredi kartı faiz oranları TCMB sayfasından çekilemedi",
        hata
      );
    }

    // Hata olan türler için uyarı kaydet
    const hatalar = sonuclar.filter((s) => s.durum === "hata");
    if (hatalar.length > 0) {
      await uyariKaydet(supabase, "uyari", "evds",
        `${hatalar.length} faiz türünde güncelleme hatası`,
        hatalar.map((h) => `${h.tur}: ${h.detay}`).join("; ")
      );
    }

    return new Response(
      JSON.stringify({
        basarili: true,
        tarih: new Date().toISOString(),
        sonuclar,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Günlük seriler (reeskont, politika faizi) ─────────────────
async function handleGunluk(
  supabase: any,
  tur: string,
  seri: SeriTanim,
  items: Array<Record<string, string>>
) {
  const oranDegisimleri: Array<{ tarih: string; oran: number }> = [];
  let oncekiOran: number | null = null;

  for (const kayit of items) {
    const oranStr = kayit[seri.fieldAd];
    if (!oranStr) continue;
    const oran = parseFloat(oranStr.replace(",", "."));
    if (isNaN(oran)) continue;

    if (oran !== oncekiOran) {
      const tarihStr = kayit["Tarih"]; // dd-mm-yyyy
      const [gun, ay, yil] = tarihStr.split("-");
      oranDegisimleri.push({ tarih: `${yil}-${ay}-${gun}`, oran });
      oncekiOran = oran;
    }
  }

  if (!oranDegisimleri.length) {
    return { tur, durum: "degismedi" as const, detay: "Oran verisi boş" };
  }

  const hedefTurler = ESLESME[tur] || [tur];
  let guncellendi = false;

  for (const hedefTur of hedefTurler) {
    for (const d of oranDegisimleri) {
      guncellendi = (await upsertOran(supabase, hedefTur, d.tarih, d.oran, seri.aciklama)) || guncellendi;
    }
  }

  const son = oranDegisimleri[oranDegisimleri.length - 1];
  return {
    tur,
    durum: guncellendi ? "guncellendi" as const : "degismedi" as const,
    detay: `%${son.oran} (${son.tarih})${hedefTurler.length > 1 ? ` → [${hedefTurler.join(", ")}]` : ""}`,
  };
}

// ── Aylık seriler (mevduat, işletme kredisi) ──────────────────
async function handleAylik(
  supabase: any,
  tur: string,
  seri: SeriTanim,
  items: Array<Record<string, string>>
) {
  let guncellendi = false;
  let sonOran = 0;
  let sonTarih = "";

  for (const kayit of items) {
    const oranStr = kayit[seri.fieldAd];
    if (!oranStr) continue;
    const oran = parseFloat(oranStr.replace(",", "."));
    if (isNaN(oran)) continue;

    // Aylık tarih: "2026-1" veya "2026-01" → YYYY-MM-01
    const tarihRaw = kayit["Tarih"];
    const tarih = aylikTarihDonustur(tarihRaw);
    if (!tarih) continue;

    guncellendi = (await upsertOran(supabase, tur, tarih, oran, seri.aciklama)) || guncellendi;
    sonOran = oran;
    sonTarih = tarih;
  }

  return {
    tur,
    durum: guncellendi ? "guncellendi" as const : "degismedi" as const,
    detay: sonTarih ? `%${sonOran} (${sonTarih})` : "Veri yok",
  };
}

// ── Endeks türleri (TÜFE, ÜFE) — yıllık değişim hesapla ─────
async function handleEndeks(
  supabase: any,
  tur: string,
  seri: SeriTanim,
  items: Array<Record<string, string>>
) {
  // Endeks değerlerini topla
  const endeksler: Array<{ tarih: string; deger: number }> = [];
  for (const kayit of items) {
    const degerStr = kayit[seri.fieldAd];
    if (!degerStr) continue;
    const deger = parseFloat(degerStr.replace(",", "."));
    if (isNaN(deger)) continue;
    const tarih = aylikTarihDonustur(kayit["Tarih"]);
    if (tarih) endeksler.push({ tarih, deger });
  }

  if (endeksler.length < 13) {
    return { tur, durum: "degismedi" as const, detay: `Yeterli endeks verisi yok (${endeksler.length} ay)` };
  }

  // Yıllık değişim: son endeks / 12 ay önceki endeks * 100 - 100
  let guncellendi = false;
  let sonOran = 0;
  let sonTarih = "";

  for (let i = 12; i < endeksler.length; i++) {
    const simdiki = endeksler[i];
    const onceki = endeksler[i - 12];
    const yillikDegisim = ((simdiki.deger / onceki.deger) - 1) * 100;
    const oran = Math.round(yillikDegisim * 100) / 100;

    guncellendi = (await upsertOran(supabase, tur, simdiki.tarih, oran, `${seri.aciklama} — Yıllık değişim`)) || guncellendi;
    sonOran = oran;
    sonTarih = simdiki.tarih;
  }

  return {
    tur,
    durum: guncellendi ? "guncellendi" as const : "degismedi" as const,
    detay: sonTarih ? `%${sonOran} (${sonTarih})` : "Hesaplanamadı",
  };
}

// ── Ortak upsert fonksiyonu ───────────────────────────────────
async function upsertOran(
  supabase: any,
  tur: string,
  tarih: string,
  oran: number,
  aciklama: string
): Promise<boolean> {
  const { data: mevcut } = await supabase
    .from("faiz_oranlari")
    .select("id, oran")
    .eq("tur", tur)
    .eq("baslangic", tarih)
    .single();

  if (mevcut && Math.abs(Number(mevcut.oran) - oran) < 0.01) {
    return false; // Aynı, güncelleme gereksiz
  }

  if (mevcut) {
    await supabase
      .from("faiz_oranlari")
      .update({ oran, kaynak: "tcmb_evds", updated_at: new Date().toISOString() })
      .eq("id", mevcut.id);
  } else {
    await supabase.from("faiz_oranlari").insert({
      tur,
      baslangic: tarih,
      oran,
      kaynak: "tcmb_evds",
      notlar: `EVDS: ${aciklama}`,
    });
  }
  return true;
}

// ── Yardımcı fonksiyonlar ─────────────────────────────────────

/** Günlük tarih: dd-mm-yyyy */
function formatEvdsDate(d: Date): string {
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  return `${gun}-${ay}-${d.getFullYear()}`;
}

/** Aylık tarih: mm-yyyy */
function formatEvdsDateAylik(d: Date): string {
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  return `${ay}-${d.getFullYear()}`;
}

/** EVDS aylık tarih → YYYY-MM-01 */
function aylikTarihDonustur(tarihRaw: string): string | null {
  if (!tarihRaw) return null;
  // Format: "2026-1" veya "2026-01" veya "01-2026"
  const parts = tarihRaw.split("-");
  if (parts.length !== 2) return null;

  let yil: string, ay: string;
  if (parts[0].length === 4) {
    // YYYY-M format
    yil = parts[0];
    ay = parts[1].padStart(2, "0");
  } else {
    // MM-YYYY format
    ay = parts[0].padStart(2, "0");
    yil = parts[1];
  }
  return `${yil}-${ay}-01`;
}

// ══════════════════════════════════════════════════════════════
// TCMB WEB SCRAPER — Kredi Kartı Azami Faiz Oranları
// ══════════════════════════════════════════════════════════════

const TCMB_KK_URL = "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Bankacilik+Verileri/Kredi_Karti_Islemlerinde_Uygulanacak_Azami_Faiz_Oranlari";

// Kredi kartı oranları eşleştirmesi (TCMB sayfasındaki sıralama)
// TCMB aylık oran verir, biz yıllık (×12) olarak kaydediyoruz
interface KKOranSatir {
  tur_akdi: string;
  tur_gecikme: string;
  label: string;
}

const KK_SATIRLAR: KKOranSatir[] = [
  { tur_akdi: "kredi_karti_akdi_0_30", tur_gecikme: "kredi_karti_gecikme_0_30", label: "30.000" },
  { tur_akdi: "kredi_karti_akdi_30_180", tur_gecikme: "kredi_karti_gecikme_30_180", label: "180.000" },
  { tur_akdi: "kredi_karti_akdi_180_ustu", tur_gecikme: "kredi_karti_gecikme_180_ustu", label: "üzeri" },
];

async function scrapeKrediKartiFaiz(supabase: any): Promise<Array<{
  tur: string;
  durum: "guncellendi" | "degismedi" | "hata";
  detay?: string;
}>> {
  const sonuclar: Array<{ tur: string; durum: "guncellendi" | "degismedi" | "hata"; detay?: string }> = [];

  try {
    const response = await fetch(TCMB_KK_URL);
    if (!response.ok) {
      throw new Error(`TCMB sayfa erişim hatası: ${response.status}`);
    }

    const html = await response.text();

    // Geçerlilik tarihini bul — "X Ay YYYY" formatında
    // Örnek: "1 Mart 2026" veya "1 Şubat 2026"
    const aylar: Record<string, string> = {
      "ocak": "01", "şubat": "02", "mart": "03", "nisan": "04",
      "mayıs": "05", "haziran": "06", "temmuz": "07", "ağustos": "08",
      "eylül": "09", "ekim": "10", "kasım": "11", "aralık": "12",
    };

    // Tarih pattern: sayfada genellikle "X AY YYYY tarihinden itibaren" formatında
    let gecerlilikTarihi = "";
    const tarihMatch = html.match(/(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/i);
    if (tarihMatch) {
      const gun = tarihMatch[1].padStart(2, "0");
      const ay = aylar[tarihMatch[2].toLowerCase()] || "01";
      const yil = tarihMatch[3];
      gecerlilikTarihi = `${yil}-${ay}-${gun}`;
    }

    if (!gecerlilikTarihi) {
      // Fallback: bu ayın 1'i
      const bugun = new Date();
      gecerlilikTarihi = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-01`;
    }

    // Oranları HTML'den çıkar
    // TCMB sayfasında oranlar <td> içinde nested <span> tagları ile sarılı:
    // <td ...><span ...><span ...><span ...>3,25</span></span></span></td>
    // NOT: Sadece VİRGÜL ayraçlı sayılar yakala (oranlar: "3,25")
    // Nokta ayraçlı "30.000", "180.000" gibi dilim etiketlerini atla!
    const tumOranlar: number[] = [];
    let match;

    const tdPattern = /<td[^>]*>(?:(?!<\/td>).)*?(\d{1,2}),(\d{2})(?:(?!<\/td>).)*?<\/td>/gs;
    while ((match = tdPattern.exec(html)) !== null) {
      tumOranlar.push(parseFloat(`${match[1]}.${match[2]}`));
    }

    // Sayfada 3 satır (3 ay) × 11 sütun var:
    // [referans, akdi_0_30, gecikme_0_30, akdi_30_180, gecikme_30_180,
    //  akdi_180+, gecikme_180+, nakit_akdi, nakit_gecikme, yp_akdi, yp_gecikme]
    // İlk satır (en güncel ayı) kullanılır, referans oranı atlanır.
    const SATIRDA_ORAN = 11; // her satırda 11 oran (1 referans + 5 çift)

    if (tumOranlar.length < SATIRDA_ORAN) {
      await uyariKaydet(supabase, "uyari", "tcmb_scraper",
        "Kredi kartı oranları TCMB sayfasından parse edilemedi",
        `Bulunan oran sayısı: ${tumOranlar.length}, beklenen: ${SATIRDA_ORAN}+. Sayfa yapısı değişmiş olabilir.`
      );
      sonuclar.push({
        tur: "kredi_karti_scraper",
        durum: "hata",
        detay: `Parse hatası: ${tumOranlar.length} oran bulundu, ${SATIRDA_ORAN}+ bekleniyor.`,
      });
      return sonuclar;
    }

    // İlk satırın oranlarını al (referansı atla → index 1'den başla)
    const ilkSatir = tumOranlar.slice(1, SATIRDA_ORAN);
    // ilkSatir[0]=akdi_0_30, [1]=gecikme_0_30, [2]=akdi_30_180, [3]=gecikme_30_180,
    // [4]=akdi_180+, [5]=gecikme_180+, [6]=nakit_akdi, [7]=nakit_gecikme,
    // [8]=yp_akdi, [9]=yp_gecikme

    let guncellendi = false;

    // TL dilimleri (3 çift)
    for (let i = 0; i < 3; i++) {
      const akdiAylik = ilkSatir[i * 2];
      const gecikmeAylik = ilkSatir[i * 2 + 1];
      const akdiYillik = Math.round(akdiAylik * 12 * 100) / 100;
      const gecikmeYillik = Math.round(gecikmeAylik * 12 * 100) / 100;

      const satir = KK_SATIRLAR[i];
      if (satir) {
        guncellendi = (await upsertOran(supabase, satir.tur_akdi, gecerlilikTarihi, akdiYillik, "TCMB scraper")) || guncellendi;
        guncellendi = (await upsertOran(supabase, satir.tur_gecikme, gecerlilikTarihi, gecikmeYillik, "TCMB scraper")) || guncellendi;
      }
    }

    // Nakit çekim (index 6,7)
    const nakitAkdi = Math.round(ilkSatir[6] * 12 * 100) / 100;
    const nakitGecikme = Math.round(ilkSatir[7] * 12 * 100) / 100;
    guncellendi = (await upsertOran(supabase, "kredi_karti_nakit_akdi", gecerlilikTarihi, nakitAkdi, "TCMB scraper")) || guncellendi;
    guncellendi = (await upsertOran(supabase, "kredi_karti_nakit_gecikme", gecerlilikTarihi, nakitGecikme, "TCMB scraper")) || guncellendi;

    // Yabancı para (index 8,9)
    const ypAkdi = Math.round(ilkSatir[8] * 12 * 100) / 100;
    const ypGecikme = Math.round(ilkSatir[9] * 12 * 100) / 100;
    guncellendi = (await upsertOran(supabase, "kredi_karti_yp_akdi", gecerlilikTarihi, ypAkdi, "TCMB scraper")) || guncellendi;
    guncellendi = (await upsertOran(supabase, "kredi_karti_yp_gecikme", gecerlilikTarihi, ypGecikme, "TCMB scraper")) || guncellendi;

    sonuclar.push({
      tur: "kredi_karti_scraper",
      durum: guncellendi ? "guncellendi" : "degismedi",
      detay: `${tumOranlar.length} oran çekildi, geçerlilik: ${gecerlilikTarihi}`,
    });

  } catch (e) {
    throw e; // Üst fonksiyona ilet — orada uyarı kaydedilecek
  }

  return sonuclar;
}

// ══════════════════════════════════════════════════════════════
// UYARI SİSTEMİ
// ══════════════════════════════════════════════════════════════

async function uyariKaydet(
  supabase: any,
  tur: "hata" | "uyari" | "bilgi",
  kaynak: string,
  mesaj: string,
  detay?: string,
) {
  try {
    await supabase.from("faiz_uyarilar").insert({
      tur,
      kaynak,
      mesaj,
      detay: detay || null,
    });
  } catch {
    // Uyarı kaydedilemezse sessizce geç
  }
}
