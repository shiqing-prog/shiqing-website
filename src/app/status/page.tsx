import type { Metadata } from "next";
import Link from "next/link";
import { checkStatus } from "@/lib/status";
import type { HealthState, StatusCheck } from "@/lib/status";
import { getStatusHistory } from "@/lib/status-history";
import { fmtDateTime } from "@/lib/time";
import type { ReactNode } from "react";
import AutoRefresh from "@/components/status/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "服务状态",
  description: "时倾站点各依赖服务与 API 接口的实时健康状态，以及最近 60 天可用率。",
};

const BANNER: Record<HealthState, { grad: string; title: string; sub: string }> = {
  operational: {
    grad: "from-emerald-500 via-emerald-600 to-teal-700",
    title: "站点运行正常",
    sub: "所有服务都在正常工作",
  },
  degraded: {
    grad: "from-amber-500 via-amber-600 to-orange-700",
    title: "部分服务异常",
    sub: "核心服务正常，部分接口或外部依赖受影响",
  },
  down: {
    grad: "from-rose-500 via-rose-600 to-red-700",
    title: "服务出现故障",
    sub: "存在核心服务无法访问",
  },
};

const DOT: Record<HealthState, string> = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

const STATUS_TEXT: Record<HealthState, string> = {
  operational: "正常访问",
  degraded: "响应异常",
  down: "无法访问",
};

/** 最近 n 天的日期（YYYY-MM-DD，按东八区算，和采样 SQL 一致） */
function lastDays(n: number): string[] {
  const out: string[] = [];
  const base = Date.now() + 8 * 3600 * 1000;
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

function Bar({ days, samples }: { days: string[]; samples?: Record<string, { total: number; ok: number }> }) {
  return (
    <div className="mt-3 grid grid-cols-[repeat(60,minmax(0,1fr))] gap-[2px]">
      {days.map((d) => {
        const s = samples?.[d];
        let cls = "bg-gray-200 dark:bg-gray-700";
        let tip = d + " · 无数据";
        if (s && s.total > 0) {
          const rate = s.ok / s.total;
          cls = rate >= 1 ? "bg-green-500" : rate >= 0.9 ? "bg-yellow-400" : "bg-red-500";
          tip = d + " · " + s.ok + "/" + s.total + " 正常";
        }
        return <span key={d} title={tip} className={"h-7 rounded-[2px] " + cls} />;
      })}
    </div>
  );
}

/** 可折叠分组：原生 details，不用 JS，默认展开 */
function Group({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <section className="mt-8">
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer select-none list-none items-center gap-2 marker:hidden">
          <span className="section-title text-base">{title}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {count}
          </span>
          <span className="ml-auto text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    </section>
  );
}

function ServiceRow({
  check,
  days,
  samples,
}: {
  check: StatusCheck;
  days: string[];
  samples?: Record<string, { total: number; ok: number }>;
}) {
  let total = 0;
  let ok = 0;
  for (const d of days) {
    const s = samples?.[d];
    if (!s) continue;
    total += s.total;
    ok += s.ok;
  }
  const rate = total > 0 ? (ok / total) * 100 : null;

  return (
    <div className="kratos-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {check.href ? (
          <a
            href={check.href}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline-offset-2 hover:underline"
          >
            {check.name}
          </a>
        ) : (
          <span className="font-bold">{check.name}</span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          HTTP / 5m
        </span>
        {check.latencyMs !== null && check.latencyMs > 0 && (
          <span className="text-xs tabular-nums text-gray-400">{check.latencyMs} ms</span>
        )}
        <span className="ml-auto flex items-center gap-2 text-sm">
          <span className={"h-2.5 w-2.5 rounded-full " + DOT[check.status]} />
          <span className={check.status === "operational" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {STATUS_TEXT[check.status]}
          </span>
        </span>
      </div>

      <Bar days={days} samples={samples} />

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>{days[0]}</span>
        <span>{rate === null ? "最近 60 天：采样中" : "最近 60 天内可用率 " + rate.toFixed(2) + "%"}</span>
        <span>今日</span>
      </div>

      {check.status !== "operational" && (
        <p className="mt-2 rounded-[2px] bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {check.detail}
        </p>
      )}
    </div>
  );
}

export default async function StatusPage() {
  const [report, history] = await Promise.all([checkStatus(), getStatusHistory(60)]);
  const banner = BANNER[report.overall];
  const days = lastDays(60);
  const core = report.checks.filter((c) => c.group === "core");
  const api = report.checks.filter((c) => c.group === "api");
  const external = report.checks.filter((c) => c.group === "external");
  const overallRate = (() => {
    let total = 0;
    let ok = 0;
    for (const checks of Object.values(history)) {
      for (const d of days) {
        const s = checks[d];
        if (!s) continue;
        total += s.total;
        ok += s.ok;
      }
    }
    return total > 0 ? (ok / total) * 100 : null;
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 返回首页
      </Link>

      <div className={"mt-4 overflow-hidden rounded-[3px] bg-gradient-to-br p-6 text-white shadow-lg sm:p-8 " + banner.grad}>
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
          <h1 className="text-2xl font-bold sm:text-3xl">{banner.title}</h1>
        </div>
        <p className="mt-2 text-sm text-white/80">{banner.sub}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90">
          <span>更新于 {fmtDateTime(report.checkedAt)}</span>
          <span className="text-white/50">|</span>
          <span>v{report.version}</span>
          {overallRate !== null && (
            <>
              <span className="text-white/50">|</span>
              <span>近 60 天可用率 {overallRate.toFixed(2)}%</span>
            </>
          )}
        </p>
        <div className="mt-3">
          <AutoRefresh seconds={60} className="text-xs text-white/90" />
        </div>
      </div>

      <Group title="核心服务" count={core.length}>
        {core.map((c) => (
          <ServiceRow key={c.id} check={c} days={days} samples={history[c.id]} />
        ))}
      </Group>

      <Group title="API 服务" count={api.length}>
        {api.map((c) => (
          <ServiceRow key={c.id} check={c} days={days} samples={history[c.id]} />
        ))}
      </Group>

      <Group title="外部依赖" count={external.length}>
        {external.map((c) => (
          <ServiceRow key={c.id} check={c} days={days} samples={history[c.id]} />
        ))}
      </Group>

      <Group title="环境与配置" count={6} defaultOpen={true}>
        <div className="kratos-card grid gap-3 p-5 text-sm sm:grid-cols-2">
          <p>
            站点版本：<b>v{report.version}</b>
          </p>
          <p>
            邮箱验证：<b>{report.env.verifyEmail ? "已开启" : "未开启"}</b>
          </p>
          <p>
            数据接口：<b>{report.api.dataEndpoints}</b> 个 · {report.api.categories} 类
          </p>
          <p>
            在线工具：<b>{report.api.tools}</b> 个
          </p>
          <p className="truncate">
            文件库：<span className="text-gray-500">{report.env.fileBase}</span>
          </p>
          <p className="truncate">
            邮件中继：<span className="text-gray-500">{report.env.mailerBase}</span>
          </p>
        </div>
      </Group>

      <p className="mt-6 text-center text-xs text-gray-400">
        监控可调用{" "}
        <Link href="/api/status" className="underline-offset-2 hover:underline">
          /api/status
        </Link>{" "}
        获取 JSON · 状态条每格是一天，绿色为全部正常，灰色为当天无采样
        <br />
        采样在有人访问本页时进行（1 分钟缓存），无人访问的时段不计入可用率，因此 100% 表示「已采样的时段全部正常」，不是 7×24 独立探活
        <br />
        API 探针不带凭证：命中 401 / 429 说明路由与网关正常，同时不会消耗卡密额度
      </p>
    </div>
  );
}
