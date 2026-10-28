"use client";

import { useEffect } from "react";

/**
 * 阅读数上报。
 *
 * 原来翻页组件在服务端渲染时直接 incrementPostViews()，于是：
 * 1) 首页/板块页里的 <Link prefetch> 一预取就 +1；
 * 2) 爬虫抓一次 +1；
 * 3) 帖子页因此每次都要写 D1，永远无法缓存。
 * 现在只在客户端真打开时上报，同一标签页同一帖子只报一次。
 */
export default function ViewCounter({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* 隐私模式禁用了 sessionStorage：照样上报一次 */
    }
    fetch(`/api/posts/${postId}/view`, { method: "POST", keepalive: true }).catch(
      () => {
        /* 计数失败不影响阅读 */
      }
    );
  }, [postId]);

  return null;
}
