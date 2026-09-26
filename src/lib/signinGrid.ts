/** 签到热力图网格（按中国时区的日期字符串计算，纯函数） */

export interface SigninCell {
  /** YYYY-MM-DD */
  day: string;
  signed: boolean;
  /** 今天之后（未到来） */
  future: boolean;
}

export interface SigninGrid {
  /** 每列 7 天（周一起） */
  columns: SigninCell[][];
  /** 月份标注：列索引 + 文本 */
  months: { col: number; label: string }[];
  /** 周标签（周一/三/五） */
  weekLabels: string[];
  /** 总签到天数（网格范围内） */
  total: number;
}

const DAY_MS = 24 * 3600 * 1000;

function addDays(day: string, delta: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** 0=周一 … 6=周日 */
function weekdayIndex(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0=周日
  return (d + 6) % 7;
}

/**
 * 生成最近 `weeks` 周的签到网格（最后一列包含今天）
 * @param signDays 已签到日期（YYYY-MM-DD），可乱序
 * @param today    今天（中国时区）
 */
export function buildSigninGrid(
  signDays: string[],
  today: string,
  weeks = 14
): SigninGrid {
  const set = new Set(signDays);
  const start = addDays(today, -(weeks - 1) * 7 - weekdayIndex(today));

  const columns: SigninCell[][] = [];
  const months: { col: number; label: string }[] = [];
  let total = 0;
  let lastMonth = "";

  for (let col = 0; col < weeks; col++) {
    const cells: SigninCell[] = [];
    for (let row = 0; row < 7; row++) {
      const day = addDays(start, col * 7 + row);
      const signed = set.has(day);
      if (signed) total++;
      cells.push({ day, signed, future: day > today });
    }
    columns.push(cells);
    const month = cells[0].day.slice(5, 7);
    if (month !== lastMonth) {
      months.push({ col, label: `${Number(month)}月` });
      lastMonth = month;
    }
  }

  return {
    columns,
    months,
    weekLabels: ["一", "", "三", "", "五", "", "日"],
    total,
  };
}
