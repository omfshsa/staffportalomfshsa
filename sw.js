/* Offline-capable PWA shell. Live application data is fetched at runtime from Apps Script. */
const CACHE_NAME='omfs-hsa-portal-shell-v1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{ event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting(); });
self.addEventListener('activate',event=>{ event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))));self.clients.claim(); });
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
  // Do not cache config.js: changing your Apps Script deployment URL must be immediate.
  if(url.pathname.endsWith('/config.js')) return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response;})
      .catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
