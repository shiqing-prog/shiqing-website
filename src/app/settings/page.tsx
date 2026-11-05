import type { Metadata } from "next";
import Link from "next/link";
import ChangePasswordForm from "@/components/user/ChangePasswordForm";
import AccountInfo from "@/components/user/AccountInfo";
import EmailVerifyStatus from "@/components/user/EmailVerifyStatus";
import EmailNotifyToggle from "@/components/user/EmailNotifyToggle";
import CardRedeem from "@/components/user/CardRedeem";

export const metadata: Metadata = { title: "账户设置" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回首页
      </Link>
      <h1 className="mt-3 section-title text-2xl">
        账户设置
      </h1>
      <div className="kratos-card mt-6 p-6">
        <h2 className="font-semibold">账号信息</h2>
        <div className="mt-3">
          <AccountInfo />
        </div>
        <div className="mt-4">
          <EmailVerifyStatus />
        </div>
      </div>
      <div className="mt-4">
        <EmailNotifyToggle />
      </div>
      <div className="mt-4">
        <CardRedeem />
      </div>
      <div className="kratos-card mt-6 p-6">
        <h2 className="font-semibold">修改密码</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
      <div className="kratos-card mt-6 p-6">
        <h2 className="font-semibold">导出我的数据</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          把帖子、回复、收藏、稍后读、关注、私信、签到、心理测评记录打包成一个 JSON 下载下来。
          里面不含密码、会话与 API 令牌。
        </p>
        <a
          href="/api/export"
          className="mt-3 inline-block rounded-[2px] bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          ⬇ 下载 JSON
        </a>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        💡 修改昵称与简介请到
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400"> 用户主页</Link>
        （点击右上角昵称即可）。
      </p>
    </div>
  );
}
