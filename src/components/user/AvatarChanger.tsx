"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { chunkedUpload } from "@/lib/chunkedUpload";
import { refreshCurrentUser } from "@/lib/useCurrentUser";
import UserAvatar from "../UserAvatar";

/** 更换头像：选图 → 分片上传到文件库 → 更新 profile.avatar */
export default function AvatarChanger({
  nickname,
  avatar,
}: {
  nickname: string;
  avatar?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(file: File) {
    setMsg("");
    if (!file.type.startsWith("image/")) {
      setMsg("❌ 请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg("❌ 头像图片不超过 5MB");
      return;
    }
    setBusy(true);
    try {
      const chunkCount = Math.max(Math.ceil(file.size / (2 * 1024 * 1024)), 1);
      const ticketRes = await fetch("/api/files/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          mime: file.type,
          chunks: chunkCount,
        }),
      });
      const ticketData = await ticketRes.json();
      if (!ticketRes.ok) throw new Error(ticketData.error || "获取上传凭证失败");

      await chunkedUpload({
        file,
        uploadUrl: ticketData.uploadUrl,
        ticket: ticketData.ticket,
      });

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: ticketData.fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存头像失败");

      refreshCurrentUser();
      router.refresh();
      setMsg("✅ 头像已更新");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "上传失败"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <UserAvatar nickname={nickname} avatar={avatar} size={48} />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        >
          {busy ? "上传中…" : "更换头像"}
        </button>
        {msg && <p className="mt-1 text-xs text-gray-500">{msg}</p>}
      </div>
    </div>
  );
}
