import { NextRequest, NextResponse } from "next/server";
import { authenticate, apiError, corsHeaders, enforceQuota, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { findUpstreamRoute, tierOf } from "@/lib/upstream";

/**
 * 开放接口统一入口。
 *
 *   GET|POST|PUT|DELETE /api/v1/<分类>/<接口>
 *
 * 凭证是站点卡密或 sk_ 令牌（与 /posts、/me 同一套）。每个接口按积分计费，
 * 分免费 / 基础 / 高级三档限流，具体见 /api/v1/endpoints 与文档站。
 *
 * 上游地址与凭据只存在服务端环境变量里，调用方只需要自己的卡密。
 */

const UPSTREAM_BASE = (
  process.env.UPSTREAM_BASE ??
  process.env.UAPI_BASE ??
  "https://uapis.cn"
).replace(/\/+$/, "");
const UPSTREAM_TOKEN = process.env.UPSTREAM_TOKEN ?? process.env.UAPI_TOKEN ?? "";
/** 单次请求最多等上游多久 */
const UPSTREAM_TIMEOUT_MS = 25000;

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

export function OPTIONS(): NextResponse {
  return preflight();
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const { path = [] } = await context.params;
  const joined = path.join("/");
  const match = findUpstreamRoute(joined);
  if (!match) {
    return apiError(
      404,
      "endpoint_not_found",
      "没有这个接口。全部可用接口见 https://docs.shiqing.site/docs/api-endpoints"
    );
  }

  const { route } = match;
  if (!route.m.split(",").includes(request.method)) {
    return apiError(405, "method_not_allowed", "这个接口不支持 " + request.method + " 方法", {
      allow: route.m.split(",").join(", "),
    });
  }

  // 按积分档位限流：贵的接口一天能调的次数明显更少。
  const tier = tierOf(route.c);
  const minute = await checkRateLimit("api:open:min:" + auth.auth.cardKey, tier.perMinute, 60_000);
  if (!minute.ok) {
    return apiError(429, "rate_limited", "这个档位的接口每分钟最多 " + tier.perMinute + " 次", {
      "retry-after": String(Math.ceil((minute.retryAfterMs ?? 60_000) / 1000)),
    });
  }
  const day = await checkRateLimit(
    "api:open:day:" + tier.name + ":" + auth.auth.cardKey,
    tier.perDay,
    24 * 3600 * 1000
  );
  if (!day.ok) {
    return apiError(
      429,
      "daily_limit",
      "这个档位的接口每天最多 " + tier.perDay + " 次，明天再来",
      { "retry-after": String(Math.ceil((day.retryAfterMs ?? 3_600_000) / 1000)) }
    );
  }

  const url = new URL(UPSTREAM_BASE + "/api/v1/" + joined.replace(/^\/+/, ""));
  for (const [key, value] of request.nextUrl.searchParams) {
    if (key === "token" || key === "authorization" || key === "access_token") continue;
    url.searchParams.set(key, value);
  }
  if (UPSTREAM_TOKEN) url.searchParams.set("token", UPSTREAM_TOKEN);

  const headers: Record<string, string> = {
    "user-agent": "shiqing-site/1.0 (+https://shiqing.site)",
  };
  if (UPSTREAM_TOKEN) {
    headers.token = UPSTREAM_TOKEN;
    headers.authorization = "Bearer " + UPSTREAM_TOKEN;
  }
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const accept = request.headers.get("accept");
  if (accept) headers.accept = accept;

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    });
    const payload = await upstream.arrayBuffer();
    const response = new NextResponse(payload, {
      status: upstream.status,
      headers: {
        ...corsHeaders(),
        "cache-control": "no-store",
        "x-api-credits": String(route.c),
      },
    });
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) response.headers.set("content-type", upstreamType);
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) response.headers.set("content-disposition", disposition);
    return response;
  } catch {
    return apiError(502, "upstream_unavailable", "接口暂时不可用，请稍后重试");
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}
export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}
export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}
