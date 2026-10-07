import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./data";
import { getChangelog } from "./content";

export type HealthState = "operational" | "degraded" | "down";

export interface StatusCheck {
  id: string;
  name: string;
  group: "core" | "external";
  status: HealthState;
  latencyMs: number | null;
  detail: string;
}

export interface StatusReport {
  overall: HealthState;
  checkedAt: string;
  version: string;
  checks: StatusCheck[];
  env: { verifyEmail: boolean; fileBase: string; mailerBase: string };
}

/** 15 秒内存缓存：避免状态页自动刷新 / 监控轮询放大对依赖的探测 */
const CACHE_TTL_MS = 15_000;
let cache: { report: StatusReport; at: number } | null = null;

function processEnv(key: string): string | undefined {
  try {
    return typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
}

async function readEnv(): Promise<{ fileBase: string; mailerBase: string; verifyEmail: string }> {
  let cf: Record<string, unknown> = {};
  try {
    const { env } = await getCloudflareContext({ async: true });
    cf = env as unknown as Record<string, unknown>;
  } catch {
    /* 非 Cloudflare 环境（本地/构建期） */
  }
  const pick = (key: string, fallback: string): string => {
    const v = cf[key];
    if (typeof v === "string" && v) return v;
    return processEnv(key) ?? fallback;
  };
  return {
    fileBase: pick("FILE_PUBLIC_BASE", "https://files.shiqing.site"),
    mailerBase: pick("MAILER_BASE", "https://mail.shiqing.site"),
    verifyEmail: pick("VERIFY_EMAIL", "false"),
  };
}

interface FetchOutcome {
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
}

async function timedFetch(url: string, timeoutMs = 6000): Promise<FetchOutcome> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    return { ok: res.ok, statusCode: res.status, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      statusCode: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "请求失败",
    };
  } finally {
    clearTimeout(timer);
  }
}

function detailOf(r: FetchOutcome): string {
  if (r.ok) return "健康检查通过";
  return r.error ? `请求失败：${r.error}` : `HTTP ${r.statusCode}`;
}

/** 执行一轮完整健康检查（默认带 15 秒缓存；force=true 强制刷新） */
export async function checkStatus(force = false): Promise<StatusReport> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.report;

  const env = await readEnv();
  const fileBase = env.fileBase.replace(/\/$/, "");
  const mailerBase = env.mailerBase.replace(/\/$/, "");
  const version = getChangelog()[0]?.version ?? "unknown";

  const checks: StatusCheck[] = [
    {
      id: "web",
      name: "站点应用（Next.js / Cloudflare Workers）",
      group: "core",
      status: "operational",
      latencyMs: 0,
      detail: "正在响应本次请求",
    },
  ];

  // D1：真实查询一次
  {
    const start = Date.now();
    try {
      const db = await getDb();
      await db.getSiteStats();
      checks.push({
        id: "d1",
        name: "数据库（Cloudflare D1）",
        group: "core",
        status: "operational",
        latencyMs: Date.now() - start,
        detail: "查询正常",
      });
    } catch (err) {
      checks.push({
        id: "d1",
        name: "数据库（Cloudflare D1）",
        group: "core",
        status: "down",
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : "查询失败",
      });
    }
  }

  const [files, mail, bing, hitokoto] = await Promise.all([
    timedFetch(`${fileBase}/health`),
    timedFetch(`${mailerBase}/health`),
    timedFetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1"),
    timedFetch("https://v1.hitokoto.cn/?encode=json"),
  ]);

  checks.push({
    id: "files",
    name: "文件库（files.shiqing.site）",
    group: "core",
    status: files.ok ? "operational" : "down",
    latencyMs: files.latencyMs,
    detail: detailOf(files),
  });
  checks.push({
    id: "mail",
    name: "邮件中继（mail.shiqing.site）",
    group: "core",
    status: mail.ok ? "operational" : "down",
    latencyMs: mail.latencyMs,
    detail: detailOf(mail),
  });
  checks.push({
    id: "bing",
    name: "Bing 每日壁纸（外部）",
    group: "external",
    status: bing.ok ? "operational" : "degraded",
    latencyMs: bing.latencyMs,
    detail: bing.ok ? "可访问" : detailOf(bing),
  });
  checks.push({
    id: "hitokoto",
    name: "一言 API（外部）",
    group: "external",
    status: hitokoto.ok ? "operational" : "degraded",
    latencyMs: hitokoto.latencyMs,
    detail: hitokoto.ok ? "可访问" : detailOf(hitokoto),
  });

  const coreDown = checks.some((c) => c.group === "core" && c.status === "down");
  const anyAbnormal = checks.some((c) => c.status !== "operational");
  const overall: HealthState = coreDown ? "down" : anyAbnormal ? "degraded" : "operational";

  const report: StatusReport = {
    overall,
    checkedAt: new Date().toISOString(),
    version,
    checks,
    env: { verifyEmail: env.verifyEmail === "true", fileBase, mailerBase },
  };
  cache = { report, at: Date.now() };
  return report;
}
