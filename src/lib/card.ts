/**
 * 卡密业务规则（纯函数，便于单测与复用）
 *
 * 时间统一用**秒级** Unix 时间戳；`expired_at === 0` 表示「未激活」，
 * 首次消费时才按 days 开始计时（生成时也可选择立即计时）。
 *
 * 相比参考方案修正的点：
 *   - 已绑定 QQ 的卡密**不能**通过「不传 qq」绕过绑定校验
 *   - QQ 必须是 5-12 位数字（避免脏数据/超长写库失败/注入后台列表）
 *   - days / quota / count 都有上限，避免时间戳溢出与刷表
 *   - 随机码用拒绝采样，消除 `% 36` 的模偏差
 */
import type { CardRecord } from "./types";

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export type CardInvalidReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "quota_exceeded"
  | "qq_mismatch";

export const CARD_REASON_TEXT: Record<CardInvalidReason, string> = {
  not_found: "卡密不存在",
  revoked: "卡密已被吊销",
  expired: "卡密已过期",
  quota_exceeded: "可用次数已用完",
  qq_mismatch: "卡密已绑定其它 QQ",
};

export const CARD_LIMITS = {
  days: { min: 1, max: 3650, fallback: 30 },
  quota: { min: 0, max: 1_000_000, fallback: 0 },
  count: { min: 1, max: 1000, fallback: 1 },
} as const;

/** 取整并夹到区间内（非法输入回落默认值） */
export function clampInt(
  input: unknown,
  spec: { min: number; max: number; fallback: number }
): number {
  const n = Math.trunc(Number(input));
  if (!Number.isFinite(n)) return spec.fallback;
  return Math.min(spec.max, Math.max(spec.min, n));
}

/**
 * 规范化 QQ：空串允许（表示未提供，此时只有未绑定的卡密能通过）；
 * 非空必须是 5-12 位数字
 */
export function normalizeQq(
  input: unknown
): { ok: true; qq: string } | { ok: false; message: string } {
  const raw =
    typeof input === "string" || typeof input === "number" ? String(input).trim() : "";
  if (raw === "") return { ok: true, qq: "" };
  if (!/^\d{5,12}$/.test(raw)) {
    return { ok: false, message: "QQ 号格式不正确（应为 5-12 位数字）" };
  }
  return { ok: true, qq: raw };
}

/** 前缀：只保留小写字母 */
export function sanitizePrefix(input: unknown): string {
  const s = String(input ?? "sec").toLowerCase().replace(/[^a-z]/g, "");
  return (s || "sec").slice(0, 16);
}

/** 套餐名：只保留小写字母与数字 */
export function sanitizePlan(input: unknown): string {
  const s = String(input ?? "basic").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (s || "basic").slice(0, 16);
}

const KEY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * 生成随机码
 * 用拒绝采样消除 `% 36` 的模偏差（256 不是 36 的整数倍，直接取模会让前 4 个字符概率偏高）
 */
function randomCode(len: number): string {
  const limit = Math.floor(256 / KEY_CHARS.length) * KEY_CHARS.length;
  let out = "";
  while (out.length < len) {
    const buf = new Uint8Array(len * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= limit) continue; // 偏差区间内的字节丢弃
      out += KEY_CHARS[b % KEY_CHARS.length];
      if (out.length === len) break;
    }
  }
  return out;
}

/** 卡密格式：`prefix_plan_32位随机码` */
export function genKey(prefix: string, plan: string): string {
  return `${prefix}_${plan}_${randomCode(32)}`;
}

export type CardCheck =
  | { valid: true; activated: boolean }
  | { valid: false; reason: CardInvalidReason };

/** 可用性判定（verify 与 consume 共用） */
export function checkCardUsable(card: CardRecord, qq: string, now: number): CardCheck {
  if (card.status !== 1) return { valid: false, reason: "revoked" };
  // expired_at = 0 表示未激活 → 有效但尚未计时
  if (card.expired_at !== 0 && card.expired_at < now) {
    return { valid: false, reason: "expired" };
  }
  if (card.quota > 0 && card.used >= card.quota) {
    return { valid: false, reason: "quota_exceeded" };
  }
  // 已绑定必须完全匹配：不能写成 `qq !== "" && ...`，否则「不传 qq」即可绕过绑定
  if (card.bound_qq !== "" && card.bound_qq !== qq) {
    return { valid: false, reason: "qq_mismatch" };
  }
  return { valid: true, activated: card.expired_at !== 0 };
}

/** 对外返回的卡密摘要（去掉自增 id） */
export function cardPublicView(card: CardRecord): Omit<CardRecord, "id"> {
  const clone: CardRecord = { ...card };
  delete clone.id;
  return clone;
}
