"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentUser, refreshCurrentUser } from "@/lib/useCurrentUser";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

export default function EditProfileForm({ userId }: { userId: string }) {
  const router = useRouter();
  const user = useCurrentUser();

  if (!user || user.id !== userId) {
    return (
      <div className="kratos-card p-8 text-center text-sm text-gray-500">
        只能编辑自己的资料，
        <Link href={`/user/${userId}`} className="text-blue-600 hover:underline dark:text-blue-400">
          返回用户主页
        </Link>
      </div>
    );
  }

  // 表单仅在 user 加载完成后渲染，挂载时即可用初始值预填（避免在 effect 中同步 setState）
  return (
    <ProfileForm
      userId={userId}
      router={router}
      initialNickname={user.nickname}
      initialBio={user.bio ?? ""}
    />
  );
}

function ProfileForm({
  userId,
  router,
  initialNickname,
  initialBio,
}: {
  userId: string;
  router: ReturnType<typeof useRouter>;
  initialNickname: string;
  initialBio: string;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      refreshCurrentUser();
      router.push(`/user/${userId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">昵称</span>
        <input
          className={inputCls}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          maxLength={20}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">个人简介</span>
        <textarea
          rows={4}
          className={inputCls}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="一句话介绍自己"
          maxLength={200}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存资料"}
        </button>
        <Link
          href={`/user/${userId}`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
