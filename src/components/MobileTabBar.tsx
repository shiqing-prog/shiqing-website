"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * 移动端专属底部 Tab 导航（< lg 显示）
 * 手机上的主入口：首页 / 文件库 / 游戏 / 工具 / 我的
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const user = useCurrentUser();

  const tabs = [
    { href: "/", label: "首页", icon: "🏠" },
    { href: "/psych", label: "测评", icon: "🧠" },
    { href: "/files", label: "文件库", icon: "📁" },
    { href: "/games", label: "游戏", icon: "🎮" },
    { href: "/tools", label: "工具", icon: "🧰" },
    { href: user ? `/user/${user.id}` : "/login", label: "我的", icon: "👤" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#faf9f7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden dark:border-white/10 dark:bg-[#0d0d0f]/95">
      <div className="flex">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 border-t-2 py-2 text-[11px] transition-colors ${
              isActive(t.href)
                ? "border-blue-600 font-medium text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
