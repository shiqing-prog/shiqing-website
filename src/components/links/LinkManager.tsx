"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ShortLink } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface LinksResponse {
  links?: ShortLink[];
  total?: number;
  totalClicks?: number;
  quota?: number;
}

/** 短链管理面板：新建、复制、删除、看点击 */
export default function LinkManager() {
  const user = useCurrentUser();

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [quota, setQuota] = useState(200);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [target, setTarget] = useState("");
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [created, setCreated] = useState<ShortLink | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 短链的站点前缀在客户端才知道（本地开发 / 线上域名不同）。
  // 不用 state 存它：SSR 首屏本来就渲染不了列表，等客户端渲染时 window 一定可用。
  const origin =
    typeof window === "undefined" ? "https://shiqing.site" : window.location.origin;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as LinksResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || `加载失败（${res.status}）`);
      setLinks(data.links ?? []);
      setQuota(data.quota ?? 200);
      setTotalClicks(data.totalClicks ?? 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, load]);

  const shortUrl = (code: string) => `${origin}/s/${code}`;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => {
        setCopied((cur) => (cur === key ? null : cur));
      }, 1600);
    } catch {
      setCreateError("复制失败，请手动选中链接复制");
    }
  }

  async function create() {
    if (creating) return;
    setCreateError("");
    setCreated(null);
    if (!target.trim()) {
      setCreateError("先粘贴一个链接");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: target,
          code: custom.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        link?: ShortLink;
        error?: string;
      };
      if (!res.ok || !data.link) {
        throw new Error(data.error || `创建失败（${res.status}）`);
      }
      setCreated(data.link);
      setTarget("");
      setCustom("");
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function remove(code: string) {
    if (deleting) return;
    if (!window.confirm(`确定删除短链 /s/${code} 吗？删除后这个短链会变成 404，已经发出去的链接也打不开了。`)) {
      return;
    }
    setDeleting(code);
    setError("");
    try {
      const res = await fetch(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `删除失败（${res.status}）`);
      setLinks((prev) => prev.filter((l) => l.code !== code));
      setTotalClicks((prev) => {
        const gone = links.find((l) => l.code === code);
        return Math.max(0, prev - (gone?.clicks ?? 0));
      });
      if (created?.code === code) setCreated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-2xl">🔗</p>
        <p className="mt-3 text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            登录
          </Link>{" "}
          后创建自己的短链接
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* 新建 */}
      <section className="kratos-card p-5">
        <h2 className="text-lg font-semibold">新建短链</h2>
        <p className="mt-1 text-sm text-gray-500">
          粘贴一个长链接，生成 <span className="font-mono text-gray-700 dark:text-gray-200">{origin}/s/xxxx</span> 这样的短地址。只支持 http / https。
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="https://example.com/一段很长很长的链接"
            className="min-w-0 flex-1 rounded-[2px] border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
            maxLength={2000}
            disabled={creating}
          />
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\s/g, ""))}
            placeholder="自定义短码（可选）"
            className="w-full rounded-[2px] border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-44 dark:border-gray-700 dark:bg-gray-900"
            maxLength={32}
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-[2px] bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "生成中…" : "生成短链"}
          </button>
        </form>
        {createError && (
          <p className="mt-3 rounded-[2px] bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {createError}
          </p>
        )}
        {created && (
          <div className="mt-4 rounded-[2px] border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">创建成功</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={shortUrl(created.code)}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-sm text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                {shortUrl(created.code)}
              </a>
              <button
                type="button"
                onClick={() => void copy(shortUrl(created.code), "created")}
                className="rounded-[2px] border border-green-300 px-2 py-1 text-xs text-green-700 transition hover:bg-green-100 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40"
              >
                {copied === "created" ? "已复制 ✓" : "复制"}
              </button>
            </div>
            <p className="mt-1 break-all text-xs text-gray-500">→ {created.url}</p>
          </div>
        )}
      </section>

      {/* 列表 */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">
            我的短链（{links.length}/{quota}）
          </h2>
          <p className="text-sm text-gray-500">
            累计点击 <span className="font-medium text-gray-700 dark:text-gray-200">{totalClicks.toLocaleString()}</span> 次
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-[2px] bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                void load();
              }}
              className="rounded-[2px] border border-red-300 px-2 py-1 text-xs dark:border-red-800"
            >
              重试
            </button>
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-gray-500">加载中…</p>
        ) : links.length === 0 ? (
          <div className="kratos-card mt-4 p-10 text-center text-gray-500">
            还没有短链，上面粘贴一个链接就能生成
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.code} className="kratos-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={shortUrl(l.code)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                    >
                      /s/{l.code}
                    </a>
                    <span className="text-xs text-gray-400">👁 {l.clicks.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(l.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500" title={l.url}>
                    {l.url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(shortUrl(l.code), l.code)}
                    className="rounded-[2px] border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {copied === l.code ? "已复制 ✓" : "复制"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(l.code)}
                    disabled={deleting === l.code}
                    className="rounded-[2px] border border-red-200 px-2.5 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {deleting === l.code ? "删除中…" : "删除"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
