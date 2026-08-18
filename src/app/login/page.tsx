import type { Metadata } from "next";
import AuthPanel from "@/components/auth/AuthPanel";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <AuthPanel mode="login" />
    </div>
  );
}
