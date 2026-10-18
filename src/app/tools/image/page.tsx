import type { Metadata } from "next";
import Link from "next/link";
import ImageCompressTool from "@/components/tools/ImageCompressTool";

export const metadata: Metadata = {
  title: "图片压缩 / 格式转换",
  description:
    "免费在线图片压缩与格式转换工具：批量压缩 JPG / PNG / WebP 图片，一键转 WebP、AVIF、JPEG、PNG，支持按边长缩放、按体积压到指定 KB。全部在浏览器本地用 Canvas 处理，图片不会上传服务器。",
  alternates: { canonical: "https://shiqing.site/tools/image" },
};

export default function ImageToolsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">图片压缩 / 格式转换</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        批量压缩、转格式、缩放、按体积压缩，纯浏览器本地处理，图片不上传。
      </p>

      <div className="mt-8">
        <ImageCompressTool />
      </div>

      <p className="mt-8 text-sm text-gray-500">
        <Link href="/tools" className="hover:underline">
          ← 返回工具箱
        </Link>
      </p>
    </div>
  );
}
