"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function EmailVerifyStatus() {
  const user = useCurrentUser();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetch("/api/auth/verify-enabled").then((r) => r.json());
        if (!cancelled) setEnabled(Boolean(cfg.enabled));
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (enabled === false || enabled === null) return null;

  const verified = Boolean(user?.email_verified);

  async function resend() {
    setSending(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/resend-verify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发送失败");
      setMsg("✅ 验证邮件已重新发送，请查收");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "发送失败"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-gray-700">
      <span className="flex items-center gap-2">
        邮箱验证：
        {verified ? (
          <span className="text-green-600">✅ 已验证</span>
        ) : (
          <span className="text-amber-600">⚠️ 未验证</span>
        )}
      </span>
      {!verified && (
        <button
          onClick={resend}
          disabled={sending}
          className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          {sending ? "发送中…" : "重新发送验证邮件"}
        </button>
      )}
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
