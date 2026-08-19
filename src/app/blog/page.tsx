import { redirect } from "next/navigation";

// 原博客已升级为更新日志
export default function BlogRedirect() {
  redirect("/changelog");
}
