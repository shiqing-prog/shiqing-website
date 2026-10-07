/**
 * 阅读统计：估算正文字数与阅读时长。
 * 中文/日文按「字」计，英文/数字按「词」计，速度按 300 字/分钟。
 * 会先剔除代码块与常见 Markdown 标记，避免把符号算进去。
 */
export function readingStats(text: string): { chars: number; minutes: number } {
  const src = (text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`~\-[\]()!|]/g, " ");
  const cjk = (src.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g) ?? []).length;
  const words = (src.match(/[A-Za-z0-9]+/g) ?? []).length;
  const chars = cjk + words;
  const minutes = Math.max(1, Math.round(chars / 300));
  return { chars, minutes };
}
