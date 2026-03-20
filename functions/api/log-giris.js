// ================================================================
// LEXBASE — IP LOG ENDPOINT
// functions/api/log-giris.js
//
// Cloudflare Pages Function — otomatik deploy edilir.
// Endpoint: https://lexbase.app/api/log-giris
//
// Cloudflare her isteğe bedava geo metadata ekler:
// - CF-Connecting-IP header → gerçek IP
// - request.cf → { country, city, region, timezone, asOrganization }
// ================================================================

// Credentials are now read from Cloudflare Pages environment variables.
// Set ADMIN_SB_URL and ADMIN_SB_KEY in Cloudflare Dashboard → Pages → Settings → Environment variables.

// İzin verilen origin'ler — production ve local dev
const IZINLI_ORIGINLER = [
  'https://lexbase.app',
  'https://www.lexbase.app',
  'http://localhost:3000',
  'http://localhost:8788',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = IZINLI_ORIGINLER.includes(origin) ? origin : IZINLI_ORIGINLER[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const CORS_HEADERS = corsHeaders(request);
  const ADMIN_SB_URL = env.ADMIN_SB_URL;
  const ADMIN_SB_KEY = env.ADMIN_SB_KEY;

  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) {
    console.error('[IP Log] ADMIN_SB_URL veya ADMIN_SB_KEY env değişkeni tanımlı değil.');
    return new Response(JSON.stringify({ ok: false, error: 'Sunucu yapılandırma hatası' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 1. IP ve Geo bilgisi (Cloudflare bedava sağlıyor)
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'bilinmiyor';
    const cf = request.cf || {};

    // 2. Body'den kullanıcı bilgisini al
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'Geçersiz JSON body' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 3. Admin Supabase'e yaz
    const logData = {
      musteri_id:  body.musteri_id || null,
      email:       body.email || '',
      ip_adresi:   ip,
      ulke:        cf.country || '',
      sehir:       decodeURIComponent(cf.city || ''),
      bolge:       cf.region || '',
      timezone:    cf.timezone || '',
      isp:         cf.asOrganization || '',
      user_agent:  (body.user_agent || '').substring(0, 500),
      platform:    body.platform || '',
      ekran:       body.ekran || '',
      tarayici:    body.tarayici || '',
      islem:       body.islem || 'giris',
    };

    const res = await fetch(`${ADMIN_SB_URL}/rest/v1/ip_loglari`, {
      method: 'POST',
      headers: {
        'apikey': ADMIN_SB_KEY,
        'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(logData)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[IP Log] Supabase yazma hatası:', errText);
      return new Response(JSON.stringify({ ok: false, error: 'DB yazma hatası' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('[IP Log] Beklenmeyen hata:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// OPTIONS handler — CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.request)
  });
}
