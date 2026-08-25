"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
const btnCls =
  "w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50";

export default function AuthPanel({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tab === "register" ? { email, password, nickname } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      if (tab === "register") {
        // 显示验证邮件提示后进入首页
        setMsg(
          data.mailSent
            ? "✅ 注册成功！验证邮件已发送到你的邮箱，请查收并点击链接完成验证。"
            : "✅ 注册成功！（邮件服务未配置，暂未发送验证邮件）"
        );
        await new Promise((r) => setTimeout(r, 1500));
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="kratos-card p-6">
        <h1 className="text-center text-2xl font-bold">
          {tab === "login" ? "登录" : "注册账号"}
        </h1>

        {/* Tab 切换 */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              ["login", "登录"],
              ["register", "注册"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError("");
              }}
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {tab === "register" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">昵称</span>
              <input
                className={inputCls}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="如何称呼你"
                required
                maxLength={20}
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">邮箱</span>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="3100722103@qq.com"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">密码</span>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "至少 6 位" : "输入密码"}
              required
              minLength={6}
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "处理中…" : tab === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
