import { NextResponse } from "next/server";

/**
 * 统一的 5xx 响应。
 *
 * 直接把 `err.message` 回给客户端会泄漏 D1/SQLite 的语句片段、表结构、
 * 约束名等内部信息，因此这里只回固定文案，原始异常写服务端日志
 * （Worker 已开启 observability）。
 */
export function serverError(
  tag: string,
  err: unknown,
  friendly = "服务器开小差了，请稍后再试"
): NextResponse {
  console.error(`[${tag}]`, err);
  return NextResponse.json({ error: friendly }, { status: 500 });
}
