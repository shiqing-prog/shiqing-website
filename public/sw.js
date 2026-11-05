/* 简单的离线兜底 Service Worker
 *
 * 只做两件事：
 * 1) 预缓存 /offline 页面；
 * 2) 页面导航请求走网络优先，断网时回退到 /offline。
 *
 * 刻意不缓存 HTML 与 /api/*：站点内容实时性高（帖子、通知、卡密），
 * 缓存了反而会看到过期数据；静态资源交给浏览器 HTTP 缓存。
 */
const CACHE = "shiqing-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 只接管页面导航：断网时给一个能看懂的页面，而不是浏览器的恐龙
  if (req.mode !== "navigate") return;

  event.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(OFFLINE_URL);
      return cached || new Response("离线了", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    })
  );
});
