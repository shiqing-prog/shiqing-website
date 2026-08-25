"use client";

import { useState } from "react";

export default function ExportButton({ postId }: { postId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function exportMarkdown() {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.post) throw new Error("获取帖子失败");
      const { post, replies, attachments } = data;
      const lines: string[] = [];
      lines.push(`# ${post.title}`);
      lines.push("");
      lines.push(
        `> 作者：${post.author_nickname ?? "匿名"} ｜ ${post.created_at} ｜ 💬 ${replies.length} 回复 ｜ 👁 ${(post.view_count ?? 0).toLocaleString()}`
      );
      lines.push("");
      lines.push(post.content);
      if (attachments?.length) {
        lines.push("");
        lines.push("## 附件");
        for (const f of attachments) {
          lines.push(`- ${f.filename}：${f.url}`);
        }
      }
      if (replies?.length) {
        lines.push("");
        lines.push("## 回复");
        for (const r of replies) {
          lines.push(`- **${r.author_nickname}**：${r.content}`);
        }
      }
      const md = lines.join("\n");
      // 下载 .md 文件
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${post.title.slice(0, 30)}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "导出失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={exportMarkdown}
      disabled={busy}
      title="导出为 Markdown 文件"
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {done ? "✅ 已导出" : busy ? "导出中…" : "📤 导出"}
    </button>
  );
}
