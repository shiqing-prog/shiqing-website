"use client";

import { useState, type ReactNode } from "react";

interface ToolLayoutProps {
  title: string;
  desc: string;
  /** 工具按钮区 */
  actions?: ReactNode;
  /** 输入回调 */
  onInput: (v: string) => void;
  inputPlaceholder?: string;
  inputLabel?: string;
  /** 输出文本 */
  output: string;
  error?: string;
  /** 是否隐藏输出区（用于统计类工具） */
  hideOutput?: boolean;
  /** 额外的内容区 */
  secondary?: ReactNode;
}

export function ToolLayout({
  title,
  desc,
  actions,
  onInput,
  inputPlaceholder,
  inputLabel = "输入",
  output,
  error,
  hideOutput,
  secondary,
}: ToolLayoutProps) {
  const [value, setValue] = useState("");
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>

      <label className="mt-5 block text-sm font-medium">{inputLabel}</label>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onInput(e.target.value);
        }}
        placeholder={inputPlaceholder}
        rows={8}
        className="input-tool mt-2 w-full resize-y font-mono text-sm"
      />

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}

      {!hideOutput && (
        <>
          <label className="mt-6 block text-sm font-medium">输出</label>
          <pre
            className={`input-tool mt-2 w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-sm dark:bg-gray-900 ${
              error ? "border-red-400 text-red-600 dark:text-red-400" : ""
            }`}
          >
            {error || output || "（等待操作）"}
          </pre>
        </>
      )}

      {secondary}
    </div>
  );
}
