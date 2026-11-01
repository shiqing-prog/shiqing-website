import { NextResponse, type NextRequest } from "next/server";

/**
 * api.shiqing.site —— 同一个 Worker 的第三个自定义域名，专给对外 API 用。
 *
 * Worker 里的 API 实体都挂在 /api/v1/* 下，但调用方拿到 https://api.shiqing.site
 * 之后更希望直接写 /posts，而不是 /api/v1/posts。这里做一次内部重写：
 *
 *   /             → /api/v1/ping     （根路径给一个连通性说明，而不是 404）
 *   /posts        → /api/v1/posts
 *   /posts/123    → /api/v1/posts/123
 *   /api/v1/xxx   → 原样放行（文档里写的完整路径依然有效，老调用方不会被改写坏）
 *
 * 用 rewrite 不用 redirect：302 会把 POST 变成 GET，而且多一次往返。
 * 其它域名（shiqing.site / www / docs / 本地预览 / 测试环境）一律 next()，零改动。
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (!host.startsWith("api.shiqing.site")) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  // 已经带 /api/ 前缀的请求原样放行，避免被重写成 /api/v1/api/v1/...
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/api/v1/ping" : `/api/v1${pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // 静态资源与图标不进中间件，省一次分支判断
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
