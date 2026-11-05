import type { ActivityDay } from "@/lib/types";

/**
 * 贡献热力图（GitHub 风格）
 *
 * 纯服务端组件：数据由页面用 db.userActivity(userId, 365) 取好传进来。
 * 日期统一按 UTC+8 归日（与 userActivity 的 SQL 对齐），不然 Worker(UTC)
 * 上算出来的格子会整体偏一天。
 */

const DAY_MS = 86_400_000;

/** 把时刻按 UTC+8 归到 YYYY-MM-DD */
function cstDay(ms: number): string {
  return new Date(ms + 8 * 3600_000).toISOString().slice(0, 10);
}

function levelOf(total: number): number {
  if (total <= 0) return 0;
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 9) return 3;
  return 4;
}

const LEVEL_CLS = [
  "bg-gray-100 dark:bg-gray-800",
  "bg-blue-200 dark:bg-blue-950",
  "bg-blue-400 dark:bg-blue-800",
  "bg-blue-600 dark:bg-blue-600",
  "bg-blue-800 dark:bg-blue-400",
];

export default function ActivityHeatmap({
  days,
  weeks = 52,
}: {
  days: ActivityDay[];
  weeks?: number;
}) {
  const map = new Map<string, ActivityDay>();
  for (const d of days) map.set(d.day, d);

  const today = Date.now();
  const total = weeks * 7;
  // 从 (today - total + 1) 天开始，顺序排，每 7 天成一列
  const start = today - (total - 1) * DAY_MS;
  const cells: { day: string; posts: number; replies: number; signins: number; sum: number }[] = [];
  for (let i = 0; i < total; i++) {
    const day = cstDay(start + i * DAY_MS);
    const hit = map.get(day);
    const posts = hit?.posts ?? 0;
    const replies = hit?.replies ?? 0;
    const signins = hit?.signins ?? 0;
    cells.push({ day, posts, replies, signins, sum: posts + replies + signins });
  }

  const activeDays = cells.filter((c) => c.sum > 0).length;

  return (
    <div className="kratos-card mt-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">近一年活跃度</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {activeDays} 天有动静 · 共 {cells.length} 天
        </p>
      </div>

      <div
        className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto pb-1"
        style={{ gridAutoColumns: "minmax(0, 1fr)" }}
      >
        {cells.map((c) => (
          <div
            key={c.day}
            title={`${c.day} · ${c.posts} 帖 / ${c.replies} 回复 / ${c.signins} 签到`}
            className={`h-3 w-3 rounded-[1px] ${LEVEL_CLS[levelOf(c.sum)]}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-gray-400">
        <span className="mr-1">少</span>
        {LEVEL_CLS.map((cls, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[1px] ${cls}`} />
        ))}
        <span className="ml-1">多</span>
      </div>
    </div>
  );
}
