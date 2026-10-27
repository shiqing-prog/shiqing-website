import type { PsychDimension, PsychScale } from "./types";
import {
  bandFor,
  CRISIS_LINES,
  dimensionBreakdown,
  OPTIONS_AGREE_1_7,
  OPTIONS_FREQ_0_3,
  OPTIONS_PSS_0_4,
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

/**
 * DASS-21 分量表分级。
 *
 * 分量表 cut 值（9/13/20/27 等）是 **DASS-42** 口径的官方常模阈值。
 * DASS-21 每个分量表只有 7 题、单题 0–3 分（原始分上限 21），官方判读做法是
 * 先把原始分 ×2 换算成 DASS-42 等效分再对比阈值。此前直接拿原始分比，
 * 导致抑郁的「极重度」（>27）与压力的「重度/极重度」（>25 / >33）永远落不到，
 * 分级系统性偏轻，且与页面 intro 里「需乘以 2」的说法自相矛盾。
 */
function dassBand(total21: number, kind: "depression" | "anxiety" | "stress") {
  const cut: Record<"depression" | "anxiety" | "stress", number[]> = {
    depression: [9, 13, 20, 27],
    anxiety: [7, 9, 14, 19],
    stress: [14, 18, 25, 33],
  };
  const [a, b, c, d] = cut[kind];
  const doubled = total21 * 2; // DASS-42 等效分
  if (doubled <= a) return { label: "正常", key: "good" as const };
  if (doubled <= b) return { label: "轻度", key: "mild" as const };
  if (doubled <= c) return { label: "中度", key: "moderate" as const };
  if (doubled <= d) return { label: "重度", key: "severe" as const };
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
      hideScore: true,
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
        {
          label: "并列说明",
          value:
            sorted[0].value === sorted[2].value
              ? "三类以上得分相同，代码顺序按 R-I-A-S-E-C 排列，仅供排序参考"
              : "得分相同者按 R-I-A-S-E-C 顺序排列",
        },
      ],
      hideScore: true,
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
    /**
     * 用「符号化差值」计分：
     * 每题按 1-5 作答，转成相对中点的偏差 (v-3) ×（该题属于左极则 +1，右极则 -1），
     * 再对每个维度求和。这样「什么都同意/什么都不同意」都会得到 0 分差（不提供偏好信息），
     * 避免出现「全选同一选项 → 一律得到同一个类型」的偏误。
     */
    const pairDiff: Record<string, number> = {};
    const pairItems: Record<string, number> = {};
    for (const p of JUNG_PAIRS) {
      pairDiff[p.key] = 0;
      pairItems[p.key] = 0;
    }
    JUNG_ITEMS.forEach((it, i) => {
      const v = raw[i] ?? 3;
      const sign = it.pole === it.pair[0] ? 1 : -1;
      pairDiff[it.pair] += (v - 3) * sign;
      pairItems[it.pair] += 1;
    });

    const code = JUNG_PAIRS.map((p) =>
      pairDiff[p.key] >= 0 ? p.left[0] : p.right[0]
    ).join("");

    const breakdown = JUNG_PAIRS.map((p) => {
      const diff = pairDiff[p.key];
      // 每个维度 6 题，单题最大偏差 ±2 → |diff| 最大 12
      const maxDiff = pairItems[p.key] * 2;
      const pct = Math.round(50 + (Math.abs(diff) / maxDiff) * 50);
      const preferLeft = diff >= 0;
      const pole = preferLeft ? p.left : p.right;
      return {
        label: p.label,
        value: Math.abs(diff),
        max: maxDiff,
        percent: pct,
        note: diff === 0 ? "两端均衡（50%），该维度无明确偏好" : `${pole} ${pct}%`,
      };
    });

    const balanced = JUNG_PAIRS.filter((p) => pairDiff[p.key] === 0).map((p) => p.label);
    const type = JUNG_TYPES[code] ?? { name: "未知类型", desc: "" };
    return {
      total: breakdown.reduce((acc, b) => acc + b.value, 0),
      max: breakdown.reduce((acc, b) => acc + b.max, 0),
      level: `类型：${code} · ${type.name}`,
      levelKey: "info",
      summary: `你的四维偏好组合为 ${code}（${type.name}）。四个维度的偏向强度见下表：百分比越接近 50%，说明你在这两端越灵活${
        balanced.length > 0 ? `；其中 ${balanced.join("、")} 接近均衡` : ""
      }。`,
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
      hideScore: true,
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
      hideScore: true,
    };
  },
};

/* ===================== 14. Zung 抑郁自评量表 SDS ===================== */

const SDS_ITEMS: { text: string; reverse?: boolean }[] = [
  { text: "我觉得闷闷不乐，情绪低沉" },
  { text: "我觉得一天之中早晨最好", reverse: true },
  { text: "我一阵阵哭出来或觉得想哭" },
  { text: "我晚上睡眠不好" },
  { text: "我吃得跟平常一样多", reverse: true },
  { text: "我与异性接触时和以往一样感到愉快", reverse: true },
  { text: "我发觉我的体重在下降" },
  { text: "我有便秘的苦恼" },
  { text: "我心跳比平时快" },
  { text: "我无缘无故地感到疲乏" },
  { text: "我的头脑跟平常一样清楚", reverse: true },
  { text: "我觉得经常做的事情并没有困难", reverse: true },
  { text: "我觉得不安而平静不下来" },
  { text: "我对将来抱有希望", reverse: true },
  { text: "我比平常容易生气激动" },
  { text: "我觉得作出决定是容易的", reverse: true },
  { text: "我觉得自己是个有用的人，有人需要我", reverse: true },
  { text: "我的生活过得很有意思", reverse: true },
  { text: "我认为如果我死了别人会生活得好些" },
  { text: "平常感兴趣的事我仍然照样感兴趣", reverse: true },
];

const OPTIONS_SDS: { label: string; value: number }[] = [
  { label: "没有或很少时间", value: 1 },
  { label: "小部分时间", value: 2 },
  { label: "相当多时间", value: 3 },
  { label: "绝大部分或全部时间", value: 4 },
];

const SDS_BANDS: Band[] = [
  {
    min: 0,
    max: 49,
    label: "无明显抑郁症状",
    levelKey: "good",
    summary: "标准分处于一般范围，最近一周没有明显的抑郁症状。",
    advice: [
      "维持规律作息与日常活动，这是最稳定的保护因素。",
      "情绪有起伏很正常，关注持续两周以上的变化即可。",
    ],
  },
  {
    min: 50,
    max: 59,
    label: "轻度抑郁",
    levelKey: "mild",
    summary: "出现了一些轻度抑郁症状，虽不严重，但值得留意。",
    advice: [
      "记录情绪与睡眠的变化，找出反复出现的触发点。",
      "增加白天光照与适度运动，减少深夜刷手机的时长。",
      "如果持续两周以上，可以找学校心理老师或咨询师聊一次。",
    ],
  },
  {
    min: 60,
    max: 69,
    label: "中度抑郁",
    levelKey: "moderate",
    summary: "症状达到中度，可能已经影响到学习、工作或人际。",
    advice: [
      "建议主动寻求专业评估（心理咨询或精神科门诊）。",
      "把任务拆小、允许自己降低标准，先保证睡眠与吃饭。",
      "把感受告诉一个可信任的人，不要长期独自硬撑。",
    ],
  },
  {
    min: 70,
    max: 100,
    label: "重度抑郁",
    levelKey: "severe",
    summary: "标准分很高，提示困扰较重，请把寻求帮助放在第一位。",
    advice: [
      "尽快前往精神科或心理科就诊，必要时请家人朋友陪同。",
      "如果你有过伤害自己的念头，请立即联系信任的人或拨打心理援助热线。",
      "抑郁是可治疗的，现在需要的是专业帮助而不是意志力。",
    ],
  },
];

const sds: PsychScale = {
  slug: "sds",
  name: "Zung 抑郁自评量表 SDS",
  subtitle: "20 题 · 经典自评量表，按最近一周作答",
  category: "情绪",
  minutes: 3,
  tags: ["抑郁", "情绪", "筛查"],
  options: OPTIONS_SDS,
  questions: SDS_ITEMS,
  intro: [
    "SDS（Self-Rating Depression Scale）由 Zung 于 1965 年编制，共 20 题，其中 10 题为反向计分，是国际上使用历史最久的抑郁自评工具之一。",
    "请回想「最近一周」，按每种情况出现的频率作答。计分时先算粗分（20-80），再乘 1.25 得到标准分（25-100）用于分级。",
  ],
  notice: "第 19 题涉及轻生念头。若你选择了非「没有或很少时间」，请认真对待并尽快寻求专业帮助。",
  source: {
    name: "Zung Self-Rating Depression Scale (Zung, 1965)",
    url: "https://pubmed.ncbi.nlm.nih.gov/14344195/",
    license:
      "量表题目广泛公开用于临床与研究；本站按通行中文译法收录，供自我了解使用，不构成诊断。",
  },
  score: (raw) => {
    const { total } = sumScores(sds, raw);
    const standard = Math.round(total * 1.25);
    const band = bandFor(SDS_BANDS, standard);
    const advice = [...band.advice];
    if ((raw[18] ?? 0) > 1) {
      advice.unshift(
        "⚠️ 你在第 19 题（轻生念头）选择了非「没有或很少时间」：请把这件事告诉一位可信任的人，并尽快联系专业人员（" +
          CRISIS_LINES[0] +
          "）。"
      );
    }
    return resultFromBand(band, standard, 100, [
      { label: "粗分（20-80）", value: String(total) },
      { label: "标准分（粗分×1.25）", value: String(standard) },
      { label: "反向计分题", value: "第 2、5、6、11、12、14、16、17、18、20 题" },
    ]);
  },
};

/* ===================== 15. Zung 焦虑自评量表 SAS ===================== */

const SAS_ITEMS: { text: string; reverse?: boolean }[] = [
  { text: "我觉得比平常容易紧张和着急" },
  { text: "我无缘无故地感到害怕" },
  { text: "我容易心里烦乱或觉得惊恐" },
  { text: "我觉得我可能将要发疯" },
  { text: "我觉得一切都很好，也不会发生什么不幸", reverse: true },
  { text: "我手脚发抖打颤" },
  { text: "我因为头痛、颈痛和背痛而苦恼" },
  { text: "我感觉容易衰弱和疲乏" },
  { text: "我觉得心平气和，并且容易安静坐着", reverse: true },
  { text: "我觉得心跳得很快" },
  { text: "我因为一阵阵头晕而苦恼" },
  { text: "我有晕倒发作，或觉得要晕倒似的" },
  { text: "我呼气吸气都感到很容易", reverse: true },
  { text: "我手脚麻木和刺痛" },
  { text: "我因为胃痛和消化不良而苦恼" },
  { text: "我常常要小便" },
  { text: "我的手常常是干燥温暖的", reverse: true },
  { text: "我脸红发热" },
  { text: "我容易入睡并且一夜睡得很好", reverse: true },
  { text: "我做噩梦" },
];

const SAS_BANDS: Band[] = [
  {
    min: 0,
    max: 49,
    label: "无明显焦虑症状",
    levelKey: "good",
    summary: "标准分处于一般范围，最近一周没有明显的焦虑症状。",
    advice: [
      "保持规律作息与运动，焦虑的阈值会随睡眠与体能改善而提高。",
      "偶尔紧张是正常反应，留意「持续两周以上」这条线即可。",
    ],
  },
  {
    min: 50,
    max: 59,
    label: "轻度焦虑",
    levelKey: "mild",
    summary: "出现了一些轻度焦虑症状，身体可能已经开始有反应。",
    advice: [
      "试试腹式呼吸或渐进式肌肉放松，每天 5-10 分钟，对躯体紧张有效。",
      "把担心的事情写下来，区分「能控制的」和「不能控制的」。",
      "减少咖啡因与深夜屏幕时间，它们会放大焦虑感。",
    ],
  },
  {
    min: 60,
    max: 69,
    label: "中度焦虑",
    levelKey: "moderate",
    summary: "焦虑程度已达中度，可能影响睡眠、注意力与日常状态。",
    advice: [
      "建议寻求专业评估，焦虑障碍是治疗效果很好的问题。",
      "避免用「硬扛」解决，长期回避会让焦虑范围扩大。",
      "和信任的人说出你的担心，把模糊的恐惧变成具体的问题。",
    ],
  },
  {
    min: 70,
    max: 100,
    label: "重度焦虑",
    levelKey: "severe",
    summary: "标准分很高，提示焦虑困扰较重，建议尽快获得专业支持。",
    advice: [
      "尽快到精神科或心理科就诊，评估是否需要系统干预。",
      "若出现惊恐发作（心跳剧烈、濒死感、呼吸困难），请就医排查并告知医生。",
      "记住：这是可以被帮助的状态，不是你「太脆弱」。",
    ],
  },
];

const sas: PsychScale = {
  slug: "sas",
  name: "Zung 焦虑自评量表 SAS",
  subtitle: "20 题 · 经典自评量表，含躯体症状条目",
  category: "情绪",
  minutes: 3,
  tags: ["焦虑", "情绪", "躯体"],
  options: OPTIONS_SDS,
  questions: SAS_ITEMS,
  intro: [
    "SAS（Self-Rating Anxiety Scale）由 Zung 于 1971 年编制，20 题中有 5 题为反向计分，特点是包含大量躯体症状条目（心慌、出汗、手脚麻木等），适合观察焦虑的身体表现。",
    "请回想「最近一周」，按每种情况出现的频率作答，计分方式与 SDS 相同：粗分×1.25 = 标准分。",
  ],
  notice: "躯体症状也可能来自其他身体疾病。若症状明显或突然出现，请先就医排查。",
  source: {
    name: "Zung Self-Rating Anxiety Scale (Zung, 1971)",
    url: "https://pubmed.ncbi.nlm.nih.gov/5157522/",
    license:
      "量表题目广泛公开用于临床与研究；本站按通行中文译法收录，供自我了解使用，不构成诊断。",
  },
  score: (raw) => {
    const { total } = sumScores(sas, raw);
    const standard = Math.round(total * 1.25);
    const band = bandFor(SAS_BANDS, standard);
    return resultFromBand(band, standard, 100, [
      { label: "粗分（20-80）", value: String(total) },
      { label: "标准分（粗分×1.25）", value: String(standard) },
      { label: "反向计分题", value: "第 5、9、13、17、19 题" },
    ]);
  },
};

/* ===================== 16. Kessler 心理困扰量表 K10 ===================== */

const K10_ITEMS = [
  "你是否经常感到疲倦，没有明显原因？",
  "你是否经常感到紧张？",
  "你是否经常感到太紧张而无法平静下来？",
  "你是否经常感到绝望？",
  "你是否经常感到烦躁不安？",
  "你是否经常感到坐立不安？",
  "你是否经常感到抑郁？",
  "你是否经常感到做每件事都很费力？",
  "你是否经常感到悲伤？",
  "你是否经常感到自己没有价值？",
];

const OPTIONS_K10: { label: string; value: number }[] = [
  { label: "几乎没有", value: 1 },
  { label: "偶尔", value: 2 },
  { label: "有些时候", value: 3 },
  { label: "大部分时间", value: 4 },
  { label: "所有时间", value: 5 },
];

const K10_BANDS: Band[] = [
  {
    min: 10,
    max: 15,
    label: "心理状态良好",
    levelKey: "good",
    summary: "过去 30 天里，你的心理困扰水平较低，整体状态比较稳定。",
    advice: [
      "保持现有的作息、运动与社交节奏，这是最有效的预防。",
      "留意压力事件集中的时期，提前给自己留缓冲。",
    ],
  },
  {
    min: 16,
    max: 21,
    label: "轻度心理困扰",
    levelKey: "mild",
    summary: "出现了一些困扰信号，多数人在这类水平下仍能正常生活，但值得关注。",
    advice: [
      "找出最近最消耗你的 1-2 件事，看看能否减少或求助。",
      "保证睡眠时长，睡眠不足会显著放大困扰感。",
      "给自己安排「什么都不用做」的恢复时间。",
    ],
  },
  {
    min: 22,
    max: 29,
    label: "较高心理困扰",
    levelKey: "moderate",
    summary: "困扰水平偏高，可能已经影响到日常功能，建议主动寻求支持。",
    advice: [
      "优先处理睡眠与饮食，再谈效率与目标。",
      "向信任的人说出你的状态，不要独自承担。",
      "若持续数周没有缓解，建议预约心理咨询评估。",
    ],
  },
  {
    min: 30,
    max: 50,
    label: "严重心理困扰",
    levelKey: "severe",
    summary: "困扰水平很高，请把寻求专业帮助放在最优先的位置。",
    advice: [
      "尽快联系精神科或心理科进行评估。",
      "如果你有伤害自己的念头，请立即联系信任的人或拨打心理援助热线。",
      "这不是你不够坚强，而是需要有人一起分担。",
    ],
  },
];

const k10: PsychScale = {
  slug: "k10",
  name: "Kessler 心理困扰量表 K10",
  subtitle: "10 题 · 过去 30 天的整体心理困扰",
  category: "情绪",
  minutes: 2,
  tags: ["困扰", "情绪", "筛查"],
  options: OPTIONS_K10,
  questions: K10_ITEMS.map((text) => ({ text })),
  intro: [
    "K10（Kessler Psychological Distress Scale）由 Kessler 等人编制，是国际大型健康调查（如澳大利亚全国调查、WHO 世界精神卫生调查）中最常用的心理困扰筛查工具，共 10 题。",
    "它不区分具体的疾病类型，而是测量「非特异性心理困扰」的总体水平。请回想过去 30 天的情况作答。",
  ],
  source: {
    name: "Kessler Psychological Distress Scale (Kessler et al., 2002)",
    url: "https://pubmed.ncbi.nlm.nih.gov/12214795/",
    license:
      "量表题目在公共卫生与研究中广泛公开使用；本站按通行中文译法收录，供自我了解使用，不构成诊断。",
  },
  score: (raw) => {
    const { total, max } = sumScores(k10, raw);
    const band = bandFor(K10_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 10).toFixed(1) },
      { label: "困扰条目数（≥4 分）", value: String(raw.filter((v) => v >= 4).length) },
    ]);
  },
};

/* ===================== 17. 情绪调节问卷 ERQ ===================== */

const ERQ_ITEMS: { text: string; dim: "reappraisal" | "suppression" }[] = [
  { text: "当我想让自己感受到更多积极情绪时，我会改变自己思考的角度", dim: "reappraisal" },
  { text: "我会把自己的情绪隐藏起来", dim: "suppression" },
  { text: "当我想让自己感受到更少消极情绪时，我会改变自己思考的角度", dim: "reappraisal" },
  { text: "当我感到积极情绪时，我会小心地不把它们表现出来", dim: "suppression" },
  { text: "当我面对压力情境时，我会让自己以有助于保持冷静的方式思考", dim: "reappraisal" },
  { text: "我会控制自己的情绪，不表达出来", dim: "suppression" },
  { text: "当我想让自己感受到更多积极情绪时，我会改变自己对情境的看法", dim: "reappraisal" },
  { text: "我会通过改变对情境的看法来控制自己的情绪", dim: "reappraisal" },
  { text: "当我感到消极情绪时，我会确保不把它们表现出来", dim: "suppression" },
  { text: "当我想让自己感受到更少消极情绪时，我会改变自己思考的角度", dim: "reappraisal" },
];

const ERQ_DIMS: PsychDimension[] = [
  { key: "reappraisal", label: "认知重评", desc: "通过重新理解情境来改变情绪，通常被视为更适应性的策略" },
  { key: "suppression", label: "表达抑制", desc: "把已经产生的情绪压住不表达，长期使用与更多身心负担相关" },
];

const erq: PsychScale = {
  slug: "erq",
  name: "情绪调节问卷 ERQ",
  subtitle: "10 题 · 你习惯用哪种方式处理情绪",
  category: "情绪",
  minutes: 2,
  tags: ["情绪", "调节", "应对"],
  options: OPTIONS_AGREE_1_7,
  questions: ERQ_ITEMS.map(({ text, dim }) => ({ text, dim })),
  dims: ERQ_DIMS,
  intro: [
    "ERQ（Emotion Regulation Questionnaire）由 Gross 与 John 于 2003 年编制，测量两种最核心的情绪调节策略：认知重评（改变想法）与表达抑制（压住不表现）。",
    "大量研究发现，习惯使用认知重评的人情绪体验与社交关系通常更好，而长期依赖表达抑制与更高的焦虑、更低的生活满意度相关。这不是好坏评判，而是「你现在主要用哪一种」。",
  ],
  source: {
    name: "Emotion Regulation Questionnaire (Gross & John, 2003)",
    url: "https://pubmed.ncbi.nlm.nih.gov/12585811/",
    license: "量表题目在学术研究中广泛公开使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const breakdown = dimensionBreakdown(erq, raw, ERQ_DIMS);
    const reappraisal = breakdown[0]?.value ?? 0;
    const suppression = breakdown[1]?.value ?? 0;
    const { total, max } = sumScores(erq, raw);
    const dominant =
      reappraisal / 42 >= suppression / 28 ? "更常使用认知重评" : "更常使用表达抑制";
    return {
      total,
      max,
      level: dominant,
      levelKey: suppression > reappraisal * (28 / 42) ? "mild" : "good",
      summary:
        "你的认知重评得分 " +
        reappraisal +
        "/42，表达抑制得分 " +
        suppression +
        "/28。整体上你" +
        dominant +
        "。两种策略都有用武之地：重评适合改变情绪的来源，抑制适合在必要时短暂维持场面。",
      advice: [
        "认知重评不是自我欺骗：它是找出情境中同样真实、但更有帮助的解释角度。",
        "如果抑制得分明显偏高，试着在安全的关系里练习表达——长期压住情绪并不会让它消失。",
        "面对强烈情绪时，先允许它存在（命名它），再选择如何回应，比直接压下去更省力。",
      ],
      breakdown,
      extra: [
        { label: "重评题均分", value: (reappraisal / 6).toFixed(2) },
        { label: "抑制题均分", value: (suppression / 4).toFixed(2) },
      ],
    };
  },
};

/* ===================== 18. 知觉压力量表 PSS-10 ===================== */

const PSS10_ITEMS: { text: string; reverse?: boolean }[] = [
  { text: "你有多经常因为发生意外的事情而感到心烦意乱？" },
  { text: "你有多经常感到无法控制生活中重要的事情？" },
  { text: "你有多经常感到紧张不安？" },
  { text: "你有多经常有信心处理好个人问题？", reverse: true },
  { text: "你有多经常感到事情正按照你的意愿发展？", reverse: true },
  { text: "你有多经常发现你无法应付所有你必须做的事情？" },
  { text: "你有多经常能够控制生活中令你烦恼的事情？", reverse: true },
  { text: "你有多经常感到你掌控着事情？", reverse: true },
  { text: "你有多经常因为无法控制的事情而生气？" },
  { text: "你有多经常感到困难堆积太多以致无法克服？" },
];

const PSS10_BANDS: Band[] = [
  {
    min: 0,
    max: 13,
    label: "压力知觉较低",
    levelKey: "good",
    summary: "过去一个月，你较少感到生活失控或不堪重负。",
    advice: [
      "维持现在的节奏，同时留意：低压期也是建立缓冲的好时机。",
      "把有效的应对方式记下来（运动、倾诉、拆任务），压力上来时可以直接用。",
    ],
  },
  {
    min: 14,
    max: 26,
    label: "压力知觉中等",
    levelKey: "mild",
    summary: "你感受到中等程度的压力，多数时候还能应付，但已有消耗感。",
    advice: [
      "每周留出固定的「恢复时间」，不要等撑不住才休息。",
      "把压力源写下来并按可控性排序，优先处理能改变的。",
      "保证睡眠与运动，这两项对压力知觉的影响比想象中大。",
    ],
  },
  {
    min: 27,
    max: 40,
    label: "压力知觉较高",
    levelKey: "severe",
    summary: "你长期处在高压与失控感中，身心正在为此付出代价。",
    advice: [
      "优先减少负荷：能推的推、能求助的求助，而不是硬撑。",
      "与信任的人谈谈现在的处境，独自承受会放大失控感。",
      "如果伴随持续的失眠、心慌或情绪低落，建议寻求专业帮助。",
    ],
  },
];

const pss10: PsychScale = {
  slug: "pss10",
  name: "知觉压力量表 PSS-10",
  subtitle: "10 题 · 过去一个月你感受到的压力",
  category: "压力",
  minutes: 2,
  tags: ["压力", "应对", "情绪"],
  options: OPTIONS_PSS_0_4,
  questions: PSS10_ITEMS,
  intro: [
    "PSS（Perceived Stress Scale）由 Cohen 等人编制，10 题版是最常用的压力自评工具。它测量的不是「发生了多少事」，而是「你觉得这些事有多难应付」——知觉到的压力比客观事件更能预测健康结果。",
    "请回想「过去一个月」，按每种感受出现的频率作答。第 4、5、7、8 题为反向计分。",
  ],
  source: {
    name: "Perceived Stress Scale (Cohen, Kamarck & Mermelstein, 1983)",
    url: "https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html",
    license: "作者公开量表供免费研究与教育使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const { total, max } = sumScores(pss10, raw);
    const band = bandFor(PSS10_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 10).toFixed(2) },
      { label: "高压力条目（≥3 分）", value: String(raw.filter((v) => v >= 3).length) },
    ]);
  },
};

/* ===================== 19. 失眠严重指数 ISI ===================== */

const ISI_ITEMS = [
  "入睡困难：你躺下后通常需要多久才能睡着？",
  "睡眠维持困难：你夜间醒来的频率如何？",
  "早醒问题：你比计划醒得更早、且难以再入睡的频率如何？",
  "你对目前睡眠模式的满意程度如何？",
  "你的睡眠问题在多大程度上干扰了白天的功能（疲劳、情绪、工作、注意力）？",
  "你的睡眠问题在多大程度上被他人注意到？",
  "你对目前的睡眠问题有多担心或痛苦？",
];

const OPTIONS_ISI: { label: string; value: number }[] = [
  { label: "无 / 非常满意", value: 0 },
  { label: "轻度", value: 1 },
  { label: "中度", value: 2 },
  { label: "重度", value: 3 },
  { label: "非常严重 / 非常不满意", value: 4 },
];

const ISI_BANDS: Band[] = [
  {
    min: 0,
    max: 7,
    label: "无临床显著失眠",
    levelKey: "good",
    summary: "你的睡眠整体处在健康范围，没有明显影响白天功能的失眠问题。",
    advice: [
      "保持固定的起床时间，比固定入睡时间更重要。",
      "睡前 1 小时减少强光与刷屏，有助于褪黑素正常分泌。",
    ],
  },
  {
    min: 8,
    max: 14,
    label: "亚临床失眠",
    levelKey: "mild",
    summary: "已经出现失眠的早期信号，可能偶尔影响白天状态。",
    advice: [
      "试试「刺激控制」：床只用来睡觉，睡不着超过 20 分钟就起来做点无聊的事。",
      "下午之后避免咖啡因，晚上避免酒精（酒精会让你早醒）。",
      "如果持续一个月以上，可以考虑认知行为疗法（CBT-I），它是失眠的一线治疗。",
    ],
  },
  {
    min: 15,
    max: 21,
    label: "中度临床失眠",
    levelKey: "moderate",
    summary: "失眠已经达到临床水平，明显影响白天的精力与情绪。",
    advice: [
      "建议优先考虑 CBT-I（失眠认知行为疗法），效果优于长期依赖安眠药。",
      "记录两周睡眠日记（入睡时间、醒来次数、起床时间），就诊时会很有帮助。",
      "不要在床上反复焦虑「今晚又要失眠了」，这会让失眠固化。",
    ],
  },
  {
    min: 22,
    max: 28,
    label: "重度临床失眠",
    levelKey: "severe",
    summary: "失眠程度较重，已显著影响生活质量，建议尽快就医。",
    advice: [
      "尽快到睡眠专科或精神科就诊，排查睡眠呼吸暂停等躯体因素。",
      "在医生指导下短期用药 + 行为治疗通常是更稳妥的组合。",
      "长期睡眠不足会加重情绪问题，请把它当作需要治疗的问题，而不是「忍一忍」。",
    ],
  },
];

const isi: PsychScale = {
  slug: "isi",
  name: "失眠严重指数 ISI",
  subtitle: "7 题 · 评估失眠的严重程度",
  category: "健康",
  minutes: 2,
  tags: ["睡眠", "失眠", "健康"],
  options: OPTIONS_ISI,
  questions: ISI_ITEMS.map((text) => ({ text })),
  intro: [
    "ISI（Insomnia Severity Index）由 Morin 编制，共 7 题，是评估失眠严重程度最常用的量表之一，也被用于追踪治疗效果。",
    "它关注的不只是「睡了几小时」，还包括入睡、维持、早醒、满意度与白天功能。请按「最近两周」的情况作答。",
  ],
  notice: "如果失眠伴随明显打鼾、呼吸暂停、白天极度嗜睡，请先到睡眠专科排查躯体原因。",
  source: {
    name: "Insomnia Severity Index (Morin, 1993)",
    url: "https://pubmed.ncbi.nlm.nih.gov/23591036/",
    license: "量表题目在临床与研究中广泛公开使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const { total, max } = sumScores(isi, raw);
    const band = bandFor(ISI_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "白天功能受损", value: String(Math.min(4, raw[4] ?? 0)) + " / 4" },
      { label: "对睡眠的担心", value: String(raw[6] ?? 0) + " / 4" },
    ]);
  },
};

/* ===================== 20. 疲劳严重度量表 FSS ===================== */

const FSS_ITEMS = [
  "当疲劳加重时，我的动力也会下降",
  "运动会使我感到疲劳",
  "我很容易疲劳",
  "疲劳会干扰我的身体功能",
  "疲劳经常给我带来问题",
  "疲劳使我无法维持长时间的身体活动",
  "疲劳会干扰我完成某些职责和任务",
  "疲劳是我最严重的症状之一",
  "疲劳会干扰我的工作、家庭或社交生活",
];

const FSS_BANDS: Band[] = [
  {
    min: 1,
    max: 3.99,
    label: "疲劳水平一般",
    levelKey: "good",
    summary: "你的疲劳程度没有达到临床显著水平，日常生活影响较小。",
    advice: [
      "保持规律运动与睡眠，是预防慢性疲劳最可靠的两件事。",
      "如果近期突然变得容易累，留意是否与睡眠、饮食或情绪变化有关。",
    ],
  },
  {
    min: 4,
    max: 5.69,
    label: "疲劳程度偏高",
    levelKey: "moderate",
    summary: "平均分达到临床关注阈值，疲劳可能已经在影响你的日常功能。",
    advice: [
      "先排查基础因素：睡眠时长与质量、贫血/甲状腺等体检指标、长期压力。",
      "把活动拆成小段并安排休息，避免「硬撑一整天再崩溃」的循环。",
      "如果持续 6 个月以上，建议就医评估是否为慢性疲劳。",
    ],
  },
  {
    min: 5.7,
    max: 7,
    label: "疲劳程度严重",
    levelKey: "severe",
    summary: "疲劳感很强，可能显著影响工作、学习与社交。",
    advice: [
      "建议尽快就医，排查躯体疾病（贫血、甲状腺、睡眠障碍等）与抑郁焦虑。",
      "在确诊前避免剧烈增加运动量，先以低强度活动维持。",
      "把重要事项排在精力最好的时段，其余时间允许自己减量。",
    ],
  },
];

const fss: PsychScale = {
  slug: "fss",
  name: "疲劳严重度量表 FSS",
  subtitle: "9 题 · 疲劳对你生活的影响程度",
  category: "健康",
  minutes: 2,
  tags: ["疲劳", "精力", "健康"],
  options: OPTIONS_AGREE_1_7,
  questions: FSS_ITEMS.map((text) => ({ text })),
  intro: [
    "FSS（Fatigue Severity Scale）由 Krupp 等人编制，共 9 题，用 1-7 分评价疲劳对日常生活的影响，是多发性硬化、慢性疲劳等研究中常用的工具。",
    "它测的是「疲劳有多影响你」，不是「你有多累」。计分取 9 题平均分，≥4 分通常被视为具有临床意义。",
  ],
  notice: "疲劳可能是贫血、甲状腺功能异常、睡眠障碍或情绪问题的表现，持续存在时请就医排查。",
  source: {
    name: "Fatigue Severity Scale (Krupp et al., 1989)",
    url: "https://pubmed.ncbi.nlm.nih.gov/2803071/",
    license: "量表题目在临床与研究中广泛公开使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const { total } = sumScores(fss, raw);
    const avg = total / 9;
    const band = bandFor(FSS_BANDS, avg);
    return resultFromBand(band, Number(avg.toFixed(2)), 7, [
      { label: "总分（9-63）", value: String(total) },
      { label: "平均值", value: avg.toFixed(2) },
      { label: "判定阈值", value: "≥4 分提示疲劳具有临床意义" },
    ]);
  },
};

/* ===================== 21. 正念注意觉知量表 MAAS ===================== */

const MAAS_ITEMS = [
  "我可能在体验某些事情时，注意力却飘到了别处",
  "我会因为不小心、走神或想别的事而弄坏或打翻东西",
  "我发现很难把注意力集中在当下正在发生的事情上",
  "我倾向于快步走到目的地，而不去留意沿途的经历",
  "我倾向于忽略身体紧张或不适的信号，直到它们真正引起我的注意",
  "我会忘记别人的名字，几乎一听到就忘",
  "我似乎处在「自动运行」状态，没有意识到自己在做什么",
  "我会匆匆忙忙地做事情，而没有真正投入其中",
  "我会过于专注想达成的目标，而忽略了自己正在做的方式",
  "我会不自觉地做任务，没有真正意识到自己在做什么",
  "我发现自己一边听别人说话，一边在做别的事",
  "我会走到某个地方，然后想不起来路上发生了什么",
  "我发现自己专注于过去或未来，而没有关注当下",
  "我发现自己做的事没有引起注意",
  "我会吃零食，却没有意识到自己在吃",
];

const OPTIONS_MAAS: { label: string; value: number }[] = [
  { label: "几乎总是", value: 1 },
  { label: "非常频繁", value: 2 },
  { label: "相当频繁", value: 3 },
  { label: "有时", value: 4 },
  { label: "很少", value: 5 },
  { label: "几乎从不", value: 6 },
];

const MAAS_BANDS: Band[] = [
  {
    min: 1,
    max: 2.99,
    label: "正念水平较低",
    levelKey: "mild",
    summary: "你大部分时间处在「自动运行」状态，注意力较少停留在当下。",
    advice: [
      "从最小练习开始：每天吃饭时专注前 3 口，感受味道与咀嚼。",
      "把「觉察到走神」本身当作练习成功，而不是失败。",
      "正念不是放空，而是知道此刻自己在做什么、想什么。",
    ],
  },
  {
    min: 3,
    max: 3.99,
    label: "正念水平中等",
    levelKey: "info",
    summary: "你有时能觉察当下，也常常被思绪带走，这是大多数人的常态。",
    advice: [
      "每天 5 分钟呼吸练习，坚持两周就能感到差别。",
      "在通勤或走路时练习：注意脚步、风声、身体的感觉。",
      "把手机通知关掉一部分，减少被动注意切换。",
    ],
  },
  {
    min: 4,
    max: 4.99,
    label: "正念水平较高",
    levelKey: "good",
    summary: "你较常把注意力放在当下，能觉察到自己的状态变化。",
    advice: [
      "把这种觉察带到情绪升起的第一时间，它是最好的缓冲。",
      "在压力大的时期保持练习，正念的效果依赖持续而非强度。",
    ],
  },
  {
    min: 5,
    max: 6,
    label: "正念水平很高",
    levelKey: "good",
    summary: "你大部分时间都能清楚地觉察当下正在发生的事。",
    advice: [
      "继续保持，并留意别把「保持觉察」变成新的绩效目标。",
      "可以把觉察用在人际互动中：先听完，再回应。",
    ],
  },
];

const maas: PsychScale = {
  slug: "maas",
  name: "正念注意觉知量表 MAAS",
  subtitle: "15 题 · 你在多大程度上活在当下",
  category: "健康",
  minutes: 2,
  tags: ["正念", "觉察", "专注"],
  options: OPTIONS_MAAS,
  questions: MAAS_ITEMS.map((text) => ({ text })),
  intro: [
    "MAAS（Mindful Attention Awareness Scale）由 Brown 与 Ryan 编制，共 15 题，测量日常生活中「对当下经验的注意与觉察」这一单一特质。",
    "注意计分方向：题目描述的都是「不注意」的情形，选「几乎总是」得分最低。分数越高，说明你越常处在清醒的觉察状态。",
  ],
  source: {
    name: "Mindful Attention Awareness Scale (Brown & Ryan, 2003)",
    url: "https://pubmed.ncbi.nlm.nih.gov/12747526/",
    license: "量表题目在学术研究中广泛公开使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const { total } = sumScores(maas, raw);
    const avg = total / 15;
    const band = bandFor(MAAS_BANDS, avg);
    return resultFromBand(band, Number(avg.toFixed(2)), 6, [
      { label: "总分（15-90）", value: String(total) },
      { label: "平均值", value: avg.toFixed(2) },
      { label: "参考常模", value: "一般成年人平均约 3.8-4.0" },
    ]);
  },
};

/* ===================== 22. 社交焦虑量表 LSAS（简化单维度版） ===================== */

const LSAS_ITEMS = [
  "在公众场合打电话",
  "参加小组活动",
  "在公共场所吃东西",
  "在公共场合与不熟悉的人一起喝饮料",
  "与权威人士（老师、领导）交谈",
  "在观众面前表演或发表演讲",
  "参加聚会",
  "在被人注视下工作",
  "在他人注视下写字或签名",
  "与不太熟悉的人打电话",
  "与不太熟悉的人面对面交谈",
  "与陌生人见面或搭话",
  "在公共卫生间里使用",
  "进入已经有人坐着的房间",
  "成为众人注意的焦点",
  "在会议或班会上发言",
  "参加测验或考试",
  "对不太熟悉的人表达不同意或不满",
  "与不太熟悉的人保持目光对视",
  "在小组中做报告",
  "主动接近陌生人",
  "在公共场合退货或投诉",
  "参加社交活动或聚餐",
  "拒绝陌生人的推销",
];

const OPTIONS_LSAS: { label: string; value: number }[] = [
  { label: "完全不紧张，也不会回避", value: 0 },
  { label: "轻度紧张，偶尔回避", value: 1 },
  { label: "中度紧张，经常回避", value: 2 },
  { label: "重度紧张或痛苦，几乎总是回避", value: 3 },
];

const LSAS_BANDS: Band[] = [
  {
    min: 0,
    max: 24,
    label: "无明显社交焦虑",
    levelKey: "good",
    summary: "面对社交与公开场合时，你的紧张程度处于正常范围。",
    advice: [
      "适度紧张是正常反应，它反而能帮你保持状态。",
      "留意哪些情境仍有轻微回避，小范围练习就能扩展舒适区。",
    ],
  },
  {
    min: 25,
    max: 32,
    label: "中度社交焦虑",
    levelKey: "moderate",
    summary: "你在部分社交情境中会明显紧张，并开始出现回避。",
    advice: [
      "从回避程度最低的情境开始，做「小步暴露」练习。",
      "事前准备一两个话题或退场理由，能显著降低焦虑。",
      "注意别用「我表现得不好」来解读对方的中性反应。",
    ],
  },
  {
    min: 33,
    max: 39,
    label: "显著社交焦虑",
    levelKey: "severe",
    summary: "社交焦虑已较明显，可能影响到你的人际、学业或表达机会。",
    advice: [
      "社交焦虑障碍是最可治疗的心理问题之一，认知行为疗法效果确切。",
      "建议寻求专业评估，不必等到「严重到不行」才去。",
      "减少安全行为（如全程看手机、躲在角落），它们会在短期缓解、长期加重焦虑。",
    ],
  },
  {
    min: 40,
    max: 72,
    label: "重度社交焦虑",
    levelKey: "severe",
    summary: "你在多数社交情境中感到强烈紧张并试图回避，建议尽快寻求帮助。",
    advice: [
      "尽快联系心理咨询或精神科，评估是否需要系统治疗。",
      "回避会让焦虑的版图不断扩张，治疗的核心是逐步、可控地面对。",
      "你不是「性格有问题」，这是可以被治疗的状态。",
    ],
  },
];

const lsas: PsychScale = {
  slug: "lsas",
  name: "社交焦虑量表 LSAS",
  subtitle: "24 题 · 社交情境中的紧张与回避",
  category: "关系",
  minutes: 4,
  tags: ["社交焦虑", "回避", "关系"],
  options: OPTIONS_LSAS,
  questions: LSAS_ITEMS.map((text) => ({ text })),
  intro: [
    "LSAS（Liebowitz Social Anxiety Scale）是评估社交焦虑最常用的工具，原版对 24 个社交情境分别评定「恐惧」与「回避」两个维度（0-144 分）。",
    "本页采用合并为单一维度的简化版：每个情境只评一次「紧张程度与回避倾向」（0-72 分），便于快速作答，分数按原量表比例换算分级，仅供自我了解。",
  ],
  notice: "本页是简化版本，分级阈值按原量表比例换算，不作为诊断依据。",
  source: {
    name: "Liebowitz Social Anxiety Scale (Liebowitz, 1987)",
    url: "https://pubmed.ncbi.nlm.nih.gov/3447095/",
    license: "量表题目在临床与研究中广泛公开使用；本站为单维度简化版，按通行中文译法收录。",
  },
  score: (raw) => {
    const { total, max } = sumScores(lsas, raw);
    const band = bandFor(LSAS_BANDS, total);
    const avoided = raw.filter((v) => v >= 2).length;
    return resultFromBand(band, total, max, [
      { label: "明显回避的情境数", value: avoided + " / 24" },
      { label: "每题均分", value: (total / 24).toFixed(2) },
    ]);
  },
};

/* ===================== 23. 成人依恋量表（ECR-12 简版） ===================== */

const AAS_ITEMS: { text: string; dim: "anxiety" | "avoidance" }[] = [
  { text: "我担心亲近的人会离开我", dim: "anxiety" },
  { text: "我倾向于不向亲近的人表达自己的真实感受", dim: "avoidance" },
  { text: "我担心自己不够好，对方会因此离开", dim: "anxiety" },
  { text: "当亲近的人想非常靠近时，我会感到不自在", dim: "avoidance" },
  { text: "我担心对方没有像我在乎他那样在乎我", dim: "anxiety" },
  { text: "我倾向于自己解决问题，而不是依赖亲近的人", dim: "avoidance" },
  { text: "我需要从亲近的人那里得到很多确认，才能安心", dim: "anxiety" },
  { text: "我发现依赖亲近的人很难", dim: "avoidance" },
  { text: "对方不在身边时，我会担心他不再爱我", dim: "anxiety" },
  { text: "我倾向于不向亲近的人求助", dim: "avoidance" },
  { text: "我担心被抛弃", dim: "anxiety" },
  { text: "当别人靠得太近时，我会想退缩", dim: "avoidance" },
];

const AAS_DIMS: PsychDimension[] = [
  { key: "anxiety", label: "依恋焦虑", desc: "害怕被抛弃、需要反复确认对方是否在乎自己" },
  { key: "avoidance", label: "依恋回避", desc: "对亲密与依赖感到不自在，倾向保持距离" },
];

const AAS_TYPES: { key: string; name: string; desc: string; advice: string[] }[] = [
  {
    key: "secure",
    name: "安全型",
    desc: "你在亲密关系中整体是安心的：既能靠近，也能独处；既愿意表达需要，也能尊重边界。",
    advice: [
      "你的稳定感是关系里的重要资源，可以主动为对方提供安全基地。",
      "遇到冲突时，你更可能直接沟通而不是回避或爆发，继续保持。",
    ],
  },
  {
    key: "anxious",
    name: "焦虑型（痴迷型）",
    desc: "你很在意关系，也容易担心对方不够在乎你，可能会反复确认、过度解读细节。",
    advice: [
      "在焦虑升起时，先问自己「这是事实，还是我的担心？」——两者常常不同。",
      "直接表达需要（「我需要你多回我一句」）比试探、冷战更有效。",
      "给自己建立不依赖单一关系的生活支点，焦虑会随之下降。",
    ],
  },
  {
    key: "avoidant",
    name: "回避型（疏离型）",
    desc: "你重视独立，对亲密与依赖容易感到不自在，倾向自己扛、少表达。",
    advice: [
      "回避常来自「表达会被拒绝」的旧经验，试着在安全关系里做小剂量表达。",
      "对方需要你时，一条简短的回应就足够，不必觉得那是一种失控。",
      "把「我自己能行」和「我可以让人帮我」两件事分开看。",
    ],
  },
  {
    key: "fearful",
    name: "恐惧回避型",
    desc: "你既渴望亲密，又害怕受伤；靠近时想逃，疏远时又不安。",
    advice: [
      "这种模式常与早期不稳定的依恋经验有关，不是你「有问题」。",
      "专业咨询对整合这类矛盾体验很有帮助，比独自反复内耗更省力。",
      "在关系里练习「慢一点但说清楚」，比忽近忽远更安全。",
    ],
  },
];

const aas: PsychScale = {
  slug: "aas",
  name: "成人依恋量表 ECR-12",
  subtitle: "12 题 · 你在亲密关系中的依恋模式",
  category: "关系",
  minutes: 2,
  tags: ["依恋", "亲密关系", "关系"],
  options: OPTIONS_AGREE_1_7,
  questions: AAS_ITEMS.map(({ text, dim }) => ({ text, dim })),
  dims: AAS_DIMS,
  intro: [
    "依恋理论认为，人在亲密关系中的安全感主要由两个维度决定：依恋焦虑（怕被抛弃）与依恋回避（怕太亲密）。两个维度交叉，得到安全型、焦虑型、回避型、恐惧回避型四种模式。",
    "本页题目参考 ECR（Experiences in Close Relationships）量表的简版结构编写，用于自我了解。依恋模式不是固定标签，会随关系经历与自我觉察改变。",
  ],
  source: {
    name: "Experiences in Close Relationships（Brennan, Clark & Shaver, 1998）简版结构",
    url: "https://pubmed.ncbi.nlm.nih.gov/31340219/",
    license: "依恋两维度模型为公共理论；本页题项为参考该结构的简版，供自我探索使用。",
  },
  score: (raw) => {
    const breakdown = dimensionBreakdown(aas, raw, AAS_DIMS);
    const anxiety = breakdown[0]?.value ?? 0;
    const avoidance = breakdown[1]?.value ?? 0;
    const anxietyAvg = anxiety / 6;
    const avoidanceAvg = avoidance / 6;
    const highAnxiety = anxietyAvg >= 4;
    const highAvoidance = avoidanceAvg >= 4;
    const key = highAnxiety && highAvoidance
      ? "fearful"
      : highAnxiety
        ? "anxious"
        : highAvoidance
          ? "avoidant"
          : "secure";
    const type = AAS_TYPES.find((t) => t.key === key) ?? AAS_TYPES[0];
    const { total, max } = sumScores(aas, raw);
    return {
      total,
      max,
      level: type.name,
      levelKey: key === "secure" ? "good" : key === "fearful" ? "moderate" : "mild",
      summary: type.desc,
      advice: type.advice,
      breakdown,
      typeCode: type.name,
      typeName: "依恋类型",
      typeDesc: type.desc,
      extra: [
        { label: "依恋焦虑均分", value: anxietyAvg.toFixed(2) + " / 7" },
        { label: "依恋回避均分", value: avoidanceAvg.toFixed(2) + " / 7" },
        { label: "判定方式", value: "两个维度均分 ≥4 视为偏高" },
      ],
      hideScore: true,
    };
  },
};

/* ===================== 24. 职业倦怠量表 MBI-GS ===================== */

const MBIGS_DIMS: PsychDimension[] = [
  { key: "exhaustion", label: "情绪耗竭", desc: "被工作耗尽的感觉，是倦怠的核心成分" },
  { key: "cynicism", label: "玩世不恭", desc: "对工作的疏离、冷淡与意义感流失" },
  { key: "efficacy", label: "个人效能", desc: "对自己工作能力与成就的积极评价（分数越高越好）" },
];

const MBIGS_ITEMS: { text: string; dim: "exhaustion" | "cynicism" | "efficacy" }[] = [
  { text: "工作让我感到身心俱疲", dim: "exhaustion" },
  { text: "下班时我感觉精疲力竭", dim: "exhaustion" },
  { text: "早晨起床不得不面对一天的工作时，我感觉非常累", dim: "exhaustion" },
  { text: "整天工作对我来说确实压力很大", dim: "exhaustion" },
  { text: "工作让我有快要崩溃的感觉", dim: "exhaustion" },
  { text: "我对自己的工作变得不那么热心了", dim: "cynicism" },
  { text: "我对工作不像以前那样投入了", dim: "cynicism" },
  { text: "我怀疑自己工作的意义", dim: "cynicism" },
  { text: "我对工作成果是否重要越来越不在意", dim: "cynicism" },
  { text: "我自信能有效地完成工作任务", dim: "efficacy" },
  { text: "在工作中，我感到精力充沛", dim: "efficacy" },
  { text: "我能冷静地处理工作中的问题", dim: "efficacy" },
  { text: "我觉得自己在工作中很有能力", dim: "efficacy" },
  { text: "完成工作后我感到有成就感", dim: "efficacy" },
  { text: "我能有效地处理工作中的情绪困扰", dim: "efficacy" },
];

const OPTIONS_MBIGS: { label: string; value: number }[] = [
  { label: "从不", value: 0 },
  { label: "一年几次", value: 1 },
  { label: "每月一次", value: 2 },
  { label: "每月几次", value: 3 },
  { label: "每周一次", value: 4 },
  { label: "每周几次", value: 5 },
  { label: "每天", value: 6 },
];

const mbigs: PsychScale = {
  slug: "mbigs",
  name: "职业倦怠量表 MBI-GS",
  subtitle: "15 题 · 情绪耗竭 / 玩世不恭 / 个人效能",
  category: "职业",
  minutes: 3,
  tags: ["倦怠", "工作", "压力"],
  options: OPTIONS_MBIGS,
  questions: MBIGS_ITEMS.map(({ text, dim }) => ({ text, dim })),
  dims: MBIGS_DIMS,
  intro: [
    "MBI-GS（Maslach Burnout Inventory - General Survey）是职业倦怠研究中最权威的工具，把倦怠拆成三个维度：情绪耗竭、玩世不恭、个人效能感。",
    "倦怠不是「懒」或「不够努力」，而是长期工作压力下资源被耗尽的结果。请按「最近一段时间」的真实频率作答。",
  ],
  notice: "本页题项参考 MBI-GS 三维度结构编写，分数用于自我了解，不用于人事评价。",
  source: {
    name: "Maslach Burnout Inventory - General Survey (Schaufeli et al., 1996)",
    url: "https://pubmed.ncbi.nlm.nih.gov/8881533/",
    license: "MBI 为商业版权量表；本页按公开的三维度结构编写等价题项，供自我探索使用。",
  },
  score: (raw) => {
    const breakdown = dimensionBreakdown(mbigs, raw, MBIGS_DIMS);
    const exhaustion = breakdown[0];
    const cynicism = breakdown[1];
    const efficacy = breakdown[2];
    const eAvg = (exhaustion?.value ?? 0) / 5;
    const cAvg = (cynicism?.value ?? 0) / 4;
    const pAvg = (efficacy?.value ?? 0) / 6;
    const burned = eAvg >= 3.5 || cAvg >= 3.5;
    const lowEfficacy = pAvg < 3;
    const level = burned && lowEfficacy
      ? "倦怠程度较高"
      : burned
        ? "出现明显倦怠信号"
        : lowEfficacy
          ? "效能感偏低"
          : "倦怠程度较低";
    const levelKey = burned && lowEfficacy ? "severe" : burned ? "moderate" : lowEfficacy ? "mild" : "good";
    const { total, max } = sumScores(mbigs, raw);
    return {
      total,
      max,
      level,
      levelKey,
      summary:
        "情绪耗竭均分 " +
        eAvg.toFixed(2) +
        "/6，玩世不恭均分 " +
        cAvg.toFixed(2) +
        "/6，个人效能均分 " +
        pAvg.toFixed(2) +
        "/6。倦怠的核心是「耗竭 + 疏离」，效能感偏低则提示成就感流失。",
      advice: burned
        ? [
            "先恢复基本盘：睡眠、吃饭、每天一段与工作无关的时间。",
            "找出耗竭的主要来源（工作量、人际、失控感），能减的先减。",
            "倦怠持续数周以上并影响功能时，建议寻求专业支持或与上级沟通调整。",
          ]
        : [
            "你目前的倦怠水平不算高，保持工作与恢复的节奏即可。",
            "留意「效能感」这一维：它下降往往早于耗竭出现。",
            "给工作设定明确的结束时间，比延长时长更能保护状态。",
          ],
      breakdown,
      extra: [
        { label: "耗竭均分（≥3.5 偏高）", value: eAvg.toFixed(2) },
        { label: "玩世不恭均分（≥3.5 偏高）", value: cAvg.toFixed(2) },
        { label: "效能均分（<3 偏低）", value: pAvg.toFixed(2) },
      ],
      hideScore: true,
    };
  },
};

/* ===================== 25. 网络成瘾量表 IAT ===================== */

const IAT_ITEMS = [
  "你是否发现自己上网的时间比计划的长？",
  "你是否因为上网而忽略了家务或学习任务？",
  "你是否更愿意上网，而不是和亲近的人相处？",
  "你是否通过上网来结交新朋友？",
  "你是否因为上网而被身边的人抱怨？",
  "你是否因为上网而导致学业或工作表现退步？",
  "你是否在上网之前就先想着下次上网？",
  "你是否因为上网而影响了工作效率？",
  "当有人问你在网上做什么时，你是否会回避或隐瞒？",
  "你是否用上网来逃避现实中的问题或缓解不良情绪？",
  "你是否期待下一次上网的时间？",
  "你是否觉得没有网络，生活就变得枯燥无聊？",
  "当别人打扰你上网时，你是否会烦躁或生气？",
  "你是否因为上网而牺牲睡眠？",
  "即使离线，你是否仍然想着网上的事情？",
  "你是否因为上网而减少了现实中的社交活动？",
  "你是否尝试过减少上网时间，但没能坚持？",
  "你是否对上网时长向他人撒过谎？",
  "你是否用上网来逃避不舒服的情绪？",
  "你是否因为上网而感到生活失去了控制？",
];

const OPTIONS_IAT: { label: string; value: number }[] = [
  { label: "极少", value: 1 },
  { label: "偶尔", value: 2 },
  { label: "有时", value: 3 },
  { label: "经常", value: 4 },
  { label: "总是", value: 5 },
];

const IAT_BANDS: Band[] = [
  {
    min: 20,
    max: 39,
    label: "上网习惯正常",
    levelKey: "good",
    summary: "你的上网行为在常见范围内，没有明显失控迹象。",
    advice: [
      "保持现在的使用节奏即可。",
      "留意压力大的时期，上网时长容易不自觉增加。",
    ],
  },
  {
    min: 40,
    max: 59,
    label: "轻度网络依赖",
    levelKey: "mild",
    summary: "上网开始占用一些本该用于其他事情的时间，但还没明显影响功能。",
    advice: [
      "给娱乐性上网设定明确的时段，而不是随时打开。",
      "把手机放在另一个房间，比单纯「靠意志力」更有效。",
      "留意你上网是在放松，还是在回避某件不想面对的事。",
    ],
  },
  {
    min: 60,
    max: 79,
    label: "中度网络依赖",
    levelKey: "moderate",
    summary: "上网已经影响到睡眠、学习或人际关系，值得认真调整。",
    advice: [
      "记录一周的上网时长与触发情境，先看清模式再改。",
      "用线下活动替代而不是单纯戒断：运动、见面、动手做东西。",
      "如果自己试过多次仍控制不住，可以考虑寻求心理咨询。",
    ],
  },
  {
    min: 80,
    max: 100,
    label: "重度网络依赖",
    levelKey: "severe",
    summary: "上网行为已明显失控并影响生活，需要外界支持来打破循环。",
    advice: [
      "建议寻求专业帮助，网络成瘾常与焦虑、抑郁或现实困境相伴。",
      "和家人朋友说明你的困扰，让他们协助设定可执行的限制。",
      "不要用「彻底戒断」当目标，重建可控的使用方式更可持续。",
    ],
  },
];

const iat: PsychScale = {
  slug: "iat",
  name: "网络成瘾量表 IAT",
  subtitle: "20 题 · 你的上网行为是否失控",
  category: "健康",
  minutes: 3,
  tags: ["网络", "成瘾", "自控"],
  options: OPTIONS_IAT,
  questions: IAT_ITEMS.map((text) => ({ text })),
  intro: [
    "IAT（Internet Addiction Test）由 Young 于 1998 年编制，共 20 题，是使用最广的网络成瘾自评工具。",
    "它关注的不是「上网多久」，而是上网是否已经失控、是否挤占了睡眠、学习与人际。请按最近几个月的真实情况作答。",
  ],
  source: {
    name: "Internet Addiction Test (Young, 1998)",
    url: "https://pubmed.ncbi.nlm.nih.gov/11527067/",
    license: "量表题目在研究与临床中广泛公开使用；本站按通行中文译法收录，供自我了解使用。",
  },
  score: (raw) => {
    const { total, max } = sumScores(iat, raw);
    const band = bandFor(IAT_BANDS, total);
    return resultFromBand(band, total, max, [
      { label: "每题均分", value: (total / 20).toFixed(1) },
      { label: "高频条目（≥4 分）", value: String(raw.filter((v) => v >= 4).length) },
    ]);
  },
};

/* ===================== 26. 成人 ADHD 自评量表 ASRS-v1.1 ===================== */

const OPTIONS_ASRS: { label: string; value: number }[] = [
  { label: "从不", value: 0 },
  { label: "很少", value: 1 },
  { label: "有时", value: 2 },
  { label: "经常", value: 3 },
  { label: "非常频繁", value: 4 },
];

const ASRS_PART_A = [
  "完成一个项目的最后细节时，是否感到困难？",
  "需要有条理地做事时，是否感到难以组织起来？",
  "是否忘记约定、承诺或必须完成的事情？",
  "面对需要大量思考的任务时，是否会拖延或回避开始？",
  "必须久坐时，是否手脚不停地动或扭来扭去？",
  "是否觉得自己过度活跃，像被马达驱动着停不下来？",
];

const ASRS_PART_B = [
  "做枯燥或困难的工作时，是否会犯粗心的错误？",
  "做枯燥重复的事情时，是否难以保持注意力？",
  "别人直接和你说话时，是否难以专心听？",
  "是否经常放错东西，或找不到家里的物品？",
  "是否容易被周围的活动或声音分散注意力？",
  "在应该坐着的场合，是否经常离开座位？",
  "是否常感到坐立不安、内心静不下来？",
  "有空闲时，是否难以放松下来？",
  "在社交场合，是否发现自己说得太多？",
  "对话时，是否忍不住替别人把话说完？",
  "需要轮流的场合，是否难以耐心等待？",
  "别人忙碌时，是否经常打断他们？",
];

const ASRS_QUESTIONS = [...ASRS_PART_A, ...ASRS_PART_B];

const asrs: PsychScale = {
  slug: "asrs",
  name: "成人 ADHD 自评量表 ASRS",
  subtitle: "18 题 · 注意力与多动冲动的自评筛查",
  category: "健康",
  minutes: 3,
  tags: ["ADHD", "注意力", "自控"],
  options: OPTIONS_ASRS,
  questions: ASRS_QUESTIONS.map((text) => ({ text })),
  intro: [
    "ASRS-v1.1（Adult ADHD Self-Report Scale）是世界卫生组织与 Kessler 等人编制的成人注意缺陷多动障碍筛查工具，共 18 题，前 6 题为筛查部分（Part A）。",
    "它衡量的是「过去半年」中注意力不集中、多动与冲动的出现频率。分数偏高不等于确诊 ADHD——很多情况（焦虑、失眠、长期压力、睡眠不足）会产生相似表现。",
  ],
  notice: "本量表用于初筛，不能替代临床诊断。若筛查提示阳性，请寻求精神科或心理科的专业评估。",
  source: {
    name: "Adult ADHD Self-Report Scale v1.1 (Kessler et al., WHO)",
    url: "https://pubmed.ncbi.nlm.nih.gov/15841682/",
    license: "量表题目由 WHO 公开发布，可免费使用；本站按通行中文译法收录。",
  },
  score: (raw) => {
    // Part A：第 1-3 题 >=「有时」(2) 计 1 分；第 4-6 题 >=「经常」(3) 计 1 分
    const partA = [0, 1, 2, 3, 4, 5].map((i) => {
      if (i <= 2) return raw[i] >= 2 ? 1 : 0;
      return raw[i] >= 3 ? 1 : 0;
    });
    const aScore = partA.filter((v) => v === 1).length;
    const partB = raw.slice(6);
    const bAvg = partB.reduce((a, b) => a + b, 0) / partB.length;
    const bHigh = partB.filter((v) => v >= 3).length;

    const level =
      aScore >= 5 ? "筛查提示阳性（较明显）" : aScore >= 4 ? "筛查提示阳性" : aScore >= 2 ? "部分症状存在" : "筛查阴性";
    const levelKey = aScore >= 4 ? "moderate" : aScore >= 2 ? "mild" : "good";
    const summary =
      "Part A 命中 " +
      aScore +
      " / 6 项（>=4 项提示值得进一步评估）。Part B 中「经常或非常频繁」的条目有 " +
      bHigh +
      " / 12 项，平均频率 " +
      bAvg.toFixed(2) +
      " / 4。";

    return {
      total: aScore,
      max: 6,
      level,
      levelKey,
      summary,
      advice:
        aScore >= 4
          ? [
              "ASRS 是筛查工具，阳性只说明「值得进一步评估」，不等于 ADHD 诊断。",
              "回顾一下这些症状是否从童年（12 岁前）就存在、是否跨场景（工作、学习、家庭）出现——这两点是诊断的关键。",
              "同时排查睡眠不足、焦虑、抑郁、甲状腺问题等会产生类似表现的因素。",
              "若确实长期影响学习或工作，建议到精神科或心理科做完整评估。",
            ]
          : [
              "本次筛查没有提示明显的 ADHD 模式。",
              "如果仍觉得注意力受影响，优先检查睡眠时长与质量，这是最常见的原因。",
              "把任务拆小、用番茄钟、减少同时打开的东西，对任何人都有效。",
            ],
      breakdown: [
        {
          label: "Part A · 筛查部分",
          value: aScore,
          max: 6,
          percent: Math.round((aScore / 6) * 100),
          note: "注意力缺陷核心 6 题，>=4 项提示阳性",
        },
        {
          label: "Part B · 症状负荷",
          value: bHigh,
          max: 12,
          percent: Math.round((bHigh / 12) * 100),
          note: "「经常/非常频繁」的条目数",
        },
      ],
      extra: [
        { label: "Part A 命中项", value: aScore + " / 6" },
        { label: "Part B 高频条目", value: bHigh + " / 12" },
        { label: "判定阈值", value: "Part A >=4 项为筛查阳性" },
      ],
      hideScore: true,
    };
  },
};

/* ===================== 27. 创伤后应激量表 PCL-5 ===================== */

const PCL5_ITEMS: { text: string; dim: "B" | "C" | "D" | "E" }[] = [
  { text: "反复出现关于那件事的痛苦记忆、想法或画面", dim: "B" },
  { text: "反复做关于那件事的噩梦", dim: "B" },
  { text: "感觉那件事好像又发生了一次（闪回）", dim: "B" },
  { text: "想到那件事时感到非常痛苦", dim: "B" },
  { text: "想到那件事时身体有反应（心跳加快、呼吸困难、出汗）", dim: "B" },
  { text: "回避与那件事有关的记忆、想法或感受", dim: "C" },
  { text: "回避会让你想起那件事的外部事物（人、地点、对话、活动、物品）", dim: "C" },
  { text: "难以记住那件事的重要部分", dim: "D" },
  { text: "对自己、他人或世界持有强烈的负面看法", dim: "D" },
  { text: "因为那件事而责备自己或他人", dim: "D" },
  { text: "持续感到恐惧、害怕、愤怒、内疚或羞耻", dim: "D" },
  { text: "对以前喜欢的活动失去兴趣", dim: "D" },
  { text: "感觉与他人疏远或隔绝", dim: "D" },
  { text: "难以体验到积极的情绪", dim: "D" },
  { text: "易怒、容易爆发或出现攻击性行为", dim: "E" },
  { text: "冒不必要的风险，或做可能伤害自己的事", dim: "E" },
  { text: "过度警觉，时刻提防危险", dim: "E" },
  { text: "容易受惊或惊跳", dim: "E" },
  { text: "难以集中注意力", dim: "E" },
  { text: "入睡困难或睡眠不安稳", dim: "E" },
];

const PCL5_OPTIONS: { label: string; value: number }[] = [
  { label: "完全没有", value: 0 },
  { label: "有一点", value: 1 },
  { label: "中等程度", value: 2 },
  { label: "相当明显", value: 3 },
  { label: "极度严重", value: 4 },
];

const PCL5_DIMS: PsychDimension[] = [
  { key: "B", label: "B 侵入性再体验", desc: "不由自主地重新经历创伤（记忆、噩梦、闪回）" },
  { key: "C", label: "C 回避", desc: "主动回避与创伤相关的想法、感受与外部线索" },
  { key: "D", label: "D 认知与情绪负性改变", desc: "自责、疏离、情感麻木、兴趣丧失" },
  { key: "E", label: "E 警觉与反应性改变", desc: "易怒、过度警觉、惊跳、睡眠与注意力问题" },
];

const PCL5_BANDS: Band[] = [
  {
    min: 0,
    max: 32,
    label: "低于临床关注阈值",
    levelKey: "good",
    summary: "你的总分未达到常用的 PTSD 筛查阈值（33 分），但个别条目仍可能有困扰。",
    advice: [
      "若某几个条目分数很高，也值得留意自己在那方面的反应。",
      "保证睡眠、规律作息与社交支持，是压力后的基础恢复条件。",
    ],
  },
  {
    min: 33,
    max: 49,
    label: "达到筛查阈值",
    levelKey: "moderate",
    summary: "总分超过常用阈值（33 分），提示存在值得关注的创伤后应激症状。",
    advice: [
      "这不是诊断，但说明专业评估是有必要的。",
      "创伤后应激是可以有效治疗的，创伤聚焦的认知行为疗法与 EMDR 都有充分证据。",
      "在寻求帮助前，避免反复强迫自己回忆细节，那可能加重症状。",
    ],
  },
  {
    min: 50,
    max: 80,
    label: "症状显著",
    levelKey: "severe",
    summary: "症状负担较重，可能已明显影响日常生活，建议尽快寻求专业帮助。",
    advice: [
      "尽快联系精神科或专业的创伤心理咨询，不要独自扛。",
      "如果有自伤念头，请立刻联系信任的人或拨打心理援助热线（12356 / 12355）。",
      "避免用酒精或其他方式麻痹自己，那会让症状长期化。",
    ],
  },
];

const pcl5: PsychScale = {
  slug: "pcl5",
  name: "创伤后应激量表 PCL-5",
  subtitle: "20 题 · 回想一件让你难以放下的事",
  category: "情绪",
  minutes: 4,
  tags: ["创伤", "PTSD", "压力"],
  options: PCL5_OPTIONS,
  questions: PCL5_ITEMS.map(({ text, dim }) => ({ text, dim })),
  dims: PCL5_DIMS,
  intro: [
    "PCL-5（PTSD Checklist for DSM-5）是评估创伤后应激症状最常用的自评量表，共 20 题，对应 DSM-5 的四个症状集群：侵入性再体验、回避、认知与情绪负性改变、警觉与反应性改变。",
    "作答前，请先在心里回想一件曾经让你感到强烈恐惧、无助或受威胁的事（可以是近期也可以是很多年前），然后按「过去一个月」里被它困扰的程度作答。",
  ],
  notice: "本量表用于自我了解，不能作为诊断。诊断需要由专业人员结合事件性质、持续时间与功能影响综合判断。",
  source: {
    name: "PTSD Checklist for DSM-5 (Weathers et al., 2013)",
    url: "https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp",
    license: "PCL-5 由美国国家 PTSD 中心公开发布，可免费用于临床与研究；本站按通行中文译法收录。",
  },
  score: (raw) => {
    const { total, max } = sumScores(pcl5, raw);
    const band = bandFor(PCL5_BANDS, total);
    const breakdown = dimensionBreakdown(pcl5, raw, PCL5_DIMS);

    // DSM-5 症状集群判定：B>=1、C>=1、D>=2、E>=2（单项 >=2 分计为存在）
    const clusterHit: Record<string, number> = { B: 0, C: 0, D: 0, E: 0 };
    PCL5_ITEMS.forEach((item, i) => {
      if (raw[i] >= 2) clusterHit[item.dim] += 1;
    });
    const metCount = ["B", "C", "D", "E"].filter((k) => {
      const need = k === "B" || k === "C" ? 1 : 2;
      return clusterHit[k] >= need;
    }).length;

    const extras = [
      { label: "满足的症状集群", value: metCount + " / 4" },
      { label: "B 侵入（>=1 项）", value: clusterHit.B + " 项" },
      { label: "C 回避（>=1 项）", value: clusterHit.C + " 项" },
      { label: "D 负性认知（>=2 项）", value: clusterHit.D + " 项" },
      { label: "E 警觉（>=2 项）", value: clusterHit.E + " 项" },
    ];

    const res = resultFromBand(band, total, max, extras);
    return { ...res, breakdown };
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
  sds,
  sas,
  k10,
  erq,
  pss10,
  isi,
  fss,
  maas,
  lsas,
  aas,
  mbigs,
  iat,
  asrs,
  pcl5,
];

export const CATEGORIES = ["情绪", "人格", "健康", "关系", "压力", "职业"] as const;

export function getScale(slug: string): PsychScale | undefined {
  return SCALES.find((s) => s.slug === slug);
}

/** 症状类量表：分数越高越需要关注（历史趋势的配色方向相反） */
const LOWER_IS_BETTER = new Set([
  "phq9",
  "gad7",
  "dass21",
  "phq15",
  "ucla3",
  "ecrrs",
  "sds",
  "sas",
  "k10",
  "pss10",
  "fss",
  "isi",
  "lsas",
  "iat",
  "asrs",
  "pcl5",
]);

/** 轻量元数据（列表页/首页/历史趋势用，避免把评分函数传入客户端） */
export function scaleMeta() {
  return SCALES.map((s) => ({
    slug: s.slug,
    name: s.name,
    subtitle: s.subtitle,
    category: s.category,
    minutes: s.minutes,
    tags: s.tags,
    questions: s.questions.length,
    /** 是否分数越高越好（幸福感/自尊等正向量表为 true） */
    higherIsBetter: !LOWER_IS_BETTER.has(s.slug),
  }));
}

export type ScaleMeta = ReturnType<typeof scaleMeta>[number];
