"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function EditPostButton({
  postId,
  authorId,
}: {
  postId: string;
  authorId: string;
}) {
  const user = useCurrentUser();

  const canEdit = user && user.id === authorId;
  if (!canEdit) return null;

  return (
    <Link
      href={`/bbs/post/${postId}/edit`}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      ✏️ 编辑
    </Link>
  );
}
