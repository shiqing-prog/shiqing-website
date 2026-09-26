"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Board } from "@/lib/types";
import AttachmentUploader from "./AttachmentUploader";
import MarkdownToolbar from "./MarkdownToolbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { renderMarkdown } from "@/lib/markdown";
import { uploadFile } from "@/lib/uploadFile";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

const previewTabCls = (active: boolean) =>
  `rounded-md px-2.5 py-1 text-xs transition ${
    active
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
  }`;

const DRAFT_KEY = "draft:new-post";

export default function NewPostForm({ defaultBoard }: { defaultBoard?: string }) {
  const router = useRouter();
  const user = useCurrentUser();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState(defaultBoard ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pasteMsg, setPasteMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 粘贴剪贴板图片：自动上传并插入 Markdown 图片 */
  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(e.clipboardData?.items ?? [])
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (images.length === 0) return;

    e.preventDefault();
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? content.length;
    for (const [i, img] of images.entries()) {
      setPasteMsg(`⏳ 正在上传粘贴的图片 ${i + 1}/${images.length}…`);
      try {
        const ext = (img.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const named = new File([img], img.name || `pasted-${Date.now()}.${ext}`, {
          type: img.type,
        });
        const up = await uploadFile(named);
        const md = `![${up.name}](${up.downloadUrl})\n`;
        setContent((prev) => prev.slice(0, pos) + md + prev.slice(pos));
        setPasteMsg("✅ 图片已插入正文");
      } catch (err) {
        setPasteMsg(
          `❌ 图片上传失败：${err instanceof Error ? err.message : "未知错误"}`
        );
      }
    }
    setTimeout(() => setPasteMsg(""), 4000);
  }

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((b: Board[]) => {
        setBoards(b);
        if (!defaultBoard && b.length > 0) setBoardId(b[0].id);
      })
      .catch(() => {});
  }, [defaultBoard]);

  // 挂载时检测草稿（异步触发 setState）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw) as { at?: number };
        if (d.at && Date.now() - d.at < 7 * 24 * 3600 * 1000) setDraftAt(d.at);
      } catch {
        /* 忽略 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 自动保存草稿（500ms 防抖）
  useEffect(() => {
    if (!title && !content && !tags) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, content, tags, at: Date.now() })
        );
      } catch {
        /* 忽略 */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [title, content, tags]);

  function restoreDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as {
        title?: string;
        content?: string;
        tags?: string;
      };
      if (d.title) setTitle(d.title);
      if (d.content) setContent(d.content);
      if (d.tags) setTags(d.tags);
    } catch {
      /* 忽略 */
    }
    setDraftAt(null);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* 忽略 */
    }
    setDraftAt(null);
  }

  if (user === null) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          登录
        </Link>{" "}
        后才能发帖
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          title,
          content,
          attachments,
          tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
          poll: pollEnabled
            ? pollOptions.map((o) => o.trim()).filter(Boolean)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发帖失败");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* 忽略 */
      }
      router.push(`/bbs/post/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发帖失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {draftAt !== null && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span>
            📝 检测到上次未发布的草稿（
            {new Date(draftAt).toLocaleString("zh-CN", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            ）
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="font-medium hover:underline">
              恢复
            </button>
            <button type="button" onClick={discardDraft} className="hover:underline">
              丢弃
            </button>
          </span>
        </div>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">板块</span>
        <select
          className={inputCls}
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          required
        >
          <option value="" disabled>
            请选择板块
          </option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">标题</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="一句话说清楚主题"
          required
          maxLength={100}
        />
      </label>
      <label className="block text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="block font-medium">内容</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={previewTabCls(!preview)}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={previewTabCls(preview)}
            >
              预览
            </button>
          </div>
        </div>
        {preview ? (
          <div
            className="prose-content min-h-[240px] rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(content) ||
                '<p class="text-gray-400">（还没有内容）</p>',
            }}
          />
        ) : (
          <>
            <MarkdownToolbar
              textareaRef={textareaRef}
              value={content}
              onChange={setContent}
            />
            <textarea
              ref={textareaRef}
              rows={10}
              className={inputCls}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => void handlePaste(e)}
              placeholder="支持 Markdown：**加粗**、`代码`、列表、标题、引用、图片链接；换行即分段（可直接粘贴截图自动上传）"
              required
              maxLength={20000}
            />
            {pasteMsg && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pasteMsg}</p>
            )}
          </>
        )}
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">标签（可选，逗号分隔，最多 5 个）</span>
        <input
          className={inputCls}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="如：教程, Next.js, 分享"
          maxLength={50}
        />
      </label>
      <div className="block text-sm">
        <span className="mb-1 block font-medium">附件（图片 / 文件）</span>
        <AttachmentUploader onChange={setAttachments} />
      </div>

      {/* 投票贴选项 */}
      <div className="block text-sm">
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={pollEnabled}
            onChange={(e) => {
              setPollEnabled(e.target.checked);
              if (!e.target.checked) setPollOptions(["", ""]);
            }}
            className="h-4 w-4 accent-blue-600"
          />
          📊 添加投票（可选，2-6 个选项）
        </label>
        {pollEnabled && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`选项 ${i + 1}`}
                  maxLength={50}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions(pollOptions.filter((_, x) => x !== i))}
                    className="shrink-0 text-gray-400 hover:text-red-500"
                    title="删除该选项"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 6 && (
              <button
                type="button"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="self-start rounded-md border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-600"
              >
                ＋ 添加选项
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "发布中…" : "发布帖子"}
        </button>
      </div>
    </form>
  );
}
