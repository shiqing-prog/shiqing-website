import { ToolError, float, int, randomBytes, str, text, type ToolDef } from "./types";

/* ---------------------------- timestamp -------------------------- */

function toDate(input: string): Date {
  const value = input.trim();
  if (value === "") return new Date();
  if (/^\d+$/.test(value)) {
    const digits = Number(value);
    return new Date(value.length <= 10 ? digits * 1000 : digits);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ToolError(400, "invalid_time", "无法识别的时间：" + value);
  return parsed;
}

function formatIn(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return pick("year") + "-" + pick("month") + "-" + pick("day") + " " + pick("hour") + ":" + pick("minute") + ":" + pick("second");
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatRelative(seconds: number): string {
  const abs = Math.abs(seconds);
  const suffix = seconds >= 0 ? "后" : "前";
  if (abs < 60) return abs + " 秒" + suffix;
  if (abs < 3600) return Math.round(abs / 60) + " 分钟" + suffix;
  if (abs < 86400) return Math.round(abs / 3600) + " 小时" + suffix;
  if (abs < 2592000) return Math.round(abs / 86400) + " 天" + suffix;
  if (abs < 31536000) return Math.round(abs / 2592000) + " 个月" + suffix;
  return Math.round(abs / 31536000) + " 年" + suffix;
}

const timestamp: ToolDef = {
  name: "data/timestamp",
  group: "data",
  summary: "时间戳与日期互转，支持任意时区、ISO、Unix 与相对时间",
  methods: ["GET"],
  params: [
    { name: "value", description: "秒级/毫秒级时间戳，或 2026-01-01 这样的日期串；留空取当前", example: "1767225600" },
    { name: "timezone", description: "IANA 时区，默认 Asia/Shanghai", example: "UTC" },
  ],
  run: (ctx) => {
    const raw = str(ctx, "value") ?? "";
    const timeZone = str(ctx, "timezone") ?? "Asia/Shanghai";
    const date = toDate(raw);
    let local: string;
    try {
      local = formatIn(date, timeZone);
    } catch {
      throw new ToolError(400, "invalid_timezone", "时区 " + timeZone + " 无法识别");
    }
    const diffSeconds = Math.round(date.getTime() / 1000 - Date.now() / 1000);
    return {
      timestamp: Math.floor(date.getTime() / 1000),
      timestampMs: date.getTime(),
      iso: date.toISOString(),
      utc: date.toUTCString(),
      timezone: timeZone,
      local,
      date: local.slice(0, 10),
      time: local.slice(11),
      weekday: WEEKDAYS[date.getUTCDay()],
      relativeSeconds: diffSeconds,
      relative: formatRelative(diffSeconds),
    };
  },
};

/* ---------------------------- date-diff -------------------------- */

const dateDiff: ToolDef = {
  name: "data/date-diff",
  group: "data",
  summary: "计算两个日期之间的天数、周数、小时与工作日",
  methods: ["GET"],
  params: [
    { name: "from", description: "起始日期，默认今天", example: "2026-01-01" },
    { name: "to", description: "结束日期，默认今天", example: "2026-12-31" },
  ],
  run: (ctx) => {
    const fromRaw = str(ctx, "from") ?? "";
    const toRaw = str(ctx, "to") ?? "";
    const from = fromRaw === "" ? new Date() : toDate(fromRaw);
    const to = toRaw === "" ? new Date() : toDate(toRaw);
    const ms = to.getTime() - from.getTime();
    const days = ms / 86400000;
    const start = new Date(Math.min(from.getTime(), to.getTime()));
    const end = new Date(Math.max(from.getTime(), to.getTime()));
    let workdays = 0;
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    while (cursor.getTime() <= last) {
      const day = cursor.getUTCDay();
      if (day !== 0 && day !== 6) workdays += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      days: Math.round(days),
      absDays: Math.round(Math.abs(days)),
      weeks: Math.round((Math.abs(days) / 7) * 100) / 100,
      hours: Math.round(Math.abs(ms) / 3600000),
      minutes: Math.round(Math.abs(ms) / 60000),
      workdays,
      direction: days >= 0 ? "future" : "past",
    };
  },
};

/* ------------------------------ roman ---------------------------- */

const ROMAN: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toRoman(value: number): string {
  let remaining = value;
  let out = "";
  for (const [amount, symbol] of ROMAN) {
    while (remaining >= amount) {
      out += symbol;
      remaining -= amount;
    }
  }
  return out;
}

function fromRoman(input: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const upper = input.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(upper)) throw new ToolError(400, "invalid_roman", "不是合法的罗马数字");
  let total = 0;
  for (let i = 0; i < upper.length; i += 1) {
    const current = map[upper.charAt(i)];
    const next = map[upper.charAt(i + 1)] ?? 0;
    total += current < next ? -current : current;
  }
  if (toRoman(total) !== upper) throw new ToolError(400, "invalid_roman", "不是规范写法的罗马数字");
  return total;
}

const roman: ToolDef = {
  name: "data/roman",
  group: "data",
  summary: "阿拉伯数字与罗马数字互转（1-3999）",
  methods: ["GET"],
  params: [{ name: "value", description: "数字或罗马数字", required: true, example: "2026" }],
  run: (ctx) => {
    const raw = text(ctx, "value", { max: 20 }).trim();
    if (/^\d+$/.test(raw)) {
      const value = Number(raw);
      if (value < 1 || value > 3999) throw new ToolError(400, "invalid_number", "数字范围是 1-3999");
      return { number: value, roman: toRoman(value) };
    }
    return { number: fromRoman(raw), roman: raw.toUpperCase() };
  },
};

/* ------------------------------- base --------------------------- */

const base: ToolDef = {
  name: "data/base",
  group: "data",
  summary: "任意 2-36 进制之间的整数互转，支持大数",
  methods: ["GET"],
  params: [
    { name: "value", description: "待转换的数字串", required: true, example: "255" },
    { name: "from", description: "输入进制，2-36，默认 10", example: "10" },
    { name: "to", description: "输出进制，2-36，默认 16", example: "16" },
  ],
  run: (ctx) => {
    const raw = text(ctx, "value", { max: 500 }).trim();
    const from = int(ctx, "from", 10, 2, 36);
    const to = int(ctx, "to", 16, 2, 36);
    const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
    const negative = raw.startsWith("-");
    const body = (negative ? raw.slice(1) : raw).toLowerCase();
    if (body === "") throw new ToolError(400, "invalid_number", "数字为空");
    let value = BigInt(0);
    const radix = BigInt(from);
    for (const ch of body) {
      const digit = digits.indexOf(ch);
      if (digit < 0 || digit >= from) throw new ToolError(400, "invalid_number", "字符 " + ch + " 不属于 " + from + " 进制");
      value = value * radix + BigInt(digit);
    }
    if (negative) value = -value;
    const outputDigits: string[] = [];
    let rest = value < BigInt(0) ? -value : value;
    const target = BigInt(to);
    if (rest === BigInt(0)) outputDigits.push("0");
    while (rest > BigInt(0)) {
      outputDigits.unshift(digits.charAt(Number(rest % target)));
      rest /= target;
    }
    const result = (value < BigInt(0) ? "-" : "") + outputDigits.join("");
    return { input: raw, from, to, result, decimal: value.toString() };
  },
};

/* ------------------------------- unit --------------------------- */

interface UnitGroup { name: string; units: Record<string, number> }

const UNIT_GROUPS: Record<string, UnitGroup> = {
  length: {
    name: "长度",
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 },
  },
  mass: {
    name: "质量",
    units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, jin: 0.5 },
  },
  area: {
    name: "面积",
    units: { mm2: 1e-6, cm2: 1e-4, m2: 1, km2: 1e6, ha: 10000, mu: 666.6667, ft2: 0.09290304, acre: 4046.8564224 },
  },
  volume: {
    name: "体积",
    units: { ml: 0.001, l: 1, m3: 1000, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946, gal: 3.785411784 },
  },
  data: {
    name: "数据",
    units: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776, kib: 1024, mib: 1048576, gib: 1073741824 },
  },
  time: {
    name: "时间",
    units: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400, w: 604800, mo: 2629800, y: 31557600 },
  },
  speed: {
    name: "速度",
    units: { "m/s": 1, "km/h": 0.2777778, mph: 0.44704, kn: 0.5144444 },
  },
};

const TEMPERATURE_UNITS = ["c", "f", "k"];

function temperature(value: number, from: string, to: string): number {
  const celsius = from === "c" ? value : from === "f" ? ((value - 32) * 5) / 9 : value - 273.15;
  return to === "c" ? celsius : to === "f" ? (celsius * 9) / 5 + 32 : celsius + 273.15;
}

const unit: ToolDef = {
  name: "data/unit",
  group: "data",
  summary: "长度、质量、面积、体积、数据、时间、速度与温度的换算",
  methods: ["GET"],
  params: [
    { name: "value", description: "数值", required: true, example: "100" },
    { name: "from", description: "原单位", required: true, example: "km" },
    { name: "to", description: "目标单位", required: true, example: "mi" },
    { name: "group", description: "类别；留空则自动识别", example: "length" },
  ],
  run: (ctx) => {
    const value = float(ctx, "value", Number.NaN, -1e15, 1e15);
    if (Number.isNaN(value)) throw new ToolError(400, "invalid_value", "value 必须是数字");
    const from = text(ctx, "from", { max: 20 }).trim().toLowerCase();
    const to = text(ctx, "to", { max: 20 }).trim().toLowerCase();
    const requested = str(ctx, "group");
    if (TEMPERATURE_UNITS.includes(from) && TEMPERATURE_UNITS.includes(to)) {
      return { group: "temperature", value, from, to, result: Math.round(temperature(value, from, to) * 1000) / 1000 };
    }
    const candidates = requested ? [requested] : Object.keys(UNIT_GROUPS);
    for (const key of candidates) {
      const group = UNIT_GROUPS[key];
      if (!group) continue;
      if (group.units[from] !== undefined && group.units[to] !== undefined) {
        const result = (value * group.units[from]) / group.units[to];
        return { group: key, groupName: group.name, value, from, to, result: Math.round(result * 1e8) / 1e8 };
      }
    }
    throw new ToolError(400, "invalid_unit", "无法在 " + from + " 与 " + to + " 之间换算，请检查单位或指定 group");
  },
};

/* ---------------------------- number-zh -------------------------- */

const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const ZH_UNITS = ["", "十", "百", "千"];
const ZH_SECTIONS = ["", "万", "亿", "万亿"];

function sectionToZh(section: number): string {
  let out = "";
  let needZero = false;
  for (let position = 3; position >= 0; position -= 1) {
    const digit = Math.floor(section / 10 ** position) % 10;
    if (digit === 0) {
      if (out !== "") needZero = true;
      continue;
    }
    if (needZero) {
      out += "零";
      needZero = false;
    }
    out += ZH_DIGITS[digit] + ZH_UNITS[position];
  }
  return out;
}

function integerToZh(input: number): string {
  if (input === 0) return "零";
  const sections: number[] = [];
  let rest = input;
  while (rest > 0) {
    sections.unshift(rest % 10000);
    rest = Math.floor(rest / 10000);
  }
  let out = "";
  sections.forEach((section, position) => {
    const unitIndex = sections.length - position - 1;
    if (section === 0) {
      if (out !== "" && !out.endsWith("零")) out += "零";
      return;
    }
    if (out !== "" && section < 1000 && !out.endsWith("零")) out += "零";
    out += sectionToZh(section) + ZH_SECTIONS[unitIndex];
  });
  out = out.replace(/零+$/, "");
  if (out.startsWith("一十")) return "十" + out.slice(2);
  return out;
}

const CN_FINANCE_DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const CN_FINANCE_UNITS = ["", "拾", "佰", "仟"];
const CN_FINANCE_SECTIONS = ["", "万", "亿", "万亿"];

function financeSection(section: number): string {
  let out = "";
  let needZero = false;
  for (let position = 3; position >= 0; position -= 1) {
    const digit = Math.floor(section / 10 ** position) % 10;
    if (digit === 0) {
      if (out !== "") needZero = true;
      continue;
    }
    if (needZero) {
      out += "零";
      needZero = false;
    }
    out += CN_FINANCE_DIGITS[digit] + CN_FINANCE_UNITS[position];
  }
  return out;
}

function moneyToZh(value: number): string {
  if (!Number.isFinite(value)) throw new ToolError(400, "invalid_number", "金额必须是数字");
  if (Math.abs(value) >= 1e16) throw new ToolError(400, "too_large", "金额过大");
  const negative = value < 0;
  const total = Math.round(Math.abs(value) * 100);
  const integer = Math.floor(total / 100);
  const jiao = Math.floor(total / 10) % 10;
  const fen = total % 10;
  let integerPart = "";
  if (integer > 0) {
    const sections: number[] = [];
    let rest = integer;
    while (rest > 0) {
      sections.unshift(rest % 10000);
      rest = Math.floor(rest / 10000);
    }
    let out = "";
    sections.forEach((section, position) => {
      const unitIndex = sections.length - position - 1;
      if (section === 0) {
        if (out !== "" && !out.endsWith("零")) out += "零";
        return;
      }
      if (out !== "" && section < 1000 && !out.endsWith("零")) out += "零";
      out += financeSection(section) + CN_FINANCE_SECTIONS[unitIndex];
    });
    integerPart = out.replace(/零+$/, "") + "元";
  }
  let decimalPart = "";
  if (jiao === 0 && fen === 0) decimalPart = integer === 0 ? "零元整" : "整";
  else {
    if (jiao > 0) decimalPart += CN_FINANCE_DIGITS[jiao] + "角";
    else if (integer > 0) decimalPart += "零";
    if (fen > 0) decimalPart += CN_FINANCE_DIGITS[fen] + "分";
  }
  return (negative ? "负" : "") + integerPart + decimalPart;
}

const numberZh: ToolDef = {
  name: "data/number-zh",
  group: "data",
  summary: "数字转中文读法，以及人民币金额的大写写法",
  methods: ["GET"],
  params: [{ name: "value", description: "数字或金额", required: true, example: "1234567.89" }],
  run: (ctx) => {
    const raw = text(ctx, "value", { max: 40 }).replace(/,/g, "").trim();
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new ToolError(400, "invalid_number", "value 必须是数字");
    const integer = Math.trunc(Math.abs(value));
    if (integer > Number.MAX_SAFE_INTEGER) throw new ToolError(400, "too_large", "数字过大");
    const negative = value < 0;
    return {
      value,
      chinese: (negative ? "负" : "") + integerToZh(integer),
      money: moneyToZh(value),
      integer,
      decimals: Math.abs(value).toFixed(2).split(".")[1] ?? "00",
    };
  },
};

/* ------------------------------- bmi ---------------------------- */

const bmi: ToolDef = {
  name: "data/bmi",
  group: "data",
  summary: "计算 BMI，并给出 WHO 与中国标准的体重分类",
  methods: ["GET"],
  params: [
    { name: "weight", description: "体重（公斤）", required: true, example: "60" },
    { name: "height", description: "身高（厘米或米，自动判断）", required: true, example: "170" },
  ],
  run: (ctx) => {
    const weight = float(ctx, "weight", Number.NaN, 1, 500);
    let height = float(ctx, "height", Number.NaN, 30, 300);
    if (Number.isNaN(weight) || Number.isNaN(height)) throw new ToolError(400, "invalid_value", "需要体重与身高");
    if (height > 3) height = height / 100;
    const value = weight / (height * height);
    const rounded = Math.round(value * 10) / 10;
    const who =
      rounded < 18.5 ? "偏瘦" : rounded < 25 ? "正常" : rounded < 30 ? "超重" : rounded < 35 ? "肥胖 I 级" : rounded < 40 ? "肥胖 II 级" : "肥胖 III 级";
    const china = rounded < 18.5 ? "偏瘦" : rounded < 24 ? "正常" : rounded < 28 ? "超重" : "肥胖";
    const healthyMin = Math.round(18.5 * height * height * 10) / 10;
    const healthyMax = Math.round(23.9 * height * height * 10) / 10;
    return { bmi: rounded, who, china, healthyWeightRange: [healthyMin, healthyMax], heightMeters: Math.round(height * 100) / 100 };
  },
};

/* ------------------------------ random -------------------------- */

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randomTool: ToolDef = {
  name: "data/random",
  group: "data",
  summary: "生成随机整数、小数，或从列表里随机抽取与打乱（可复现种子）",
  methods: ["GET", "POST"],
  params: [
    { name: "type", description: "int（默认）、float、choice 或 shuffle", example: "int" },
    { name: "min", description: "最小值，默认 0", example: "1" },
    { name: "max", description: "最大值，默认 100", example: "100" },
    { name: "count", description: "数量，1-100，默认 1", example: "5" },
    { name: "items", description: "choice / shuffle 用的列表，逗号分隔", example: "a,b,c" },
    { name: "seed", description: "种子，同一个种子结果可复现", example: "42" },
    { name: "decimals", description: "float 的小数位，0-10，默认 2", example: "2" },
  ],
  run: (ctx) => {
    const type = (str(ctx, "type") ?? "int").toLowerCase();
    const count = int(ctx, "count", 1, 1, 100);
    const seedRaw = str(ctx, "seed");
    const seed = seedRaw === null ? undefined : Number(seedRaw);
    if (seed !== undefined && !Number.isFinite(seed)) throw new ToolError(400, "invalid_seed", "seed 必须是数字");
    const next =
      seed === undefined
        ? () => {
            const buffer = randomBytes(4);
            return new DataView(buffer.buffer).getUint32(0) / 4294967296;
          }
        : mulberry32(seed);
    if (type === "int") {
      const min = int(ctx, "min", 0, -1e12, 1e12);
      const max = int(ctx, "max", 100, -1e12, 1e12);
      if (min > max) throw new ToolError(400, "invalid_range", "min 不能大于 max");
      return { type, min, max, values: Array.from({ length: count }, () => Math.floor(next() * (max - min + 1)) + min) };
    }
    if (type === "float") {
      const min = float(ctx, "min", 0, -1e12, 1e12);
      const max = float(ctx, "max", 1, -1e12, 1e12);
      const decimals = int(ctx, "decimals", 2, 0, 10);
      if (min > max) throw new ToolError(400, "invalid_range", "min 不能大于 max");
      const factor = 10 ** decimals;
      return {
        type,
        min,
        max,
        values: Array.from({ length: count }, () => Math.round((min + next() * (max - min)) * factor) / factor),
      };
    }
    const rawItems = str(ctx, "items");
    if (rawItems === null || rawItems.trim() === "") throw new ToolError(400, "missing_items", "需要 items 列表");
    const items = rawItems.split(",").map((item) => item.trim()).filter((item) => item !== "");
    if (type === "choice") {
      return { type, values: Array.from({ length: count }, () => items[Math.floor(next() * items.length)]) };
    }
    if (type === "shuffle") {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return { type, values: copy };
    }
    throw new ToolError(400, "invalid_type", "type 只能是 int、float、choice 或 shuffle");
  },
};

export const DATA_TOOLS: ToolDef[] = [timestamp, dateDiff, roman, base, unit, numberZh, bmi, randomTool];
