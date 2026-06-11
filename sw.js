const CACHE_NAME = 'quiz-reader-cache-v1.2.2';

const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'sw.js',
  'lib/pdf.min.js',
  'lib/pdf.worker.min.js'
];

// 1. 安裝階段
self.addEventListener('install', event => {
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(file =>
            cache.add(file).catch(err => console.log('cache fail:', file, err))
          )
        );
      })
  );
});

// 2. 啟用階段
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('delete old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('SW activated');
      // 🌟 解除註解：確保新的 SW 啟動後立刻控制所有開啟的網頁，配合強制刷新更穩定
      return self.clients.claim();
    })
  );
});


// 3. 攔截請求
self.addEventListener('fetch', event => {

  const url = new URL(event.request.url);


  if (url.origin !== self.location.origin) {
    return;
  }


  // data 類：更新優先
  if (
    url.pathname.includes('/data/') ||
    url.pathname.endsWith('.md') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.pdf')
  ) {

    event.respondWith(
      fetch(event.request)
      .then(response=>{

        const copy=response.clone();

        caches.open(CACHE_NAME)
        .then(cache=>{
          cache.put(event.request,copy);
        });

        return response;

      })
      .catch(()=>{
        return caches.match(event.request);
      })
    );

    return;
  }



  // app 本體：快取優先
  event.respondWith(

    caches.match(event.request)
    .then(cacheResponse=>{

      return cacheResponse ||
      fetch(event.request)
      .then(response=>{

        const copy=response.clone();

        caches.open(CACHE_NAME)
        .then(cache=>{
          cache.put(event.request,copy);
        });

        return response;

      });

    })

  );

});

// 4. 接收前端訊息
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    // 當使用者在畫面上點擊「立即更新」時，這裡才會觸發接管
    self.skipWaiting();
  }
});
