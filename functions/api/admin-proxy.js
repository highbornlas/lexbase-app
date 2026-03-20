// ================================================================
// LEXBASE — ADMIN PROXY ENDPOINT
// functions/api/admin-proxy.js
//
// Cloudflare Pages Function — admin Supabase işlemlerini
// server-side'da yaparak credential'ları client'tan gizler.
//
// Env vars (Cloudflare Dashboard'da tanımlanmalı):
//   ADMIN_SB_URL  — Admin Supabase proje URL'i
//   ADMIN_SB_KEY  — Admin Supabase anon key
// ================================================================

// İzin verilen origin'ler
const IZINLI_ORIGINLER = [
  'https://lexbase.app',
  'https://www.lexbase.app',
  'http://localhost:3000',
  'http://localhost:8788',
];

function corsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowedOrigin = IZINLI_ORIGINLER.includes(origin) ? origin : IZINLI_ORIGINLER[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// İzin verilen tablolar — sadece bunlara erişim olabilir
const IZINLI_TABLOLAR = new Set([
  'musteriler', 'kullanim_log', 'destek_talepleri', 'duyurular', 'ip_loglari'
]);

// İzin verilen HTTP method'lar (tablo bazında)
const IZINLI_ISLEMLER = {
  musteriler:       ['GET', 'POST', 'PATCH'],
  kullanim_log:     ['POST', 'PATCH'],
  destek_talepleri: ['GET', 'POST', 'PATCH'],
  duyurular:        ['GET'],
  ip_loglari:       ['POST'],
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const CORS_HEADERS = corsHeaders(request);
  const ADMIN_SB_URL = env.ADMIN_SB_URL;
  const ADMIN_SB_KEY = env.ADMIN_SB_KEY;

  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) {
    return jsonRes({ ok: false, error: 'Sunucu yapılandırma hatası' }, 500, CORS_HEADERS);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonRes({ ok: false, error: 'Geçersiz JSON body' }, 400, CORS_HEADERS);
  }

  const { action, tablo, data, id, filtre } = body;

  // Tablo kontrolü
  if (!tablo || !IZINLI_TABLOLAR.has(tablo)) {
    return jsonRes({ ok: false, error: 'Geçersiz tablo' }, 400, CORS_HEADERS);
  }

  // Method kontrolü
  const methodMap = { post: 'POST', patch: 'PATCH', get: 'GET' };
  const method = methodMap[action];
  if (!method || !IZINLI_ISLEMLER[tablo]?.includes(method)) {
    return jsonRes({ ok: false, error: 'Bu işlem izinli değil' }, 403, CORS_HEADERS);
  }

  try {
    let url, fetchOpts;

    if (action === 'get') {
      // GET — filtre parametresi ile
      url = `${ADMIN_SB_URL}/rest/v1/${tablo}?${filtre || ''}&select=*`;
      fetchOpts = {
        method: 'GET',
        headers: {
          'apikey': ADMIN_SB_KEY,
          'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        },
      };
    } else if (action === 'post') {
      // POST — yeni kayıt ekle
      url = `${ADMIN_SB_URL}/rest/v1/${tablo}`;
      fetchOpts = {
        method: 'POST',
        headers: {
          'apikey': ADMIN_SB_KEY,
          'Authorization': `Bearer ${ADMIN_SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(data),
      };
    } else if (action === 'patch') {
      // PATCH — mevcut kaydı güncelle (id zorunlu)
      if (!id) return jsonRes({ ok: false, error: 'id zorunlu' }, 400, CORS_HEADERS);
      url = `${ADMIN_SB_URL}/rest/v1/${tablo}?id=eq.${encodeURIComponent(id)}`;
      fetchOpts = {
        method: 'PATCH',
        headers: {
          'apikey': ADMIN_SB_KEY,
          'Authorization': `Bearer ${ADMIN_SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(data),
      };
    }

    const res = await fetch(url, fetchOpts);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Admin Proxy] ${action} ${tablo} hatası: ${res.status}`, errText);
      return jsonRes({ ok: false, error: 'DB hatası' }, 500, CORS_HEADERS);
    }

    if (action === 'get') {
      const result = await res.json();
      return jsonRes({ ok: true, data: result }, 200, CORS_HEADERS);
    }

    if (action === 'patch') {
      const result = await res.json().catch(() => null);
      if (Array.isArray(result) && result.length === 0) {
        return jsonRes({ ok: false, error: 'Kayıt güncellenemedi' }, 404, CORS_HEADERS);
      }
    }

    return jsonRes({ ok: true }, 200, CORS_HEADERS);

  } catch (e) {
    console.error('[Admin Proxy] Hata:', e.message);
    return jsonRes({ ok: false, error: 'Sunucu hatası' }, 500, CORS_HEADERS);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

function jsonRes(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
