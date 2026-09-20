// Wax Santé — Service Worker PWA (Offline Shell & Strict Health Data Isolation)
const CACHE_NAME = 'wax-sante-v2';

// Static assets for the app shell ONLY
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/icon.svg'
];

// Health Data & Security URL blacklist — NEVER to be cached in Service Worker
const SENSITIVE_URL_PATTERNS = [
  '/api/',
  'patient',
  'consultation',
  'record',
  'auth',
  'login',
  'pin',
  'secret',
  'token'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pré-mise en cache partielle:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRICT HEALTH DATA PROTECTION:
  // Discard all non-GET requests (POST /api/translate-audio, etc.)
  // Discard all sensitive patterns: patient records, consultation logs, credentials
  if (
    event.request.method !== 'GET' ||
    SENSITIVE_URL_PATTERNS.some((pattern) => url.pathname.includes(pattern))
  ) {
    // Direct network-only bypass — never store medical records or API tokens in cache
    return;
  }

  // 2. Navigation requests: Network-First with fallback to cached app shell or offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          }
          return caches.match('/') || caches.match('/offline.html');
        })
        .catch(async () => {
          const cachedApp = await caches.match('/');
          if (cachedApp) return cachedApp;
          const cachedOffline = await caches.match('/offline.html');
          if (cachedOffline) return cachedOffline;
          return new Response('Hors connexion', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // 3. Static assets: Stale-While-Revalidate or Cache-First for versioned assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background for next reload
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
