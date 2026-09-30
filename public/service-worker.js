// Digital Apsen - Service Worker for PWA v1.0.37
const CACHE_NAME = 'digital-apsen-v1.0.37';
const urlsToCache = [
  '/',
  '/welcome.html',
  '/index.html',
  '/login-siswa.html',
  '/login-guru.html',
  '/daftar-guru.html',
  '/dashboard-siswa.html',
  '/dashboard-guru.html',
  '/manifest.json',
  '/icon.png?v=1.0.37',
  '/js/auth-guard.js',
  '/js/nav.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Jangan cache API calls, biar data selalu real
  if(event.request.url.includes('/api/')){
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cache atau fetch network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if(cacheName !== CACHE_NAME){
            console.log('Delete old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
