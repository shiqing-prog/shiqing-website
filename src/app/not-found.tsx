import type { Metadata } from "next";
import Link from "next/link";

// 404 之前沿用根布局的默认标题「ShiQing 时倾」，标签页上分不出是哪里出错。
// 不在这里写 robots：Next 对 404 会自动注入 <meta name="robots" content="noindex">，
// 再写一份会输出两个重复标签。
export const metadata: Metadata = {
  title: "页面不存在",
  description: "你访问的页面可能已被移动或删除。",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</p>
      <h1 className="mt-4 text-2xl font-bold">页面不存在</h1>
      <p className="mt-2 text-gray-500">你访问的页面可能已被移动或删除。</p>
      <Link
        href="/"
        className="mt-6 rounded-[2px] bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        返回首页
      </Link>
    </div>
  );
}
