"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicUser } from "@/lib/types";

export default function EditPostButton({
  postId,
  authorId,
}: {
  postId: string;
  authorId: string;
}) {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

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
