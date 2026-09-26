import type {
  LevelKey,
  PsychBreakdownItem,
  PsychDimension,
  PsychQuestion,
  PsychScale,
  PsychResult,
} from "./types";

/** 单题得分（自动按 reverse 反转） */
export function itemScore(
  options: { value: number }[],
  question: PsychQuestion,
  raw: number
): number {
  const values = options.map((o) => o.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return question.reverse ? max + min - raw : raw;
}

/**
 * 累加得分
 * @param indices 参与计分的题目下标（不传则全部）
 */
export function sumScores(
  scale: PsychScale,
  raw: number[],
  indices?: number[]
): { total: number; max: number; min: number } {
  const list = indices ?? scale.questions.map((_, i) => i);
  let total = 0;
  let max = 0;
  let min = 0;
  for (const i of list) {
    const q = scale.questions[i];
    if (!q || raw[i] === undefined) continue;
    total += itemScore(scale.options, q, raw[i]);
    const values = scale.options.map((o) => o.value);
    max += Math.max(...values);
    min += Math.min(...values);
  }
  return { total, max, min };
}

/** 按维度分组统计 */
export function dimensionBreakdown(
  scale: PsychScale,
  raw: number[],
  dims: PsychDimension[],
  notes?: Record<string, string>
): PsychBreakdownItem[] {
  return dims.map((d) => {
    const indices = scale.questions
      .map((q, i) => (q.dim === d.key ? i : -1))
      .filter((i) => i >= 0);
    const { total, max } = sumScores(scale, raw, indices);
    return {
      label: d.label,
      value: total,
      max,
      percent: max > 0 ? Math.round((total / max) * 100) : 0,
      note: notes?.[d.key],
    };
  });
}

/** 各项题目得分（用于雷达/条形展示前的归一） */
export function percentOf(total: number, max: number): number {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

/** 分级区间 */
export interface Band {
  min: number;
  max: number;
  label: string;
  levelKey: LevelKey;
  summary: string;
  advice: string[];
}

/** 取命中区间（区间按 min 升序传入） */
export function bandFor(bands: Band[], total: number): Band {
  for (const b of bands) {
    if (total >= b.min && total <= b.max) return b;
  }
  return bands[bands.length - 1];
}

/** 由区间生成结果对象（附带 extra 指标） */
export function resultFromBand(
  band: Band,
  total: number,
  max: number,
  extra?: { label: string; value: string }[]
): PsychResult {
  return {
    total,
    max,
    level: band.label,
    levelKey: band.levelKey,
    summary: band.summary,
    advice: band.advice,
    extra,
  };
}

/** 常用选项组 */
export const OPTIONS_FREQ_0_3: { label: string; value: number }[] = [
  { label: "完全不会", value: 0 },
  { label: "有几天", value: 1 },
  { label: "一半以上时间", value: 2 },
  { label: "几乎每天", value: 3 },
];

export const OPTIONS_FREQ_0_4: { label: string; value: number }[] = [
  { label: "从来没有", value: 0 },
  { label: "很少", value: 1 },
  { label: "有时", value: 2 },
  { label: "经常", value: 3 },
  { label: "总是", value: 4 },
];

export const OPTIONS_AGREE_1_5: { label: string; value: number }[] = [
  { label: "非常不同意", value: 1 },
  { label: "不同意", value: 2 },
  { label: "中立", value: 3 },
  { label: "同意", value: 4 },
  { label: "非常同意", value: 5 },
];

export const OPTIONS_AGREE_1_7: { label: string; value: number }[] = [
  { label: "非常不同意", value: 1 },
  { label: "比较不同意", value: 2 },
  { label: "有点不同意", value: 3 },
  { label: "中立", value: 4 },
  { label: "有点同意", value: 5 },
  { label: "比较同意", value: 6 },
  { label: "非常同意", value: 7 },
];

export const OPTIONS_FREQ_1_5: { label: string; value: number }[] = [
  { label: "从不", value: 1 },
  { label: "很少", value: 2 },
  { label: "有时", value: 3 },
  { label: "经常", value: 4 },
  { label: "总是", value: 5 },
];

export const OPTIONS_PSS_0_4: { label: string; value: number }[] = [
  { label: "从不", value: 0 },
  { label: "几乎从不", value: 1 },
  { label: "有时", value: 2 },
  { label: "相当频繁", value: 3 },
  { label: "非常频繁", value: 4 },
];

/** 通用提示文案 */
export const DISCLAIMER =
  "本测评仅用于自我了解与科普参考，不能作为临床诊断依据。若结果提示明显困扰，或持续时间较长、影响日常生活，请寻求精神科医生或专业心理咨询师的帮助。";

/** 心理援助热线（集中配置，便于日后更新；号码可能随时间调整） */
export const CRISIS_LINES = [
  "全国统一心理援助热线：12356（24 小时）",
  "希望 24 热线：400-161-9995（24 小时）",
  "北京心理危机研究与干预中心：010-82951332",
  "紧急情况请直接拨打 120 或前往就近医院急诊",
];
