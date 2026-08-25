"use client";

import { useRef, useState } from "react";
import { chunkedUpload } from "@/lib/chunkedUpload";

interface Uploaded {
  fileId: string;
  name: string;
  size: number;
}

const MAX = 10;

export default function AttachmentUploader({
  onChange,
}: {
  onChange: (ids: string[]) => void;
}) {
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function update(next: Uploaded[]) {
    setFiles(next);
    onChange(next.map((f) => f.fileId));
  }

  async function upload(list: File[]) {
    setError("");
    const pending = list.filter((f) => f.size <= 2 * 1024 * 1024 * 1024);
    if (pending.length !== list.length) {
      setError("有文件超过 2GB 限制，已跳过");
    }
    if (files.length + pending.length > MAX) {
      setError(`最多附带 ${MAX} 个文件`);
      return;
    }
    setUploading(true);
    for (const file of pending) {
      try {
        // 1. 获取上传凭证（带分片数）
        const chunkCount = Math.max(Math.ceil(file.size / (10 * 1024 * 1024)), 1);
        const ticketRes = await fetch("/api/files/ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            mime: file.type || "application/octet-stream",
            chunks: chunkCount,
          }),
        });
        const ticketData = await ticketRes.json();
        if (!ticketRes.ok) throw new Error(ticketData.error || "获取凭证失败");

        // 2. 分片直传本机文件库（断点续传 + 进度）
        await chunkedUpload({
          file,
          uploadUrl: ticketData.uploadUrl,
          ticket: ticketData.ticket,
          onProgress: setProgress,
        });

        update([...files, { fileId: ticketData.fileId, name: file.name, size: file.size }]);
      } catch (err) {
        setError(`「${file.name}」上传失败：${err instanceof Error ? err.message : "未知错误"}`);
      }
    }
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300">
          {uploading ? `上传中 ${progress}%…` : "📎 添加图片/文件（最多 10 个，单个 ≤2GB）"}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length) void upload(list);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {uploading && (
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={f.fileId}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-700"
            >
              <span className="truncate">
                📎 {f.name} <span className="text-gray-400">({fmtSize(f.size)})</span>
              </span>
              <button
                onClick={() => update(files.filter((_, j) => j !== i))}
                className="ml-3 shrink-0 text-red-500 hover:underline"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
