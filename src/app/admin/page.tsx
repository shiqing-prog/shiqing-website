"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProjectManager from "./ProjectManager";
import PostManager from "./PostManager";
import BbsManager from "./BbsManager";

type Tab = "projects" | "posts" | "bbs";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("projects");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-500">
        验证权限中…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-2xl">🔒</p>
        <h1 className="mt-3 text-xl font-bold">无权访问</h1>
        <p className="mt-2 text-sm text-gray-500">
          此页面仅限管理员使用。
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">内容管理后台</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        仅管理员可见。项目/博客数据保存在 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">data/</code>{" "}
        目录的 JSON 文件中。
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {(
          [
            ["bbs", "论坛管理"],
            ["projects", "项目管理"],
            ["posts", "文章管理"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "projects" && <ProjectManager />}
        {tab === "posts" && <PostManager />}
        {tab === "bbs" && <BbsManager />}
      </div>
    </div>
  );
}

export function useList<T>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("加载失败");
      setItems((await res.json()) as T[]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("加载失败");
        const data = (await res.json()) as T[];
        if (!cancelled) {
          setItems(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { items, setItems, loading, error, refresh };
}

export const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
export const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50";
export const btnGhost =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";
export const btnDanger =
  "rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950";
