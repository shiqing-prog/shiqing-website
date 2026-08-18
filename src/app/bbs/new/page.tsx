import type { Metadata } from "next";
import NewPostForm from "@/components/bbs/NewPostForm";

export const metadata: Metadata = { title: "发新帖" };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">发新帖</h1>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <NewPostForm defaultBoard={board} />
      </div>
    </div>
  );
}
