// 天枢·紫微 Service Worker — 离线缓存
const CACHE = 'ziwei-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/main-edba3d82.js',
  '/assets/main-d2ee087f.css',
  '/assets/custom.css',
  '/assets/ai-panel.js',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
];

// 安装：预缓存核心资源
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，API 走网络
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API 请求始终走网络
  if (url.pathname.startsWith('/api/')) return;

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
    )
  );
});
