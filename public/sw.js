const CACHE_NAME = 'stopmotion-collaborator-v1'
const urlsToCache = [
  '/',
  '/src/main.ts',
  '/src/assets/base.css',
  '/manifest.json'
]

// Service Worker インストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
})

// キャッシュからのレスポンス
self.addEventListener('fetch', (event) => {
  // S3 APIコールはキャッシュしない
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('amazonaws.com')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})

// 古いキャッシュの削除
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
