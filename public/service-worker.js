const CACHE_NAME = 'lets-walk-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
   'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
]

// Installazione - cache delle risorse
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
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
    }).then(() => self.clients.claim())
  )
})

// Fetch - gestione delle richieste
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip cross-origin third-party map tiles and APIs
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tile.thunderforest.com') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('openrouteservice.org')) {
    return event.respondWith(fetch(event.request))
  }

  // Network-first for HTML/doc to avoid stale index.html
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const resClone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone))
        return res
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // Cache-first for all other requests (JS/CSS/assets)
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})