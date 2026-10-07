/**
 * JSON-LD 序列化：把 < 转义成 \u003c，防止用户内容中的 </script> 提前闭合脚本标签。
 * 配合 `<script type="application/ld+json" dangerouslySetInnerHTML>` 使用。
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
