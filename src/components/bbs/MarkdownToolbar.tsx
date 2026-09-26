"use client";

import type { RefObject } from "react";

/** 语法片段：wrap 为包裹符号（无则插入 prefix 到行首），placeholder 为选中为空时的占位文本 */
interface Syntax {
  key: string;
  label: string;
  title: string;
  wrap?: string;
  prefix?: string;
  placeholder: string;
  /** 是否块级（作用于整行/整段） */
  block?: boolean;
}

const SYNTAX: Syntax[] = [
  { key: "bold", label: "B", title: "加粗 **文字**", wrap: "**", placeholder: "加粗文字" },
  { key: "italic", label: "I", title: "斜体 *文字*", wrap: "*", placeholder: "斜体文字" },
  { key: "strike", label: "S", title: "删除线 ~~文字~~", wrap: "~~", placeholder: "删除线" },
  { key: "code", label: "</>", title: "行内代码 `code`", wrap: "`", placeholder: "code" },
  {
    key: "codeblock",
    label: "{ }",
    title: "代码块 ```",
    block: true,
    prefix: "```\n",
    placeholder: "代码",
  },
  {
    key: "quote",
    label: "❝",
    title: "引用 > 文字",
    block: true,
    prefix: "> ",
    placeholder: "引用的内容",
  },
  {
    key: "ul",
    label: "•",
    title: "无序列表 - 项",
    block: true,
    prefix: "- ",
    placeholder: "列表项",
  },
  {
    key: "ol",
    label: "1.",
    title: "有序列表 1. 项",
    block: true,
    prefix: "1. ",
    placeholder: "列表项",
  },
  {
    key: "h2",
    label: "H",
    title: "二级标题 ##",
    block: true,
    prefix: "## ",
    placeholder: "标题",
  },
  { key: "link", label: "🔗", title: "链接 [文字](url)", placeholder: "文字" },
  { key: "image", label: "🖼", title: "图片 ![alt](url)", placeholder: "图片描述" },
  { key: "hr", label: "―", title: "分割线 ---", block: true, placeholder: "" },
];

export default function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  /** 在光标处插入语法（保留选中的文字） */
  function apply(s: Syntax) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const text = selected || s.placeholder;

    let inserted: string;
    let caretStart: number;
    let caretEnd: number;

    if (s.key === "hr") {
      inserted = "\n---\n";
      caretStart = caretEnd = start + inserted.length;
    } else if (s.key === "link" || s.key === "image") {
      // 链接/图片：文字部分选中，URL 占位待填
      const head = s.key === "link" ? "[" : "![";
      inserted = `${head}${text}](https://)`;
      const offset = head.length + text.length + 2; // "](" 之后即 URL 起点
      caretStart = start + offset;
      caretEnd = caretStart + "https://".length;
    } else if (s.wrap) {
      inserted = `${s.wrap}${text}${s.wrap}`;
      const offset = s.wrap.length;
      caretStart = start + offset;
      caretEnd = caretStart + text.length;
    } else {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const atLineStart = value.slice(lineStart, start).trim() === "";
      const prefix = (atLineStart ? "" : "\n") + (s.prefix ?? "");
      inserted = `${prefix}${text}`;
      caretStart = start + prefix.length;
      caretEnd = caretStart + text.length;
    }

    onChange(value.slice(0, start) + inserted + value.slice(end));
    // 插入后恢复焦点与选区
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caretStart, caretEnd);
    });
  }

  return (
    <div className="mb-1 flex flex-wrap gap-1">
      {SYNTAX.map((s) => (
        <button
          key={s.key}
          type="button"
          title={s.title}
          onClick={() => apply(s)}
          className="min-w-[28px] rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
