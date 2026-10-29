/**
 * 短链接的纯函数工具：目标地址归一化、短码校验与生成。
 *
 * 这里的东西不碰数据库，方便单测与在 route handler / 客户端之间复用。
 */

/** 短码长度下限 */
export const MIN_CODE_LEN = 4;
/** 短码长度上限 */
export const MAX_CODE_LEN = 32;
/** 目标地址最大长度 */
export const MAX_URL_LEN = 2000;

const CODE_RE = /^[A-Za-z0-9_-]+$/;
/** 带协议头的绝对地址（scheme 任意，下一步会只放行 http/https） */
const HAS_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/** 本站在使用的域名：指向本站 /s/ 的短链要挡掉，否则可能自己跳自己 */
const SELF_HOSTS = new Set(["shiqing.site", "www.shiqing.site"]);

/**
 * 把用户输入的目标地址归一化成绝对 URL。
 *
 * - 没有协议头时补 `https://`（「example.com/a」这种最常见的粘贴形态）
 * - 只放行 http / https（挡掉 javascript:、data: 之类的伪协议）
 * - 拒绝带账号密码的 URL（https://user:pass@host 容易被用来伪装域名）
 * - 拒绝指向本站 /s/ 的地址（两层短链互相跳会造成死循环）
 *
 * @returns 归一化后的地址；不合法时返回 null
 */
export function normalizeTarget(raw: string): string | null {
  const input = raw.trim();
  if (!input || input.length > MAX_URL_LEN) return null;

  const withScheme = HAS_SCHEME_RE.test(input) ? input : `https://${input}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return null;
  if (parsed.username || parsed.password) return null;
  if (SELF_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith("/s/")) {
    return null;
  }

  const out = parsed.toString();
  return out.length > MAX_URL_LEN ? null : out;
}

/** 短码是否合法：只允许字母/数字/下划线/短横线，4–32 位 */
export function isValidShortCode(code: string): boolean {
  return (
    code.length >= MIN_CODE_LEN &&
    code.length <= MAX_CODE_LEN &&
    CODE_RE.test(code)
  );
}

/** 随机短码用的字符集（去掉 0/O/1/l/I 之类容易看错的字符） */
const CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * 生成随机短码（默认 7 位，约 57^7 ≈ 1.9e12 种组合）。
 * 用 crypto.getRandomValues 而不是 Math.random：短码可被枚举猜到就等于公开了别人发的链接。
 */
export function randomShortCode(len = 7): string {
  const n = Math.max(MIN_CODE_LEN, Math.min(MAX_CODE_LEN, Math.floor(len)));
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}
