/**
 * 从帖子/回复内容中提取 @昵称 提及（去重，最多 5 个）
 * 允许中文、字母、数字、下划线、连字符；遇空白/标点/常见分隔符结束
 */
export function extractMentions(content: string): string[] {
  const out: string[] = [];
  const re = /@([^\s@#，。！？、,.!?：:；;"'()（）[\]【】<>《》|/\\]{1,20})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim();
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= 5) break;
  }
  return out;
}
