import type { Metadata } from "next";
import Link from "next/link";
import EditPostForm from "@/components/bbs/EditPostForm";

export const metadata: Metadata = { title: "编辑帖子" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/bbs/post/${id}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回帖子
      </Link>
      <h1 className="mt-3 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        编辑帖子
      </h1>
      <div className="kratos-card mt-6 p-6">
        <EditPostForm postId={id} />
      </div>
    </div>
  );
}
