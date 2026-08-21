import type { Metadata } from "next";
import Link from "next/link";
import EditProfileForm from "@/components/user/EditProfileForm";

export const metadata: Metadata = { title: "编辑资料" };

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/user/${id}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← 返回用户主页
      </Link>
      <h1 className="mt-3 border-l-4 border-blue-600 pl-3 text-2xl font-bold">
        编辑资料
      </h1>
      <div className="kratos-card mt-6 p-6">
        <EditProfileForm userId={id} />
      </div>
    </div>
  );
}
