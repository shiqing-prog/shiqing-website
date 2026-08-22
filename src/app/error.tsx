"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">⚠️</p>
      <h1 className="mt-4 text-2xl font-bold">页面出错了</h1>
      <p className="mt-2 text-sm text-gray-500">加载过程中发生了一点问题。</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重试
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
