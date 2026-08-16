"use client";

import { useMemo, useState } from "react";
import { ToolLayout } from "./ToolLayout";

export default function TextStatsTool() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const total = text.length;
    const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const latin = (text.match(/[a-zA-Z]/g) || []).length;
    const digits = (text.match(/[0-9]/g) || []).length;
    const spaces = (text.match(/\s/g) || []).length;
    const lines = text === "" ? 0 : text.split(/\n/).length;
    const paragraphs =
      text === "" ? 0 : text.split(/\n{2,}/).filter((p) => p.trim()).length;
    const words = (
      text.trim().match(/[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*/g) || []
    ).length;
    return { total, cjk, latin, digits, spaces, lines, paragraphs, words };
  }, [text]);

  const rows: [string, number][] = [
    ["总字符数", stats.total],
    ["中文字数", stats.cjk],
    ["英文字母", stats.latin],
    ["数字", stats.digits],
    ["空白字符", stats.spaces],
    ["单词数（英文）", stats.words],
    ["行数", stats.lines],
    ["段落数", stats.paragraphs],
  ];

  return (
    <ToolLayout
      title="文本统计"
      desc="实时统计输入文本的字数、字符、行数与段落。"
      output=""
      onInput={setText}
      inputPlaceholder="在这里输入或粘贴文本，统计结果实时更新…"
      inputLabel="输入文本"
      hideOutput
      secondary={
        <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-800"
              >
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {value}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
