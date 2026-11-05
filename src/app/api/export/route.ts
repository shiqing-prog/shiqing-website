import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { serverError } from "@/lib/http";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * GET /api/export —— 导出当前账号的全部个人数据（JSON 下载）
 *
 * 只导出**属于本人**的数据：帖子、回复、收藏、稍后读、关注关系、
 * 签到、心理测评、短链、通知、私信会话；API 令牌只给前缀，不落明文，
 * 避免用户把导出文件转发出去后令牌一起泄露。
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  // 导出会连带拉私信全文，限制频率，别让人拿它当压库工具
  const rl = await checkRateLimit(`export:${user.id}`, 3, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "导出太频繁，请过几分钟再试" }, { status: 429 });
  }

  try {
    const db = await getDb();
    const [posts, replies, favorites, bookmarks, tagFollows, psych, links, notifications, followers, following, signinDays] =
      await Promise.all([
        db.listPosts({ authorId: user.id, page: 1, pageSize: 500 }),
        db.listRepliesByUser(user.id, 500),
        db.listFavoritePosts(user.id),
        db.listBookmarks(user.id),
        db.listTagFollows(user.id),
        db.listPsychResults(user.id, 500),
        db.listShortLinks(user.id),
        db.listNotifications(user.id, 500),
        db.listFollowers(user.id),
        db.listFollowing(user.id),
        db.listSigninDays(user.id, 365),
      ]);

    const conversations = await db.listConversations(user.id);
    const threads = [];
    for (const c of conversations.slice(0, 50)) {
      const { messages } = await db.listMessages(user.id, c.userId, { limit: 200 });
      threads.push({ peer: c.nickname, peer_id: c.userId, messages });
    }

    const payload = {
      exported_at: new Date().toISOString(),
      site: "https://shiqing.site",
      user,
      stats: {
        posts: posts.total,
        replies: replies.length,
        favorites: favorites.length,
        bookmarks: bookmarks.length,
        conversations: conversations.length,
      },
      posts: posts.posts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        tags: p.tags,
        created_at: p.created_at,
        updated_at: p.updated_at,
        views: p.view_count,
        likes: p.likes,
      })),
      replies: replies.map((r) => ({
        id: r.id,
        post_id: r.post_id,
        content: r.content,
        created_at: r.created_at,
      })),
      favorites: favorites.map((p) => ({ id: p.id, title: p.title })),
      bookmarks: bookmarks.map((p) => ({
        id: p.id,
        title: p.title,
        bookmarked_at: p.bookmarked_at,
        read_at: p.bookmark_read_at,
      })),
      tag_follows: tagFollows,
      psych_results: psych.map((r) => ({
        scale: r.scale_slug,
        total: r.total,
        max: r.max,
        level: r.level,
        type_code: r.type_code,
        created_at: r.created_at,
      })),
      short_links: links.map((l) => ({ code: l.code, url: l.url, clicks: l.clicks })),
      notifications: notifications.map((n) => ({
        type: n.type,
        content: n.content,
        created_at: n.created_at,
      })),
      following: following.map((u) => u.nickname),
      followers: followers.map((u) => u.nickname),
      signin_days: signinDays,
      conversations: threads,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="shiqing-data-${user.id}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return serverError("export.data", err);
  }
}
