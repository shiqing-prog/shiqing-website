import MarkdownIt from "markdown-it";

/**
 * 帖子 Markdown 渲染（服务端 RSC 与客户端预览共用）
 *
 * 安全模型：
 * - html: false —— 用户输入的原始 HTML 一律转义输出，杜绝 XSS
 * - linkify: true —— 裸 URL 自动转链接
 * - breaks: true —— 单换行保留为 <br>（旧帖子纯文本也能正常显示）
 * - markdown-it 内置链接协议白名单（仅 http/https/mailto 等）
 */
const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  html: false,
  typographer: false,
});

/** 将 Markdown 源文本渲染为（已安全处理过的）HTML */
export function renderMarkdown(src: string): string {
  return md.render(src ?? "");
}
