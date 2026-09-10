/* web/sw.js — 公信万年历 Service Worker
 * 缓存策略：
 *  - APP_SHELL 安装期预缓存（同源静态资源，离线可启动）
 *  - 导航请求：network-first，失败回退 /app.html（离线看壳）
 *  - 同源静态 GET：stale-while-revalidate（缓存优先 + 后台更新）
 *  - /api/v1：network-only（HMAC 签名请求，禁止缓存旧响应）
 */
'use strict';

const VERSION = 'v1';
const CACHE = 'gongxin-calendar-' + VERSION;

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon.svg',
  '/icons/maskable.svg',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/calendar.css',
  '/css/bazi.css',
  '/css/ziwei.css',
  '/js/app.js',
  '/js/api.js',
  '/js/hmac-spec.js',
  '/js/sha256.js',
  '/js/state.js',
  '/js/router.js',
  '/js/dom-helpers.js',
  '/js/time-util.js',
  '/js/calendar-ui.js',
  '/js/detail-ui.js',
  '/js/bazi-ui.js',
  '/js/bazi-interact.js',
  '/js/ziwei-ui.js',
  '/js/nianli-ui.js',
  '/js/note-ui.js',
  '/js/settings-ui.js',
  '/js/archive-ui.js',
  '/js/region-cascader.js',
  '/js/region-tree-data.js',
  '/js/geo-data.js',
  '/js/geo-cards.js',
  '/js/geo-cards-data.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(APP_SHELL); })
      .catch(function () { /* 单个资源失败不阻断安装，剩余由 SWR 补全 */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isApi(u) { return u.pathname.indexOf('/api/v1') === 0; }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // 跨域（CDN 字体等）交给浏览器

  // 1) API：HMAC 签名，禁止缓存，直走网络
  if (isApi(url)) {
    e.respondWith(fetch(req));
    return;
  }

  // 2) 导航：network-first，离线回退 app.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('/app.html').then(function (c) { return c || caches.match('/index.html'); });
      })
    );
    return;
  }

  // 3) 同源静态：stale-while-revalidate
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
