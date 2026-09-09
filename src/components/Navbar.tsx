"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser, refreshCurrentUser } from "@/lib/useCurrentUser";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import StyleSwitcher from "./StyleSwitcher";
import UserAvatar from "./UserAvatar";

const links = [
  { href: "/", label: "首页" },
  { href: "/files", label: "文件库" },
  { href: "/games", label: "游戏" },
  { href: "/changelog", label: "更新日志" },
  { href: "/tools", label: "工具" },
  { href: "/about", label: "关于" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    refreshCurrentUser();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-grad">{"<ShiQing />"}</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {/* 桌面端导航链接（移动端用底部 Tab 栏） */}
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 transition ${
                  pathname === l.href
                    ? "nav-active"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href={`/user/${user.id}`}
                className="hidden items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-1 pr-3 font-medium text-blue-700 transition hover:bg-blue-100 sm:flex dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                <UserAvatar nickname={user.nickname} avatar={user.avatar} size={26} />
                {user.nickname}
              </Link>
              <button
                onClick={logout}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
              >
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-grad ml-2 px-3 py-1.5 text-sm"
            >
              登录 / 注册
            </Link>
          )}
          <NotificationBell />
          <StyleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
