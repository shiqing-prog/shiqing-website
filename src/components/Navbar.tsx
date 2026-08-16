import Link from "next/link";

const links = [
  { href: "/", label: "首页" },
  { href: "/projects", label: "项目" },
  { href: "/blog", label: "博客" },
  { href: "/tools", label: "工具" },
  { href: "/about", label: "关于" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {"<我的网站 />"}
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-2 rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
          >
            管理
          </Link>
        </div>
      </nav>
    </header>
  );
}
