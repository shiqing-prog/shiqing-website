"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; label: string; hint?: string; href: string; group: string };

const SHORTCUTS: Item[] = [
  { id: "s-home", label: "首页", href: "/", group: "页面" },
  { id: "s-files", label: "文件库", href: "/files", group: "页面" },
  { id: "s-psych", label: "心理测评", href: "/psych", group: "页面" },
  { id: "s-games", label: "小游戏", href: "/games", group: "页面" },
  { id: "s-tools", label: "工具", href: "/tools", group: "页面" },
  { id: "s-changelog", label: "更新日志", href: "/changelog", group: "页面" },
  { id: "s-links", label: "短链", href: "/links", group: "页面" },
  { id: "s-docs", label: "文档", href: "/docs", group: "页面" },
  { id: "s-bookmarks", label: "稍后读", href: "/bookmarks", group: "我的" },
  { id: "s-favorites", label: "我的收藏", href: "/favorites", group: "我的" },
  { id: "s-following", label: "关注与粉丝", href: "/following", group: "我的" },
  { id: "s-notifications", label: "通知", href: "/notifications", group: "我的" },
  { id: "s-settings", label: "设置", href: "/settings", group: "我的" },
  { id: "s-search", label: "全站搜索", hint: "也可以按 /", href: "/search", group: "我的" },
];

type SearchResp = {
  posts?: { id: string; title: string }[];
  docs?: { slug: string; title: string }[];
  tools?: { name: string; summary: string }[];
  projects?: { id: string; title: string }[];
  tags?: { tag: string; count: number }[];
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchResp>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
    setRemote({});
  }, []);

  // ⌘K / Ctrl+K 开关；单独按 / 也能打开（输入框里除外）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // 输入防抖后调 /api/search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) {
      setRemote({});
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (res.ok) setRemote((await res.json()) as SearchResp);
      } catch {
        /* 面板搜索失败不打扰用户 */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q, open]);

  const items = useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const local = SHORTCUTS.filter(
      (s) => !term || s.label.toLowerCase().includes(term) || s.href.includes(term)
    );
    const hit: Item[] = [];
    for (const p of remote.posts ?? [])
      hit.push({ id: `p-${p.id}`, label: p.title, hint: "帖子", href: `/bbs/post/${p.id}`, group: "站内结果" });
    for (const d of remote.docs ?? [])
      hit.push({ id: `d-${d.slug}`, label: d.title, hint: "文档", href: `/docs/${d.slug}`, group: "站内结果" });
    for (const t of remote.tools ?? [])
      hit.push({ id: `t-${t.name}`, label: t.name, hint: "工具", href: "/tools", group: "站内结果" });
    for (const p of remote.projects ?? [])
      hit.push({ id: `pr-${p.id}`, label: p.title, hint: "项目", href: "/projects", group: "站内结果" });
    for (const t of remote.tags ?? [])
      hit.push({
        id: `tg-${t.tag}`,
        label: `#${t.tag}`,
        hint: `${t.count} 篇`,
        href: `/tags/${encodeURIComponent(t.tag)}`,
        group: "站内结果",
      });
    return [...local, ...hit];
  }, [q, remote]);

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(items.length - 1, 0)));
  }, [items.length]);

  function go(item: Item) {
    close();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) go(item);
    }
  }

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={close}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[2px] border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="搜索页面、帖子、文档、工具…  （Esc 关闭）"
          className="w-full border-b border-gray-100 bg-transparent px-4 py-3 text-sm outline-none dark:border-gray-800"
        />
        <div className="max-h-[55vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              {loading ? "搜索中…" : "没有匹配项"}
            </p>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-4 pb-1 pt-2 text-[10px] uppercase tracking-wider text-gray-400">
                    {item.group}
                  </p>
                )}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                    i === active ? "bg-blue-50 dark:bg-blue-950" : ""
                  }`}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-gray-400">{item.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-gray-800">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
