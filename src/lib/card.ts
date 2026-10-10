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
import type { CardRecord, CardRequest, UserPlan } from "./types";

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export type CardInvalidReason =
  | "not_found"
  | "revoked"
  | "expired"
  | "quota_exceeded"
  | "qq_mismatch"
  | "redeemed";

export const CARD_REASON_TEXT: Record<CardInvalidReason, string> = {
  not_found: "卡密不存在",
  revoked: "卡密已被吊销",
  expired: "卡密已过期",
  quota_exceeded: "可用次数已用完",
  qq_mismatch: "卡密已绑定其它 QQ",
  redeemed: "卡密已兑换到本站账号",
};

export const CARD_LIMITS = {
  days: { min: 1, max: 3650, fallback: 30 },
  quota: { min: 0, max: 1_000_000, fallback: 0 },
  count: { min: 1, max: 1000, fallback: 1 },
} as const;

/* ================= 卡密申请（主页提交 → 管理员审核 → 自动发卡） ================= */

export const CARD_REQUEST_RULES = {
  /** 同时最多允许 1 条待审核申请 */
  maxPending: 1,
  /** 每 24 小时最多提交 3 次（不管通过与否，防止刷申请） */
  dailyLimit: 3,
  reason: { min: 5, max: 200 },
  contact: { max: 64 },
  /** 申请时可选的套餐（管理员审核时可用 ?plan/?days/?quota 覆盖） */
  plans: ["basic", "pro", "vip"] as const,
} as const;

export function cardRequestStatusText(status: number): string {
  if (status === 1) return "已通过";
  if (status === 2) return "已拒绝";
  return "待审核";
}

/**
 * 申请的对外视图：把 snake_case 行整理成 camelCase，避免前端混用两套字段名
 * （cardKey 只在通过后才有值；通过后用户可自行去「卡密兑换」入账）
 */
export function cardRequestView(r: CardRequest) {
  return {
    id: Number(r.id ?? 0),
    plan: String(r.plan ?? ""),
    days: Number(r.days ?? 0),
    quota: Number(r.quota ?? 0),
    reason: String(r.reason ?? ""),
    contact: String(r.contact ?? ""),
    status: Number(r.status ?? 0),
    statusText: cardRequestStatusText(Number(r.status ?? 0)),
    cardKey: String(r.card_key ?? ""),
    reviewNote: String(r.review_note ?? ""),
    reviewedAt: Number(r.reviewed_at ?? 0),
    createdAt: Number(r.created_at ?? 0),
    userNickname: r.user_nickname ?? null,
    userId: r.user_id,
  };
}

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

/** 前缀：保留大写字母与数字（新格式形如 QB-XXXX-…）；旧的小写前缀仍可传 */
export function sanitizePrefix(input: unknown): string {
  const s = String(input ?? "QB").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (s || "QB").slice(0, 16);
}

/** 套餐名：只保留小写字母与数字 */
export function sanitizePlan(input: unknown): string {
  const s = String(input ?? "basic").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (s || "basic").slice(0, 16);
}

/** 卡密随机字符集：去掉易混淆的 0/O/1/I，共 32 个（与 QQ 机器人侧一致） */
const KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 默认卡密模板：QB-XXXX-XXXX-XXXX-XXXX */
export const DEFAULT_CARD_FORMAT = "{PREFIX}-{RAND4}-{RAND4}-{RAND4}-{RAND4}";

/** 生成 n 位随机字符（拒绝采样，避免取模偏差） */
function randomChars(length: number): string {
  const size = Math.max(1, Math.min(64, Math.trunc(length) || 4));
  const limit = Math.floor(256 / KEY_CHARS.length) * KEY_CHARS.length;
  let out = "";
  while (out.length < size) {
    const buf = new Uint8Array(size * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= limit) continue;
      out += KEY_CHARS[b % KEY_CHARS.length];
      if (out.length === size) break;
    }
  }
  return out;
}

/**
 * 模板化卡密生成（与 QQ 机器人侧 cards/key.ts 保持一致）
 * 占位符：{PREFIX} {YEAR} {YY} {MONTH} {DAY} {RANDn}
 */
export function generateCardKey(
  prefix = "QB",
  format = DEFAULT_CARD_FORMAT
): string {
  const now = new Date();
  const raw = format
    .replace(/\{PREFIX\}/g, prefix.trim().toUpperCase())
    .replace(/\{YEAR\}/g, String(now.getFullYear()))
    .replace(/\{YY\}/g, String(now.getFullYear()).slice(-2))
    .replace(/\{MONTH\}/g, String(now.getMonth() + 1).padStart(2, "0"))
    .replace(/\{DAY\}/g, String(now.getDate()).padStart(2, "0"))
    .replace(/\{RAND(\d+)?\}/g, (_m, size?: string) =>
      randomChars(size === undefined ? 4 : Number.parseInt(size, 10))
    );
  return raw
    .replace(/^[-_\s]+/, "")
    .replace(/[-_\s]+$/, "")
    .replace(/[-_\s]{2,}/g, "-");
}

/** 生成卡密：`QB-XXXX-XXXX-XXXX-XXXX`（旧卡密仍有效；plan 只存数据库） */
export function genKey(prefix: string, _plan?: string): string {
  // 旧签名保留 plan 参数以兼容调用方；新格式不含 plan（plan 存在数据库里）
  void _plan;
  return generateCardKey(prefix);
}

export type CardCheck =
  | { valid: true; activated: boolean }
  | { valid: false; reason: CardInvalidReason };

/** 可用性判定（verify 与 consume 共用） */
export function checkCardUsable(card: CardRecord, qq: string, now: number): CardCheck {
  if (card.status !== 1) return { valid: false, reason: "revoked" };
  // 已整卡兑换到本站账号的卡密，不再参与按次使用
  if (card.redeemed_at !== 0) return { valid: false, reason: "redeemed" };
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
  // 兑换批次令牌仅服务端内部使用，不对外暴露
  delete clone.redeem_token;
  return clone;
}

/* ================= 账号权益（卡密整卡兑换到 users 表） ================= */

/**
 * 由「权益结构」（camelCase，内部与前端使用）组装成对外视图
 * 注意：redeem 接口返回的就是这种结构，字段名必须与 DB 行区分开，
 * 否则会出现「DB 里存对了、响应里全是 0」的字段错配 bug
 */
export function planView(
  p: { plan: string; expiresAt: number; quota: number; used: number },
  now: number
): UserPlan {
  const expiresAt = Number(p.expiresAt ?? 0);
  const quota = Number(p.quota ?? 0);
  const used = Number(p.used ?? 0);
  const active = expiresAt > 0 && expiresAt >= now && (quota === 0 || used < quota);
  return {
    plan: String(p.plan ?? "free"),
    expiresAt,
    quota,
    used,
    active,
    remainingDays: expiresAt > now ? Math.ceil((expiresAt - now) / 86400) : 0,
  };
}

/** 由 users 表的 plan_* 字段（snake_case）组装成对外的权益视图 */
export function toUserPlan(
  user: {
    plan?: string;
    plan_expires_at?: number;
    plan_quota?: number;
    plan_used?: number;
  },
  now: number
): UserPlan {
  return planView(
    {
      plan: String(user.plan ?? "free"),
      expiresAt: Number(user.plan_expires_at ?? 0),
      quota: Number(user.plan_quota ?? 0),
      used: Number(user.plan_used ?? 0),
    },
    now
  );
}

/**
 * 把一张卡密的权益叠加到账号上（纯函数）
 * - 套餐名：以卡密为准
 * - 到期时间：从「当前到期时间与现在的较晚者」往后加 days 天（支持续期叠加）
 * - 次数：**首次兑换**直接用卡密次数；已有生效权益时，任一方为 0（不限）则整体不限，否则相加
 *   （注意不能只看 quota === 0，因为「未激活」时 quota 也是 0，那会把首次兑换误判成不限次数）
 */
export function mergePlan(
  current: { plan: string; expiresAt: number; quota: number; used: number },
  card: CardRecord,
  now: number
): { plan: string; expiresAt: number; quota: number; used: number } {
  const hasActivePlan = current.expiresAt > 0;
  const quota = !hasActivePlan
    ? card.quota
    : current.quota === 0 || card.quota === 0
      ? 0
      : current.quota + card.quota;
  return {
    plan: card.plan,
    expiresAt: Math.max(now, current.expiresAt) + card.days * 86400,
    quota,
    used: current.used,
  };
}
