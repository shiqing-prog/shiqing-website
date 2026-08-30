/** 统一 ID / slug 工具（原 data.ts 与 store.ts 各有一份重复实现，统一收口到此） */

/** 生成短 ID：时间戳(36进制) + crypto 随机 8 位，避免可预测/碰撞 */
export function uid(): string {
  return `${Date.now().toString(36)}${crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
}

/** 生成 URL 友好的 slug（支持中文），行为与旧实现一致 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
