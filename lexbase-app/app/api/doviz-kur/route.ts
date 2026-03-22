import { NextResponse } from 'next/server';

/**
 * TCMB Döviz Kuru API Proxy
 * Client-side CORS sorununu aşmak için server-side proxy
 * Revalidate: 1 saat (3600 saniye)
 */

export const revalidate = 3600;

interface KurData {
  birim: string;
  dovizAlis: number;
  dovizSatis: number;
  efektifAlis: number;
  efektifSatis: number;
  tarih: string;
}

export async function GET() {
  try {
    const tcmbUrl = 'https://www.tcmb.gov.tr/kurlar/today.xml';
    const res = await fetch(tcmbUrl, {
      headers: { 'Accept': 'application/xml' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ kurlar: [], hata: 'TCMB erişilemedi' }, { status: 502 });
    }

    const xml = await res.text();

    // Basit XML parse (DOMParser sunucu tarafında yok, regex ile çöz)
    const kurlar: KurData[] = [];
    const tarihMatch = xml.match(/Tarih="([^"]+)"/);
    const tarih = tarihMatch ? tarihMatch[1] : new Date().toISOString().slice(0, 10);

    const currencies = [
      { kod: 'USD', attr: 'US DOLLAR' },
      { kod: 'EUR', attr: 'EURO' },
      { kod: 'GBP', attr: 'POUND STERLING' },
    ];

    for (const cur of currencies) {
      // Currency bloğunu bul
      const regex = new RegExp(
        `<Currency[^>]*CurrencyCode="${cur.kod}"[^>]*>([\\s\\S]*?)</Currency>`,
        'i'
      );
      const match = xml.match(regex);
      if (!match) continue;

      const block = match[1];
      const dovizAlis = parseFloat(block.match(/<ForexBuying>([\d.]+)<\/ForexBuying>/)?.[1] || '0');
      const dovizSatis = parseFloat(block.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1] || '0');
      const efektifAlis = parseFloat(block.match(/<BanknoteBuying>([\d.]+)<\/BanknoteBuying>/)?.[1] || '0');
      const efektifSatis = parseFloat(block.match(/<BanknoteSelling>([\d.]+)<\/BanknoteSelling>/)?.[1] || '0');

      kurlar.push({
        birim: cur.kod,
        dovizAlis,
        dovizSatis,
        efektifAlis,
        efektifSatis,
        tarih,
      });
    }

    return NextResponse.json({ kurlar, tarih });
  } catch (err) {
    return NextResponse.json(
      { kurlar: [], hata: 'Kur verisi alinamadi', detay: String(err) },
      { status: 500 }
    );
  }
}
