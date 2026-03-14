import { NextRequest, NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════════
   PTT Gönderi Sorgulama — Server-side CORS Bypass
   POST /api/ptt-sorgula  { barkod: "RR123456789TR" }
   ══════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const { barkod } = await req.json();

    if (!barkod || typeof barkod !== 'string' || barkod.trim().length < 5) {
      return NextResponse.json({ hata: 'Geçersiz barkod numarası' }, { status: 400 });
    }

    const temizBarkod = barkod.trim().toUpperCase();

    // PTT Gönderi Takip API'si
    const pttUrl = `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${encodeURIComponent(temizBarkod)}`;

    const response = await fetch(pttUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({
        durum: null,
        hata: 'PTT sunucusuna erişilemedi',
        fallbackUrl: pttUrl,
      });
    }

    const html = await response.text();

    // HTML'den durumu parse et
    const sonuc = parsePttHtml(html, temizBarkod);

    return NextResponse.json(sonuc);
  } catch (error) {
    console.error('PTT sorgulama hatası:', error);
    return NextResponse.json({
      durum: null,
      hata: 'Sorgulama sırasında bir hata oluştu',
    });
  }
}

/* ── PTT HTML Parser ─────────────────────────────────────────── */
function parsePttHtml(html: string, barkod: string) {
  // Tebliğ/teslim durumu arama
  const tebligPatterns = [
    /teslim\s*edildi/i,
    /tebli[ğg]\s*edildi/i,
    /alıcısına\s*teslim/i,
    /dağıtıcıya\s*verildi.*teslim/i,
  ];

  const iadePatterns = [
    /iade/i,
    /geri\s*gönder/i,
    /teslim\s*edilemedi/i,
    /alıcı\s*adreste\s*bulunamadı/i,
    /müracaata\s*kaldı/i,
  ];

  const bekleyenPatterns = [
    /dağıtıma\s*verildi/i,
    /şubeye\s*geldi/i,
    /yolda/i,
    /kabul\s*edildi/i,
    /aktarma\s*merkezinde/i,
    /dağıtıcıya\s*verildi/i,
  ];

  // Tarih çıkarma: DD.MM.YYYY veya YYYY-MM-DD formatı
  const tarihRegex = /(\d{2}\.\d{2}\.\d{4}\s*\d{2}:\d{2})/g;
  const tarihler = html.match(tarihRegex);
  const sonTarih = tarihler?.length ? tarihler[tarihler.length - 1] : null;

  // Durum belirleme
  for (const pattern of tebligPatterns) {
    if (pattern.test(html)) {
      // Tebliğ tarihini bulmaya çalış
      let tebligTarih = '';
      if (sonTarih) {
        const parts = sonTarih.split(/[.\s:]/);
        if (parts.length >= 3) {
          tebligTarih = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      return {
        durum: 'Tebliğ Edildi / Teslim Edildi',
        tarih: sonTarih || '',
        tebligDurum: 'Tebliğ Edildi',
        tebligTarih,
        barkod,
      };
    }
  }

  for (const pattern of iadePatterns) {
    if (pattern.test(html)) {
      return {
        durum: 'İade Döndü',
        tarih: sonTarih || '',
        tebligDurum: 'İade Döndü',
        barkod,
      };
    }
  }

  for (const pattern of bekleyenPatterns) {
    if (pattern.test(html)) {
      return {
        durum: 'Gönderim Devam Ediyor',
        tarih: sonTarih || '',
        tebligDurum: "PTT'de Bekliyor",
        barkod,
      };
    }
  }

  // Eğer barkod HTML'de bulunuyorsa ama durum belirlenemiyorsa
  if (html.includes(barkod) || html.length > 500) {
    return {
      durum: 'Sorgu tamamlandı — durum otomatik belirlenemedi',
      tarih: sonTarih || '',
      barkod,
      fallbackUrl: `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod}`,
    };
  }

  // Barkod bulunamadı
  return {
    durum: null,
    hata: 'Barkod numarası bulunamadı',
    barkod,
  };
}
