import { getCloudflareContext } from "@opennextjs/cloudflare";

/** 从 Worker 环境读取 HMAC 密钥（wrangler secret FILE_HMAC_SECRET） */
async function getSecret(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as unknown as { FILE_HMAC_SECRET?: string }).FILE_HMAC_SECRET;
  if (!secret) throw new Error("FILE_HMAC_SECRET 未配置");
  return secret;
}

/** 生成本机文件服务的 HMAC 凭证（与本机 server.js 的验证逻辑一致） */
export async function signTicket(payload: Record<string, unknown>): Promise<string> {
  const secret = await getSecret();
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payloadB64}.${sigHex}`;
}

/**
 * 校验并解出上传/删除凭证的 payload；签名或格式不对返回 null。
 * 用于上传完成后由站点落元数据（/api/files/confirm），确保只登记真正上传成功的文件。
 */
export async function verifyTicket(
  ticket: string
): Promise<Record<string, unknown> | null> {
  const secret = await getSecret();
  const dot = ticket.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = ticket.slice(0, dot);
  const sigHex = ticket.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/i.test(sigHex)) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sig = new Uint8Array(
      (sigHex.match(/../g) ?? []).map((h) => parseInt(h, 16))
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return null;
    // 不用 Buffer 的 "base64url"（部分 polyfill 只支持编码）：手动转标准 base64 再解码
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf-8")
    ) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 文件库公网基础地址 */
export async function getFileBase(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return (
    (env as unknown as { FILE_PUBLIC_BASE?: string }).FILE_PUBLIC_BASE ??
    "https://files.shiqing.site"
  );
}
