import type { Metadata } from "next";
import Link from "next/link";
import UsagePanel from "./UsagePanel";

export const metadata: Metadata = {
  title: "开发者用量查询 - ShiQing 时倾",
  description: "粘贴卡密或 sk_ 令牌，查今天调用了多少次、还剩多少配额。",
  alternates: { canonical: "https://shiqing.site/developers/usage" },
};

export default function UsagePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/developers" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 回到开发者 API
      </Link>
      <h1 className="mt-4 section-title text-2xl">用量查询</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        贴上卡密或 <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">sk_</code>{" "}
        令牌，就能看到今天已经调用了多少次、还剩多少额度。每天 00:00（北京时间）重置。
      </p>
      <UsagePanel />
    </div>
  );
}
