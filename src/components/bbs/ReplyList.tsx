"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Reply } from "@/lib/types";
import ReplyBox from "./ReplyBox";
import EditReplyButton from "./EditReplyButton";
import DeleteReplyButton from "./DeleteReplyButton";

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
}: {
  postId: string;
  /** 当前页顶层回复 */
  topReplies: Reply[];
  /** 全部子回复（楼中楼） */
  childReplies: Reply[];
  replyTotal: number;
  replyPage: number;
  replyTotalPages: number;
}) {
  // 当前"回复某人"目标
  const [selected, setSelected] = useState<{ id: string; nickname: string } | null>(null);

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
      <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">
        全部回复（{replyTotal}）
      </h2>

      {topReplies.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">还没有回复，来抢沙发 🛋️</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {topReplies.map((r, i) => {
            const children = childrenMap.get(r.id) ?? [];
            return (
              <li key={r.id} className="kratos-card p-5">
                {/* 顶层回复 */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/user/${r.author_id}`}
                      className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      {r.author_nickname}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-gray-400">
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
                        #{(replyPage - 1) * 20 + i + 1} · {fmtTime(r.created_at)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {r.content}
                  </p>
                </div>

                {/* 楼中楼：子回复（缩进 + 左侧线） */}
                {children.length > 0 && (
                  <div className="mt-4 space-y-4 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
                    {children.map((c) => (
                      <div key={c.id}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {c.author_nickname}
                            {c.reply_to_nickname && (
                              <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                → @{c.reply_to_nickname}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-3 text-xs text-gray-400">
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
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                          {c.content}
                        </p>
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
