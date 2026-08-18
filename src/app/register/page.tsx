import type { Metadata } from "next";
import AuthPanel from "@/components/auth/AuthPanel";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <AuthPanel mode="register" />
    </div>
  );
}
