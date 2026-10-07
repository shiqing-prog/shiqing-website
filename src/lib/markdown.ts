import MarkdownIt from "markdown-it";

/**
 * 帖子 Markdown 渲染（服务端 RSC 与客户端预览共用）
 *
 * 安全模型：
 * - html: false —— 用户输入的原始 HTML 一律转义输出，杜绝 XSS
 * - linkify: true —— 裸 URL 自动转链接
 * - breaks: true —— 单换行保留为 <br>（旧帖子纯文本也能正常显示）
 * - markdown-it 内置链接协议白名单（仅 http/https/mailto 等）
 *
 * 阅读增强：
 * - 代码块带 data-lang，配合 CSS 显示语言标签
 * - 图片懒加载 + 异步解码
 * - 外链新窗口打开并加 rel="noopener noreferrer nofollow ugc"
 */
const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  html: false,
  typographer: false,
});

// 代码块：把 fence 的语言信息写到 <pre data-lang> 上
const defaultFence =
  md.renderer.rules.fence ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const html = defaultFence(tokens, idx, options, env, self);
  const info = (tokens[idx].info || "").trim().split(/\s+/)[0];
  const lang = info.replace(/[^a-zA-Z0-9_+#.-]/g, "").slice(0, 20);
  if (!lang) return html;
  return html.replace("<pre>", `<pre data-lang="${lang}">`);
};

// 图片：懒加载 + 异步解码
const defaultImage =
  md.renderer.rules.image ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("loading", "lazy");
  tokens[idx].attrSet("decoding", "async");
  return defaultImage(tokens, idx, options, env, self);
};

// 外链：新窗口 + 安全属性（站内链接保持原样）
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = String(tokens[idx].attrGet("href") ?? "");
  const external = /^https?:\/\//i.test(href) && !/(^|\.)shiqing\.site/i.test(href);
  if (external) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer nofollow ugc");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/** 将 Markdown 源文本渲染为（已安全处理过的）HTML */
export function renderMarkdown(src: string): string {
  return md.render(src ?? "");
}
