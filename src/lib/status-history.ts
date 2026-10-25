import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Statement = {
  bind(...args: unknown[]): D1Statement;
  all(): Promise<{ results: unknown[] }>;
};

type D1Database = {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};

type SampleInput = { id: string; status: string; latencyMs: number | null };

async function d1(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as unknown as { dsh_bbs?: D1Database }).dsh_bbs;
    return db ?? null;
  } catch {
    return null;
  }
}

/** 5 分钟一个采样桶：同一服务同一桶只写一条，页面刷新不会放大写入量 */
const BUCKET_SECONDS = 300;

/** 记录一轮探测结果。任何异常都静默忽略——采样不该影响状态页本身。 */
export async function recordStatusSamples(checks: SampleInput[]): Promise<void> {
  const db = await d1();
  if (!db || checks.length === 0) return;
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / BUCKET_SECONDS);
  try {
    const stmts = checks.map((c) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO status_samples (service, bucket, ts, ok, latency_ms) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(c.id, bucket, now, c.status === "operational" ? 1 : 0, c.latencyMs ?? 0),
    );
    await db.batch(stmts);
  } catch {
    /* 表还没建、D1 抖动等都不影响页面 */
  }
}

export interface StatusDaySample {
  date: string;
  total: number;
  ok: number;
  avgLatency: number;
}

export type StatusHistory = Record<string, Record<string, StatusDaySample>>;

/** 按天聚合每个服务的可用情况（时区固定 +8，和站点受众一致）。 */
export async function getStatusHistory(days = 60): Promise<StatusHistory> {
  const db = await d1();
  if (!db) return {};
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  try {
    const { results } = await db
      .prepare(
        "SELECT service, date(ts, 'unixepoch', '+8 hours') AS d, COUNT(*) AS n, SUM(ok) AS ok, AVG(latency_ms) AS lat FROM status_samples WHERE ts >= ? GROUP BY service, d",
      )
      .bind(since)
      .all();
    const out: StatusHistory = {};
    for (const row of results as Array<Record<string, unknown>>) {
      const service = String(row.service);
      const date = String(row.d);
      const perService = out[service] ?? {};
      perService[date] = {
        date,
        total: Number(row.n ?? 0),
        ok: Number(row.ok ?? 0),
        avgLatency: Math.round(Number(row.lat ?? 0)),
      };
      out[service] = perService;
    }
    return out;
  } catch {
    return {};
  }
}

