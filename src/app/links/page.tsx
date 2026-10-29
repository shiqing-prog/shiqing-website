import type { Metadata } from "next";
import Link from "next/link";
import LinkManager from "@/components/links/LinkManager";

export const metadata: Metadata = {
  title: "短链接",
  description:
    "把长得离谱的链接收成一条短地址：登录后粘贴链接即可生成 /s/xxxx 短链，支持自定义短码、点击统计与随时删除。",
  alternates: { canonical: "https://shiqing.site/links" },
};

export default function LinksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← 返回首页
      </Link>
      <h1 className="mt-4 border-l-4 border-blue-600 pl-3 text-2xl font-bold">🔗 短链接</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        把长链接收成一条短地址，转发到 QQ、群里或任何地方都干净利落。会记录每条链接被点开了多少次。
      </p>
      <LinkManager />
    </div>
  );
}
