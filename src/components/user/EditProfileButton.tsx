"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicUser } from "@/lib/types";

export default function EditProfileButton({ userId }: { userId: string }) {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUser(d.user ?? null);
      })
      .catch(() => setUser(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.id !== userId) return null;

  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href="/favorites"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        ⭐ 我的收藏
      </Link>
      <Link
        href={`/user/${userId}/edit`}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        ✏️ 编辑资料
      </Link>
      <Link
        href="/settings"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        ⚙️ 设置
      </Link>
    </div>
  );
}
