import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import type { BbsPost } from "@/lib/types";
import { getFileBase } from "@/lib/fileticket";
import { SESSION_COOKIE } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";
import { withHeadingIds } from "@/lib/toc";
import ReplyList from "@/components/bbs/ReplyList";
import PostContent from "@/components/bbs/PostContent";
import BbsPostCard from "@/components/bbs/BbsPostCard";
import PollBox from "@/components/bbs/PollBox";
import UserAvatar from "@/components/UserAvatar";
import { levelOf } from "@/lib/level";
import DeletePostButton from "@/components/bbs/DeletePostButton";
import EditPostButton from "@/components/bbs/EditPostButton";
import LikeButton from "@/components/bbs/LikeButton";
import StickyButton from "@/components/bbs/StickyButton";
import ShareButton from "@/components/bbs/ShareButton";
import FavoriteButton from "@/components/bbs/FavoriteButton";
import ExportButton from "@/components/bbs/ExportButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  return { title: post ? `${post.title} - 时倾` : "帖子不存在" };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const replyPage = Math.max(Number(pageStr ?? 1) || 1, 1);
  const REPLY_PAGE_SIZE = 20;

  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) notFound();
  const board = await db.getBoard(post.board_id);
  const { replies, total: replyTotal } = await db.listRepliesPage(
    id,
    replyPage,
    REPLY_PAGE_SIZE
  );
  const childReplies = await db.listChildReplies(id);
  const replyTotalPages = Math.max(Math.ceil(replyTotal / REPLY_PAGE_SIZE), 1);

  // 阅读计数 +1（Kratos 风格 meta）
  await db.incrementPostViews(id);
  const views = (post.view_count ?? 0) + 1;

  // 当前登录用户是否已赞/已收藏/已投票（服务端从 Cookie 会话判断）
  let liked = false;
  let favorited = false;
  let currentUserId: string | null = null;
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await db.getSession(token);
      if (session) {
        currentUserId = session.user_id;
        liked = await db.isPostLiked(id, session.user_id);
        favorited = await db.isPostFavorited(id, session.user_id);
      }
    }
  } catch {
    /* 忽略 */
  }
  const pollResult = await db.getPollResult(id, currentUserId ?? "");

  // 我的回复点赞集合 + 作者等级
  const allReplyIds = [...replies, ...childReplies].map((r) => r.id);
  const myReplyLikes = currentUserId
    ? await db.listReplyLikesByUser(currentUserId, allReplyIds)
    : [];
  const authorPoints = await db.getUserPoints(post.author_id);
  const authorLevel = levelOf(authorPoints.points);

  // 附件信息
  const attachmentFiles = await db.getFilesByIds(post.attachments ?? []);
  const fileBase = await getFileBase();
  const isImage = (mime: string) => mime.startsWith("image/");

  // 正文渲染 + 目录锚点
  const { html: bodyHtml, toc } = withHeadingIds(renderMarkdown(post.content));

  // 相关帖子：同标签优先，不足则同板块热门补齐
  const related: BbsPost[] = [];
  const seen = new Set<string>([post.id]);
  const firstTag = (post.tags ?? [])[0];
  if (firstTag) {
    const byTag = await db.listPosts({ tag: firstTag, pageSize: 8 });
    for (const p of byTag.posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      related.push(p);
      if (related.length >= 4) break;
    }
  }
  if (related.length < 4) {
    const byBoard = await db.listPosts({
      boardId: post.board_id,
      sort: "hot",
      pageSize: 8,
    });
    for (const p of byBoard.posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      related.push(p);
      if (related.length >= 4) break;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={board ? `/bbs/board/${board.slug}` : "/"}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← {board ? board.name : "返回"}
      </Link>

      {/* 主帖（Kratos 文章卡） */}
      <article className="kratos-card mt-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
          {post.title}
          {pollResult && (
            <span className="ml-2 align-middle rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-1 text-xs font-medium text-white">
              📊 投票帖
            </span>
          )}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <Link
            href={`/user/${post.author_id}`}
            className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <UserAvatar
              nickname={post.author_nickname ?? "匿名"}
              avatar={post.author_avatar}
              size={24}
            />
            {post.author_nickname ?? "匿名"}
          </Link>
          <span
            title={`${authorPoints.points} 积分`}
            className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
          >
            Lv{authorLevel.level} · {authorLevel.title}
          </span>
          <span>🕐 {fmtTime(post.created_at)}</span>
          {board && <span>📂 {board.name}</span>}
          <span>💬 {replyTotal} 回复</span>
          <span>👁 {views.toLocaleString()} 阅读</span>
          {(post.tags ?? []).map((t) => (
            <span
              key={t}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              #{t}
            </span>
          ))}
          {post.updated_at > post.created_at && (
            <span title="最后编辑时间">✏️ 编辑于 {fmtTime(post.updated_at)}</span>
          )}
          <span className="ml-auto flex items-center gap-2" data-gaprow="2">
            <LikeButton
              postId={post.id}
              initialLiked={liked}
              initialLikes={post.likes ?? 0}
            />
            <FavoriteButton postId={post.id} initialFavorited={favorited} />
            <ShareButton />
            <ExportButton postId={post.id} />
            <StickyButton postId={post.id} initialSticky={post.sticky === 1} />
            <EditPostButton postId={post.id} authorId={post.author_id} />
            <DeletePostButton
              postId={post.id}
              authorId={post.author_id}
              boardSlug={board?.slug}
            />
          </span>
        </div>
        {/* 正文（Markdown 渲染，html 已转义防 XSS）+ 目录 / 代码复制 / 图片放大 */}
        <PostContent html={bodyHtml} toc={toc} />

        {/* 投票贴 */}
        {pollResult && <PollBox postId={post.id} initial={pollResult} />}

        {/* 附件区 */}
        {attachmentFiles.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
              附件（{attachmentFiles.length}）
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {attachmentFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  {isImage(f.mime) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${fileBase}/download/${f.id}`}
                      alt={f.filename}
                      className="h-14 w-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-gray-100 text-xl dark:bg-gray-800">
                      📄
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.filename}</p>
                    <p className="text-xs text-gray-400">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <a
                    href={`${fileBase}/download/${f.id}`}
                    download
                    className="shrink-0 rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    ⬇ 下载
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* 回复列表（楼中楼嵌套，客户端组件） */}
      <ReplyList
        postId={post.id}
        topReplies={replies}
        childReplies={childReplies}
        replyTotal={replyTotal}
        replyPage={replyPage}
        replyTotalPages={replyTotalPages}
        myLikedIds={myReplyLikes}
      />

      {/* 相关帖子 */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="border-l-4 border-blue-600 pl-3 text-base font-bold">
            {firstTag ? `同标签 #${firstTag}` : "同板块推荐"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((p) => (
              <BbsPostCard key={p.id} post={p} boardName={board?.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
