import type { Metadata } from "next";
import FileLibrary from "@/components/files/FileLibrary";

export const metadata: Metadata = { title: "文件库" };

export default function FilesPage() {
  return <FileLibrary />;
}
