import type { NextConfig } from "next";

/**
 * 全站安全响应头。
 * HSTS 只在生产加，避免本地 http 开发被浏览器强制跳 https。
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * CSP（暂无 nonce 方案）。
 *
 * 站点 <head> 有内联主题脚本、Next 也会注入内联引导脚本，因此 script-src 保留
 * 'unsafe-inline'（严格 nonce 需全站动态渲染，代价大，留待后续）。即便如此，
 * default-src 'self' / object-src 'none' / base-uri / form-action / frame-ancestors
 * 仍能挡掉外部脚本注入、<base> 劫持与点击劫持。
 * - connect-src 放行文件库（前端直传）与一言 API
 * - img-src 用 https: 放行帖子内嵌的任意 https 图片
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://files.shiqing.site https://v1.hitokoto.cn",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  // 显式指定项目根：本仓库外层目录（harness）也有 package-lock.json/node_modules，
  // Next 自动探测会把根误判到外层，导致 Turbopack 解析不到 lightningcss 的 Linux 原生包。
  turbopack: {
    root: __dirname,
  },
  // 不再对外暴露 X-Powered-By: Next.js
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
