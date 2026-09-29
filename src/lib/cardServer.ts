/**
 * 卡密接口公共部分：CORS、统一响应体、鉴权、限流、审计
 *
 * 鉴权有两种：
 *   - 词库调用 verify / consume：`Authorization: Bearer <CARD_API_TOKEN>`
 *   - 管理接口：**站点管理员登录态**（推荐，后台页面用）或 `Bearer <CARD_ADMIN_TOKEN>`（脚本/curl）
 *
 * 响应体与参考方案一致：`{ code, msg, data }`，业务无效也是 code=0 + msg=invalid。
 * 管理接口**不加 CORS**，避免跨站携带管理员凭证调用。
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./data";
import { getSessionUser } from "./auth";
import { checkRateLimit, clientIp } from "./ratelimit";
import type { CardLogRecord } from "./types";

/** 公开接口（ping/verify/consume）的 CORS */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function json(body: unknown, status = 200, withCors = true): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: withCors ? CORS_HEADERS : undefined,
  });
}

/** 统一成功响应 */
export function ok(data: unknown, msg = "ok"): NextResponse {
  return json({ code: 0, msg, data });
}

/** 统一错误响应（默认 HTTP 200，业务错误码放 body，与参考方案一致） */
export function fail(code: number, msg: string, status = 200): NextResponse {
  return json({ code, msg, data: null }, status);
}

export function preflight(withCors = true): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: withCors ? CORS_HEADERS : undefined,
  });
}

/** 读取密钥：优先 Cloudflare secret，其次本地进程环境（.env.local / .dev.vars）
 *  注意 trim：用管道 `echo xxx | wrangler secret put` 上传时可能把换行写进值里，
 *  不 trim 会导致恒定时间比较失败（表现为「token 明明对却 401」） */
export async function readEnv(name: string): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as unknown as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    /* 本地 next dev 没有 Cloudflare 上下文 */
  }
  if (typeof process !== "undefined" && process.env) {
    return (process.env[name] ?? "").trim();
  }
  return "";
}

export function bearerOf(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/** 恒定时间字符串比较（避免逐字符比较的时序差异） */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 词库接口鉴权：Bearer CARD_API_TOKEN；通过返回 null */
export async function requireApiToken(request: NextRequest): Promise<NextResponse | null> {
  const token = await readEnv("CARD_API_TOKEN");
  if (!token) {
    return json({ code: 503, msg: "服务端未配置 CARD_API_TOKEN", data: null }, 503);
  }
  if (!safeEqual(token, bearerOf(request))) {
    return json({ code: 401, msg: "unauthorized", data: null }, 401);
  }
  return null;
}

/**
 * 管理接口鉴权：站点管理员登录态 或 Bearer CARD_ADMIN_TOKEN；通过返回 null
 * （比参考方案的「只在页面手输 ADMIN_TOKEN」更安全：后台页面走登录态，密钥不落到浏览器）
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const adminToken = await readEnv("CARD_ADMIN_TOKEN");
  if (adminToken && safeEqual(adminToken, bearerOf(request))) return null;

  const user = await getSessionUser(request);
  if (user?.role === "admin") return null;
  if (!user) {
    return json({ code: 401, msg: "请先登录或提供 ADMIN_TOKEN", data: null }, 401, false);
  }
  return json({ code: 403, msg: "需要管理员权限", data: null }, 403, false);
}

/** 安全解析 JSON body（非法/空 body 返回 {}） */
export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const data = (await request.json()) as unknown;
    return data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function ipOf(request: NextRequest): string {
  return clientIp(request);
}

/** 限流（内存桶，多 isolate 下阈值放宽，用于挡压测） */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  return !checkRateLimit(key, limit, windowMs).ok;
}

/** 写审计日志（写失败不影响主流程） */
export async function logCard(
  entry: Omit<CardLogRecord, "created_at"> & { created_at?: number }
): Promise<void> {
  try {
    const db = await getDb();
    await db.createCardLog({
      ...entry,
      created_at: entry.created_at ?? Math.floor(Date.now() / 1000),
    });
  } catch {
    /* 忽略 */
  }
}
