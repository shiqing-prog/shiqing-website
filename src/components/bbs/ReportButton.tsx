"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS } from "@/lib/types";

/**
 * 举报按钮 + 理由弹窗。
 *
 * 理由白名单与服务端共用 REPORT_REASONS，避免前后端文案漂移；
 * 提交成功后按钮变灰并提示"已收到"，不给二次提交的入口。
 */
export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "post" | "reply";
  targetId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, detail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "举报失败");
      }
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "举报失败");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <span className="text-xs text-gray-400">✓ 已收到举报</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-[2px] border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-red-500 hover:text-red-600 dark:border-gray-700 dark:text-gray-300"
      >
        ⚠ 举报
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-[2px] border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            举报理由
          </p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-2 w-full rounded-[2px] border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            {Object.entries(REPORT_REASONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 500))}
            placeholder="补充说明（选填）"
            rows={3}
            className="mb-2 w-full rounded-[2px] border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-[2px] px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-[2px] bg-red-600 px-3 py-1 text-xs text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "提交中…" : "提交"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
