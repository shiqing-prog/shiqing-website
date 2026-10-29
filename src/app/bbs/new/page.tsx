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
      <h1 className="section-title text-2xl">发新帖</h1>
      <div className="kratos-card mt-6 p-6">
        <NewPostForm defaultBoard={board} />
      </div>
    </div>
  );
}
