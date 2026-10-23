import type { Metadata } from "next";
import ToolsIndex from "@/components/tools/ToolsIndex";

// 之前这里是 "use client" 页面：Client Component 不能导出 metadata，
// 于是 /tools 的 <title> 一直退化成根布局的默认值（搜索引擎里显示成站名，看不出是工具箱）。
// 现在拆成「服务端页面给元信息 + 客户端组件管交互」，两边各司其职。
export const metadata: Metadata = {
  title: "工具箱",
  description:
    "纯前端在线工具箱：JSON 格式化、Base64、时间戳、正则测试、图片压缩与格式转换、二维码生成、CSV ↔ JSON、文本对比、JWT 解析、哈希计算等，全部在浏览器本地处理，不上传服务器。",
  alternates: { canonical: "https://shiqing.site/tools" },
};

export default function ToolsPage() {
  return <ToolsIndex />;
}
