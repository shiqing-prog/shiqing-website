"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "首页" },
  { href: "/files", label: "文件库" },
  { href: "/changelog", label: "更新日志" },
  { href: "/tools", label: "工具" },
  { href: "/about", label: "关于" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ nickname: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {"<ShiQing />"}
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 transition ${
                pathname === l.href
                  ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700 sm:inline dark:bg-blue-950 dark:text-blue-300">
                {user.nickname}
              </span>
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
              className="ml-2 rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
