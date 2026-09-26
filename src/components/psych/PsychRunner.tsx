"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LevelKey, PsychResult } from "@/lib/psych/types";
import { DISCLAIMER, CRISIS_LINES } from "@/lib/psych/scoring";
import { getScale } from "@/lib/psych/scales";

/** 每页题目数（长量表分页作答，避免一屏几十题） */
const PAGE_SIZE = 5;

const LEVEL_STYLE: Record<LevelKey, string> = {
  good: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200",
  info: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  mild: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  moderate:
    "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
  severe: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
};

const BAR_STYLE: Record<LevelKey, string> = {
  good: "from-emerald-500 to-green-500",
  info: "from-sky-500 to-blue-500",
  mild: "from-amber-400 to-yellow-500",
  moderate: "from-orange-500 to-amber-500",
  severe: "from-rose-500 to-red-600",
};

export default function PsychRunner({ slug }: { slug: string }) {
  const scale = getScale(slug);
  const [answers, setAnswers] = useState<number[]>(() =>
    scale ? new Array(scale.questions.length).fill(-1) : []
  );
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PsychResult | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "need-login" | "error">(
    "idle"
  );
  const [saveMsg, setSaveMsg] = useState("");

  const total = scale?.questions.length ?? 0;
  const answered = answers.filter((a) => a >= 0).length;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const pageQuestions = useMemo(() => {
    if (!scale) return [];
    return scale.questions
      .map((q, i) => ({ q, i }))
      .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [scale, page]);

  if (!scale) {
    return (
      <div className="kratos-card p-8 text-center text-gray-500">
        量表不存在或已下线。<Link href="/psych" className="text-blue-600 hover:underline">返回测评列表</Link>
      </div>
    );
  }

  function choose(qIndex: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = value;
      return next;
    });
    // 本页最后一题作答后自动翻到下一页
    const lastIndexOfPage = Math.min((page + 1) * PAGE_SIZE, total) - 1;
    if (qIndex === lastIndexOfPage && page < pages - 1) {
      setTimeout(() => setPage((p) => Math.min(p + 1, pages - 1)), 240);
    }
  }

  function submit() {
    setResult(scale!.score(answers));
    setSaveState("idle");
    setSaveMsg("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function restart() {
    setAnswers(new Array(total).fill(-1));
    setPage(0);
    setResult(null);
    setSaveState("idle");
    setSaveMsg("");
  }

  async function save() {
    setSaveState("saving");
    setSaveMsg("");
    try {
      const res = await fetch("/api/psych/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: scale!.slug, answers }),
      });
      if (res.status === 401) {
        setSaveState("need-login");
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "保存失败");
      setSaveState("saved");
      setSaveMsg("已保存到我的测评记录");
    } catch (err) {
      setSaveState("error");
      setSaveMsg(err instanceof Error ? err.message : "保存失败");
    }
  }

  /* ---------- 结果页 ---------- */
  if (result) {
    const crisis = scale.crisis?.(answers) ?? null;
    return (
      <div className="flex flex-col gap-4">
        {/* 危机提示：优先于分数展示 */}
        {crisis && (
          <div className="rounded-xl border-2 border-red-500 bg-red-50 p-5 dark:border-red-700 dark:bg-red-950/50">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              🆘 请先看这里
            </p>
            <p className="mt-2 text-sm leading-relaxed text-red-800 dark:text-red-200">
              {crisis}
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-red-800 dark:text-red-200">
              {CRISIS_LINES.map((l) => (
                <li key={l}>· {l}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={`rounded-xl border p-6 ${LEVEL_STYLE[result.levelKey]}`}>
          <p className="text-xs opacity-70">测评结果</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            {!result.hideScore && (
              <>
                <span className="text-3xl font-bold">{result.total}</span>
                <span className="text-sm opacity-80">/ {result.max} 分</span>
              </>
            )}
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium dark:bg-black/30">
              {result.level}
            </span>
          </div>
          {result.typeCode && (
            <p className="mt-2 text-2xl font-bold tracking-wide">
              {result.typeCode}
              {result.typeName && <span className="ml-2 text-base">· {result.typeName}</span>}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed">{result.summary}</p>
        </div>

        {result.typeDesc && (
          <div className="kratos-card p-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            {result.typeDesc}
          </div>
        )}

        {result.breakdown && result.breakdown.length > 0 && (
          <div className="kratos-card p-5">
            <h2 className="text-sm font-bold">各维度得分</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {result.breakdown.map((b) => (
                <li key={b.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-200">{b.label}</span>
                    <span className="text-xs text-gray-500">
                      {b.value} / {b.max}
                      {b.note ? ` · ${b.note}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${BAR_STYLE[result.levelKey]}`}
                      style={{ width: `${b.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.extra && result.extra.length > 0 && (
          <div className="kratos-card flex flex-wrap gap-x-6 gap-y-2 p-5 text-sm">
            {result.extra.map((e) => (
              <span key={e.label} className="text-gray-600 dark:text-gray-300">
                {e.label}：<b>{e.value}</b>
              </span>
            ))}
          </div>
        )}

        <div className="kratos-card p-5">
          <h2 className="text-sm font-bold">可以参考的建议</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            {result.advice.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500">·</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠️ {DISCLAIMER}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saveState === "saved" ? (
            <span className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
              ✅ {saveMsg}
            </span>
          ) : saveState === "need-login" ? (
            <Link
              href={`/login?next=/psych/${scale.slug}`}
              className="btn-grad px-4 py-2 text-sm"
            >
              登录后保存结果
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saveState === "saving"}
              className="btn-grad px-4 py-2 text-sm disabled:opacity-50"
            >
              {saveState === "saving" ? "保存中…" : "💾 保存到我的记录"}
            </button>
          )}
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            🔄 重新测试
          </button>
          <Link
            href="/psych/history"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            📚 我的测评记录
          </Link>
          {saveState === "error" && (
            <span className="text-sm text-red-600">{saveMsg}</span>
          )}
        </div>

        <div className="kratos-card p-5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-600 dark:text-gray-300">量表来源与许可</p>
          <p className="mt-1">
            {scale.source.name} ——{" "}
            <a
              href={scale.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {scale.source.url}
            </a>
          </p>
          <p className="mt-1">许可：{scale.source.license}</p>
          {scale.source.note && <p className="mt-1">{scale.source.note}</p>}
        </div>
      </div>
    );
  }

  /* ---------- 作答页 ---------- */
  const progress = Math.round((answered / total) * 100);
  const allAnswered = answered === total;

  return (
    <div className="flex flex-col gap-4">
      <div className="kratos-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            已作答 <b>{answered}</b> / {total} 题
          </span>
          <span className="text-xs text-gray-400">
            第 {page + 1} / {pages} 页
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {pageQuestions.map(({ q, i }) => (
          <li key={i} className="kratos-card p-5">
            <p className="text-sm font-medium leading-relaxed">
              {i + 1}. {q.text}
              {q.reverse && (
                <span className="ml-1 align-middle text-[10px] text-gray-400">（反向计分）</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {scale.options.map((o) => {
                const active = answers[i] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => choose(i, o.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          ← 上一页
        </button>
        <div className="flex gap-2">
          {page < pages - 1 ? (
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, pages - 1))}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              下一页 →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!allAnswered}
              className="btn-grad px-5 py-2 text-sm disabled:opacity-50"
            >
              {allAnswered ? "查看结果" : `还有 ${total - answered} 题未答`}
            </button>
          )}
        </div>
      </div>

      {!allAnswered && page < pages - 1 && (
        <p className="text-center text-xs text-gray-400">
          提示：全部 {total} 题作答完成后即可查看结果
        </p>
      )}
    </div>
  );
}
