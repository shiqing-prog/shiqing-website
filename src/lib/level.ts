/**
 * 用户等级：由积分动态推导（无需存储）
 * 积分 = 发帖×5 + 回复×2 + 签到×3 + 收到的赞×1
 */
export const LEVELS: { min: number; title: string }[] = [
  { min: 0, title: "新手上路" },
  { min: 50, title: "初露锋芒" },
  { min: 150, title: "活跃用户" },
  { min: 350, title: "资深用户" },
  { min: 700, title: "社区达人" },
  { min: 1200, title: "知名人士" },
  { min: 2000, title: "传奇人物" },
];

export interface LevelInfo {
  level: number;
  title: string;
  /** 距离下一级还需积分（满级为 0） */
  remaining: number;
  /** 当前等级内进度 0-100（满级为 100） */
  progress: number;
}

export function levelOf(points: number): LevelInfo {
  const p = Math.max(points, 0);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (p >= LEVELS[i].min) idx = i;
  }
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  if (!next) {
    return { level: idx + 1, title: cur.title, remaining: 0, progress: 100 };
  }
  const span = next.min - cur.min;
  const done = p - cur.min;
  return {
    level: idx + 1,
    title: cur.title,
    remaining: next.min - p,
    progress: Math.min(Math.round((done / span) * 100), 100),
  };
}
