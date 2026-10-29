"use client";

import { fmtChatTime } from "@/lib/time";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conversation, Message } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import UserAvatar from "@/components/UserAvatar";

function fmtTime(iso: string): string {
  // 统一按中国时区显示（同日只显示时分）
  return fmtChatTime(iso);
}

/**
 * 按 id 去重合并两批消息，并按时间正序排列。
 * 轮询只拉最新一页，用户往上翻过的历史必须靠合并保住。
 */
function mergeMessages(a: Message[], b: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return [...map.values()].sort((x, y) =>
    x.created_at === y.created_at
      ? x.id.localeCompare(y.id)
      : x.created_at.localeCompare(y.created_at)
  );
}

export default function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const sp = use(searchParams);
  const router = useRouter();
  const user = useCurrentUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNick, setActiveNick] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  /** 服务端还有更早的消息没拉下来 */
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  /** 消息流容器：用来判断用户是否还贴在底部 */
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef(0);
  const prevActiveRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setConversations(data.conversations ?? []);
    } catch {
      /* 忽略 */
    }
  }, []);

  /**
   * mode="reset"：切换会话，整体替换；
   * mode="merge"：10s 轮询，只把新来的并进已有列表 —— 用户往上翻过的
   * 历史页不会被轮询冲掉（服务端每次只回最新一页）。
   */
  const loadChat = useCallback(
    async (userId: string, mode: "reset" | "merge" = "reset") => {
      try {
        const res = await fetch(`/api/messages/${userId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) return;
        const incoming: Message[] = data.messages ?? [];
        if (mode === "reset") {
          setMessages(incoming);
          setHasMore(Boolean(data.hasMore));
        } else {
          // 轮询不动 hasMore：用户可能已经把历史翻到底了，
          // 服务端每次都说 "还有更早的"（它只看自己那一页），会把按钮又点亮。
          setMessages((prev) => mergeMessages(prev, incoming));
        }
        setActiveNick(data.other?.nickname ?? "");
      } catch {
        /* 忽略 */
      }
    },
    []
  );

  /** 往上翻一页历史 */
  const loadOlder = useCallback(async () => {
    if (!activeId || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const before = messages[0].created_at;
      const res = await fetch(
        `/api/messages/${activeId}?before=${encodeURIComponent(before)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        const older: Message[] = data.messages ?? [];
        setMessages((prev) => mergeMessages(older, prev));
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      /* 忽略 */
    } finally {
      setLoadingOlder(false);
    }
  }, [activeId, loadingOlder, messages]);

  // 初始：加载会话列表；若带 ?to= 直接打开对话（全部在 await 后触发 setState）
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const convs = await fetch("/api/messages", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      let chat: { other?: { nickname: string }; messages?: Message[] } | null = null;
      if (sp.to) {
        chat = await fetch(`/api/messages/${sp.to}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);
      }
      if (cancelled) return;
      if (convs) setConversations(convs.conversations ?? []);
      if (sp.to && chat) {
        setActiveId(sp.to);
        setActiveNick(chat.other?.nickname ?? "");
        setMessages(chat.messages ?? []);
        setHasMore(Boolean((chat as { hasMore?: boolean }).hasMore));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sp.to]);

  // 10s 轮询：会话列表 + 当前对话
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      loadConversations();
      if (activeId) loadChat(activeId, "merge");
    }, 10000);
    return () => clearInterval(timer);
  }, [user, activeId, loadConversations, loadChat]);

  // 新消息自动滚底：只在「切换了会话」或「用户本来就在底部」时滚。
  // 原实现依赖 [messages]，而 10s 轮询每次都用服务端结果整体替换数组（引用必变），
  // 正在向上翻历史的人会被每 10 秒拽回底部。
  useEffect(() => {
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    const switched = prevActiveRef.current !== activeId;
    prevActiveRef.current = activeId;
    if (!switched && !grew) return;
    if (!switched && !stickRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: switched ? "auto" : "smooth" });
  }, [messages, activeId]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            登录
          </Link>{" "}
          后查看私信
        </p>
      </div>
    );
  }

  function openChat(conv: Conversation) {
    setActiveId(conv.userId);
    setActiveNick(conv.nickname);
    loadChat(conv.userId);
    // 路由同步（移动端切换也保持地址可回退）
    router.replace(`/messages?to=${conv.userId}`, { scroll: false });
  }

  async function send() {
    const content = draft.trim();
    if (!content || !activeId) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: activeId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");
      setDraft("");
      setMessages((prev) => [...prev, data]);
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  const activeConv = conversations.find((c) => c.userId === activeId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="section-title text-2xl">私信</h1>

      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ===== 会话列表（移动端在未选中会话时显示） ===== */}
        <div className={activeId ? "hidden lg:block" : "block"}>
          <div className="kratos-card overflow-hidden">
            {conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">还没有会话</p>
            ) : (
              <ul className="flex max-h-[70vh] flex-col overflow-y-auto">
                {conversations.map((c) => (
                  <li key={c.userId}>
                    <button
                      type="button"
                      onClick={() => openChat(c)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        activeId === c.userId ? "bg-blue-50 dark:bg-blue-950/40" : ""
                      }`}
                    >
                      <UserAvatar
                        nickname={c.nickname}
                        avatar={c.avatar}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium">
                            {c.nickname}
                          </span>
                          <span className="shrink-0 text-[10px] text-gray-400">
                            {fmtTime(c.lastAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between">
                          <span className="truncate text-xs text-gray-400">
                            {c.lastContent}
                          </span>
                          {c.unread > 0 && (
                            <span className="ml-2 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {c.unread > 99 ? "99+" : c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== 对话区（移动端在选中会话后显示） ===== */}
        <div className={activeId ? "block" : "hidden lg:block"}>
          <div className="kratos-card flex h-[70vh] flex-col overflow-hidden">
            {/* 会话头 */}
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setActiveId(null);
                  router.replace("/messages", { scroll: false });
                }}
                className="rounded-[2px] px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
              >
                ←
              </button>
              <span className="text-sm font-semibold">
                {activeNick || (activeConv?.nickname ?? "")}
              </span>
            </div>

            {/* 消息流 */}
            <div
              ref={listRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickRef.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 60;
              }}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {hasMore && messages.length > 0 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    disabled={loadingOlder}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                  >
                    {loadingOlder ? "加载中…" : "加载更早的消息"}
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <p className="pt-10 text-center text-sm text-gray-400">
                  打个招呼吧 👋
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-[3px] px-3.5 py-2 text-sm leading-relaxed ${
                          mine
                            ? "rounded-br-sm bg-blue-600 text-white"
                            : "rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            mine ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {fmtTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* 输入区 */}
            <div className="border-t border-gray-100 p-3 dark:border-gray-800">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="输入私信内容，Enter 发送，Shift+Enter 换行"
                  maxLength={2000}
                  className="flex-1 resize-none rounded-[2px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !draft.trim()}
                  className="btn-grad shrink-0 px-5 text-sm"
                >
                  {sending ? "…" : "发送"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
