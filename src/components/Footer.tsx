import Link from "next/link";

const NAV = [
  { href: "/psych", label: "心理测评" },
  { href: "/tags", label: "标签云" },
  { href: "/archive", label: "归档" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/stats", label: "站点统计" },
  { href: "/status", label: "服务状态" },
  { href: "/cards", label: "卡密领取" },
  { href: "/links", label: "短链" },
  { href: "/developers", label: "开发者 API" },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-black/10 pt-7 pb-10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <p className="font-serif text-base font-semibold tracking-tight">
              ShiQing<span className="text-blue-600 dark:text-blue-400">.</span>
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                时倾
              </span>
            </p>
            <p className="meta mt-1.5">
              © {new Date().getFullYear()} · 技术笔记 · 生活杂谈 · 资源共享
            </p>
          </div>

          <nav
            className="flex max-w-xl flex-wrap gap-x-5 gap-y-2 sm:justify-end"
            data-gaprow="3"
          >
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-black/[0.07] pt-4 dark:border-white/[0.07]"
          data-gaprow="3"
        >
          <a
            href="https://github.com/shiqing-prog"
            className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="mailto:3100722103@qq.com"
            className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            3100722103@qq.com
          </a>
          <a
            href="https://icp.gov.moe/?keyword=20260817"
            target="_blank"
            rel="noreferrer"
            className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            萌ICP备20260817号
          </a>
          <a
            href="/feed.xml"
            className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            RSS
          </a>
          <a
            href="/sitemap.xml"
            className="meta transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            站点地图
          </a>
          <span className="meta sm:ml-auto">用 Next.js 构建</span>
        </div>
      </div>
    </footer>
  );
}
