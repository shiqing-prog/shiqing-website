import { NextResponse, type NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

/** POST /api/users/[id]/follow —— 关注/取消关注（通知被关注者） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const { id } = await params;
    const db = await getDb();
    const target = await db.getUserById(id);
    if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (target.id === user.id) {
      return NextResponse.json({ error: "不能关注自己" }, { status: 400 });
    }

    const wasFollowing = await db.isFollowing(user.id, target.id);
    const result = await db.toggleFollow(user.id, target.id);

    // 首次关注时通知被关注者
    if (result.following && !wasFollowing) {
      await db.createNotification({
        id: uid(),
        user_id: target.id,
        actor_id: user.id,
        type: "follow",
        post_id: null,
        reply_id: null,
        content: "",
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
