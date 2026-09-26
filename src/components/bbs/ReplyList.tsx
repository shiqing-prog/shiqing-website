"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Reply } from "@/lib/types";
import ReplyBox from "./ReplyBox";
import EditReplyButton from "./EditReplyButton";
import DeleteReplyButton from "./DeleteReplyButton";
import { renderMarkdown } from "@/lib/markdown";
import { useCurrentUser } from "@/lib/useCurrentUser";
import UserAvatar from "../UserAvatar";

/** 回复正文的紧凑 Markdown 容器（段落/代码/链接紧凑样式） */
const replyHtmlCls =
  "text-sm leading-relaxed text-gray-800 dark:text-gray-200 [&_p]:my-1 [&_p]:leading-relaxed [&_pre]:my-1.5 [&_code]:break-all [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

const replyBtnCls =
  "text-xs text-gray-400 transition hover:text-blue-600 dark:hover:text-blue-400";

export default function ReplyList({
  postId,
  topReplies,
  childReplies,
  replyTotal,
  replyPage,
  replyTotalPages,
  myLikedIds = [],
}: {
  postId: string;
  /** 当前页顶层回复 */
  topReplies: Reply[];
  /** 全部子回复（楼中楼） */
  childReplies: Reply[];
  replyTotal: number;
  replyPage: number;
  replyTotalPages: number;
  /** 我点过赞的回复 id */
  myLikedIds?: string[];
}) {
  const router = useRouter();
  const user = useCurrentUser();
  // 当前"回复某人"目标
  const [selected, setSelected] = useState<{ id: string; nickname: string } | null>(null);
  // 回复排序（默认按时间正序，与服务端一致）
  const [sort, setSort] = useState<"earliest" | "latest" | "hot">("earliest");
  // 回复点赞状态（本地乐观更新）
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(myLikedIds));
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const likeCount = (r: Reply) => likeCounts[r.id] ?? r.likes ?? 0;

  /** 楼层号固定按服务端原始顺序，排序后不跳号 */
  const floorOf = useMemo(() => {
    const m = new Map<string, number>();
    topReplies.forEach((r, i) => m.set(r.id, (replyPage - 1) * 20 + i + 1));
    return m;
  }, [topReplies, replyPage]);

  const shownReplies = useMemo(() => {
    const arr = [...topReplies];
    if (sort === "earliest") {
      return arr;
    }
    if (sort === "latest") {
      return arr.reverse();
    }
    return arr.sort(
      (a, b) =>
        (likeCounts[b.id] ?? b.likes ?? 0) - (likeCounts[a.id] ?? a.likes ?? 0) ||
        a.created_at.localeCompare(b.created_at)
    );
  }, [topReplies, sort, likeCounts]);

  async function toggleLike(r: Reply) {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`/api/replies/${r.id}/like`, { method: "POST" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) return;
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(r.id);
        else next.delete(r.id);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [r.id]: data.likes }));
    } catch {
      /* 忽略 */
    }
  }

  const likeBtnCls = (liked: boolean) =>
    liked
      ? "text-xs font-medium text-blue-600 dark:text-blue-400"
      : replyBtnCls;

  // parent_id -> children（保持时间正序）
  const childrenMap = useMemo(() => {
    const m = new Map<string, Reply[]>();
    for (const c of childReplies) {
      const key = c.parent_id ?? "";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return m;
  }, [childReplies]);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">
          全部回复（{replyTotal}）
        </h2>
        {replyTotal > 1 && (
          <div className="flex gap-1 text-xs">
            {(
              [
                ["earliest", "最早"],
                ["latest", "最新"],
                ["hot", "最热"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`rounded-full border px-2.5 py-1 transition ${
                  sort === key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {topReplies.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">还没有回复，来抢沙发 🛋️</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {shownReplies.map((r) => {
            const children = childrenMap.get(r.id) ?? [];
            return (
              <li key={r.id} className="kratos-card p-5">
                {/* 顶层回复 */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/user/${r.author_id}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      <UserAvatar
                        nickname={r.author_nickname ?? "匿名"}
                        avatar={r.author_avatar}
                        size={22}
                      />
                      {r.author_nickname}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-gray-400" data-gaprow="3">
                      <button
                        type="button"
                        className={likeBtnCls(likedIds.has(r.id))}
                        onClick={() => void toggleLike(r)}
                        title="点赞该回复"
                      >
                        👍 {likeCount(r) > 0 ? likeCount(r) : "赞"}
                      </button>
                      <button
                        type="button"
                        className={replyBtnCls}
                        onClick={() =>
                          setSelected({ id: r.id, nickname: r.author_nickname ?? "匿名" })
                        }
                      >
                        回复
                      </button>
                      <EditReplyButton
                        replyId={r.id}
                        authorId={r.author_id}
                        initialContent={r.content}
                      />
                      <DeleteReplyButton replyId={r.id} authorId={r.author_id} />
                      <span>
                        #{floorOf.get(r.id)} · {fmtTime(r.created_at)}
                      </span>
                    </span>
                  </div>
                  {/* 顶层回复正文（Markdown，html 转义防 XSS） */}
                  <div
                    className={`${replyHtmlCls} mt-2`}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(r.content),
                    }}
                  />
                </div>

                {/* 楼中楼：子回复（缩进 + 左侧线） */}
                {children.length > 0 && (
                  <div className="mt-4 space-y-4 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
                    {children.map((c) => (
                      <div key={c.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400">
                            <UserAvatar
                              nickname={c.author_nickname ?? "匿名"}
                              avatar={c.author_avatar}
                              size={20}
                            />
                            {c.author_nickname}
                            {c.reply_to_nickname && (
                              <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                → @{c.reply_to_nickname}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-3 text-xs text-gray-400" data-gaprow="3">
                            <button
                              type="button"
                              className={likeBtnCls(likedIds.has(c.id))}
                              onClick={() => void toggleLike(c)}
                              title="点赞该回复"
                            >
                              👍 {likeCount(c) > 0 ? likeCount(c) : "赞"}
                            </button>
                            <button
                              type="button"
                              className={replyBtnCls}
                              onClick={() =>
                                setSelected({ id: c.id, nickname: c.author_nickname ?? "匿名" })
                              }
                            >
                              回复
                            </button>
                            <EditReplyButton
                              replyId={c.id}
                              authorId={c.author_id}
                              initialContent={c.content}
                            />
                            <DeleteReplyButton replyId={c.id} authorId={c.author_id} />
                            <span>{fmtTime(c.created_at)}</span>
                          </span>
                        </div>
                        {/* 子回复正文（Markdown） */}
                        <div
                          className={`${replyHtmlCls} mt-1.5`}
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(c.content),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 回复分页（仅顶层回复参与分页） */}
      {replyTotalPages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2">
          {replyPage > 1 && (
            <Link
              href={`/bbs/post/${postId}?page=${replyPage - 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              ← 上一页
            </Link>
          )}
          <span className="px-2 text-sm text-gray-500">
            第 {replyPage} / {replyTotalPages} 页
          </span>
          {replyPage < replyTotalPages && (
            <Link
              href={`/bbs/post/${postId}?page=${replyPage + 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              下一页 →
            </Link>
          )}
        </nav>
      )}

      <ReplyBox
        postId={postId}
        parentId={selected?.id}
        replyToNickname={selected?.nickname}
        onCancel={() => setSelected(null)}
      />
    </div>
  );
}
