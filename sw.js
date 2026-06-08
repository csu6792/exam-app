const CACHE_NAME = 'quiz-reader-cache-v1';

// 需要快取的靜態資源基礎框架
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// 安裝階段：寫入基礎快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // 核心：若有新 Service Worker，跳過等待，立刻活化
      return self.skipWaiting();
    })
  );
});

// 活化階段：清除舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: 清除舊快取...', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // 讓新 Service Worker 立刻控制所有開啟的網頁分頁
      return self.clients.claim();
    })
  );
});

// 攔截請求策略：網路優先 (Network First)
// 確保優先從 GitHub io 下載最新的程式碼與 JSON 題庫，失敗時才使用離線快取
self.addEventListener('fetch', (event) => {
  // 排除非 HTTP/HTTPS 請求（例如 chrome-extension 或 data: 網址）
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果網路請求成功，複製一份放入快取中，隨時保持最新
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 當沒網路（斷網）時，自動退回尋找本機快取資源
        return caches.match(event.request);
      })
  );
});
