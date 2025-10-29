/* service worker base per la PWA Let's Walk, da aggiornare in futuro
*/

const CACHE_NAME = 'lets-walk-v1'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/styles/index.css'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key)
        })
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // gestisci solo le richieste GET
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // richede pagine di navigazione (HTML): network-first con fallback su cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // metto in cache la risposta per il futuro
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    )
    return
  }

  // Per le richieste dello stesso origin, usa cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
        // metto in cache la risposta per il futuro
        if (resp && resp.status === 200) {
          const copy = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return resp
      }).catch(() => cached))
    )
    return
  }

  // Per le altre richieste (API esterne, ecc.), usa network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        // metto in cache la risposta per il futuro
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Gestione messaggi per aggiornamenti del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
