import type { Metadata } from "next";
import Link from "next/link";
import { checkStatus } from "@/lib/status";
import type { HealthState, StatusCheck } from "@/lib/status";
import { fmtDateTime } from "@/lib/time";
import AutoRefresh from "@/components/status/AutoRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "服务状态",
  description: "时倾站点各依赖服务的实时健康状态。",
};

const META: Record<
  HealthState,
  { label: string; dot: string; badge: string; banner: string; title: string }
> = {
  operational: {
    label: "正常",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    banner:
      "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40",
    title: "所有服务运行正常",
  },
  degraded: {
    label: "部分异常",
    dot: "bg-yellow-500",
    badge:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    banner:
      "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40",
    title: "核心服务正常，部分外部依赖异常",
  },
  down: {
    label: "故障",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    banner: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
    title: "存在核心服务故障",
  },
};

function CheckList({ title, checks }: { title: string; checks: StatusCheck[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 border-l-4 border-blue-600 pl-3 text-base font-bold">
        {title}
      </h2>
      <ul className="kratos-card divide-y divide-gray-100 overflow-hidden dark:divide-gray-800">
        {checks.map((c) => {
          const m = META[c.status];
          return (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${m.dot}`} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span
                className="hidden max-w-[40%] truncate text-xs text-gray-400 sm:inline"
                title={c.detail}
              >
                {c.detail}
              </span>
              {c.latencyMs !== null && c.latencyMs > 0 && (
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {c.latencyMs} ms
                </span>
              )}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.badge}`}
              >
                {m.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function StatusPage() {
  const report = await checkStatus();
  const meta = META[report.overall];
  const core = report.checks.filter((c) => c.group === "core");
  const external = report.checks.filter((c) => c.group === "external");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">
          🩺 服务状态
        </h1>
        <AutoRefresh seconds={30} />
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        实时检查站点自身、数据库与各依赖服务；最后检查{" "}
        {fmtDateTime(report.checkedAt)}。
      </p>

      <div
        className={`mt-5 flex items-center gap-3 rounded-xl border p-5 ${meta.banner}`}
      >
        <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${meta.dot}`} />
        <div>
          <p className="font-bold">{meta.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            总体状态：{meta.label} · 站点版本 v{report.version}
          </p>
        </div>
      </div>

      <CheckList title="核心服务" checks={core} />
      <CheckList title="外部依赖" checks={external} />

      <section className="mt-6">
        <h2 className="mb-3 border-l-4 border-blue-600 pl-3 text-base font-bold">
          环境与配置
        </h2>
        <div className="kratos-card grid gap-3 p-5 text-sm sm:grid-cols-2">
          <p>
            站点版本：<b>v{report.version}</b>
          </p>
          <p>
            邮箱验证：<b>{report.env.verifyEmail ? "已开启" : "未开启"}</b>
          </p>
          <p className="truncate">
            文件库：<span className="text-gray-500">{report.env.fileBase}</span>
          </p>
          <p className="truncate">
            邮件中继：<span className="text-gray-500">{report.env.mailerBase}</span>
          </p>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-gray-400">
        监控可调用{" "}
        <Link href="/api/status" className="underline-offset-2 hover:underline">
          /api/status
        </Link>{" "}
        获取 JSON
      </p>
    </div>
  );
}
