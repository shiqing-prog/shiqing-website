"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** 可输出的编码格式 */
const FORMATS = [
  { value: "original", label: "保持原格式", mime: "" },
  { value: "jpeg", label: "JPEG", mime: "image/jpeg" },
  { value: "png", label: "PNG", mime: "image/png" },
  { value: "webp", label: "WebP", mime: "image/webp" },
  { value: "avif", label: "AVIF", mime: "image/avif" },
] as const;

type FormatValue = (typeof FORMATS)[number]["value"];

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** 用 canvas 把图片重绘成指定格式的 Blob */
function encode(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: string,
  quality: number,
  flatten: boolean,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  if (flatten) {
    // JPEG 不支持透明，先铺白底
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

/** 检测浏览器能否编码某种格式 */
function canEncode(mime: string): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(!!blob && blob.type === mime), mime, 0.8);
    } catch {
      resolve(false);
    }
  });
}

/** 按目标体积反复试压：先二分质量，必要时再逐步缩小尺寸 */
async function encodeToTarget(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: string,
  targetBytes: number,
  flatten: boolean,
): Promise<Blob | null> {
  const lossy = mime !== "image/png";
  let best: Blob | null = null;

  if (lossy) {
    let lo = 0.25;
    let hi = 0.96;
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2;
      const blob = await encode(img, width, height, mime, q, flatten);
      if (!blob) break;
      if (blob.size <= targetBytes) {
        best = blob;
        lo = q;
      } else {
        hi = q;
      }
      if (hi - lo < 0.02) break;
    }
  } else {
    best = await encode(img, width, height, mime, 1, flatten);
  }

  let w = width;
  let h = height;
  while ((!best || best.size > targetBytes) && Math.min(w, h) > 48) {
    w = Math.round(w * 0.82);
    h = Math.round(h * 0.82);
    const blob = await encode(img, w, h, mime, lossy ? 0.62 : 1, flatten);
    if (!blob) break;
    best = blob;
  }
  return best;
}

interface Item {
  id: string;
  file: File;
  name: string;
  origSize: number;
  origType: string;
  src: string;
  width: number;
  height: number;
  status: "ready" | "working" | "done" | "error";
  error?: string;
  outUrl?: string;
  outSize?: number;
  outType?: string;
  outWidth?: number;
  outHeight?: number;
  outName?: string;
}

const MAX_FILES = 30;

export default function ImageCompressTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<FormatValue>("webp");
  const [quality, setQuality] = useState(0.82);
  const [maxEdge, setMaxEdge] = useState(0);
  const [targetKB, setTargetKB] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [avifOk, setAvifOk] = useState(true);
  const [webpOk, setWebpOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  // 浏览器编码能力探测
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [a, w] = await Promise.all([canEncode("image/avif"), canEncode("image/webp")]);
      if (!alive) return;
      setAvifOk(a);
      setWebpOk(w);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 卸载时释放 objectURL
  useEffect(() => {
    const list = urls.current;
    return () => {
      for (const u of list) URL.revokeObjectURL(u);
    };
  }, []);

  const track = (u: string) => {
    urls.current.push(u);
    return u;
  };

  const addFiles = useCallback(async (files: File[]) => {
    setNote("");
    const picked = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_FILES);
    if (!picked.length) {
      setNote("没有可用的图片文件（支持 JPG / PNG / WebP / GIF / BMP / SVG）");
      return;
    }
    const next: Item[] = [];
    for (const file of picked) {
      const src = track(URL.createObjectURL(file));
      try {
        const img = new Image();
        img.src = src;
        await img.decode();
        next.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          origSize: file.size,
          origType: file.type || "image/*",
          src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          status: "ready",
        });
      } catch {
        next.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          origSize: file.size,
          origType: file.type || "image/*",
          src,
          width: 0,
          height: 0,
          status: "error",
          error: "无法解码这张图片",
        });
      }
    }
    setItems((prev) => [...prev, ...next]);
  }, []);

  function reset() {
    for (const it of items) {
      if (it.outUrl) URL.revokeObjectURL(it.outUrl);
    }
    urls.current = [];
    setItems([]);
    setNote("");
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.outUrl) URL.revokeObjectURL(target.outUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  const activeMime = useMemo(() => {
    if (format !== "original") return FORMATS.find((f) => f.value === format)!.mime;
    return "";
  }, [format]);

  const runAll = useCallback(async () => {
    if (busy || !items.length) return;
    setBusy(true);
    setNote("正在本地处理，图片不会离开你的浏览器…");
    const snapshot = items;
    for (const it of snapshot) {
      if (it.status === "error") continue;
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "working", error: undefined } : p)));
      try {
        const img = new Image();
        img.src = it.src;
        await img.decode();

        const srcType = it.file.type || "image/png";
        const mime = activeMime || (srcType === "image/gif" ? "image/png" : srcType);
        const flatten = mime === "image/jpeg";

        let w = it.width || img.naturalWidth;
        let h = it.height || img.naturalHeight;
        if (maxEdge > 0 && Math.max(w, h) > maxEdge) {
          const k = maxEdge / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
        }

        const targetBytes = targetKB > 0 ? targetKB * 1024 : 0;
        const q = mime === "image/png" ? 1 : quality;
        const blob = targetBytes
          ? await encodeToTarget(img, w, h, mime, targetBytes, flatten)
          : await encode(img, w, h, mime, q, flatten);

        if (!blob) throw new Error("编码失败（浏览器不支持该格式）");
        const finalType = blob.type || mime;
        const outUrl = track(URL.createObjectURL(blob));
        setItems((prev) =>
          prev.map((p) =>
            p.id === it.id
              ? {
                  ...p,
                  status: "done",
                  outUrl,
                  outSize: blob.size,
                  outType: finalType,
                  outWidth: w,
                  outHeight: h,
                  outName: baseName(p.name) + "." + (EXT[finalType] ?? "img"),
                }
              : p,
          ),
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === it.id
              ? { ...p, status: "error", error: err instanceof Error ? err.message : "处理失败" }
              : p,
          ),
        );
      }
    }
    setBusy(false);
    setNote("处理完成，全部在本地完成 ✅");
  }, [activeMime, busy, items, maxEdge, quality, targetKB]);

  function download(it: Item) {
    if (!it.outUrl || !it.outName) return;
    const a = document.createElement("a");
    a.href = it.outUrl;
    a.download = it.outName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadAll() {
    const done = items.filter((i) => i.status === "done" && i.outUrl);
    for (const it of done) {
      download(it);
      await new Promise((r) => setTimeout(r, 180));
    }
  }

  const doneItems = items.filter((i) => i.status === "done");
  const totalOrig = doneItems.reduce((a, b) => a + b.origSize, 0);
  const totalOut = doneItems.reduce((a, b) => a + (b.outSize ?? 0), 0);
  const saved = totalOrig > 0 ? Math.round((1 - totalOut / totalOrig) * 100) : 0;

  const dropCls =
    "mt-5 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition " +
    (dragging
      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
      : "border-gray-300 hover:border-blue-400 dark:border-gray-700");

  const runLabel = busy
    ? "处理中…"
    : items.length
      ? "开始处理（" + items.length + " 张）"
      : "开始处理";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">图片压缩 / 格式转换</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        批量压缩、转 WebP / AVIF / JPEG / PNG、按边长缩放、按体积压到指定大小。全部在浏览器本地用
        Canvas 完成，图片不会上传到服务器。
      </p>

      {/* 拖拽 / 选择 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={dropCls}
      >
        <p className="text-2xl">🖼️</p>
        <p className="mt-2 text-sm font-medium">拖拽图片到这里，或点击选择</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          支持 JPG / PNG / WebP / GIF / BMP / SVG，一次最多 {MAX_FILES} 张
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {/* 参数 */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">输出格式</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as FormatValue)}
            className="input-tool mt-1.5 w-full"
          >
            {FORMATS.map((f) => {
              const unsupported = (f.value === "avif" && !avifOk) || (f.value === "webp" && !webpOk);
              return (
                <option key={f.value} value={f.value} disabled={unsupported}>
                  {f.label}
                  {unsupported ? "（当前浏览器不支持）" : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label className="block text-sm">
          <span className="flex items-center justify-between font-medium">
            <span>质量</span>
            <span className="font-mono text-xs text-gray-500">
              {targetKB > 0 ? "由目标体积决定" : format === "png" ? "PNG 无损" : Math.round(quality * 100)}
            </span>
          </span>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.02}
            value={quality}
            disabled={format === "png" || targetKB > 0}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="mt-3 w-full accent-blue-600 disabled:opacity-40"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">最大边长（像素）</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={100}
              value={maxEdge || ""}
              placeholder="0 = 不缩放"
              onChange={(e) => setMaxEdge(Math.max(0, Number(e.target.value) || 0))}
              className="input-tool w-full"
            />
            {[0, 1920, 1280, 800].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMaxEdge(v)}
                className={
                  "shrink-0 rounded-md border px-2 py-1 text-xs " +
                  (maxEdge === v
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-gray-300 text-gray-500 dark:border-gray-700")
                }
              >
                {v === 0 ? "原图" : v}
              </button>
            ))}
          </div>
        </label>

        <label className="block text-sm">
          <span className="font-medium">压缩到指定大小（KB，0 = 不限）</span>
          <input
            type="number"
            min={0}
            step={10}
            value={targetKB || ""}
            placeholder="例如 200"
            onChange={(e) => setTargetKB(Math.max(0, Number(e.target.value) || 0))}
            className="input-tool mt-1.5 w-full"
          />
        </label>
      </div>

      {/* 操作 */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => void runAll()} disabled={busy || !items.length} className="btn-tool disabled:opacity-40">
          {runLabel}
        </button>
        <button
          onClick={() => void downloadAll()}
          disabled={!doneItems.length}
          className="btn-tool disabled:opacity-40"
        >
          全部下载
        </button>
        <button onClick={reset} disabled={!items.length || busy} className="btn-tool disabled:opacity-40">
          清空
        </button>
        <a href="/tools" className="btn-tool">
          返回工具箱
        </a>
      </div>

      {note && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{note}</p>}

      {doneItems.length > 0 && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60">
          共 {doneItems.length} 张：{formatBytes(totalOrig)} → <strong>{formatBytes(totalOut)}</strong>，节省{" "}
          <strong className={saved > 0 ? "text-green-600" : "text-red-600"}>{saved}%</strong>
        </p>
      )}

      {/* 列表 */}
      {items.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const ratio = it.outSize && it.origSize ? Math.round((1 - it.outSize / it.origSize) * 100) : null;
            return (
              <li key={it.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.src}
                    alt={it.name}
                    className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover dark:border-gray-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" title={it.name}>
                      {it.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {it.width}×{it.height} · {it.origType.replace("image/", "").toUpperCase()} ·{" "}
                      {formatBytes(it.origSize)}
                    </p>
                    {it.status === "done" && it.outSize != null && (
                      <p className="mt-1 text-[11px]">
                        <span className="text-gray-500 dark:text-gray-400">→ </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatBytes(it.outSize)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}
                          {it.outWidth}×{it.outHeight} {it.outType ? it.outType.replace("image/", "").toUpperCase() : ""}
                        </span>
                        {ratio != null && (
                          <span className={ratio >= 0 ? " text-green-600" : " text-red-600"}>
                            {" "}
                            ({ratio >= 0 ? "-" : "+"}
                            {Math.abs(ratio)}%)
                          </span>
                        )}
                      </p>
                    )}
                    {it.status === "working" && <p className="mt-1 text-[11px] text-blue-600">处理中…</p>}
                    {it.status === "error" && (
                      <p className="mt-1 text-[11px] text-red-600">{it.error ?? "失败"}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="h-6 w-6 shrink-0 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                    aria-label="移除"
                    title="移除"
                  >
                    ×
                  </button>
                </div>
                {it.status === "done" && it.outUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => download(it)} className="btn-tool text-xs">
                      下载 {it.outName}
                    </button>
                    <a href={it.outUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      预览
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        说明：GIF 动图会被压成静态首帧；SVG / HEIC 等格式视浏览器支持而定；「压缩到指定大小」会先二分质量，仍超标时再逐步缩小尺寸。
      </p>
    </div>
  );
}
