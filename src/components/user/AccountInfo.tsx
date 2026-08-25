"use client";

import { useEffect, useState } from "react";

export default function AccountInfo() {
  const [user, setUser] = useState<{
    email: string;
    nickname: string;
    role: string;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUser(d.user ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const d = new Date(user.created_at);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between border-b border-gray-100 py-2 dark:border-gray-800">
        <span className="text-gray-500">昵称</span>
        <span className="font-medium">{user.nickname}</span>
      </div>
      <div className="flex justify-between border-b border-gray-100 py-2 dark:border-gray-800">
        <span className="text-gray-500">邮箱</span>
        <span className="font-medium">{user.email}</span>
      </div>
      <div className="flex justify-between border-b border-gray-100 py-2 dark:border-gray-800">
        <span className="text-gray-500">角色</span>
        <span className="font-medium">
          {user.role === "admin" ? "管理员" : "普通用户"}
        </span>
      </div>
      <div className="flex justify-between py-2">
        <span className="text-gray-500">注册时间</span>
        <span className="font-medium">{date}</span>
      </div>
    </div>
  );
}
