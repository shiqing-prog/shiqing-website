import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { isValidShortCode } from "@/lib/shortlink";

/** 短链 404 响应：纯文本 + noindex，别让搜索引擎收录 */
function notFound() {
  return new Response("短链不存在或已被删除", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

/**
 * GET /s/[code] —— 短链跳转。
 *
 * 用 302 而不是 301：短链可以随时删除，301 会被浏览器长期缓存，
 * 删除后用户仍然会被跳到旧地址，容易误以为「删不掉」。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!isValidShortCode(code)) return notFound();

  const db = await getDb();
  const link = await db.getShortLink(code);
  if (!link) return notFound();

  try {
    await db.incrementShortLinkClicks(code);
  } catch {
    // 计数失败不该导致跳转失败：宁可少记一次，也别让用户看到 500
  }

  const res = NextResponse.redirect(link.url, 302);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex");
  return res;
}
