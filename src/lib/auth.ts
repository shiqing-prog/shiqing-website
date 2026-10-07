import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { getDb } from "./data";
import type { PublicUser, User } from "./types";

export const SESSION_COOKIE = "bbs_session";

/** 邮箱验证 token 有效期：24 小时 */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function newSessionToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function toPublicUser(u: User): PublicUser {
  // 只暴露客户端真正需要的字段：绝不能带上 verify_token / reset_token 等敏感字段
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    bio: u.bio,
    role: u.role,
    created_at: u.created_at,
    avatar: u.avatar ?? null,
    email_verified: u.email_verified ?? 0,
    notify_email: u.notify_email ?? 0,
    // 卡密兑换来的账号权益（客户端据此展示会员状态）
    plan: u.plan ?? "free",
    plan_expires_at: u.plan_expires_at ?? 0,
    plan_quota: u.plan_quota ?? 0,
    plan_used: u.plan_used ?? 0,
  };
}

export function sessionCookieOptions(expires: Date): {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor((expires.getTime() - Date.now()) / 1000),
    // 生产环境（https）才要求 secure；本地 http 开发环境也能正常登录
    secure: process.env.NODE_ENV === "production",
  };
}

/** 会话 token → 已登录用户（统一在这里校验过期，并顺手清理过期会话） */
async function userFromSessionToken(token: string): Promise<PublicUser | null> {
  if (!token) return null;
  const db = await getDb();
  const session = await db.getSession(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.deleteSession(token);
    return null;
  }
  const user = await db.getUserById(session.user_id);
  return user ? toPublicUser(user) : null;
}

/** 根据请求 Cookie 获取当前登录用户（未登录返回 null） */
export async function getSessionUser(
  request: NextRequest
): Promise<PublicUser | null> {
  return userFromSessionToken(request.cookies.get(SESSION_COOKIE)?.value ?? "");
}

/**
 * 服务端组件（RSC/SSR）用：直接读 cookie，并走**同一套**过期校验。
 * 页面若自己 db.getSession() 会绕过过期判断，导致过期 Cookie 仍被当成已登录。
 */
export async function getSessionUserFromCookies(): Promise<PublicUser | null> {
  try {
    const { cookies } = await import("next/headers");
    return await userFromSessionToken(
      (await cookies()).get(SESSION_COOKIE)?.value ?? ""
    );
  } catch {
    /* 无请求上下文（构建期等） */
    return null;
  }
}

/** 校验邮箱格式 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
