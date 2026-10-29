/**
 * 开发者 API 公共层：凭证解析、CORS、统一响应、配额。
 *
 * 鉴权有两种凭证：
 *   - 卡密本身（cards.card_key）—— 最省事，适合自己临时用；
 *   - 用卡密换来的 sk_ 令牌（api_tokens.token）—— 推荐，泄露后可单独吊销，
 *     不影响卡密本身。
 *
 * 配额按**卡密**统计（同一张卡密下的多个令牌共享额度），按天切分（上海时区）。
 */
import { NextResponse } from "next/server";
import type { CardRecord } from "./types";
import { getDb, shanghaiDay } from "./data";
import { normalizeCardKey, nowSec } from "./card";
import { checkRateLimit } from "./ratelimit";

export const API_VERSION = "1";
/** 每张卡密每日调用上限（所有令牌共享） */
export const DAILY_LIMIT = 2000;
/** 每张卡密每分钟上限（挡突发流量） */
export const PER_MINUTE_LIMIT = 60;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, x-api-key, content-type",
  "access-control-max-age": "86400",
};

export function corsHeaders(): Record<string, string> {
  return { ...CORS };
}

/** 统一 JSON 响应（带 CORS 与 no-store） */
export function apiJson(
  data: unknown,
  status = 200,
  extra?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { ...CORS, "cache-control": "no-store", ...extra },
  });
}

/** 统一错误响应：{ error: { code, message } } */
export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, string>
): NextResponse {
  return apiJson({ error: { code, message } }, status, extra);
}

/** OPTIONS 预检（浏览器跨域调用） */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export interface ApiAuth {
  cardKey: string;
  card: CardRecord;
  /** 走 sk_ 令牌时带出，直接用卡密调用时为 null */
  token: string | null;
}

export type ApiAuthResult =
  | { ok: true; auth: ApiAuth }
  | { ok: false; response: NextResponse };

function extractCredential(request: Request): string {
  const header = (request.headers.get("authorization") ?? "").trim();
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (m) return m[1].trim();
  return (request.headers.get("x-api-key") ?? "").trim();
}

/**
 * 解析并校验凭证。返回的 response 已经带好 CORS，直接 return 即可。
 * 卡密有效性口径与 GET /api/card/verify 一致：未被吊销、未过期
 * （expired_at = 0 表示未激活，仍可使用；API 调用不消耗卡密次数）。
 */
export async function authenticate(request: Request): Promise<ApiAuthResult> {
  const raw = extractCredential(request);
  if (!raw) {
    return {
      ok: false,
      response: apiError(
        401,
        "missing_key",
        "缺少调用凭证。请带上 Authorization: Bearer <卡密或 sk_ 令牌>"
      ),
    };
  }

  const db = await getDb();
  let cardKey: string;
  let token: string | null = null;

  if (raw.startsWith("sk_")) {
    const row = await db.getApiToken(raw);
    if (!row || row.revoked === 1) {
      return { ok: false, response: apiError(401, "invalid_token", "令牌不存在或已被吊销") };
    }
    cardKey = row.card_key;
    token = raw;
  } else {
    cardKey = normalizeCardKey(raw);
    if (!cardKey) {
      return { ok: false, response: apiError(401, "invalid_key", "凭证格式不正确") };
    }
  }

  const card = await db.getCardByKey(cardKey);
  if (!card) {
    return { ok: false, response: apiError(401, "invalid_key", "卡密不存在") };
  }
  const now = nowSec();
  if (card.status !== 1) {
    return { ok: false, response: apiError(403, "revoked", "卡密已被吊销") };
  }
  if (card.expired_at !== 0 && card.expired_at < now) {
    return { ok: false, response: apiError(403, "expired", "卡密已过期") };
  }

  // 令牌的「最近使用时间」只做展示，写失败不影响本次请求。
  if (token) {
    try {
      await db.touchApiToken(token, now);
    } catch {
      /* 忽略 */
    }
  }

  return { ok: true, auth: { cardKey, card, token } };
}

/**
 * 配额检查：先卡每分钟，再卡每天（每天计数落库，跨 isolate 共享）。
 * 超限返回 429 响应，正常返回 null。
 */
export async function enforceQuota(auth: ApiAuth): Promise<NextResponse | null> {
  const minute = await checkRateLimit(
    `api:min:${auth.cardKey}`,
    PER_MINUTE_LIMIT,
    60 * 1000
  );
  if (!minute.ok) {
    return apiError(429, "rate_limited", "调用太频繁，请稍后再试", {
      "retry-after": String(Math.ceil((minute.retryAfterMs ?? 60_000) / 1000)),
    });
  }

  const db = await getDb();
  const day = shanghaiDay(new Date());
  const used = await db.bumpApiUsage(auth.cardKey, day, nowSec());
  if (used > DAILY_LIMIT) {
    return apiError(
      429,
      "daily_limit",
      `今日调用已达上限（${DAILY_LIMIT} 次），明天再来`
    );
  }
  return null;
}

/** 今天的用量（不含本次） */
export async function todayUsage(cardKey: string): Promise<number> {
  const db = await getDb();
  return db.getApiUsage(cardKey, shanghaiDay(new Date()));
}

/** 生成 sk_ 令牌（24 字节随机 → 48 位十六进制） */
export function newApiToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const b of bytes) body += b.toString(16).padStart(2, "0");
  return `sk_${body}`;
}

/** 卡密的对外视图（不返回任何敏感字段） */
export function cardView(card: CardRecord) {
  const now = nowSec();
  return {
    plan: card.plan,
    days: card.days,
    activated: card.expired_at !== 0,
    expired_at: card.expired_at,
    remaining_seconds: card.expired_at === 0 ? null : Math.max(0, card.expired_at - now),
    bound_qq: card.bound_qq || null,
    bound_user_id: card.bound_user_id || null,
    status: card.status === 1 ? "active" : "revoked",
  };
}

/** 分页信息 */
export function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    hasMore: page * pageSize < total,
  };
}
