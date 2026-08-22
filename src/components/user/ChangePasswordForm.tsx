"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ type: "err", text: "两次输入的新密码不一致" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      setMsg({ type: "ok", text: "✅ 密码已修改，下次登录请使用新密码" });
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "修改失败" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">当前密码</span>
        <input
          type="password"
          className={inputCls}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">新密码（至少 6 位）</span>
        <input
          type="password"
          className={inputCls}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "提交中…" : "修改密码"}
      </button>
    </form>
  );
}
