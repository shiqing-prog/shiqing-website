import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</p>
      <h1 className="mt-4 text-2xl font-bold">页面不存在</h1>
      <p className="mt-2 text-gray-500">你访问的页面可能已被移动或删除。</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        返回首页
      </Link>
    </div>
  );
}
