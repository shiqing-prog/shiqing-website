import type { Metadata } from "next";
import Link from "next/link";
import { DOC_NAV } from "@/lib/docs";
import DocsSidebar from "@/components/docs/DocsSidebar";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: {
    default: "ShiQing 文档",
    template: "%s | ShiQing 文档",
  },
  description: "ShiQing 时倾的使用文档：全站功能说明与开发者 API 参考。",
  metadataBase: new URL("https://docs.shiqing.site"),
};

/**
 * 文档站外壳。
 *
 * 主站的顶栏 / 页脚已在根 layout 里由 SiteChromeGate 关掉（/docs 前缀），
 * 这里换成一套独立的极简外壳：左边目录、右边正文，两个域名共用同一份路由。
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#faf9f7]/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0d0d0f]/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/docs" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-semibold tracking-tight">
              ShiQing<span className="text-blue-600 dark:text-blue-400">.</span>
            </span>
            <span className="meta">docs</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="https://shiqing.site"
              className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              主站
            </a>
            <a
              href="https://shiqing.site/api/v1/openapi.json"
              className="hidden text-gray-600 transition hover:text-gray-900 sm:block dark:text-gray-400 dark:hover:text-white"
            >
              OpenAPI
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-4 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <DocsSidebar groups={DOC_NAV} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="lg:hidden">
            <Link
              href="/docs"
              className="meta inline-block border-b border-black/15 pb-1 dark:border-white/15"
            >
              ← 文档目录
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
