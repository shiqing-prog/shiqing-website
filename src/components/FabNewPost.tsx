"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

/** 移动端右下角悬浮发帖按钮（登录后显示，避开底部 Tab 栏） */
export default function FabNewPost() {
  const user = useCurrentUser();
  const pathname = usePathname();

  // 发帖页自身不显示
  if (!user || pathname === "/bbs/new") return null;

  return (
    <Link
      href="/bbs/new"
      title="发新帖"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-500/30 transition active:scale-95 lg:hidden"
    >
      ✏️
    </Link>
  );
}
