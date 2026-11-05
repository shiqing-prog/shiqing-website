import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/data";
import { getSessionUserFromCookies } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  return {
    title: post ? `《${post.title}》的编辑历史 - 时倾` : "编辑历史",
    robots: { index: false },
  };
}

export default async function PostHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const post = await db.getPost(id);
  if (!post) notFound();

  const me = await getSessionUserFromCookies();
  const isAuthor = !!me && me.id === post.author_id;
  const isAdmin = me?.role === "admin";
  // 正文只给作者和管理员看：否则历史版本会变成"删了还能翻"的擦除漏洞
  const canViewContent = isAuthor || isAdmin;

  const revisions = await safe(db.listPostRevisions(id, 50), [], "编辑历史");

  // 从旧到新编号，最新的当前版本排最后
  const ordered = [...revisions].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/bbs/post/${id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 回到《{post.title}》
      </Link>
      <h1 className="mt-4 section-title text-2xl">编辑历史</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        共 {ordered.length + 1} 个版本（含当前版本）。每次保存正文或标题有变化才会留一条快照。
      </p>

      <ol className="mt-6 flex flex-col gap-3">
        {ordered.map((rev, i) => (
          <li key={rev.id} className="kratos-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-[2px] bg-gray-100 px-2 py-0.5 font-medium dark:bg-gray-800">
                v{i + 1}
              </span>
              <span>{fmtDateTime(rev.created_at)}</span>
              {rev.editor_nickname && <span>· 编辑者 {rev.editor_nickname}</span>}
              <span>· {rev.content.length} 字</span>
            </div>
            <p className="mt-2 font-medium">{rev.title}</p>
            {canViewContent ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400">
                  展开这一版正文
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[2px] bg-gray-50 p-3 text-xs leading-relaxed dark:bg-gray-900">
                  {rev.content}
                </pre>
              </details>
            ) : (
              <p className="mt-2 text-xs text-gray-400">正文仅作者本人与管理员可见</p>
            )}
          </li>
        ))}

        <li className="kratos-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="rounded-[2px] bg-blue-600 px-2 py-0.5 font-medium text-white">
              v{ordered.length + 1} 当前
            </span>
            <span>{fmtDateTime(post.updated_at || post.created_at)}</span>
            <span>· {post.content.length} 字</span>
          </div>
          <p className="mt-2 font-medium">{post.title}</p>
          {canViewContent && (
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[2px] bg-gray-50 p-3 text-xs leading-relaxed dark:bg-gray-900">
              {post.content}
            </pre>
          )}
        </li>
      </ol>
    </div>
  );
}
