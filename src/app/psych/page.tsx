import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/data";
import { scaleMeta } from "@/lib/psych/scales";
import { DISCLAIMER } from "@/lib/psych/scoring";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "心理测评",
  description:
    "免费在线心理测评：抑郁（PHQ-9）、焦虑（GAD-7）、DASS-21、大五人格、16 型人格、职业兴趣、压力与幸福感量表，本地计分、支持保存记录。",
};

const CATEGORY_ICON: Record<string, string> = {
  情绪: "🌧️",
  人格: "🧬",
  健康: "🌱",
  关系: "🤝",
  压力: "⚡",
  职业: "🧭",
};

export default async function PsychIndexPage() {
  const scales = scaleMeta();
  const db = await getDb();

  // 各量表参与人次（全站统计，失败不影响页面）
  let counts: Record<string, number> = {};
  let totalCount = 0;
  try {
    counts = await db.psychCountsByScale();
    totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  } catch {
    counts = {};
  }

  const groups = new Map<string, typeof scales>();
  for (const s of scales) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">🧠 心理测评</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        收录 {scales.length} 个国际通用的心理学量表，全部在浏览器本地计分，可匿名使用；
        登录后可以把结果保存成记录，方便日后对比自己的变化。
        {totalCount > 0 && (
          <span className="ml-1 text-xs text-gray-400">
            （全站已累计完成 {totalCount} 次测评）
          </span>
        )}
      </p>

      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        ⚠️ {DISCLAIMER}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/psych/history" className="btn-grad px-4 py-2">
          📚 我的测评记录
        </Link>
        <Link
          href="/stats"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          📊 站点统计
        </Link>
      </div>

      {[...groups.entries()].map(([category, list]) => (
        <section key={category} className="mt-9">
          <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
            {CATEGORY_ICON[category] ?? "🔹"} {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((s) => (
              <Link
                key={s.slug}
                href={`/psych/${s.slug}`}
                className="kratos-card flex flex-col p-5 transition hover:border-blue-400 dark:hover:border-blue-600"
              >
                <h3 className="font-bold">{s.name}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {s.subtitle}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                    {s.questions} 题
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                    ≈{s.minutes} 分钟
                  </span>
                  {s.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-gray-400">
                      #{t}
                    </span>
                  ))}
                  {counts[s.slug] > 0 && (
                    <span className="ml-auto text-gray-400">
                      {counts[s.slug]} 人次
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="mb-3 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          怎么用这些结果
        </h2>
        <ul className="kratos-card flex flex-col gap-2 p-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
          <li>· 量表反映的是「最近一段时间」的状态，状态会变，分数也会变，不必把一次结果当成标签。</li>
          <li>· 请按第一感觉作答，不要反复推敲「应该选哪个」——那测的是你希望成为的样子。</li>
          <li>· 建议间隔 2-4 周复测并对比记录，趋势比单次分数更有意义。</li>
          <li>· 分数偏高请当作「该关注一下自己」的提醒，而不是诊断结论。</li>
        </ul>
      </section>

      <p className="mt-10 text-center text-xs text-gray-400">
        <Link href="/" className="hover:underline">
          ← 返回首页
        </Link>
      </p>
    </div>
  );
}
