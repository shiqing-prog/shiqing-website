import { NextResponse } from "next/server";
import { getDb } from "@/lib/data";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/posts/[id]/view —— 阅读数 +1
 *
 * 计数从「服务端渲染时写库」挪到这里：页面里写库会让 <Link prefetch>、
 * 爬虫、CDN 预取都算成一次阅读，还会让帖子页彻底无法缓存。
 * 现在只有客户端真正挂载后才上报一次（sessionStorage 去重）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // 未登录也能上报，但限一个人一分钟最多 3 次，避免脚本把阅读数刷上天
  const rl = await checkRateLimit(`view:${clientIp(request)}:${id}`, 3, 60 * 1000);
  if (!rl.ok) return NextResponse.json({ ok: true });
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 });

  await db.incrementPostViews(id);
  return NextResponse.json({ ok: true, views: (post.view_count ?? 0) + 1 });
}
