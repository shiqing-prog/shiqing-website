"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

const FIELDS = [
  { key: "minute", label: "分钟", range: "0-59" },
  { key: "hour", label: "小时", range: "0-23" },
  { key: "dom", label: "日", range: "1-31" },
  { key: "month", label: "月", range: "1-12" },
  { key: "dow", label: "星期", range: "0-6（0=周日）" },
] as const;

/** 解析单个字段为允许值集合（支持通配、范围、步长与逗号列表） */
function parseField(expr: string, min: number, max: number): number[] | null {
  const out = new Set<number>();
  for (const part of expr.split(",")) {
    const seg = part.trim();
    if (!seg) return null;
    const stepMatch = /^(\*|\d+(?:-\d+)?)\/(\d+)$/.exec(seg);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (step <= 0) return null;
      let lo = min;
      let hi = max;
      if (stepMatch[1] !== "*") {
        const [a, b] = stepMatch[1].split("-").map(Number);
        lo = a;
        hi = b;
      }
      if (lo < min || hi > max || lo > hi) return null;
      for (let v = lo; v <= hi; v += step) out.add(v);
      continue;
    }
    if (seg === "*") {
      for (let v = min; v <= max; v++) out.add(v);
      continue;
    }
    const rangeMatch = /^(\d+)-(\d+)$/.exec(seg);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      if (a < min || b > max || a > b) return null;
      for (let v = a; v <= b; v++) out.add(v);
      continue;
    }
    if (!/^\d+$/.test(seg)) return null;
    const v = Number(seg);
    if (v < min || v > max) return null;
    out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

/** 计算接下来 count 次执行时间（从 from 之后开始） */
function nextRuns(expr: string, from: Date, count: number): Date[] | string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return "需要 5 个字段：分 时 日 月 周";
  const ranges: [number, number][] = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 6],
  ];
  const sets = parts.map((p, i) => parseField(p, ranges[i][0], ranges[i][1]));
  const badIndex = sets.findIndex((s) => s === null);
  if (badIndex >= 0) {
    return `第 ${badIndex + 1} 个字段（${FIELDS[badIndex].label}）无法解析，允许范围 ${FIELDS[badIndex].range}`;
  }
  const [minutes, hours, doms, months, dows] = sets as number[][];

  const res: Date[] = [];
  const cur = new Date(from.getTime());
  cur.setSeconds(0, 0);
  cur.setMinutes(cur.getMinutes() + 1);
  // 最多向后扫描 366 天，避免死循环
  for (let i = 0; i < 366 * 24 * 60 && res.length < count; i++) {
    if (
      minutes.includes(cur.getMinutes()) &&
      hours.includes(cur.getHours()) &&
      months.includes(cur.getMonth() + 1) &&
      doms.includes(cur.getDate()) &&
      dows.includes(cur.getDay())
    ) {
      res.push(new Date(cur.getTime()));
    }
    cur.setMinutes(cur.getMinutes() + 1);
  }
  return res;
}

const PRESETS: { label: string; expr: string; desc: string }[] = [
  { label: "每分钟", expr: "* * * * *", desc: "* * * * *" },
  { label: "每 5 分钟", expr: "*/5 * * * *", desc: "*/5 * * * *" },
  { label: "每小时", expr: "0 * * * *", desc: "0 * * * *" },
  { label: "每天 0 点", expr: "0 0 * * *", desc: "0 0 * * *" },
  { label: "每天 9:30", expr: "30 9 * * *", desc: "30 9 * * *" },
  { label: "每周一 8 点", expr: "0 8 * * 1", desc: "0 8 * * 1" },
  { label: "每月 1 号", expr: "0 0 1 * *", desc: "0 0 1 * *" },
  { label: "工作日 9 点", expr: "0 9 * * 1-5", desc: "0 9 * * 1-5" },
];

export default function CronTool() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<Date[]>([]);
  const [error, setError] = useState("");

  function run(value = expr) {
    setError("");
    const result = nextRuns(value, new Date(), 8);
    if (typeof result === "string") {
      setError(result);
      setRuns([]);
      return;
    }
    setRuns(result);
  }

  const fields = expr.trim().split(/\s+/);
  const dowNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  return (
    <div className="kratos-card p-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Cron 表达式（5 段）</span>
        <input
          className={inputCls}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder="*/5 * * * *"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run()}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          解析
        </button>
        {PRESETS.map((p) => (
          <button
            key={p.expr}
            type="button"
            onClick={() => {
              setExpr(p.expr);
              run(p.expr);
            }}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            {p.label}
          </button>
        ))}
      </div>

      {fields.length === 5 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500 dark:text-gray-400">
              <tr>
                {FIELDS.map((f) => (
                  <th key={f.key} className="border-b border-gray-200 py-1.5 pr-3 font-medium dark:border-gray-700">
                    {f.label}
                    <span className="ml-1 font-normal text-gray-400">({f.range})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-mono">
                {fields.map((v, i) => (
                  <td key={i} className="py-1.5 pr-3 text-gray-700 dark:text-gray-200">
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {runs.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            接下来 {runs.length} 次执行时间（本地时区）
          </p>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-gray-700 dark:text-gray-200">
            {runs.map((d) => (
              <li key={d.toISOString()} className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-900">
                {d.getFullYear()}-{String(d.getMonth() + 1).padStart(2, "0")}-
                {String(d.getDate()).padStart(2, "0")}{" "}
                {String(d.getHours()).padStart(2, "0")}:
                {String(d.getMinutes()).padStart(2, "0")} {dowNames[d.getDay()]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        支持 <code>*</code> 任意值、<code>a-b</code> 范围、<code>*/n</code> 步长、
        <code>a,b,c</code> 列表；日与星期同时限定时取「同时满足」（非标准 OR 语义），
        暂不支持 <code>L W #</code> 等扩展语法。
      </p>
    </div>
  );
}
