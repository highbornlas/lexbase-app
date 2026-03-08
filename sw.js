// ================================================================
// LEXBASE — SERVICE WORKER (PWA Offline Desteği)
// sw.js — Kök dizinde olmalı (scope: /)
//
// Strateji:
// - Statik dosyalar (CSS, JS, HTML, ikonlar) → Cache-First
// - Supabase API → Network-Only (localStorage fallback zaten var)
// - Diğer → Network-First with Cache Fallback
// ================================================================

const CACHE_NAME = 'lexbase-v1';
const CACHE_VERSION = 1;

// Önceden cache'lenecek dosyalar
const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Dinamik cache'lenecek dosya kalıpları
const CACHEABLE = [
  /\.js$/,
  /\.css$/,
  /\.svg$/,
  /\.png$/,
  /\.woff2?$/,
  /fonts\.googleapis/,
  /cdnjs\.cloudflare/,
];

// Kesinlikle cache'lenmeyecek
const NO_CACHE = [
  /supabase/,
  /\.supabase\./,
  /auth/,
  /rest\/v1/,
  /realtime/,
  /chrome-extension/,
];

// ── INSTALL: Precache ────────────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Install — cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(PRECACHE).catch(function(err) {
          console.warn('[SW] Precache kısmen başarısız:', err);
        });
      })
      .then(function() { self.skipWaiting(); })
  );
});

// ── ACTIVATE: Eski cache'leri temizle ────────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { console.log('[SW] Eski cache silindi:', k); return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ── FETCH: Strateji bazlı cache ──────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // GET olmayan istekleri geç
  if (event.request.method !== 'GET') return;

  // Supabase / API → cache'leme
  if (NO_CACHE.some(function(p) { return p.test(url); })) return;

  // Statik dosyalar → Cache-First
  if (CACHEABLE.some(function(p) { return p.test(url); })) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // HTML (navigasyon) → Network-First
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Diğer → Network-First
  event.respondWith(networkFirst(event.request));
});

// ── Cache-First stratejisi ───────────────────────────────────
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
      }
      return response;
    }).catch(function() {
      // Offline ve cache'de yok
      return new Response('Offline', { status: 503 });
    });
  });
}

// ── Network-First stratejisi ─────────────────────────────────
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response.ok) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      if (cached) return cached;
      // Offline fallback
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    });
  });
}
