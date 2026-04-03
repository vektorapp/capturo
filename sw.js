// CAPTURO v5.0 — Service Worker PWA
// © 2024-2025 Felipe Uchoa

const CACHE_NAME = 'capturo-v5-cache-v1';
const STATIC_ASSETS = [
  '/app.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
];

// ── INSTALL: cache dos assets estáticos ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network-first, fallback para cache ─────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase API: sempre network (dados em tempo real)
  if(url.hostname.includes('supabase.co')){
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Google Fonts: cache-first
  if(url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')){
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // app.html: network-first, fallback para cache (permite usar offline)
  if(url.pathname.endsWith('app.html') || url.pathname === '/'){
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match('/app.html'))
    );
    return;
  }

  // Default: network com fallback cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
