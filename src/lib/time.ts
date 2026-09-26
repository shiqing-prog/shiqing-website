/**
 * 统一时间格式化（固定使用中国时区）
 *
 * 为什么不能用 Date 的本地 getter：
 * 生产环境跑在 Cloudflare Workers 上，运行时是 UTC（无 TZ 配置），
 * 直接 `d.getHours()` 得到的是 UTC 小时，界面上的时间会比北京时间**少 8 小时**；
 * 而本地开发机（UTC+8）显示正常，导致这个 bug 很难在开发期发现。
 */

const TZ = "Asia/Shanghai";

function partsOf(iso: string): Record<string, string> {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return {};
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** `YYYY-MM-DD HH:mm`（中国时区） */
export function fmtDateTime(iso: string): string {
  const p = partsOf(iso);
  if (!p.year) return "";
  // 部分环境下午夜会格式化为 24 时，这里统一成 00
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}`;
}

/** `YYYY-MM-DD`（中国时区） */
export function fmtDate(iso: string): string {
  const p = partsOf(iso);
  if (!p.year) return "";
  return `${p.year}-${p.month}-${p.day}`;
}

/** 聊天时间：中国时区下的「今天」只显示 `HH:mm`，否则 `MM-DD HH:mm` */
export function fmtChatTime(iso: string, now: Date = new Date()): string {
  const p = partsOf(iso);
  if (!p.year) return "";
  const n = partsOf(now.toISOString());
  const hour = p.hour === "24" ? "00" : p.hour;
  const hm = `${hour}:${p.minute}`;
  const sameDay = p.year === n.year && p.month === n.month && p.day === n.day;
  return sameDay ? hm : `${p.month}-${p.day} ${hm}`;
}
