"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 本地最高分记录（localStorage）
 * @param key       记录键（如 "2048"、"snake"）
 * @param lowIsBetter 计步/计时类游戏用（越小越好）
 */
export function useHighScore(key: string, opts?: { lowIsBetter?: boolean }) {
  const lowIsBetter = opts?.lowIsBetter ?? false;
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const v = localStorage.getItem(`hs:${key}`);
        if (v !== null && !Number.isNaN(Number(v))) setBest(Number(v));
      } catch {
        /* 隐私模式等场景忽略 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const submit = useCallback(
    (score: number) => {
      setBest((prev) => {
        const better = prev === null || (lowIsBetter ? score < prev : score > prev);
        if (!better) return prev;
        try {
          localStorage.setItem(`hs:${key}`, String(score));
        } catch {
          /* 忽略 */
        }
        return score;
      });
    },
    [key, lowIsBetter]
  );

  return { best, submit };
}
