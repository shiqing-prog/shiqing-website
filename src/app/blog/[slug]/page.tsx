import { redirect } from "next/navigation";

// 原博客文章已并入更新日志
export default function BlogPostRedirect() {
  redirect("/changelog");
}
