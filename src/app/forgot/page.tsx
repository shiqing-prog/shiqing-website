"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <div className="kratos-card p-6">
        <h1 className="text-center text-2xl font-bold">忘记密码</h1>
        {sent ? (
          <div className="mt-5 text-center">
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ 若该邮箱已注册，重置邮件已发送
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              请查收邮件并在 1 小时内点击链接设置新密码（也请检查垃圾邮件）。
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">注册邮箱</span>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-grad px-4 py-2.5 text-sm">
              {loading ? "发送中…" : "发送重置邮件"}
            </button>
            <Link
              href="/login"
              className="text-center text-xs text-gray-500 hover:underline dark:text-gray-400"
            >
              想起密码了？返回登录
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
