import type { PsychScale } from "./types";
import {
  bandFor,
  CRISIS_LINES,
  dimensionBreakdown,
  OPTIONS_AGREE_1_7,
  OPTIONS_FREQ_0_3,
  resultFromBand,
  sumScores,
  type Band,
} from "./scoring";

/* ===================== 1. PHQ-9 抑郁筛查 ===================== */

const PHQ9_ITEMS = [
  "做事时提不起劲或没有兴趣",
  "感到心情低落、沮丧或绝望",
  "入睡困难、睡不安稳或睡眠过多",
  "感觉疲倦或没有活力",
  "食欲不振或吃太多",
  "觉得自己很糟、或觉得自己很失败、或让自己和家人失望",
  "对事物专注有困难（例如阅读或看电视时）",
  "动作或说话速度缓慢到别人已经察觉；或正好相反——烦躁、坐立不安、动来动去的情况比平时更多",
  "有不如死掉、或用某种方式伤害自己的念头",
];

const PHQ9_BANDS: Band[] = [
  {
    min: 0,
    max: 4,
    label: "无明显抑郁症状",
    levelKey: "good",
    summary: "你的得分处于一般人群的常见范围，近期没有明显的抑郁症状困扰。",
    advice: [
      "保持规律作息与运动，继续维持现有的社交与兴趣活动。",
      "情绪偶尔低落是正常的，留意持续两周以上的变化即可。",
    ],
  },
  {
    min: 5,
    max: 9,
    label: "轻度抑郁症状",
    levelKey: "mild",
    summary: "你近期出现了一些抑郁相关症状，程度较轻，但值得关注。",
    advice: [
      "记录情绪日记，找出让情绪变差的具体诱因。",
      "保证睡眠与白天日照时间，每周 3 次以上中等强度运动有明确帮助。",
      "若持续两周以上或逐渐加重，建议找专业心理咨询师聊一聊。",
    ],
  },
  {
    min: 10,
    max: 14,
    label: "中度抑郁症状",
    levelKey: "moderate",
    summary: "症状已达到中度水平，可能正在影响你的工作、学习或人际关系。",
    advice: [
      "建议主动寻求专业帮助（心理咨询或精神科门诊评估）。",
      "把大任务拆成小步骤，允许自己在状态差时降低标准。",
      "把感受告诉一位可信任的人，避免长期独自承受。",
    ],
  },
  {
    min: 15,
    max: 19,
    label: "中重度抑郁症状",
    levelKey: "severe",
    summary: "症状较为明显，多数日子都可能感到吃力，建议尽快获得专业支持。",
    advice: [
      "尽快到精神科或心理科就诊，评估是否需要系统治疗。",
      "请亲友协助安排日常事务，减少独自承担的压力。",
      "避免用酒精或熬夜来缓解情绪，这会加重症状。",
    ],
  },
  {
    min: 20,
    max: 27,
    label: "重度抑郁症状",
    levelKey: "severe",
    summary: "得分很高，提示你正经历相当严重的困扰，请把求助放在第一位。",
    advice: [
      "请尽快（最好在家人朋友陪同下）前往精神科就诊。",
      "如果出现伤害自己的念头，请立即联系信任的人或拨打心理援助热线（如 12356、400-161-9995）。",
      "记住：抑郁是可以治疗的，现在需要的是专业帮助而不是独自硬撑。",
    ],
  },
];

const phq9: PsychScale = {
  slug: "phq9",
  name: "PHQ-9 抑郁自评",
  subtitle: "9 题 · 国际通用的抑郁症状筛查量表",
  category: "情绪",
  minutes: 2,
  tags: ["抑郁", "情绪", "筛查"],
  options: OPTIONS_FREQ_0_3,
  questions: PHQ9_ITEMS.map((text) => ({ text })),
  intro: [
    "PHQ-9（Patient Health Questionnaire-9）由 Robert Spitzer 等人开发，是目前全世界使用最广的抑郁症状自评量表之一，被大量医院与研究中用作初筛工具。",
    "请回想「最近两周」内，下列问题困扰你的频率，选择最符合的选项。答案没有好坏之分，凭第一感觉作答即可。",
  ],
  notice: "第 9 题涉及自伤念头。若该项不为 0，请务必认真对待并尽快寻求专业帮助。",
  source: {
    name: "PHQ-9 / PHQ Screeners（Pfizer 授权免费使用）",
    url: "https://www.phqscreeners.com/",
    license:
      "PHQ 系列量表由原作者授权免费使用，可复制、翻译、展示与分发（无需另行申请许可），不得修改题目表述或用于商业销售。",
  },
  score: (raw) => {
    const { total, max } = sumScores(phq9, raw);
    const band = bandFor(PHQ9_BANDS, total);
    const advice = [...band.advice];
    if ((raw[8] ?? 0) > 0) {
      advice.unshift(
        `⚠️ 你在第 9 题选择了非「完全不会」：请把这件事告诉一位可信任的人，并尽快联系专业人员（${CRISIS_LINES[0]}）。`
      );
    }
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 9).toFixed(1) },
      { label: "症状条目数（≥1 分）", value: String(raw.filter((v) => v > 0).length) },
    ]);
  },
  crisis: (raw) =>
    (raw[8] ?? 0) > 0
      ? "你在「有不如死掉、或用某种方式伤害自己的念头」一题上选择了非「完全不会」。请立刻把这件事告诉一位可信任的人，并尽快联系专业人员。你不需要独自面对。"
      : null,
};

/* ===================== 2. GAD-7 焦虑筛查 ===================== */

const GAD7_ITEMS = [
  "感到紧张、焦虑或急切",
  "不能停止或控制担忧",
  "对各种各样的事情担忧过多",
  "很难放松下来",
  "由于不安而无法静坐",
  "变得容易烦恼或急躁",
  "感到似乎会有可怕的事情发生",
];

const GAD7_BANDS: Band[] = [
  {
    min: 0,
    max: 4,
    label: "无明显焦虑症状",
    levelKey: "good",
    summary: "你的得分处于常见范围，近期没有明显的焦虑症状。",
    advice: ["维持规律作息与运动，保留让自己放松的活动。", "考试、汇报前的紧张属于正常反应，不必过度担心。"],
  },
  {
    min: 5,
    max: 9,
    label: "轻度焦虑症状",
    levelKey: "mild",
    summary: "你近期有一些焦虑表现，程度较轻，可通过自我调节缓解。",
    advice: [
      "尝试「4-7-8 呼吸」或渐进式肌肉放松，每天 5 分钟。",
      "把担忧写下来并区分「可行动」与「不可控」两类，只处理前者。",
      "减少咖啡因与睡前刷手机，焦虑常被这两件事放大。",
    ],
  },
  {
    min: 10,
    max: 14,
    label: "中度焦虑症状",
    levelKey: "moderate",
    summary: "焦虑已达中度水平，可能影响睡眠、注意力与日常效率。",
    advice: [
      "建议预约心理咨询，认知行为疗法（CBT）对焦虑有充分证据支持。",
      "规律作息 + 有氧运动（快走、慢跑）每周 150 分钟以上。",
      "避免用「反复检查」「逃避」来短期缓解焦虑，这会形成恶性循环。",
    ],
  },
  {
    min: 15,
    max: 21,
    label: "重度焦虑症状",
    levelKey: "severe",
    summary: "焦虑程度较高，可能已明显影响生活，建议尽快获得专业支持。",
    advice: [
      "尽快到精神科或心理科就诊，评估是否需要药物或系统心理治疗。",
      "把日程降到最低负荷，优先保证睡眠与进食。",
      "出现惊恐发作（心悸、窒息感、濒死感）时，请坐稳并做缓慢腹式呼吸，事后务必告知医生。",
    ],
  },
];

const gad7: PsychScale = {
  slug: "gad7",
  name: "GAD-7 焦虑自评",
  subtitle: "7 题 · 广泛性焦虑筛查量表",
  category: "情绪",
  minutes: 2,
  tags: ["焦虑", "情绪", "筛查"],
  options: OPTIONS_FREQ_0_3,
  questions: GAD7_ITEMS.map((text) => ({ text })),
  intro: [
    "GAD-7（Generalized Anxiety Disorder-7）同样出自 PHQ 系列，用于筛查广泛性焦虑症状，也常用于评估焦虑严重程度与治疗效果。",
    "请回想「最近两周」内，下列问题困扰你的频率。",
  ],
  source: {
    name: "GAD-7 / PHQ Screeners",
    url: "https://www.phqscreeners.com/",
    license: "与 PHQ-9 相同：原作者授权免费使用，可复制分发，不得商用或修改题目。",
  },
  score: (raw) => {
    const { total, max } = sumScores(gad7, raw);
    const band = bandFor(GAD7_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 7).toFixed(1) },
    ]);
  },
};

/* ===================== 3. DASS-21 情绪三合一 ===================== */

const DASS21_ITEMS: { text: string; dim: "depression" | "anxiety" | "stress" }[] = [
  { text: "我觉得很难让自己平静下来", dim: "stress" },
  { text: "我感到口干", dim: "anxiety" },
  { text: "我完全无法感到积极愉快", dim: "depression" },
  { text: "我感到呼吸困难（例如呼吸急促、在没有体力活动时喘不上气）", dim: "anxiety" },
  { text: "我觉得很难主动去做事情", dim: "depression" },
  { text: "我容易反应过度", dim: "stress" },
  { text: "我感到颤抖（例如手抖）", dim: "anxiety" },
  { text: "我觉得自己消耗了很多精力（紧张、心神不宁）", dim: "stress" },
  { text: "我担心一些可能让自己恐慌或出丑的场合", dim: "anxiety" },
  { text: "我觉得自己没有什么可期待的", dim: "depression" },
  { text: "我感到自己变得很容易激动", dim: "stress" },
  { text: "我觉得自己很难放松下来", dim: "stress" },
  { text: "我感到忧郁沮丧", dim: "depression" },
  { text: "我无法容忍任何阻碍我继续做事的东西", dim: "stress" },
  { text: "我感到自己快要惊慌失措", dim: "anxiety" },
  { text: "我对任何事情都提不起热情", dim: "depression" },
  { text: "我觉得自己作为一个人没什么价值", dim: "depression" },
  { text: "我觉得自己很容易被触怒", dim: "stress" },
  { text: "在没有明显体力活动时，我也感到心跳加快或心律不齐", dim: "anxiety" },
  { text: "我无缘无故地感到害怕", dim: "anxiety" },
  { text: "我感到生命没有意义", dim: "depression" },
];

const DASS21_DIMS = [
  { key: "depression", label: "抑郁（Depression）" },
  { key: "anxiety", label: "焦虑（Anxiety）" },
  { key: "stress", label: "压力（Stress）" },
];

/** DASS-21 分量表分级（原始分 = 7 题之和；括号内为 DASS-42 的等效分） */
function dassBand(total21: number, kind: "depression" | "anxiety" | "stress") {
  const cut: Record<"depression" | "anxiety" | "stress", number[]> = {
    depression: [9, 13, 20, 27],
    anxiety: [7, 9, 14, 19],
    stress: [14, 18, 25, 33],
  };
  const [a, b, c, d] = cut[kind];
  if (total21 <= a) return { label: "正常", key: "good" as const };
  if (total21 <= b) return { label: "轻度", key: "mild" as const };
  if (total21 <= c) return { label: "中度", key: "moderate" as const };
  if (total21 <= d) return { label: "重度", key: "severe" as const };
  return { label: "极重度", key: "severe" as const };
}

const dass21: PsychScale = {
  slug: "dass21",
  name: "DASS-21 抑郁焦虑压力量表",
  subtitle: "21 题 · 一次测完抑郁、焦虑与压力",
  category: "情绪",
  minutes: 4,
  tags: ["抑郁", "焦虑", "压力", "综合"],
  options: OPTIONS_FREQ_0_3,
  questions: DASS21_ITEMS.map(({ text, dim }) => ({ text, dim })),
  dims: DASS21_DIMS,
  intro: [
    "DASS-21（Depression Anxiety Stress Scales）由悉尼新南威尔士大学的 Lovibond 夫妇编制，用 21 个题目同时评估抑郁、焦虑与压力三个维度，是研究中非常常用的自评工具。",
    "请回想「最近一周」，下列描述符合你情况的频率。临床判读时，DASS-21 的分量表得分需乘以 2 才能与 DASS-42 的常模比较。",
  ],
  source: {
    name: "DASS (Depression Anxiety Stress Scales) — UNSW",
    url: "http://www2.psy.unsw.edu.au/dass/",
    license:
      "DASS 属公共领域，可自由下载与复制（official: may be downloaded and copied without restriction），但不得修改题目或用于营利销售。本站中文表述采用学界通行的中文译本，未改动题目数量、顺序与计分结构；如与官方译本有出入，以官方版本为准。",
  },
  score: (raw) => {
    const admin = (key: string) =>
      DASS21_ITEMS.map((it, i) => (it.dim === key ? i : -1)).filter((i) => i >= 0);

    const per = {
      depression: sumScores(dass21, raw, admin("depression")).total,
      anxiety: sumScores(dass21, raw, admin("anxiety")).total,
      stress: sumScores(dass21, raw, admin("stress")).total,
    };
    const bands = {
      depression: dassBand(per.depression, "depression"),
      anxiety: dassBand(per.anxiety, "anxiety"),
      stress: dassBand(per.stress, "stress"),
    };
    const worst = (["severe", "moderate", "mild", "good"] as const).find((k) =>
      Object.values(bands).some((b) => b.key === k)
    )!;

    const total = per.depression + per.anxiety + per.stress;
    const breakdown = dimensionBreakdown(dass21, raw, DASS21_DIMS, {
      depression: bands.depression.label,
      anxiety: bands.anxiety.label,
      stress: bands.stress.label,
    });

    const advice: string[] = [];
    if (bands.depression.key === "good" && bands.anxiety.key === "good" && bands.stress.key === "good") {
      advice.push("三个维度都在正常范围，继续保持现有的作息与放松习惯即可。");
    } else {
      advice.push(
        "针对得分偏高的维度优先调整：抑郁相关多做「行为激活」（安排小而确定的愉快活动），焦虑相关练习呼吸与暴露，压力相关优先减少负荷与保证睡眠。"
      );
    }
    if (worst === "moderate" || worst === "severe") {
      advice.push("至少一个维度达到中度及以上，建议预约心理咨询或精神科评估。");
    }
    if (bands.anxiety.key !== "good") {
      advice.push("减少咖啡因与酒精摄入，它们会放大心悸、颤抖等焦虑的躯体反应。");
    }
    if (bands.stress.key !== "good") {
      advice.push("把「必须今天完成」的清单压缩到 3 项以内，给神经系统留出恢复窗口。");
    }

    return {
      total,
      max: 63,
      level: `最高维度：${
        per.depression >= per.anxiety && per.depression >= per.stress
          ? "抑郁"
          : per.anxiety >= per.stress
            ? "焦虑"
            : "压力"
      }（${bands.depression.key === "good" && bands.anxiety.key === "good" && bands.stress.key === "good" ? "正常范围" : "需关注"}）`,
      levelKey: worst,
      summary:
        "DASS-21 分别给出抑郁、焦虑、压力三个分数。判读时看每个维度各自的分级，而不是三者相加的总分。",
      advice,
      breakdown,
      extra: [
        { label: "抑郁 ×2（DASS-42 等效）", value: String(per.depression * 2) },
        { label: "焦虑 ×2", value: String(per.anxiety * 2) },
        { label: "压力 ×2", value: String(per.stress * 2) },
      ],
    };
  },
};

/* ===================== 4. 生活满意度 SWLS ===================== */

const SWLS_ITEMS = [
  "我的生活大致符合我的理想",
  "我的生活状况非常理想",
  "我对我的生活感到满意",
  "到目前为止，我已经得到了我生活中想要的重要东西",
  "如果我能重新活一次，我几乎不会改变任何事",
];

const SWLS_BANDS: Band[] = [
  {
    min: 5,
    max: 9,
    label: "极度不满意",
    levelKey: "severe",
    summary: "你对当前整体生活相当不满，可能正经历较大的落差或困境。",
    advice: [
      "先确认是否有具体、可改变的压力源（工作、关系、健康），从最小的一步开始处理。",
      "如果这种不满已持续很久并伴随情绪低落，建议寻求专业帮助。",
    ],
  },
  {
    min: 10,
    max: 14,
    label: "不满意",
    levelKey: "moderate",
    summary: "你对生活整体评价偏低，与理想状态有明显差距。",
    advice: [
      "写下 3 件「目前还算顺利」的事，避免认知只聚焦在缺口上。",
      "挑一个最想改变的生活领域，设定 30 天内可完成的小目标。",
    ],
  },
  {
    min: 15,
    max: 19,
    label: "略低于平均",
    levelKey: "mild",
    summary: "你的生活满意度略低于一般水平，仍有不少可以改善的空间。",
    advice: [
      "回顾最近一个月，找出真正让你感到充实的时刻，并尝试增加它的频率。",
      "人际关系是生活满意度最稳定的预测因素之一，主动维护重要的几个人。",
    ],
  },
  {
    min: 20,
    max: 24,
    label: "平均水平",
    levelKey: "info",
    summary: "你的生活满意度处于多数人的常见区间，整体平稳。",
    advice: ["保持现有的作息与关系网络。", "可以试着把注意力从「拥有什么」转向「体验什么」，后者对幸福感更持久。"],
  },
  {
    min: 25,
    max: 29,
    label: "略高于平均",
    levelKey: "good",
    summary: "你对生活的评价高于一般人，整体状态不错。",
    advice: ["记录让自己满意的做法，形成可重复的生活节奏。", "留意高满意度也需维护，避免长期透支健康与关系。"],
  },
  {
    min: 30,
    max: 35,
    label: "满意 / 极度满意",
    levelKey: "good",
    summary: "你对生活相当满意，处于良好状态。",
    advice: ["保持感恩记录，能进一步稳固这种状态。", "把经验分享给身边的人，关系质量会反过来提升满意度。"],
  },
];

const swls: PsychScale = {
  slug: "swls",
  name: "生活满意度量表 SWLS",
  subtitle: "5 题 · 主观幸福感的整体评价",
  category: "健康",
  minutes: 1,
  tags: ["幸福感", "满意度"],
  options: OPTIONS_AGREE_1_7,
  questions: SWLS_ITEMS.map((text) => ({ text })),
  intro: [
    "SWLS（Satisfaction With Life Scale）由 Diener 等人编制，只用 5 道题评估你对整体生活的认知评价，是主观幸福感研究中最常用的量表之一。",
    "它测的是「你认为自己的生活如何」，而不是「你现在心情好不好」。请按长期的整体感受作答。",
  ],
  source: {
    name: "Satisfaction With Life Scale (Diener et al., 1985)",
    url: "https://labs.psychology.illinois.edu/~ediener/SWLS.html",
    license: "原作者公开量表题目，可免费用于研究与教学；转载时请引用原始文献。",
  },
  score: (raw) => {
    const { total, max } = sumScores(swls, raw);
    const band = bandFor(SWLS_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 5).toFixed(1) },
    ]);
  },
};

/* ===================== 5. 罗森伯格自尊量表 ===================== */

const RSES_ITEMS: { text: string; reverse?: boolean }[] = [
  { text: "我认为自己是个有价值的人，至少与别人不相上下" },
  { text: "我觉得自己有很多优点" },
  { text: "总的来说，我倾向于认为自己是个失败者", reverse: true },
  { text: "我做事的能力和大多数人一样好" },
  { text: "我觉得自己没有什么值得骄傲的地方", reverse: true },
  { text: "我对自己持肯定态度" },
  { text: "总的来说，我对自己是满意的" },
  { text: "我希望我能为自己赢得更多尊重", reverse: true },
  { text: "我确实时常感到自己毫无用处", reverse: true },
  { text: "我时常认为自己一无是处", reverse: true },
];

const RSES_BANDS: Band[] = [
  {
    min: 10,
    max: 14,
    label: "自尊水平偏低",
    levelKey: "moderate",
    summary: "你对自己整体评价偏低，容易自我否定或过度在意他人看法。",
    advice: [
      "练习「事实对照」：把「我一无是处」换成具体事件，再找出与结论相反的证据。",
      "每天记录 1 件自己做成的具体小事，坚持两周再重测。",
      "若长期伴随明显情绪低落，建议寻求心理咨询。",
    ],
  },
  {
    min: 15,
    max: 25,
    label: "自尊水平中等",
    levelKey: "info",
    summary: "你对自己的评价处于常见区间，整体上能接纳自己，也有在意的方面。",
    advice: [
      "把自我价值更多建立在可控的过程（努力、习惯）而非结果与他人评价上。",
      "在重要关系里练习表达需求，边界清晰会反过来提升自尊。",
    ],
  },
  {
    min: 26,
    max: 40,
    label: "自尊水平较高",
    levelKey: "good",
    summary: "你对自己持稳定肯定态度，较少因外界评价而剧烈波动。",
    advice: [
      "保持自我肯定，同时留意别让它变成「听不进反馈」。",
      "把这种稳定感带进团队与关系里，会成为很大的支持资源。",
    ],
  },
];

const rses: PsychScale = {
  slug: "rses",
  name: "罗森伯格自尊量表 RSES",
  subtitle: "10 题 · 最经典的自尊水平测量",
  category: "人格",
  minutes: 2,
  tags: ["自尊", "自我评价"],
  options: [
    { label: "非常同意", value: 4 },
    { label: "同意", value: 3 },
    { label: "不同意", value: 2 },
    { label: "非常不同意", value: 1 },
  ],
  questions: RSES_ITEMS,
  intro: [
    "Rosenberg 自尊量表（1965）是测量整体自尊最常被引用的工具，共 10 题，其中 5 题为反向计分。",
    "请按你「平时一贯」的自我感受作答，而不是今天的心情。",
  ],
  source: {
    name: "Rosenberg Self-Esteem Scale (Rosenberg, 1965)",
    url: "https://www.yorku.ca/rokada/psyctest/rosenberg.pdf",
    license:
      "量表已进入公共领域，可自由用于研究与教学（转载建议引用 Rosenberg, 1965）。反向计分题为第 3、5、8、9、10 题。",
  },
  score: (raw) => {
    const { total, max } = sumScores(rses, raw);
    const band = bandFor(RSES_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "正向题均分", value: (sumScores(rses, raw, [0, 1, 3, 5, 6]).total / 5).toFixed(2) },
      { label: "反向题均分", value: (sumScores(rses, raw, [2, 4, 7, 8, 9]).total / 5).toFixed(2) },
    ]);
  },
};

/* ===================== 6. UCLA 孤独感简表 ===================== */

const UCLA3_ITEMS = [
  "你有多经常觉得自己缺少陪伴？",
  "你有多经常觉得自己被冷落？",
  "你有多经常觉得自己与周围的人隔绝？",
];

const UCLA3_OPTIONS = [
  { label: "几乎没有", value: 1 },
  { label: "有时", value: 2 },
  { label: "经常", value: 3 },
];

const ucla3: PsychScale = {
  slug: "ucla3",
  name: "孤独感简表 UCLA-3",
  subtitle: "3 题 · 一分钟了解你的孤独感水平",
  category: "关系",
  minutes: 1,
  tags: ["孤独", "人际", "关系"],
  options: UCLA3_OPTIONS,
  questions: UCLA3_ITEMS.map((text) => ({ text })),
  intro: [
    "UCLA 孤独量表由 Russell 编制，其 3 题简版（Hays & DiMatteo, 1987）在大型健康调查中被广泛使用，能在极短时间内反映主观孤独感。",
    "孤独感指的是「你感受到的社会联结是否足够」，与朋友数量无关：有人社交很多仍会孤独，有人独处却并不孤独。",
  ],
  notice:
    "UCLA-3 目前没有公认的临床分界线（cut-off），本页的分级区间是本站为便于理解所作的参考划分，请把它当作相对程度而非诊断阈值。",
  source: {
    name: "UCLA Loneliness Scale（3-item short form, Hughes et al. 2004）",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2729713/",
    license:
      "原始量表由作者持有版权，学术与科普场景普遍免费使用；本站仅用于个人自评与非商业展示，不作商业用途，并注明 Hughes et al. (2004) 文献。",
  },
  score: (raw) => {
    const { total, max } = sumScores(ucla3, raw);
    const bands: Band[] = [
      {
        min: 3,
        max: 5,
        label: "孤独感较低",
        levelKey: "good",
        summary: "你感到被陪伴、被接纳，社会联结基本满足需要。",
        advice: ["保持与重要他人的定期联系。", "把支持别人的经验也留给自己，关系是双向的。"],
      },
      {
        min: 6,
        max: 7,
        label: "孤独感中等",
        levelKey: "mild",
        summary: "你偶尔会感到缺少陪伴或被隔绝，属于常见范围。",
        advice: [
          "主动发起一次小范围聚会或约饭，比等待别人来找你更有效。",
          "把「认识很多人」换成「维持 2-3 段深关系」，孤独感下降更明显。",
        ],
      },
      {
        min: 8,
        max: 9,
        label: "孤独感偏高",
        levelKey: "moderate",
        summary: "你较常感到缺少陪伴与被隔绝，这种状态长期持续会影响身心健康。",
        advice: [
          "从低门槛的联结开始：兴趣社群、线下活动、志愿服务，重点是「固定频率」。",
          "孤独感偏高常与抑郁、睡眠问题相互影响，如同时存在情绪低落请寻求专业帮助。",
          "检查是否长期只有线上社交：面对面的互动对孤独感的缓解效果更强。",
        ],
      },
    ];
    const band = bandFor(bands, total);
    return resultFromBand(band, total, max);
  },
};

/* ===================== 7. WHO-5 幸福感指数 ===================== */

const WHO5_ITEMS = [
  "我感到愉快、心情舒畅",
  "我感到平静和放松",
  "我感到充满活力、精力充沛",
  "我醒来时感到清新、休息充分",
  "我的日常生活充满让我感兴趣的事情",
];

const WHO5_OPTIONS = [
  { label: "从未", value: 0 },
  { label: "偶尔", value: 1 },
  { label: "少于一半时间", value: 2 },
  { label: "超过一半时间", value: 3 },
  { label: "大部分时间", value: 4 },
  { label: "一直", value: 5 },
];

const who5: PsychScale = {
  slug: "who5",
  name: "WHO-5 幸福感指数",
  subtitle: "5 题 · 世界卫生组织编制的正向心理健康指标",
  category: "健康",
  minutes: 1,
  tags: ["幸福感", "心理健康", "正向"],
  options: WHO5_OPTIONS,
  questions: WHO5_ITEMS.map((text) => ({ text })),
  intro: [
    "WHO-5 由世界卫生组织编制，用 5 个正向题目评估最近两周的主观幸福感，原始分 0-25，乘以 4 换算为 0-100 的百分比分数。",
    "它关注「好的那一面」，适合用来定期追踪自己的心理状态变化。",
  ],
  source: {
    name: "WHO-5 Well-Being Index (World Health Organization)",
    url: "https://www.psykiatri-regionh.dk/who-5/",
    license:
      "WHO-5 版权属世界卫生组织（WHO Regional Office for Europe），官方说明可免费用于非商业用途并鼓励翻译，需注明来源、不得修改题目与计分。本站为非商业个人站点，仅用于自我了解。",
  },
  score: (raw) => {
    const { total } = sumScores(who5, raw);
    const pct = total * 4;
    const bands: Band[] = [
      {
        min: 0,
        max: 27,
        label: "幸福感很低，建议进一步评估",
        levelKey: "severe",
        summary: `换算得分 ${pct}/100，低于 28 分提示可能存在抑郁风险，建议尽快进行专业评估。`,
        advice: [
          "尽快到精神科或心理科做一次系统评估。",
          "把日常负荷降到最低，优先保证睡眠与规律进食。",
          "告诉一位可信任的人你最近的状态。",
        ],
      },
      {
        min: 28,
        max: 49,
        label: "幸福感偏低",
        levelKey: "moderate",
        summary: `换算得分 ${pct}/100，低于 50 分，建议关注情绪状态并考虑进一步筛查。`,
        advice: [
          "用 PHQ-9 或 DASS-21 进一步筛查情绪状态。",
          "每天安排一件确定能带来愉悦的小事，坚持两周。",
          "规律运动与日照对提升该分数有稳定效果。",
        ],
      },
      {
        min: 50,
        max: 67,
        label: "幸福感中等",
        levelKey: "info",
        summary: `换算得分 ${pct}/100，处于中等水平。`,
        advice: ["保持作息与社交频率。", "记录让你状态变好的因素，形成可重复的习惯。"],
      },
      {
        min: 68,
        max: 100,
        label: "幸福感良好",
        levelKey: "good",
        summary: `换算得分 ${pct}/100，状态良好。`,
        advice: ["保持现有节奏，定期（如每月）复测以观察趋势。", "把这套让你状态良好的习惯分享给身边的人。"],
      },
    ];
    const band = bandFor(bands, pct);
    return {
      ...resultFromBand(band, total, 25),
      extra: [
        { label: "换算百分比（×4）", value: `${pct} / 100` },
        { label: "参考线", value: "低于 50 分建议进一步评估" },
      ],
    };
  },
};

/* ===================== 8. PHQ-15 躯体症状 ===================== */

const PHQ15_ITEMS = [
  "胃痛",
  "背痛",
  "手臂、腿或关节疼痛",
  "月经期疼痛或其他与月经有关的问题（不适用时请选「完全没有」）",
  "头痛",
  "胸痛",
  "头晕",
  "昏倒或晕厥",
  "感到心跳加快或心悸",
  "气短（呼吸急促）",
  "性交时疼痛或出现问题（不适用时请选「完全没有」）",
  "便秘、腹泻或大便不成形",
  "恶心、胀气或消化不良",
  "感到疲倦或精力不足",
  "睡眠困难",
];

const PHQ15_OPTIONS = [
  { label: "完全没有", value: 0 },
  { label: "有一点", value: 1 },
  { label: "非常明显", value: 2 },
];

const phq15: PsychScale = {
  slug: "phq15",
  name: "PHQ-15 躯体症状",
  subtitle: "15 题 · 身体不适与压力负荷的关联",
  category: "健康",
  minutes: 2,
  tags: ["躯体化", "身体症状", "健康"],
  options: PHQ15_OPTIONS,
  questions: PHQ15_ITEMS.map((text) => ({ text })),
  intro: [
    "PHQ-15 出自 PHQ 系列，测量最近四周里常见躯体症状对你的困扰程度。它并不判断「有没有器质性疾病」，而是反映压力与情绪如何体现在身体上。",
    "如果某个症状持续存在或明显加重，请先去医院检查排除身体疾病，再考虑心理因素。",
  ],
  notice:
    "第 4 题仅适用于女性；不适用时请选择「完全没有」（计 0 分）。躯体症状首先要排除器质性疾病，本量表不能替代医学检查。",
  source: {
    name: "PHQ-15 / PHQ Screeners（作者授权免费使用，可翻译与分发）",
    url: "https://www.phqscreeners.com/select-screener",
    license:
      "与 PHQ-9 相同：作者授权可复制、翻译、展示与分发，无需另行申请许可，不得商用。",
  },
  score: (raw) => {
    const { total, max } = sumScores(phq15, raw);
    const bands: Band[] = [
      {
        min: 0,
        max: 4,
        label: "躯体症状极低",
        levelKey: "good",
        summary: "你最近几乎没有被身体不适困扰。",
        advice: ["保持规律作息与运动。", "把当前的生活方式维持下去即可。"],
      },
      {
        min: 5,
        max: 9,
        label: "躯体症状偏低",
        levelKey: "info",
        summary: "有少量身体不适，属于常见范围。",
        advice: [
          "留意症状出现的时机（熬夜、久坐、压力大时）。",
          "规律进食与睡眠通常能明显减少这类不适。",
        ],
      },
      {
        min: 10,
        max: 14,
        label: "躯体症状中等",
        levelKey: "moderate",
        summary: "身体不适较多，可能和长期压力、焦虑或睡眠不足有关。",
        advice: [
          "建议先做一次常规体检，排除贫血、甲状腺等常见躯体原因。",
          "同时关注情绪：焦虑与抑郁常以躯体症状为主要表现（可做 GAD-7 / PHQ-9）。",
          "减少咖啡因与酒精，它们会放大心悸、胃部不适等反应。",
        ],
      },
      {
        min: 15,
        max: 30,
        label: "躯体症状明显",
        levelKey: "severe",
        summary: "身体不适程度较高，已可能影响日常生活，建议就医评估。",
        advice: [
          "尽快到医院做系统检查，明确是否存在躯体疾病。",
          "检查无明显异常时，请不要认为「只是心理作用」——躯体化症状同样需要治疗，可到精神心理科就诊。",
          "记录症状日记（时间、强度、当时情绪），对医生判断很有帮助。",
        ],
      },
    ];
    const band = bandFor(bands, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 15).toFixed(1) },
      { label: "症状条目数（≥1 分）", value: String(raw.filter((v) => v > 0).length) },
    ]);
  },
};

/* ===================== 9. mini-IPIP 大五人格 ===================== */

/** 每题对应维度与计分方向（IPIP 公共领域量表） */
const MINIIPIP_ITEMS: { en: string; text: string; dim: string; reverse?: boolean }[] = [
  { en: "Am the life of the party.", text: "我是聚会中的活跃分子", dim: "E" },
  { en: "Talk to a lot of different people at parties.", text: "在聚会上我会和很多不同的人聊天", dim: "E" },
  { en: "Don't talk a lot.", text: "我话不多", dim: "E", reverse: true },
  { en: "Keep in the background.", text: "我习惯待在不起眼的位置", dim: "E", reverse: true },
  { en: "Sympathize with others' feelings.", text: "我能体谅别人的感受", dim: "A" },
  { en: "Feel others' emotions.", text: "我能感受到别人的情绪", dim: "A" },
  { en: "Am not really interested in others.", text: "我对别人不太感兴趣", dim: "A", reverse: true },
  { en: "Am not interested in other people's problems.", text: "我对别人的问题不感兴趣", dim: "A", reverse: true },
  { en: "Get chores done right away.", text: "我会立刻把事情做完", dim: "C" },
  { en: "Like order.", text: "我喜欢井然有序", dim: "C" },
  { en: "Often forget to put things back in their proper place.", text: "我常忘记把东西放回原处", dim: "C", reverse: true },
  { en: "Make a mess of things.", text: "我常把事情弄得一团糟", dim: "C", reverse: true },
  { en: "Have frequent mood swings.", text: "我的情绪起伏比较大", dim: "N" },
  { en: "Get upset easily.", text: "我很容易心烦", dim: "N" },
  { en: "Am relaxed most of the time.", text: "我大部分时候都很放松", dim: "N", reverse: true },
  { en: "Seldom feel blue.", text: "我很少感到低落", dim: "N", reverse: true },
  { en: "Have a vivid imagination.", text: "我有丰富的想象力", dim: "O" },
  { en: "Have difficulty understanding abstract ideas.", text: "我理解抽象概念有困难", dim: "O", reverse: true },
  { en: "Am not interested in abstract ideas.", text: "我对抽象的想法不感兴趣", dim: "O", reverse: true },
  { en: "Do not have a good imagination.", text: "我的想象力不太好", dim: "O", reverse: true },
];

const MINIIPIP_OPTIONS = [
  { label: "非常不准确", value: 1 },
  { label: "比较不准确", value: 2 },
  { label: "中立", value: 3 },
  { label: "比较准确", value: 4 },
  { label: "非常准确", value: 5 },
];

const MINIIPIP_DIMS = [
  { key: "E", label: "外向性 E", desc: "社交性、活力、寻求刺激" },
  { key: "A", label: "宜人性 A", desc: "信任、合作、体谅他人" },
  { key: "C", label: "尽责性 C", desc: "条理、自律、目标导向" },
  { key: "N", label: "神经质 N", desc: "情绪稳定性（分数越低越稳定）" },
  { key: "O", label: "开放性 O", desc: "想象、审美、求新" },
];

const MINIIPIP_DESC: Record<string, string> = {
  E: "外向性高：喜欢与人互动、精力充沛、乐于表达；偏低则更安静、偏好小圈子与独处。",
  A: "宜人性高：友善、信任他人、愿意让步；偏低则更直接、竞争性强、敢于质疑。",
  C: "尽责性高：有计划、守时、能坚持完成；偏低则更灵活随性，但也容易拖延。",
  N: "神经质高：情绪反应强烈、容易紧张或担心；偏低则情绪稳定、抗压能力好。",
  O: "开放性高：好奇、爱思考抽象问题、喜欢新体验；偏低则务实、偏好熟悉与确定。",
};

const miniipip: PsychScale = {
  slug: "miniipip",
  name: "mini-IPIP 大五人格",
  subtitle: "20 题 · 学界最常用的五因素人格模型",
  category: "人格",
  minutes: 3,
  tags: ["大五人格", "人格", "IPIP"],
  options: MINIIPIP_OPTIONS,
  questions: MINIIPIP_ITEMS.map(({ text, dim, reverse }) => ({ text, dim, reverse })),
  dims: MINIIPIP_DIMS,
  intro: [
    "大五人格（Big Five）是当代人格心理学共识度最高的框架，用外向性、宜人性、尽责性、神经质、开放性五个维度描述人。",
    "本量表使用 IPIP（国际人格题库）的 20 题简版（mini-IPIP），题目与计分方式均属公共领域，五个维度各 4 题。",
  ],
  source: {
    name: "Mini-IPIP（Donnellan et al., 2006）/ IPIP 国际人格题库",
    url: "https://ipip.ori.org/MiniIPIPKey.htm",
    license:
      "IPIP 已进入公共领域：「permission has already been granted for any person to use IPIP items, scales, and inventories for any purpose, commercial or non-commercial.」可自由使用与翻译。",
  },
  score: (raw) => {
    const breakdown = dimensionBreakdown(
      miniipip,
      raw,
      MINIIPIP_DIMS,
      Object.fromEntries(
        MINIIPIP_DIMS.map((d) => {
          const { total, max } = sumScores(
            miniipip,
            raw,
            MINIIPIP_ITEMS.map((it, i) => (it.dim === d.key ? i : -1)).filter((i) => i >= 0)
          );
          return [d.key, total >= max * 0.75 ? "高" : total <= max * 0.45 ? "偏低" : "中等"];
        })
      )
    );
    // 以最突出（偏离中位最多）的维度作为结果卡主体
    const sorted = [...breakdown].sort(
      (a, b) => Math.abs(b.percent - 50) - Math.abs(a.percent - 50)
    );
    const top = sorted[0];
    const traits: string[] = [];
    for (const d of MINIIPIP_DIMS) {
      const item = breakdown.find((b) => b.label === d.label)!;
      traits.push(`${d.label}：${item.value}/${item.max}（${item.note}）—— ${MINIIPIP_DESC[d.key]}`);
    }
    return {
      total: top.value,
      max: top.max,
      level: `最突出维度：${top.label}`,
      levelKey: "info",
      summary:
        "大五人格没有「好」与「坏」的总分，只有五个维度的相对高低。请重点看下面的维度分布，而不是把某一项当作缺点。",
      advice: traits,
      breakdown,
      extra: [
        {
          label: "维度均分（1-5）",
          value: MINIIPIP_DIMS.map((d) => {
            const item = breakdown.find((b) => b.label === d.label)!;
            return `${d.key} ${(item.value / 4).toFixed(1)}`;
          }).join(" ｜ "),
        },
      ],
    };
  },
};

/* ===================== 10. 心理繁荣量表 FS ===================== */

const FS_ITEMS = [
  "我过着有目标、有意义的生活。",
  "我的社会关系是支持性的、令人满意的。",
  "我投入并对我日常的活动感兴趣。",
  "我积极地为他人的幸福与福祉做出贡献。",
  "在我所重视的活动中，我是有能力的。",
  "我是一个好人，过着良好的生活。",
  "我对我的未来感到乐观。",
  "人们尊重我。",
];

const flourishing: PsychScale = {
  slug: "flourishing",
  name: "心理繁荣量表 FS",
  subtitle: "8 题 · 心理资源与幸福感的整体状态",
  category: "健康",
  minutes: 2,
  tags: ["幸福感", "正向心理", "繁荣"],
  options: OPTIONS_AGREE_1_7,
  questions: FS_ITEMS.map((text) => ({ text })),
  intro: [
    "Flourishing Scale（心理繁荣量表）由 Diener 等人编制，从关系、意义感、胜任感、乐观等角度评估心理繁荣程度，是「正向心理学」最常用的简短指标之一。",
    "它衡量的是你拥有的心理资源，而不是症状有无；分数越高，通常意味着生活满意度、意义感与人际支持越好。",
  ],
  source: {
    name: "Flourishing Scale (Diener et al., 2009)",
    url: "https://eddiener.com/flourishing-scale-fs/",
    license:
      "量表受版权保护但可免费使用：「The use of this scale is permitted for non-commercial purposes only.」署名 Diener & Biswas-Diener (2009)。本站为非商业个人站点，符合其使用条款。",
  },
  score: (raw) => {
    const { total, max } = sumScores(flourishing, raw);
    const bands: Band[] = [
      {
        min: 8,
        max: 28,
        label: "心理繁荣度较低",
        levelKey: "moderate",
        summary: "你感到生活意义、关系支持或胜任感方面比较匮乏，值得认真关注。",
        advice: [
          "优先改善睡眠与规律运动，它们是心理资源的基础。",
          "主动联系 1-2 位重要的人，关系支持是繁荣感最强的预测因素。",
          "如同时伴随明显情绪低落，建议做一次 PHQ-9 或寻求专业帮助。",
        ],
      },
      {
        min: 29,
        max: 41,
        label: "心理繁荣度中等",
        levelKey: "info",
        summary: "整体处于常见区间，部分领域（意义感、关系或乐观）还有提升空间。",
        advice: [
          "写下最近一周让你觉得「有意义」的 3 件事，并增加它们的频率。",
          "给自己设定一个能在两周内完成的小目标，胜任感最容易被行动点亮。",
        ],
      },
      {
        min: 42,
        max: 49,
        label: "心理繁荣度较高",
        levelKey: "good",
        summary: "你拥有较充足的心理资源，关系、意义感与胜任感都处于良好状态。",
        advice: ["保持现有的生活节奏与关系维护习惯。", "可以尝试把注意力转向长期目标与帮助他人。"],
      },
      {
        min: 50,
        max: 56,
        label: "心理繁荣度很高",
        levelKey: "good",
        summary: "你的心理繁荣度处于很高水平，生活充实且关系稳固。",
        advice: ["记录让你保持这种状态的做法，形成可复制的习惯。", "留意不要因过度投入而透支休息时间。"],
      },
    ];
    const band = bandFor(bands, total);
    return resultFromBand(band, total, max, undefined);
  },
};

/* ===================== 11. 职业兴趣探索（RIASEC，自制题项） ===================== */

const RIASEC_DIMS = [
  { key: "R", label: "现实型 R（Realistic）", desc: "动手、工具、机械、户外" },
  { key: "I", label: "研究型 I（Investigative）", desc: "分析、探究、科学、逻辑" },
  { key: "A", label: "艺术型 A（Artistic）", desc: "创作、审美、表达、自由" },
  { key: "S", label: "社会型 S（Social）", desc: "助人、教学、服务、沟通" },
  { key: "E", label: "企业型 E（Enterprising）", desc: "领导、说服、竞争、经营" },
  { key: "C", label: "常规型 C（Conventional）", desc: "条理、数据、流程、准确" },
];

const RIASEC_ITEMS: { text: string; dim: string }[] = [
  { text: "修理家用电器或机械装置", dim: "R" },
  { text: "动手组装、搭建或制作实物", dim: "R" },
  { text: "在户外或现场进行体力与技术工作", dim: "R" },
  { text: "操作工具、设备或驾驶车辆", dim: "R" },
  { text: "分析数据、寻找规律与原因", dim: "I" },
  { text: "阅读科普或研究类材料", dim: "I" },
  { text: "做实验、验证假设", dim: "I" },
  { text: "研究复杂问题并给出解释", dim: "I" },
  { text: "写作、绘画、音乐或视频创作", dim: "A" },
  { text: "设计海报、界面或空间", dim: "A" },
  { text: "用不拘一格的方式表达想法", dim: "A" },
  { text: "在没有标准答案的任务里发挥创意", dim: "A" },
  { text: "倾听别人的困扰并给出支持", dim: "S" },
  { text: "教别人学会一件事", dim: "S" },
  { text: "组织活动、照顾团队里的每个人", dim: "S" },
  { text: "做志愿服务或社区工作", dim: "S" },
  { text: "说服别人接受我的方案", dim: "E" },
  { text: "负责一个项目并推进结果", dim: "E" },
  { text: "在竞争中争取更好的成绩", dim: "E" },
  { text: "谈判、销售或推广产品", dim: "E" },
  { text: "整理表格、档案与数据并保证准确", dim: "C" },
  { text: "按照清晰的流程按部就班做事", dim: "C" },
  { text: "核对细节、检查错误", dim: "C" },
  { text: "制定并维护规范与制度", dim: "C" },
];

const RIASEC_OPTIONS = [
  { label: "非常不喜欢", value: 1 },
  { label: "不喜欢", value: 2 },
  { label: "一般", value: 3 },
  { label: "喜欢", value: 4 },
  { label: "非常喜欢", value: 5 },
];

const RIASEC_ADVICE: Record<string, string> = {
  R: "适合偏向实物与技术的方向：工程、制造、运维、硬件、建筑、体育、农业等。",
  I: "适合研究与分析方向：科研、数据、算法、医学、金融分析、情报研究等。",
  A: "适合创意与表达方向：设计、内容创作、影视、音乐、写作、产品体验等。",
  S: "适合与人相关的方向：教育、心理咨询、护理、社工、人力资源、客户成功等。",
  E: "适合影响与经营方向：管理、市场、销售、创业、商务谈判、公共关系等。",
  C: "适合与秩序和数据相关的方向：财务、审计、法务、行政、运营、质量管理等。",
};

const riasec: PsychScale = {
  slug: "riasec",
  name: "职业兴趣探索（RIASEC）",
  subtitle: "24 题 · 霍兰德六型兴趣排序",
  category: "职业",
  minutes: 3,
  tags: ["职业", "兴趣", "霍兰德"],
  options: RIASEC_OPTIONS,
  questions: RIASEC_ITEMS,
  dims: RIASEC_DIMS,
  intro: [
    "霍兰德（Holland）的职业兴趣理论把兴趣分为现实型 R、研究型 I、艺术型 A、社会型 S、企业型 E、常规型 C 六类，取分数最高的三码组成「霍兰德代码」，用于匹配职业方向。",
    "说明：本题项由本站按 RIASEC 模型自行编写，用于自我探索，并非 O*NET 官方标准化量表（O*NET 官方题目禁止翻译后分发），因此分数只用于相对排序，没有常模百分位。",
  ],
  notice:
    "本站自编题项，非标准化量表，结果仅供职业方向探索参考，不构成职业建议。",
  source: {
    name: "题项为本站自编（参考 Holland RIASEC 模型）",
    url: "https://www.onetcenter.org/IP.html",
    license:
      "RIASEC 理论模型为公共知识；O*NET 官方兴趣问卷采用 CC BY-ND（禁止翻译后分发），故本站不使用其题目，改为自编题项并明确标注非标准化。",
  },
  score: (raw) => {
    const breakdown = dimensionBreakdown(riasec, raw, RIASEC_DIMS);
    const sorted = [...breakdown].sort((a, b) => b.value - a.value);
    const code = sorted
      .slice(0, 3)
      .map((b) => RIASEC_DIMS.find((d) => d.label === b.label)?.key ?? "")
      .join("");
    const topKey = code[0] ?? "R";
    return {
      total: sorted[0].value,
      max: sorted[0].max,
      level: `霍兰德代码：${code}`,
      levelKey: "info",
      summary: `你的兴趣排序中前三位是 ${code}。代码由六类兴趣得分从高到低取前三位组成，可用来寻找匹配的职业方向，而不是决定你「必须做什么」。`,
      advice: [
        `最强倾向 ${code[0]}：${RIASEC_ADVICE[topKey] ?? ""}`,
        `第二倾向 ${code[1] ?? ""}：${RIASEC_ADVICE[code[1]] ?? ""}`,
        `第三倾向 ${code[2] ?? ""}：${RIASEC_ADVICE[code[2]] ?? ""}`,
        "把代码与真实经历对照：回想过去一年最有成就感的 3 件事，看它们分别落在哪一类。",
        "兴趣可以培养，能力可以被训练——如果兴趣与当前工作不一致，可以先在业余时间小规模尝试。",
      ],
      breakdown,
      typeCode: code,
      typeName: "霍兰德三码",
      extra: [
        { label: "六类百分位（本表内）", value: sorted.map((b) => `${b.label.slice(0, 1)} ${b.percent}%`).join(" ") },
      ],
    };
  },
};

/* ===================== 12. 荣格四维偏好速测（自制题项） ===================== */

type Pole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

const JUNG_ITEMS: { text: string; pole: Pole; pair: string }[] = [
  // 能量方向 E / I
  { text: "在聚会里，我常常主动和陌生人搭话", pole: "E", pair: "EI" },
  { text: "和人相处一段时间后，我通常觉得更有精神", pole: "E", pair: "EI" },
  { text: "我喜欢成为大家关注的中心", pole: "E", pair: "EI" },
  { text: "独处一段时间能让我恢复精力", pole: "I", pair: "EI" },
  { text: "比起热闹的聚会，我更喜欢和一两个熟人待着", pole: "I", pair: "EI" },
  { text: "发言之前，我通常需要先在心里想清楚", pole: "I", pair: "EI" },
  // 信息获取 S / N
  { text: "我更关注眼前的事实，而不是未来的可能性", pole: "S", pair: "SN" },
  { text: "我信任亲身经历和具体细节", pole: "S", pair: "SN" },
  { text: "做事时我偏向用已经验证过的方法", pole: "S", pair: "SN" },
  { text: "我常常同时想到很多种可能性和联想", pole: "N", pair: "SN" },
  { text: "我喜欢讨论抽象的概念和理论", pole: "N", pair: "SN" },
  { text: "我常在脑海里预演未来可能发生的各种情景", pole: "N", pair: "SN" },
  // 决策方式 T / F
  { text: "做决定时，我先看逻辑和利弊", pole: "T", pair: "TF" },
  { text: "我认为公正比顾及情面更重要", pole: "T", pair: "TF" },
  { text: "别人向我倾诉时，我倾向于帮 TA 分析解决办法", pole: "T", pair: "TF" },
  { text: "做决定时，我会优先考虑这件事对每个人感受的影响", pole: "F", pair: "TF" },
  { text: "我很容易被别人的情绪感染", pole: "F", pair: "TF" },
  { text: "我认为维护关系和谐比争论谁对更重要", pole: "F", pair: "TF" },
  // 生活方式 J / P
  { text: "我习惯提前做好计划并按计划完成", pole: "J", pair: "JP" },
  { text: "事情悬而未决会让我不太舒服", pole: "J", pair: "JP" },
  { text: "我喜欢把待办列出来再逐项打勾", pole: "J", pair: "JP" },
  { text: "我更喜欢保留选择余地，而不是过早定下来", pole: "P", pair: "JP" },
  { text: "我常常临时改变原定计划", pole: "P", pair: "JP" },
  { text: "面对截止日期，我更习惯临近时集中发力", pole: "P", pair: "JP" },
];

const JUNG_PAIRS = [
  { key: "EI", left: "E 外向", right: "I 内向", label: "能量方向 E / I" },
  { key: "SN", left: "S 实感", right: "N 直觉", label: "信息获取 S / N" },
  { key: "TF", left: "T 思考", right: "F 情感", label: "决策方式 T / F" },
  { key: "JP", left: "J 判断", right: "P 知觉", label: "生活方式 J / P" },
];

const JUNG_TYPES: Record<string, { name: string; desc: string }> = {
  ISTJ: { name: "务实守序者", desc: "认真、可靠、重视规则与承诺，喜欢按既定流程把事情做扎实。适合需要精确与责任心的岗位，但要注意别把「以前都这么做」当成唯一标准。" },
  ISFJ: { name: "温和守护者", desc: "细心、体贴、愿意照顾身边的人，记得住别人的需要。你的支持常被低估，记得也要为自己争取空间与休息。" },
  INFJ: { name: "洞察引导者", desc: "敏感、有理想、善于理解他人动机，常想为更大的意义做事。注意别因为追求完美与照顾他人而耗尽自己。" },
  INTJ: { name: "独立策划者", desc: "擅长长远规划与系统思考，喜欢独立解决问题。你的弱项往往是表达感受，多解释一次能减少很多误会。" },
  ISTP: { name: "冷静实践者", desc: "动手能力强、临场反应快、喜欢直接解决问题。你不喜欢被规则束缚，适合技术、运维、应急类工作。" },
  ISFP: { name: "柔和体验者", desc: "重视真实感受与美感，喜欢用自己的方式生活。别因害怕冲突而长期压抑需求，温和也可以有边界。" },
  INFP: { name: "理想共情者", desc: "内心有清晰的价值标准，重视意义与真诚。容易理想化，把目标拆小、落到具体行动会让你更有力量。" },
  INTP: { name: "思辨探索者", desc: "喜欢分析原理、质疑结论，享受理解复杂系统的过程。注意把想法落到完成度，别停在「想得很清楚」。" },
  ESTP: { name: "行动冒险家", desc: "反应快、敢试错、擅长在真实场景里解决问题。注意风险预算与长期后果，别只在当下做决定。" },
  ESFP: { name: "热情体验者", desc: "乐于分享、能带动气氛、活在当下。你的人际能力是优势，配上一点计划性会更稳。" },
  ENFP: { name: "灵感激发者", desc: "点子多、热情、善于连接人和可能性。最大的挑战是收尾与坚持，用固定节奏替代临时的热情。" },
  ENTP: { name: "辩论创新者", desc: "喜欢挑战既有结论、擅长找到新解法。注意别人的感受，先说「我理解你的意思」再提出不同意见。" },
  ESTJ: { name: "高效组织者", desc: "目标明确、执行力强、善于把混乱变有序。记得给团队成员留出自主空间，效率不等于统一。" },
  ESFJ: { name: "热心协调者", desc: "重视关系与和谐、乐于照顾集体。注意别把他人的评价当成唯一标准，学会说「不」。" },
  ENFJ: { name: "感召引导者", desc: "善于鼓励他人、能凝聚团队、关注成长。留意别把别人的问题都扛在自己身上。" },
  ENTJ: { name: "果断领导者", desc: "擅长定方向、做决策并推动落地。你的效率很高，但别忘了停下来听情绪层面的信息。" },
};

const jung16: PsychScale = {
  slug: "jung16",
  name: "荣格四维偏好速测（16 型）",
  subtitle: "24 题 · 四个维度组合出 16 种类型",
  category: "人格",
  minutes: 3,
  tags: ["16型", "荣格", "类型"],
  options: [
    { label: "非常不同意", value: 1 },
    { label: "比较不同意", value: 2 },
    { label: "中立", value: 3 },
    { label: "比较同意", value: 4 },
    { label: "非常同意", value: 5 },
  ],
  questions: JUNG_ITEMS.map(({ text, pole, pair }) => ({ text, dim: `${pair}:${pole}` })),
  dims: JUNG_PAIRS.map((p) => ({ key: p.key, label: p.label })),
  intro: [
    "基于荣格心理类型理论的四个维度：能量方向（E/I）、信息获取（S/N）、决策方式（T/F）、生活方式（J/P），组合出 16 种类型。",
    "说明：本题项由本站自行编写，属于通俗化的自我探索工具，既非 MBTI®（与 Myers-Briggs 公司无任何关系），也不是经过心理测量学验证的标准化量表，请不要用它给自己或他人贴标签、做招聘筛选。",
  ],
  notice:
    "本站自编题项，非 MBTI、非标准化量表。类型只是偏好倾向，同一个人在不同情境下表现可能不同。",
  source: {
    name: "题项为本站自编（参考荣格类型理论与开放量表思路）",
    url: "https://www.openpsychometrics.org/tests/OEJTS/",
    license:
      "本站原创题项，不使用 MBTI（注册商标，题目受版权保护）与 OEJTS（CC BY-NC-SA，需整套沿用其题目与署名条款）的题目；类型名称亦为本站描述性命名。",
  },
  score: (raw) => {
    const per: Record<string, { left: number; right: number; max: number }> = {};
    for (const p of JUNG_PAIRS) per[p.key] = { left: 0, right: 0, max: 0 };

    JUNG_ITEMS.forEach((it, i) => {
      const v = raw[i] ?? 3;
      const bucket = per[it.pair];
      const isLeft = it.pole === it.pair[0];
      // 该题得分越高说明越靠近所标记的极
      const score = Math.max(0, v - 1); // 1-5 -> 0-4
      if (isLeft) bucket.left += score;
      else bucket.right += score;
      bucket.max += 4;
    });

    const code = JUNG_PAIRS.map((p) =>
      per[p.key].left >= per[p.key].right ? p.left[0] : p.right[0]
    ).join("");

    const breakdown = JUNG_PAIRS.map((p) => {
      const b = per[p.key];
      const total = b.left + b.right;
      const leftPct = total > 0 ? Math.round((b.left / total) * 100) : 50;
      const preferLeft = b.left >= b.right;
      const pct = preferLeft ? leftPct : 100 - leftPct;
      return {
        label: p.label,
        value: preferLeft ? b.left : b.right,
        max: b.max,
        percent: pct,
        note: `${preferLeft ? p.left : p.right} ${pct}%`,
      };
    });

    const type = JUNG_TYPES[code] ?? { name: "未知类型", desc: "" };
    return {
      total: JUNG_PAIRS.reduce((acc, p) => acc + Math.max(per[p.key].left, per[p.key].right), 0),
      max: JUNG_PAIRS.length * 12,
      level: `类型：${code} · ${type.name}`,
      levelKey: "info",
      summary: `你的四维偏好组合为 ${code}（${type.name}）。四个维度的偏向强度见下表：百分比越接近 50%，说明你在这两端越灵活。`,
      advice: [
        "每种类型都有优势与盲点，类型不是能力上限，也不是命运。",
        "关注百分比接近 50% 的维度：那说明你在两端都比较自如，可以按情境切换。",
        "把结果当作「我通常偏好怎样」的描述，而不是「我只能这样」的结论。",
        `与 ${code} 差异大的类型往往是最难沟通的人——理解差异比改变对方更有效。`,
      ],
      breakdown,
      typeCode: code,
      typeName: type.name,
      typeDesc: type.desc,
      extra: [
        {
          label: "偏好强度",
          value: breakdown.map((b) => `${b.label.slice(0, 1)} ${b.percent}%`).join(" ｜ "),
        },
      ],
    };
  },
};

/* ===================== 13. 依恋关系结构 ECR-RS ===================== */

const ECRRS_ITEMS = [
  "在需要的时候，向 TA 求助是有用的。",
  "我通常会把自己的问题和担心告诉 TA。",
  "我会和 TA 一起商量事情。",
  "我觉得依赖 TA 是件容易的事。",
  "我不太愿意向 TA 敞开心扉。",
  "我不喜欢让 TA 看到我内心深处的感受。",
  "我常常担心 TA 其实并不真的在乎我。",
  "我害怕 TA 可能会抛弃我。",
  "我担心 TA 对我的在乎程度不如我在乎 TA。",
];

const ECRRS_OPTIONS = [
  { label: "非常不同意", value: 1 },
  { label: "不同意", value: 2 },
  { label: "有点不同意", value: 3 },
  { label: "中立", value: 4 },
  { label: "有点同意", value: 5 },
  { label: "同意", value: 6 },
  { label: "非常同意", value: 7 },
];

const ECRRS_DIMS = [
  { key: "avoid", label: "依恋回避（Avoidance）", desc: "对亲近与依赖的不适感" },
  { key: "anx", label: "依恋焦虑（Anxiety）", desc: "对被抛弃与被冷落的担心" },
];

const ecrrs: PsychScale = {
  slug: "ecrrs",
  name: "依恋关系结构 ECR-RS",
  subtitle: "9 题 · 你在亲密关系中的依恋倾向",
  category: "关系",
  minutes: 2,
  tags: ["依恋", "亲密关系", "关系"],
  options: ECRRS_OPTIONS,
  questions: ECRRS_ITEMS.map((text, i) => ({
    text,
    // 前 6 题为回避维度，其中第 1-4 题反向计分；后 3 题为焦虑维度
    dim: i < 6 ? "avoid" : "anx",
    reverse: i < 4,
  })),
  dims: ECRRS_DIMS,
  intro: [
    "ECR-RS（Relationship Structures）由 Fraley 等人编制，用 9 个题目测量依恋的两个核心维度：依恋回避（对亲近、依赖的不适）与依恋焦虑（担心被抛弃、被冷落）。",
    "请先在心中选定一个对象（伴侣、家人或「重要的人」），再按整体感受作答；也可以按「我在亲密关系中通常的样子」来回答。",
  ],
  source: {
    name: "ECR-RS (Fraley et al., 2011)",
    url: "https://labs.psychology.illinois.edu/~rcfraley/measures/relstructures.htm",
    license:
      "作者在实验室页面公开全部题目、计分方式与说明，并明确表示欢迎翻译（「If you are interested in translating the ECR-RS from English to another language, please feel free to do so.」）。本站用于非商业自我了解，并注明原作者与文献。",
  },
  score: (raw) => {
    const mean = (indices: number[]) => {
      const { total } = sumScores(ecrrs, raw, indices);
      return total / indices.length;
    };
    const avoid = mean([0, 1, 2, 3, 4, 5]);
    const anx = mean([6, 7, 8]);
    const highAvoid = avoid >= 4;
    const highAnx = anx >= 4;

    const styles = {
      secure: {
        label: "安全型",
        levelKey: "good" as const,
        summary:
          "你既能安心地亲近和依赖他人，也不太担心被抛弃。这是最容易维持稳定关系的依恋模式。",
        advice: [
          "继续保持开放沟通的习惯，亲密关系中的安全感来源于可预期的回应。",
          "伴侣或朋友处在焦虑/回避状态时，你的稳定表达本身就是最好的支持。",
        ],
      },
      anxious: {
        label: "焦虑型（专注型）",
        levelKey: "mild" as const,
        summary:
          "你渴望亲近，但容易担心对方不够在乎自己，情绪起伏常和对方的回应速度有关。",
        advice: [
          "把「TA 是不是不爱我了」换成具体行为线索来判断，避免用猜测填补空白。",
          "练习直接表达需要（「我今天想要你陪我一会儿」），比反复试探更有效。",
          "先让自己的一部分安全感来自自己：稳定的作息、朋友和兴趣。",
        ],
      },
      avoidant: {
        label: "回避型（疏离型）",
        levelKey: "mild" as const,
        summary:
          "你重视独立，对过度亲近与依赖会感到不适，习惯自己消化情绪。",
        advice: [
          "试着从小事开始自我暴露（分享一件今天的烦心事），不必一次敞开全部。",
          "当你想抽离时，先告诉对方「我需要一点时间」，比直接消失更少伤害关系。",
          "独立与亲密并不冲突，允许别人偶尔照顾你。",
        ],
      },
      fearful: {
        label: "恐惧型（矛盾型）",
        levelKey: "moderate" as const,
        summary:
          "你既渴望亲密又害怕受伤，容易在靠近与退缩之间反复，内心冲突较明显。",
        advice: [
          "这种模式常与早年的不稳定照顾经历有关，理解来处能减少自责。",
          "如果这种拉扯长期带来痛苦，建议寻求心理咨询（依恋取向或 EFT 效果较好）。",
          "先建立一段「低风险」的稳定关系（朋友、兴趣社群），练习被回应的经验。",
        ],
      },
    };

    const style = highAvoid
      ? highAnx
        ? styles.fearful
        : styles.avoidant
      : highAnx
        ? styles.anxious
        : styles.secure;

    const breakdown = [
      {
        label: ECRRS_DIMS[0].label,
        value: Number(avoid.toFixed(1)),
        max: 7,
        percent: Math.round((avoid / 7) * 100),
        note: highAvoid ? "偏高" : "偏低",
      },
      {
        label: ECRRS_DIMS[1].label,
        value: Number(anx.toFixed(1)),
        max: 7,
        percent: Math.round((anx / 7) * 100),
        note: highAnx ? "偏高" : "偏低",
      },
    ];

    return {
      total: Math.round(((avoid + anx) / 2) * 10),
      max: 70,
      level: style.label,
      levelKey: style.levelKey,
      summary: style.summary,
      advice: style.advice,
      breakdown,
      typeCode: `${highAvoid ? "高回避" : "低回避"}·${highAnx ? "高焦虑" : "低焦虑"}`,
      typeName: style.label,
      extra: [
        { label: "依恋回避（1-7）", value: avoid.toFixed(2) },
        { label: "依恋焦虑（1-7）", value: anx.toFixed(2) },
      ],
    };
  },
};

/* ===================== 注册表 ===================== */

export const SCALES: PsychScale[] = [
  phq9,
  gad7,
  dass21,
  swls,
  rses,
  ucla3,
  who5,
  phq15,
  miniipip,
  flourishing,
  riasec,
  jung16,
  ecrrs,
];

export const CATEGORIES = ["情绪", "人格", "健康", "关系", "压力", "职业"] as const;

export function getScale(slug: string): PsychScale | undefined {
  return SCALES.find((s) => s.slug === slug);
}

/** 轻量元数据（列表页/首页用，避免把评分函数传入客户端） */
export function scaleMeta() {
  return SCALES.map((s) => ({
    slug: s.slug,
    name: s.name,
    subtitle: s.subtitle,
    category: s.category,
    minutes: s.minutes,
    tags: s.tags,
    questions: s.questions.length,
  }));
}

export type ScaleMeta = ReturnType<typeof scaleMeta>[number];
