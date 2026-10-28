import { NextResponse } from "next/server";

/**
 * 统一的 5xx 响应。
 *
 * 直接把 `err.message` 回给客户端会泄漏 D1/SQLite 的语句片段、表结构、
 * 约束名等内部信息，因此这里只回固定文案，原始异常写服务端日志
 * （Worker 已开启 observability）。
 */
/**
 * 把任意输入规整成安全字符串：非字符串一律当空串，再去空白、截断。
 *
 * 直接写 `(body.filename ?? "").trim()` 时，客户端传 `{"filename": 123}`
 * 会触发 `... .trim is not a function` 的 TypeError，最后变成 500。
 */
export function asString(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * 解析 JSON 请求体。非法 JSON、数组、null、原始值都返回 null，
 * 由调用方回 400，而不是让 `request.json()` 抛错变 500。
 */
export async function readJsonBody(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** D1/SQLite 的唯一约束冲突（「先查后写」在并发下的兜底识别） */
export function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /UNIQUE constraint failed/i.test(msg);
}

export function serverError(
  tag: string,
  err: unknown,
  friendly = "服务器开小差了，请稍后再试"
): NextResponse {
  console.error(`[${tag}]`, err);
  return NextResponse.json({ error: friendly }, { status: 500 });
}
