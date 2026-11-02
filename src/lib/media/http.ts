/**
 * 媒体解析用的小工具：统一的 UA、超时、cookie 透传。
 *
 * 解析接口都是「服务端替调用方去取」，所以超时一律卡在 8 秒内，
 * 免得调用方（和 Worker）被一个慢源拖死。
 */

export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  ua?: string;
}

/** 取文本，失败抛错（调用方统一兜成 502） */
export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const response = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "user-agent": opts.ua ?? DESKTOP_UA,
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      ...opts.headers,
    },
    body: opts.body,
    signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.text();
}

/** 取 JSON */
export async function fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("响应不是合法 JSON");
  }
}

/** 从 Set-Cookie 头里拼出 Cookie 请求头 */
export function cookieFrom(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

/** 秒级时间戳 */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
