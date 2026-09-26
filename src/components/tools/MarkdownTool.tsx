"use client";

import { useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

const SAMPLE = `# 标题

**加粗**、*斜体*、\`行内代码\`

- 列表项 1
- 列表项 2

> 引用文本

\`\`\`js
console.log("hello")
\`\`\`

[链接](https://shiqing.site)`;

export default function MarkdownTool() {
  const [text, setText] = useState(SAMPLE);

  return (
    <div className="kratos-card p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Markdown 源码</span>
          <textarea
            className={inputCls + " font-mono text-xs"}
            rows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium">预览</span>
          <div
            className="prose-content min-h-[200px] rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        与论坛发帖使用同一渲染引擎（原始 HTML 自动转义，安全无 XSS）
      </p>
    </div>
  );
}
