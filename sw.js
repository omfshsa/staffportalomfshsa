const CACHE_NAME = 'omfs-hsa-portal-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// Install event: Cache core assets and force the new SW to activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches to save storage on the user's device
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first approach with dynamic caching and offline fallback
self.addEventListener('fetch', event => {
  // We only want to cache GET requests. Ignore POST/PUT/DELETE.
  if (event.request.method !== 'GET') return;

  // Ignore requests for chrome-extension:// or other unsupported schemes
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 1. Return the cached asset if we already have it
      if (cached) {
        return cached;
      }

      // 2. Otherwise, fetch it from the network
      return fetch(event.request)
        .then(response => {
          // Check if we received a valid response. 
          // We cache 'basic' (your local files) and 'cors' (Bootstrap, Google Fonts, etc.)
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
            return response;
          }

          // Clone the response because the stream can only be consumed once
          const responseToCache = response.clone();

          // Dynamically add the new asset to the cache
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 3. Network failed (offline). 
          // Only serve the index.html fallback if the user is trying to navigate to a page.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          
          // For images or stylesheets that fail while offline, do nothing 
          // (it prevents them from rendering as broken HTML text).
        });
    })
  );
});
