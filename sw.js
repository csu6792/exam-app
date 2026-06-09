const CACHE_NAME = 'quiz-reader-cache-v1.7.0.1'; 

const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// 安裝階段：強制把核心靜態資源塞入快取
// 安裝階段：強制把核心靜態資源塞入快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }) // 🛠️ 修正：移除後面的 .then(() => self.skipWaiting())，讓新版本乖乖待在 waiting 狀態排隊
  );
});

// 啟用階段：清除過期的舊版本快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('刪除舊快取:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截請求（🛠️ iOS 防卡死核心修正）
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 💡 關鍵防線 1：絕對不要快取更新日誌 (update_log.md)！直接放行走網路
  // 這樣能徹底防止 iOS 因為快取污染，導致 showUpdatePrompt() 被核心掐死
  if (url.pathname.includes('update_log.md')) {
    return event.respondWith(fetch(event.request));
  }

  // 💡 關鍵防線 2：針對核心靜態資源（在 ASSETS_TO_CACHE 裡面的）
  // 採用「快取優先」或「網路優先但安全過濾」，這裡使用安全的快取隔離策略
  event.respondWith(
    fetch(event.request).then((response) => {
      // 只有當請求是成功的，且不是動態 API/日誌時，才安全地更新快取
      if (response.status === 200) {
        // 🛠️ iOS 修正：只快取同源的靜態檔案或指定的 CDN 資源，防止快取爆掉導致 App 凍結
        if (url.origin === self.location.origin || url.href.includes('cdnjs.cloudflare.com')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
      }
      return response;
    }).catch(() => {
      // 網路斷線或 iOS 執行緒掛起時，才從快取撈防禦
      return caches.match(event.request);
    })
  );
});

// 監聽前端網頁傳來的「立即更新」指令
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
