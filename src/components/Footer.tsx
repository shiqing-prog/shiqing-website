import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-6 dark:border-gray-800">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p
          className="mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          data-gaprow="3"
        >
          <Link href="/psych" className="underline-offset-2 hover:underline">
            心理测评
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/tags" className="underline-offset-2 hover:underline">
            标签云
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/stats" className="underline-offset-2 hover:underline">
            站点统计
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <a href="/feed.xml" className="underline-offset-2 hover:underline">
            RSS 订阅
          </a>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <a href="/sitemap.xml" className="underline-offset-2 hover:underline">
            站点地图
          </a>
        </p>
        <p>© {new Date().getFullYear()} ShiQing 时倾 · 用 Next.js 与 ❤️ 构建</p>
        <p>
          <a
            href="https://github.com/shiqing-prog"
            className="underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <span className="mx-2">·</span>
          <a
            href="mailto:3100722103@qq.com"
            className="underline-offset-2 hover:underline"
          >
            3100722103@qq.com
          </a>
        </p>
        <p>
          <a
            href="https://icp.gov.moe/?keyword=20260817"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            萌ICP备20260817号
          </a>
        </p>
      </div>
    </footer>
  );
}
