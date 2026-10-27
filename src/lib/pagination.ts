/**
 * 分页参数解析。
 *
 * 为什么单独抽出来：原来的写法 `Math.max(Number(x ?? 1) || 1, 1)` 挡不住两类输入——
 *
 * 1. 小数：`page=2.3` 会算出 `OFFSET 26.000000000000004`，SQLite 直接抛
 *    `datatype mismatch`，线上 `/api/posts?page=2.3` 可复现 500。
 * 2. 非有限数：`Number("Infinity")` 是 Infinity，而 `Infinity || 1` 仍然是 Infinity，
 *    兜底失效，OFFSET 变成 Infinity 同样报错。
 *
 * 分页参数是纯外部输入，任何人改一下 URL 就能让列表页出事，所以入口一律走这里。
 */

/** 页码：正整数，非法输入回落 fallback（默认 1）。 */
export function parsePage(raw: string | null | undefined, fallback = 1): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/** 页大小：正整数并夹到 [1, max]，非法输入回落 fallback（默认 20）。 */
export function parsePageSize(
  raw: string | null | undefined,
  fallback = 20,
  max = 50
): number {
  const n = Math.floor(Number(raw));
  const size = Number.isFinite(n) && n >= 1 ? n : fallback;
  return Math.min(Math.max(size, 1), Math.max(max, 1));
}
