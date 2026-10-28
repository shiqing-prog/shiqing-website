/**
 * 服务端数据兜底。
 *
 * 站点约定：D1 短时不可用不该让整页变成「页面出错了」。
 * /status、/sitemap.xml 早就做了降级，但首页、板块、排行榜、统计等页面
 * 直接把 db.* 的 Promise 丢给 Promise.all —— 任何一个查询抛错，
 * 整棵服务端组件树就崩到错误边界，用户看到白屏式报错。
 *
 * 用法：await safe(db.listPosts(...), { posts: [], total: 0 }, "首页-帖子")
 */
export async function safe<T>(
  promise: Promise<T>,
  fallback: T,
  tag: string
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error(`[safe] ${tag} 失败，已降级`, err);
    return fallback;
  }
}
