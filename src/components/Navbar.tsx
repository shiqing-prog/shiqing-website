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
  { href: "/psych", label: "测评" },
  { href: "/games", label: "游戏" },
  { href: "/changelog", label: "更新日志" },
  { href: "/tools", label: "工具" },
  { href: "/links", label: "短链" },
  { href: "/developers", label: "API" },
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
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#faf9f7]/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0d0d0f]/95">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          ShiQing<span className="text-blue-600 dark:text-blue-400">.</span>
        </Link>
        <div className="flex items-center gap-1 text-sm" data-gaprow="1">
          {/* 桌面端导航链接（移动端用底部 Tab 栏） */}
          <div className="hidden items-center gap-1 lg:flex" data-gaprow="1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-[2px] px-3 py-1.5 transition ${
                  pathname === l.href
                    ? "nav-active"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          {user ? (
            <div className="ml-2 flex items-center gap-2" data-gaprow="2">
              <Link
                href={`/user/${user.id}`}
                className="hidden items-center gap-1.5 rounded-[2px] border border-black/12 py-1 pl-1 pr-3 font-medium text-gray-700 transition-colors hover:border-black/30 sm:flex dark:border-white/12 dark:text-gray-200 dark:hover:border-white/30"
              >
                <UserAvatar nickname={user.nickname} avatar={user.avatar} size={26} />
                {user.nickname}
              </Link>
              <button
                onClick={logout}
                className="rounded-[2px] border border-black/15 px-3 py-1.5 text-gray-600 transition-colors hover:border-black/40 hover:text-gray-900 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white"
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
