const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB 每片

interface ChunkedUploadOpts {
  file: File;
  uploadUrl: string; // 形如 https://files.shiqing.site/upload
  ticket: string;
  onProgress?: (percent: number) => void;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // 4xx（凭证无效/参数错误）立即失败，重试无意义；仅 5xx/网络错误重试
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (err instanceof Error && /^HTTP 4\d\d/.test(err.message)) throw err;
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("上传失败");
}

/**
 * 分片上传（断点续传）：
 * 1. 查询已上传分片（中断后可续传，跳过已传分片）
 * 2. 顺序上传缺失分片（10MB/片，失败自动重试）
 * 3. 通知合并
 */
export async function chunkedUpload({
  file,
  uploadUrl,
  ticket,
  onProgress,
}: ChunkedUploadOpts): Promise<void> {
  const base = uploadUrl.replace(/\/upload$/, "");
  const total = Math.max(Math.ceil(file.size / CHUNK_SIZE), 1);

  // 1. 查询已上传分片
  let received = new Set<number>();
  try {
    const res = await fetch(`${base}/upload-status?ticket=${ticket}`);
    if (res.ok) {
      const data = (await res.json()) as { received?: number[] };
      received = new Set(data.received ?? []);
    }
  } catch {
    /* 状态查询失败则全量上传 */
  }

  // 2. 顺序上传缺失分片
  for (let i = 0; i < total; i++) {
    if (received.has(i)) {
      onProgress?.(Math.round(((i + 1) / total) * 99));
      continue;
    }
    const blob = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await fetchWithRetry(`${base}/upload-chunk?ticket=${ticket}&index=${i}&total=${total}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    });
    onProgress?.(Math.round(((i + 1) / total) * 99));
  }

  // 3. 合并
  const res = await fetchWithRetry(`${base}/upload-complete?ticket=${ticket}`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "合并失败");
  }
  onProgress?.(100);
}
