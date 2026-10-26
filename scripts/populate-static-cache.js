/* eslint-disable @typescript-eslint/no-require-imports -- Node 构建脚本，使用 CommonJS */
/**
 * 把构建产物里的 ISR 缓存复制进静态资产：npm run build:cf / deploy:cf 会自动执行
 *
 * 为什么需要它
 * ------------
 * open-next.config.ts 用的是 static-assets 增量缓存，它在运行时读
 * `cdn-cgi/_next_cache/<buildId>/<key>.cache`，而这些文件必须事先躺在
 * assets 目录里，否则 read 落空、页面又退化成每次重新渲染。
 *
 * `opennextjs-cloudflare deploy` 会自动做这一步（其内部 populate-cache
 * 就是 `fs.cpSync(outputDir/cache, outputDir/assets/cdn-cgi/_next_cache)`），
 * 但我们的流程是 `build` 之后用自己的 `wrangler deploy`，所以这里手工补上。
 *
 * buildId 不需要我们自己算：缓存目录名就是 next build 的 BuildId，运行时
 * server-functions 里也执行了 `process.env.OPEN_NEXT_BUILD_ID = BuildId`，
 * 两边天然一致。
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, ".open-next", "cache");
const dest = path.join(root, ".open-next", "assets", "cdn-cgi", "_next_cache");

function walk(dir) {
  let count = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(p);
      count += sub.count;
      bytes += sub.bytes;
    } else {
      count += 1;
      bytes += fs.statSync(p).size;
    }
  }
  return { count, bytes };
}

if (!fs.existsSync(src)) {
  console.warn("[populate-static-cache] 未找到 .open-next/cache，跳过（不影响静态页面以外的功能）");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });

const { count, bytes } = walk(dest);
console.log(
  `[populate-static-cache] 已复制 ${count} 个缓存条目（${(bytes / 1024 / 1024).toFixed(2)} MB）到 assets/cdn-cgi/_next_cache`,
);
