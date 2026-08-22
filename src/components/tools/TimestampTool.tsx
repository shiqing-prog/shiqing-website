"use client";

import { useState } from "react";
import { ToolLayout } from "./ToolLayout";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function TimestampTool() {
  const [tsInput, setTsInput] = useState("");
  const [tsResult, setTsResult] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dateResult, setDateResult] = useState("");

  function convertTs() {
    const raw = tsInput.trim();
    if (!/^-?\d+$/.test(raw)) {
      setTsResult("请输入数字时间戳");
      return;
    }
    let ms = parseInt(raw, 10);
    // 自动识别秒/毫秒：13 位左右视为毫秒，10 位左右视为秒
    if (Math.abs(ms) < 1e12) ms *= 1000;
    const d = new Date(ms);
    setTsResult(isNaN(d.getTime()) ? "无效的时间戳" : fmtDate(d));
  }

  function convertDate() {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      setDateResult("日期格式无效，请使用 YYYY-MM-DDTHH:mm:ss");
      return;
    }
    setDateResult(
      `秒：${Math.floor(d.getTime() / 1000)}\n毫秒：${d.getTime()}`
    );
  }

  return (
    <ToolLayout
      title="时间戳转换"
      desc="Unix 时间戳与日期时间互转，自动识别秒/毫秒。"
      actions={
        <>
          <button
            onClick={() => {
              setTsInput(String(Math.floor(Date.now() / 1000)));
              setTsResult("");
            }}
            className="btn-tool"
          >
            填入当前秒级时间戳
          </button>
          <button
            onClick={() => {
              setTsInput(String(Date.now()));
              setTsResult("");
            }}
            className="btn-tool"
          >
            填入当前毫秒级时间戳
          </button>
          <button onClick={convertTs} className="btn-tool">
            转换
          </button>
        </>
      }
      output={tsResult}
      error={tsResult.startsWith("请输入") || tsResult.startsWith("无效") ? tsResult : ""}
      onInput={setTsInput}
      inputPlaceholder="输入时间戳（如 1737000000000）"
      inputLabel="时间戳 → 日期时间"
      secondary={
        <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
          <label className="mb-1 block text-sm font-medium">
            日期时间 → 时间戳
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="input-tool flex-1"
            />
            <button onClick={convertDate} className="btn-tool">
              转换
            </button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-sm dark:bg-gray-900">
            {dateResult || "（等待转换）"}
          </pre>
        </div>
      }
    />
  );
}
