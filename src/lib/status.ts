import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./data";
import { getChangelog } from "./content";
import { recordStatusSamples } from "./status-history";
import { UPSTREAM_PATHS, UPSTREAM_CATEGORIES, findUpstreamRoute } from "./upstream";
import { TOOLS, TOOL_MAP } from "./tools";
import { buildOpenApiSpec } from "./openapi";

export type HealthState = "operational" | "degraded" | "down";

export interface StatusCheck {
  id: string;
  name: string;
  group: "core" | "api" | "external";
  status: HealthState;
  latencyMs: number | null;
  detail: string;
  /** API 检查项的公开地址，页面上可点击 */
  href?: string;
}

export interface StatusReport {
  overall: HealthState;
  checkedAt: string;
  version: string;
  checks: StatusCheck[];
  env: { verifyEmail: boolean; fileBase: string; mailerBase: string };
  api: { dataEndpoints: number; categories: number; tools: number };
}

/** 60 秒内存缓存：与状态页的自动刷新间隔对齐，避免每轮刷新都真探测一遍 */
const CACHE_TTL_MS = 60_000;
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

async function timedFetch(
  url: string,
  timeoutMs = 6000,
  headers?: Record<string, string>,
): Promise<FetchOutcome> {
  // 注意：status 页要等所有探测完成才出 HTML，超时值直接等于最坏情况的等待时间。
  // 自有服务（files/mail）留 4s，第三方（Bing/一言）2.5s 足够——它们挂掉也不该拖慢整页。
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store", headers });
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
    timedFetch(`${fileBase}/health`, 4000),
    timedFetch(`${mailerBase}/health`, 4000),
    timedFetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", 2500),
    timedFetch("https://v1.hitokoto.cn/?encode=json", 2500),
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

  // ---- API 服务 ----
  // 注意：Worker 里 fetch 自己的域名会被同区回环拦成 522，所以内部接口一律做进程内自检，
  // 只有真正的对外依赖（数据源、音乐源、视频中转）才发真实请求，且全部不带卡密。
  const routeCount = UPSTREAM_PATHS.length;
  const sampleRoute = findUpstreamRoute("/misc/weather");
  checks.push({
    id: "api-gateway",
    name: "API 网关（路由 · 鉴权 · 限流）",
    group: "api",
    status: routeCount > 0 && sampleRoute ? "operational" : "down",
    latencyMs: 0,
    detail:
      routeCount > 0 && sampleRoute
        ? `路由表 ${routeCount} 条，卡密鉴权与三档限流已挂载`
        : "路由表为空，网关不可用",
    href: "https://api.shiqing.site/ping",
  });

  const specPaths = Object.keys(buildOpenApiSpec().paths).length;
  checks.push({
    id: "api-openapi",
    name: "OpenAPI 描述文档",
    group: "api",
    status: specPaths > 0 ? "operational" : "down",
    latencyMs: 0,
    detail: specPaths > 0 ? `覆盖 ${specPaths} 个路径，SDK 与文档工具可直接导入` : "规范为空",
    href: "https://api.shiqing.site/openapi.json",
  });

  checks.push({
    id: "api-endpoints",
    name: "接口目录（全部数据接口）",
    group: "api",
    status: routeCount > 0 ? "operational" : "down",
    latencyMs: 0,
    detail: `${routeCount} 个数据接口，分 ${UPSTREAM_CATEGORIES.length} 类`,
    href: "https://api.shiqing.site/endpoints",
  });

  // 工具引擎：真跑一次纯计算工具，验证注册表与执行链路（不涉及网络与凭证）
  {
    const start = Date.now();
    let detail = "";
    let ok = false;
    try {
      const tool = TOOL_MAP["text/stats"];
      if (!tool) throw new Error("工具注册表里找不到 text/stats");
      const out = await tool.run({
        request: null as never,
        params: new URLSearchParams({ text: "澪" }),
        body: null,
      });
      if (!out || typeof out !== "object") throw new Error("工具返回为空");
      ok = true;
      detail = `${TOOLS.length} 个工具，冒烟用例 text/stats 通过`;
    } catch (err) {
      detail = err instanceof Error ? err.message : "工具执行失败";
    }
    checks.push({
      id: "api-tools",
      name: "在线工具引擎",
      group: "api",
      status: ok ? "operational" : "down",
      latencyMs: Date.now() - start,
      detail,
      href: "https://api.shiqing.site/tools",
    });
  }

  // 真实网络探测：数据源、音乐源、视频中转（都不带卡密，不吃额度）
  const dataBase = (processEnv("UPSTREAM_BASE") ?? processEnv("UAPI_BASE") ?? "https://uapis.cn").replace(/\/+$/, "");
  const videoBase = (processEnv("BILI_PROXY_BASE") ?? "https://files.shiqing.site").replace(/\/+$/, "");
  const [dataSrc, musicSrc, videoSrc] = await Promise.all([
    timedFetch(`${dataBase}/api/v1/misc/weather?city=beijing`, 5000),
    timedFetch("https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=test&count=1", 5000),
    timedFetch(`${videoBase}/bili/x/web-interface/view?bvid=BV1TxxC6vEo4`, 6000, {
      "x-bili-key": processEnv("BILI_PROXY_KEY") ?? "",
    }),
  ]);

  const externalProbes: Array<{ id: string; name: string; outcome: FetchOutcome; label: string; href: string }> = [
    { id: "api-data", name: "第三方数据接口（21 类）", outcome: dataSrc, label: "数据源", href: "https://api.shiqing.site/misc/weather" },
    { id: "api-music", name: "音乐接口（网易云 / QQ / 酷狗）", outcome: musicSrc, label: "音乐源", href: "https://api.shiqing.site/music/search" },
    { id: "api-video", name: "视频解析（B 站等 10 个平台）", outcome: videoSrc, label: "视频中转", href: "https://api.shiqing.site/video/parse" },
  ];
  for (const probe of externalProbes) {
    const r = probe.outcome;
    const code = r.statusCode;
    // 需要凭证 / 限流说明对端是活的，只有连不上和 5xx 才算故障
    const reachable = r.ok || code === 401 || code === 402 || code === 403 || code === 429;
    const state: HealthState = reachable ? "operational" : code === 0 || code >= 500 ? "down" : "degraded";
    const detail = r.ok
      ? `${probe.label}可达`
      : reachable
        ? `${probe.label}可达（HTTP ${code}，需凭证或已限流）`
        : `${probe.label}不可达：${r.error ?? `HTTP ${code}`}`;
    checks.push({
      id: probe.id,
      name: probe.name,
      group: "api",
      status: state,
      latencyMs: r.latencyMs,
      detail,
      href: probe.href,
    });
  }

  const coreDown = checks.some((c) => c.group === "core" && c.status === "down");
  const anyAbnormal = checks.some((c) => c.status !== "operational");
  const overall: HealthState = coreDown ? "down" : anyAbnormal ? "degraded" : "operational";

  const report: StatusReport = {
    overall,
    checkedAt: new Date().toISOString(),
    version,
    checks,
    env: { verifyEmail: env.verifyEmail === "true", fileBase, mailerBase },
    api: {
      dataEndpoints: UPSTREAM_PATHS.length,
      categories: UPSTREAM_CATEGORIES.length,
      tools: TOOLS.length,
    },
  };
  // 每轮真实探测顺手落一条历史样本（5 分钟一桶，重复写入被主键挡掉）
  await recordStatusSamples(checks);

  cache = { report, at: Date.now() };
  return report;
}
