"use client";

import { useState } from "react";
import { useCurrentUser, refreshCurrentUser } from "@/lib/useCurrentUser";

export default function EmailNotifyToggle() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const enabled = Boolean(user?.notify_email);

  if (!user) return null;

  async function toggle() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEmail: !enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      refreshCurrentUser();
      setMsg(enabled ? "已关闭邮件提醒" : "✅ 已开启邮件提醒");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "保存失败"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kratos-card flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm font-bold">📧 邮件提醒</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          有人回复你的帖子或 @你 时，发送提醒邮件到 {user.email}
        </p>
        {msg && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">{msg}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          enabled
            ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            : "border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
      >
        {busy ? "保存中…" : enabled ? "已开启" : "已关闭"}
      </button>
    </div>
  );
}
