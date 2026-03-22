// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TCMB EVDS API'den faiz oranlarını çekip Supabase'e kaydeden Edge Function
 *
 * Desteklenen faiz türleri:
 * - ticari (avans faizi / kısa vadeli avans) — PPK kararlarıyla değişir
 * - reeskont_avans — TCMB reeskont avans oranı
 * - reeskont_iskonto — TCMB reeskont iskonto oranı
 *
 * EVDS API Key gerektirir: Supabase secret olarak TCMB_EVDS_API_KEY ayarlanmalı
 *
 * Kullanım:
 * - Manuel: POST /functions/v1/tcmb-faiz-guncelle
 * - Scheduled: pg_cron ile günde 1 kez
 * - Body: { "turler": ["ticari", "reeskont_avans"] } (opsiyonel, boşsa hepsini günceller)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVDS_BASE = "https://evds2.tcmb.gov.tr/service/evds";

// TCMB EVDS seri kodları — faiz türlerine göre
// NOT: Tam seri kodları EVDS portalından doğrulanmalı
// Aşağıdakiler bilinen/yaklaşık kodlardır
const EVDS_SERI_KODLARI: Record<
  string,
  { seriKod: string; aciklama: string }
> = {
  // Politika faizi (1 haftalık repo) — yaklaşık ortalama fonlama maliyeti
  politika_faizi: {
    seriKod: "TP.APIFON4",
    aciklama: "TCMB Ağırlıklı Ortalama Fonlama Maliyeti",
  },
};

// Fallback: TCMB web sayfasından reeskont/avans oranları
// Bu oranlar EVDS'de direkt seri olarak bulunmayabilir
// Manuel güncelleme ile desteklenir

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
          info: "Supabase Secrets'a TCMB_EVDS_API_KEY ekleyin. EVDS kaydı: https://evds2.tcmb.gov.tr",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Request body (opsiyonel)
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

    // EVDS'den çekilebilen türler
    const evdsTurleri = turler
      ? turler.filter((t) => EVDS_SERI_KODLARI[t])
      : Object.keys(EVDS_SERI_KODLARI);

    for (const tur of evdsTurleri) {
      const seri = EVDS_SERI_KODLARI[tur];
      if (!seri) continue;

      try {
        // Son 30 günün verisini çek
        const bugun = new Date();
        const baslangic = new Date(bugun.getTime() - 30 * 86400000);
        const startDate = formatEvdsDate(baslangic);
        const endDate = formatEvdsDate(bugun);

        const url = `${EVDS_BASE}?series=${seri.seriKod}&startDate=${startDate}&endDate=${endDate}&type=json`;

        const response = await fetch(url, {
          headers: { key: evdsApiKey },
        });

        if (!response.ok) {
          sonuclar.push({
            tur,
            durum: "hata",
            detay: `EVDS API ${response.status}: ${response.statusText}`,
          });
          continue;
        }

        const data: EvdsResponse = await response.json();

        if (!data.items?.length) {
          sonuclar.push({ tur, durum: "degismedi", detay: "Veri bulunamadı" });
          continue;
        }

        // En son kaydı al
        const sonKayit = data.items[data.items.length - 1];
        const oranStr = sonKayit[seri.seriKod];
        if (!oranStr) {
          sonuclar.push({
            tur,
            durum: "degismedi",
            detay: "Oran değeri boş",
          });
          continue;
        }

        const oran = parseFloat(oranStr.replace(",", "."));
        const tarihStr = sonKayit["Tarih"]; // dd-mm-yyyy
        const [gun, ay, yil] = tarihStr.split("-");
        const baslangicTarihi = `${yil}-${ay}-${gun}`;

        // Aynı tür ve tarih için mevcut kayıt var mı?
        const { data: mevcut } = await supabase
          .from("faiz_oranlari")
          .select("id, oran")
          .eq("tur", tur)
          .eq("baslangic", baslangicTarihi)
          .single();

        if (mevcut && Number(mevcut.oran) === oran) {
          sonuclar.push({ tur, durum: "degismedi", detay: `%${oran} zaten güncel` });
          continue;
        }

        if (mevcut) {
          // Güncelle
          await supabase
            .from("faiz_oranlari")
            .update({ oran, kaynak: "tcmb_evds", updated_at: new Date().toISOString() })
            .eq("id", mevcut.id);
        } else {
          // Yeni ekle
          await supabase.from("faiz_oranlari").insert({
            tur,
            baslangic: baslangicTarihi,
            oran,
            kaynak: "tcmb_evds",
            notlar: `EVDS: ${seri.aciklama} (${tarihStr})`,
          });
        }

        sonuclar.push({
          tur,
          durum: "guncellendi",
          detay: `%${oran} (${baslangicTarihi})`,
        });
      } catch (e) {
        sonuclar.push({
          tur,
          durum: "hata",
          detay: e instanceof Error ? e.message : "Bilinmeyen hata",
        });
      }
    }

    return new Response(
      JSON.stringify({
        basarili: true,
        tarih: new Date().toISOString(),
        sonuclar,
        bilgi:
          "Yasal faiz, reeskont ve kredi kartı oranları EVDS'de doğrudan seri olarak bulunmayabilir. Bu oranları admin panelinden manuel ekleyebilirsiniz.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Bilinmeyen hata",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function formatEvdsDate(d: Date): string {
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const yil = d.getFullYear();
  return `${gun}-${ay}-${yil}`;
}
