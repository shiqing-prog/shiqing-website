"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FileRecord } from "@/lib/types";
import { chunkedUpload } from "@/lib/chunkedUpload";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface FileItem extends FileRecord {
  url?: string;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function FileLibrary() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const user = useCurrentUser();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/files", { cache: "no-store" });
      const data = await res.json();
      setFiles(data.files ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMsg("加载文件列表失败");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/files", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          setFiles(data.files ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) setMsg("加载文件列表失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(file: File) {
    setMsg("");
    setUploading(true);
    setProgress(0);
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

      setProgress(100);
      setMsg(`✅ 上传成功（${fmtSize(file.size)}）`);
      await load();
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "上传失败"}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDelete(f: FileItem) {
    if (!confirm(`确定删除文件「${f.filename}」？`)) return;
    try {
      const res = await fetch(`/api/files/${f.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      setFiles(files.filter((x) => x.id !== f.id));
      setMsg("✅ 已删除");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "删除失败"}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📁 文件库</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 {total} 个文件 · 单文件最大 2GB · 存储在独立文件服务器，全员可下载
          </p>
        </div>
        {user && (
          <div className="flex flex-col items-end gap-2">
            {uploading && progress > 0 && (
              <div className="w-48">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>上传中</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "上传中…" : "⬆ 上传文件"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>

      {msg && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{msg}</p>}

      {!user && (
        <p className="mt-4 text-sm text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            登录
          </Link>{" "}
          后可上传文件
        </p>
      )}

      {files.length === 0 ? (
        <p className="mt-8 text-gray-500">
          {user ? "还没有文件，点击右上角上传第一个吧！" : "还没有文件。"}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-gray-100 kratos-card dark:divide-gray-800">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <div className="min-w-0">
                <a
                  href={f.url}
                  download
                  className="truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
                  title="点击下载"
                >
                  {f.filename}
                </a>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {fmtSize(f.size)} · {f.uploader_nickname ?? "匿名"} ·{" "}
                  {fmtTime(f.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={f.url}
                  download
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  下载
                </a>
                {user &&
                  (user.role === "admin" || user.id === f.uploader_id) && (
                    <button
                      onClick={() => handleDelete(f)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      删除
                    </button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
