/** 心理测评模块类型定义（客户端与服务端共用，无服务端专属依赖） */

/** 结果分级色彩语义 */
export type LevelKey = "good" | "mild" | "moderate" | "severe" | "info";

export interface PsychOption {
  /** 选项文案 */
  label: string;
  /** 计分（原始分，反向题会在评分时反转） */
  value: number;
}

export interface PsychQuestion {
  text: string;
  /** 反向计分（如自尊量表中的负向表述） */
  reverse?: boolean;
  /** 所属维度 key（多维度量表） */
  dim?: string;
}

export interface PsychDimension {
  key: string;
  label: string;
  desc?: string;
}

export interface PsychBreakdownItem {
  label: string;
  value: number;
  max: number;
  percent: number;
  note?: string;
}

export interface PsychResult {
  /** 总分（已按反向题修正） */
  total: number;
  max: number;
  /** 分级名称（如「轻度抑郁症状」） */
  level: string;
  levelKey: LevelKey;
  summary: string;
  advice: string[];
  /** 维度/分量表得分 */
  breakdown?: PsychBreakdownItem[];
  /** 类型代码（如 16 型人格的 INFP） */
  typeCode?: string;
  typeName?: string;
  typeDesc?: string;
  /** 其他要展示的指标（如「每题均分」） */
  extra?: { label: string; value: string }[];
  /** 类型/画像类量表隐藏顶部数字分数（如大五人格、16 型、霍兰德代码） */
  hideScore?: boolean;
}

export interface PsychScaleSource {
  /** 量表中英文名 */
  name: string;
  /** 题目/评分来源链接 */
  url: string;
  /** 许可证或使用条款摘要 */
  license: string;
  /** 补充说明（如中文译本来源） */
  note?: string;
}

export interface PsychScale {
  slug: string;
  name: string;
  subtitle: string;
  category: "情绪" | "人格" | "职业" | "关系" | "压力" | "健康";
  /** 预计耗时（分钟） */
  minutes: number;
  tags: string[];
  /** 统一作答选项 */
  options: PsychOption[];
  questions: PsychQuestion[];
  /** 量表简介段落 */
  intro: string[];
  /** 重要提示（如非诊断用途、量表版权说明） */
  notice?: string;
  dims?: PsychDimension[];
  source: PsychScaleSource;
  /** 评分与解读 */
  score: (raw: number[]) => PsychResult;
  /**
   * 危机提示钩子：返回文案则在结果页最顶部（分数卡之前）显示醒目危机提示
   * 例如 PHQ-9 第 9 题（自伤念头）得分 > 0
   */
  crisis?: (raw: number[]) => string | null;
}
