"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setState("ok");
            setMessage(data.already ? "该邮箱此前已验证 ✅" : "邮箱验证成功 ✅");
          } else {
            setState("error");
            setMessage(data.error || "验证失败");
          }
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("网络错误，请稍后重试");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {state === "loading" && (
        <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">正在验证邮箱…</p>
        </>
      )}
      {state === "ok" && (
        <>
          <p className="text-5xl">✅</p>
          <h1 className="mt-4 text-2xl font-bold">{message}</h1>
          <p className="mt-2 text-sm text-gray-500">现在可以正常登录使用论坛了。</p>
        </>
      )}
      {state === "error" && (
        <>
          <p className="text-5xl">❌</p>
          <h1 className="mt-4 text-2xl font-bold">验证失败</h1>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        </>
      )}
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        返回首页
      </Link>
    </div>
  );
}
