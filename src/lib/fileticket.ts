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

/** 文件库公网基础地址 */
export async function getFileBase(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return (
    (env as unknown as { FILE_PUBLIC_BASE?: string }).FILE_PUBLIC_BASE ??
    "https://files.shiqing.site"
  );
}
