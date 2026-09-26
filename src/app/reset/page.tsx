"use client";

import { use, useState } from "react";
import Link from "next/link";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = use(searchParams);
  const token = sp.token ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重置失败");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-16">
        <div className="kratos-card p-8 text-center text-sm text-gray-500">
          链接无效（缺少凭证），
          <Link href="/forgot" className="text-blue-600 hover:underline dark:text-blue-400">
            重新申请重置
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <div className="kratos-card p-6">
        <h1 className="text-center text-2xl font-bold">设置新密码</h1>
        {done ? (
          <div className="mt-5 text-center">
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ 密码已重置，请用新密码登录
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              为安全起见，其他设备的登录状态已全部退出。
            </p>
            <Link href="/login" className="btn-grad mt-5 inline-block px-4 py-2 text-sm">
              去登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">新密码（至少 6 位）</span>
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">确认新密码</span>
              <input
                type="password"
                className={inputCls}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-grad px-4 py-2.5 text-sm">
              {loading ? "提交中…" : "重置密码"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
