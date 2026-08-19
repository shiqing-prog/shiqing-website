export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-6 dark:border-gray-800">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-1 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} ShiQing 星夜 · 用 Next.js 与 ❤️ 构建</p>
        <p>
          <a
            href="https://github.com/yourname"
            className="underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <span className="mx-2">·</span>
          <a
            href="mailto:you@example.com"
            className="underline-offset-2 hover:underline"
          >
            you@example.com
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
