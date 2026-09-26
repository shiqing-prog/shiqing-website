export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 给渲染后的 HTML 中的 h2/h3 加上锚点 id，并返回目录（TOC）
 * 仅用于 Markdown 渲染结果（html 已转义，标签结构可控）
 */
export function withHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const out = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (match, lvl: string, inner: string) => {
      const text = inner
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
      if (!text) return match;
      const id = `h${lvl}-${toc.length}`;
      toc.push({ id, text, level: Number(lvl) });
      return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
    }
  );
  return { html: out, toc };
}
