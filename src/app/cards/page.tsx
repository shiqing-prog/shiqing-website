import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "卡密领取",
  description: "领取 QQ 机器人卡密（领取页由 cards.shiqing.site 提供）。",
};

export default function CardsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        🎫 卡密领取
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        填写 QQ 号即可领取。领取页由{" "}
        <a
          href="https://cards.shiqing.site/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          cards.shiqing.site
        </a>{" "}
        提供；若下方未加载，可点链接新窗口打开。
      </p>
      <div className="kratos-card mt-6 overflow-hidden">
        <iframe
          src="https://cards.shiqing.site/"
          title="卡密领取"
          className="h-[760px] w-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
}
