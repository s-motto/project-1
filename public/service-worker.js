const CACHE_NAME = 'lets-walk-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png'
]

// Installazione - cache delle risorse
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Attivazione - pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch - gestione delle richieste
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // NON cachare le tile delle mappe
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tile.thunderforest.com') ||
      url.hostname.includes('openrouteservice.org')) {
    // Lascia passare direttamente alla rete
    return event.respondWith(fetch(event.request))
  }
  
  // Per tutto il resto, usa cache-first
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  )
})