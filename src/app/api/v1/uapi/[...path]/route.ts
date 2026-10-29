import { NextRequest, NextResponse } from "next/server";
import { authenticate, enforceQuota, apiError, corsHeaders, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * UApiPro 中转接口：把站点卡密换成 UApiPro 的调用权。
 *
 *   GET /api/v1/uapi/<上游路径>?<参数>
 *
 * 上游 token 只存在服务端的 UAPI_TOKEN 环境变量里，调用者只需要站点卡密（或 sk_ 令牌）。
 * 只开放白名单里的只读接口，避免有人拿它打任意地址（SSRF）。
 */

const UAPI_BASE = (process.env.UAPI_BASE ?? "https://uapis.cn").replace(/\/+$/, "");
const UAPI_TOKEN = process.env.UAPI_TOKEN ?? "";

/** 每张卡密每天最多调用多少次上游接口 */
const UAPI_DAILY_LIMIT = 200;
/** 上游接口最慢等多久（新闻图这类接口本身很慢） */
const UPSTREAM_TIMEOUT_MS = 25000;

/** 允许中转的上游路径前缀。全部对应 UApiPro 的 /api/v1/* 只读接口。 */
const ALLOWED_PATHS: readonly string[] = [
  "answerbook/ask",
  "social/bilibili/userinfo",
  "social/bilibili/archives",
  "image/bing-daily",
  "github/repo",
  "saying",
  "misc/holiday-calendar",
  "misc/hotboard",
  "network/icp",
  "network/ipinfo",
  "network/whois",
  "game/minecraft/serverstatus",
  "daily/news-image",
  "image/qrcode",
  "random/image",
  "random/string",
  "misc/tracking/query",
  "misc/weather",
];

function isAllowed(path: string): boolean {
  if (!path) return false;
  return ALLOWED_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function OPTIONS(): NextResponse {
  return preflight();
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const { path = [] } = await context.params;
  const rest = path.join("/");
  if (!isAllowed(rest)) {
    return apiError(404, "endpoint_not_supported", "这个上游接口没有开放，可用的接口见 https://shiqing.site/developers");
  }

  const limit = await checkRateLimit("api:uapi:" + auth.auth.cardKey, UAPI_DAILY_LIMIT, 24 * 3600 * 1000);
  if (!limit.ok) {
    const retry = Math.max(1, Math.ceil((limit.retryAfterMs ?? 60_000) / 1000));
    return apiError(429, "uapi_daily_limit", "UApi 接口每张卡密每天最多调用 " + UAPI_DAILY_LIMIT + " 次，请稍后再试", {
      "retry-after": String(retry),
    });
  }

  const url = new URL(UAPI_BASE + "/api/v1/" + rest);
  for (const [key, value] of request.nextUrl.searchParams) {
    // 调用方不能自带 token，统一用服务端的
    if (key === "token" || key === "authorization") continue;
    url.searchParams.set(key, value);
  }
  if (UAPI_TOKEN) url.searchParams.set("token", UAPI_TOKEN);

  const headers: Record<string, string> = { "user-agent": "shiqing-site/1.0" };
  if (UAPI_TOKEN) {
    headers.token = UAPI_TOKEN;
    headers.authorization = "Bearer " + UAPI_TOKEN;
  }

  try {
    const upstream = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await upstream.arrayBuffer();
    const response = new NextResponse(body, {
      status: upstream.status,
      headers: { ...corsHeaders(), "cache-control": "no-store" },
    });
    const contentType = upstream.headers.get("content-type");
    if (contentType) response.headers.set("content-type", contentType);
    return response;
  } catch {
    return apiError(502, "upstream_unavailable", "上游接口暂时不可用，请稍后重试");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  return handle(request, context);
}
