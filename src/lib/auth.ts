import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { getDb } from "./data";
import type { PublicUser, User } from "./types";

export const SESSION_COOKIE = "bbs_session";
const SESSION_DAYS = 30;

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
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    bio: u.bio,
    role: u.role,
    created_at: u.created_at,
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
    secure: true,
  };
}

/** 根据请求 Cookie 获取当前登录用户（未登录返回 null） */
export async function getSessionUser(
  request: NextRequest
): Promise<PublicUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
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

/** 校验邮箱格式 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
