import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import { getScale, SCALES } from "@/lib/psych/scales";
import PsychRunner from "@/components/psych/PsychRunner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scale = getScale(slug);
  if (!scale) return { title: "量表不存在" };
  return {
    title: `${scale.name} - 心理测评`,
    description: `${scale.subtitle}。${scale.intro[0]?.slice(0, 80) ?? ""}`,
  };
}

export default async function PsychScalePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scale = getScale(slug);
  if (!scale) notFound();

  let count = 0;
  try {
    const db = await getDb();
    count = await db.countPsychResults(slug);
  } catch {
    count = 0;
  }

  const others = SCALES.filter((s) => s.slug !== slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/psych" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 全部测评
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold">{scale.name}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {scale.subtitle}
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
            {scale.questions.length} 题 · ≈{scale.minutes} 分钟
          </span>
          {count > 0 && (
            <span className="ml-2 text-xs text-gray-400">{count} 人次已完成</span>
          )}
        </p>
      </header>

      <div className="kratos-card mt-5 p-5">
        {scale.intro.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed text-gray-700 first:mt-0 mt-2 dark:text-gray-200"
          >
            {p}
          </p>
        ))}
        {scale.notice && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            ⚠️ {scale.notice}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          量表来源：{scale.source.name} ｜ 许可：{scale.source.license}
        </p>
      </div>

      <div className="mt-6">
        <PsychRunner slug={scale.slug} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 border-l-4 border-blue-600 pl-3 text-base font-bold">
          其他测评
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((s) => (
            <Link
              key={s.slug}
              href={`/psych/${s.slug}`}
              className="kratos-card p-4 text-sm transition hover:border-blue-400 dark:hover:border-blue-600"
            >
              <span className="font-medium">{s.name}</span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {s.questions.length} 题 · {s.subtitle}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
