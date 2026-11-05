import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "离线了 - ShiQing 时倾",
  description: "网络断了，这里是本地缓存的离线提示页。",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-4xl">📡</p>
      <h1 className="mt-4 text-xl font-bold">现在没有网络</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        这个页面是本地缓存的，所以还打得开。等网络回来再刷新，
        帖子、通知和卡密都需要联网才能读到。
      </p>
      <Link
        href="/"
        className="mt-6 rounded-[2px] bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        重试首页
      </Link>
    </div>
  );
}
