import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // 用构建产物里的静态资产做 ISR 缓存。
  //
  // 默认的 dummy 缓存永远返回 null，于是每个预渲染页面每次请求都要在 Worker
  // 里重新渲染一遍（响应头 x-nextjs-cache: MISS），既慢又费 CPU——免费版
  // 每个请求只有 10ms，这正是偶发 Error 1102 的来源之一。
  //
  // static-assets 缓存是只读的：构建时生成的 .cache 会被复制进 assets 的
  // cdn-cgi/_next_cache，运行时直接读文件，预渲染页面从此是 HIT。
  // 页面内容更新仍然靠重新部署（本来就是这个节奏）。
  incrementalCache: staticAssetsIncrementalCache,

  // 缓存拦截：路由解析完之后，如果命中的是预渲染页面，直接从增量缓存取内容
  // 返回，不再进入 Next.js 的渲染管线。
  //
  // 实测预渲染页的 TTFB 里服务端部分稳定占 0.3~0.7 秒，而 Cloudflare 记录的
  // CPU 时间只有约 24 毫秒——说明这段耗时是等待 IO 和初始化，不是计算。
  // 拦截器正是为了跳过这段初始化。注意官方说明：用了 PPR 就不能开这个，
  // 本站没用 PPR。若日后出现页面内容错乱，第一个该回滚的就是这一行。
  enableCacheInterception: true,
});
