"use client";

import { useEffect, useState } from "react";

export default function WallpaperTool() {
  const [data, setData] = useState<{ url: string; title: string; copyright: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallpaper")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.url) setData(d);
        else if (!cancelled && d.error) setError(d.error);
      })
      .catch(() => {
        if (!cancelled) setError("获取壁纸失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">每日壁纸</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        微软必应每日壁纸（API 实时获取，每天更新）。
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="mt-4 text-sm text-gray-500">加载中…</p>}

      {data && (
        <div className="mt-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.url}
              alt={data.title}
              className="h-56 w-full object-cover"
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{data.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{data.copyright}</p>
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            查看原图
          </a>
        </div>
      )}
    </div>
  );
}
