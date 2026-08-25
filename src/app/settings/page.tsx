import type { Metadata } from "next";
import Link from "next/link";
import ChangePasswordForm from "@/components/user/ChangePasswordForm";
import AccountInfo from "@/components/user/AccountInfo";

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
      <h1 className="mt-3 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        账户设置
      </h1>
      <div className="kratos-card mt-6 p-6">
        <h2 className="font-semibold">账号信息</h2>
        <div className="mt-3">
          <AccountInfo />
        </div>
      </div>
      <div className="kratos-card mt-6 p-6">
        <h2 className="font-semibold">修改密码</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        💡 修改昵称与简介请到
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400"> 用户主页</Link>
        （点击右上角昵称即可）。
      </p>
    </div>
  );
}
