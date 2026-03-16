import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/log-giris
 * Başarılı giriş sonrası IP, konum ve cihaz bilgisini loglar.
 * Cloudflare headers üzerinden geolocation bilgisi alır.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    // IP adresi — Cloudflare / proxy headers
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'bilinmiyor';

    // Geolocation — Cloudflare headers
    const country = request.headers.get('cf-ipcountry') || '';
    const city = request.headers.get('cf-ipcity') || '';
    const region = request.headers.get('cf-ipregion') || '';

    // Konum formatla: "City, Country" veya mevcut olanlar
    const konumParts = [city, region, country].filter(Boolean);
    const konum = konumParts.length > 0 ? konumParts.join(', ') : 'bilinmiyor';

    // Cihaz bilgisi — User-Agent
    const cihaz = request.headers.get('user-agent') || 'bilinmiyor';

    // ip_loglari tablosuna kaydet
    const { error: insertError } = await supabase
      .from('ip_loglari')
      .insert({
        auth_id: user.id,
        ip,
        konum,
        cihaz,
      });

    if (insertError) {
      console.error('IP log kayıt hatası:', insertError);
      return NextResponse.json({ error: 'Log kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('IP log beklenmeyen hata:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
