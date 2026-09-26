/**
 * 从帖子/回复内容中提取 @昵称 提及（去重，最多 5 个）
 *
 * 昵称允许：中文、字母、数字、下划线、连字符。
 * 由于中文正文里 @昵称 后面常常紧跟其它汉字（`@小明你好呀`），正则无法判断昵称到哪结束，
 * 因此这里只负责给出「候选串」，由 resolveMention() 逐个变体去查库确认。
 */
const MENTION_RE = /@([A-Za-z0-9_\-\u4e00-\u9fa5]{1,20})/g;

export function extractMentions(content: string): string[] {
  const out: string[] = [];
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(content)) !== null) {
    const name = m[1].trim();
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * 生成一个候选提及名的查询变体（从最长到最短），用于处理中英混排：
 *   "@bob你好"  → ["bob你好", "bob", "bob你", "bob你好"]（去重后按顺序尝试）
 *   "@小明你好" → ["小明你好", "小明你", "小明"]
 */
export function mentionVariants(name: string): string[] {
  const out: string[] = [name];
  const push = (v: string) => {
    if (v && !out.includes(v)) out.push(v);
  };
  // 英数字前缀（@bob 后面直接跟中文正文时）
  const latin = /^[A-Za-z0-9_-]+/.exec(name)?.[0];
  if (latin) push(latin);
  // 去掉结尾 1-3 个汉字（中文昵称后面直接跟正文时）
  let trimmed = name;
  for (let i = 0; i < 3; i++) {
    if (!/[\u4e00-\u9fa5]$/.test(trimmed)) break;
    trimmed = trimmed.slice(0, -1);
    push(trimmed);
  }
  return out;
}

/**
 * 依次用候选变体查库，返回第一个命中的对象
 * @param lookup 由调用方提供的查询函数（例如 (n) => db.getUserByNickname(n)）
 */
export async function resolveMention<T>(
  name: string,
  lookup: (candidate: string) => Promise<T | null>
): Promise<T | null> {
  for (const candidate of mentionVariants(name)) {
    const hit = await lookup(candidate);
    if (hit) return hit;
  }
  return null;
}
