import { chunkedUpload } from "./chunkedUpload";

/** 与 chunkedUpload 保持一致的分片大小（2MB） */
const CHUNK_SIZE = 2 * 1024 * 1024;
/** 单文件上限 2GB（与 /api/files/ticket 一致） */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

export interface UploadedFile {
  fileId: string;
  name: string;
  size: number;
  mime: string;
  /** 公网下载地址（可直接用于 Markdown 图片/链接） */
  downloadUrl: string;
}

/**
 * 上传单个文件到本机文件库：
 * 取凭证（/api/files/ticket）→ 分片直传（断点续传 + 重试）→ 返回元数据
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedFile> {
  if (file.size <= 0) throw new Error("文件为空");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("文件超过 2GB 限制");

  const chunkCount = Math.max(Math.ceil(file.size / CHUNK_SIZE), 1);
  const ticketRes = await fetch("/api/files/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "pasted-image.png",
      size: file.size,
      mime: file.type || "application/octet-stream",
      chunks: chunkCount,
    }),
  });
  const data = (await ticketRes.json()) as {
    error?: string;
    ticket?: string;
    fileId?: string;
    uploadUrl?: string;
    downloadUrl?: string;
  };
  if (!ticketRes.ok || !data.ticket || !data.uploadUrl || !data.fileId) {
    throw new Error(data.error || "获取上传凭证失败");
  }

  await chunkedUpload({
    file,
    uploadUrl: data.uploadUrl,
    ticket: data.ticket,
    onProgress,
  });

  return {
    fileId: data.fileId,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    downloadUrl:
      data.downloadUrl ?? `${data.uploadUrl.replace(/\/upload$/, "")}/download/${data.fileId}`,
  };
}
