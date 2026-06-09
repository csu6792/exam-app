// 版本每次更新記得改
const CACHE_NAME = 'quiz-reader-cache-v1.7.1.1';

const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json'
];


// 安裝
self.addEventListener('install', event => {

  // iOS PWA 建議直接接管，不要卡 waiting
  //self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {

        return Promise.allSettled(
          ASSETS_TO_CACHE.map(file =>
            cache.add(file).catch(err =>
              console.log('cache fail:', file, err)
            )
          )
        );

      })
  );

});


// 啟用
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

    }).then(()=>{
      console.log('SW activated');
      //return self.clients.claim();

    })

  );

});


// fetch
self.addEventListener('fetch', event => {

  const url = new URL(event.request.url);


  // 更新檔永遠不要快取
  if(url.pathname.includes('update_log.md')){
    event.respondWith(fetch(event.request));
    return;
  }


  event.respondWith(

    fetch(event.request)

      .then(response=>{


        // 成功才更新 cache
        if(
          response.status === 200 &&
          (
            url.origin === self.location.origin
          )
        ){

          const copy=response.clone();

          caches.open(CACHE_NAME)
          .then(cache=>{
            cache.put(event.request,copy);
          });

        }


        return response;

      })


      .catch(()=>{

        return caches.match(event.request);

      })

  );

});



// 前端要求更新
self.addEventListener('message',event=>{

  if(event.data==='SKIP_WAITING'){

    self.skipWaiting();

  }

});
