import { ToolError, int, str, text, type ToolDef } from "./types";

/* ----------------------------- hitokoto -------------------------- */

const HITOKOTO: Record<string, string[]> = {
  anime: [
    "只要不停下来，道路就会不断延伸。",
    "世界上只有一种真正的英雄主义，那就是认清生活真相后依然热爱生活。",
    "愿你出走半生，归来仍是少年。",
    "有些路很远，走下去会很累，可是不走，会后悔。",
    "不要哀求，学会争取，若是如此，终有所获。",
  ],
  game: [
    "胜败乃兵家常事，但真正的勇士会再次站起来。",
    "游戏可以重来，人生只有一次，所以要认真对待每一局。",
    "存档点之前，先把这一关打完。",
  ],
  literature: [
    "生活不能等待别人来安排，要自己去争取和奋斗。",
    "我们都在阴沟里，但仍有人仰望星空。",
    "一个人知道自己为什么而活，就可以忍受任何一种生活。",
    "愿有岁月可回首，且以深情共白头。",
  ],
  philosophy: [
    "未经省察的人生不值得过。",
    "真正的自由不是想做什么就做什么，而是不想做什么就可以不做。",
    "重要的不是活着，而是活得有意义。",
  ],
  poetry: [
    "人生天地间，忽如远行客。",
    "山重水复疑无路，柳暗花明又一村。",
    "莫愁前路无知己，天下谁人不识君。",
    "长风破浪会有时，直挂云帆济沧海。",
  ],
  netease: [
    "你那么擅长安慰他人，一定度过了很多自己安慰自己的日子吧。",
    "后来才发现，原来只是我一个人的兵荒马乱。",
    "所有的突然想起，都是一直放在心里。",
  ],
};

const hitokoto: ToolDef = {
  name: "content/hitokoto",
  group: "content",
  summary: "随机返回一句短语，可按动画、文学、哲学、诗词等类别筛选",
  methods: ["GET"],
  params: [{ name: "category", description: "类别：anime、game、literature、philosophy、poetry、netease；留空随机", example: "poetry" }],
  run: (ctx) => {
    const requested = str(ctx, "category");
    const keys = requested ? [requested] : Object.keys(HITOKOTO);
    const pool = keys.flatMap((key) => HITOKOTO[key] ?? []);
    if (pool.length === 0) throw new ToolError(400, "invalid_category", "没有这个类别");
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const index = new DataView(buffer.buffer).getUint32(0) % pool.length;
    return { category: requested ?? "random", text: pool[index], total: pool.length };
  },
};

/* ------------------------------ quote ---------------------------- */

const QUOTES: Array<{ text: string; author: string; tag: string }> = [
  { text: "一个人知道自己为什么而活，就可以忍受任何一种生活。", author: "尼采", tag: "人生" },
  { text: "我们都在阴沟里，但仍有人仰望星空。", author: "王尔德", tag: "人生" },
  { text: "生活中最重要的不是所站的位置，而是所朝的方向。", author: "霍尔姆斯", tag: "人生" },
  { text: "真正的勇气不是没有恐惧，而是带着恐惧继续前行。", author: "纳尔逊·曼德拉", tag: "勇气" },
  { text: "成功不是终点，失败也不是终结，唯有前进的勇气才是永恒。", author: "丘吉尔", tag: "勇气" },
  { text: "时间不等人，尤其不等犹豫的人。", author: "佚名", tag: "时间" },
  { text: "把时间用在思考上是最能节省时间的事情。", author: "卡曾斯", tag: "时间" },
  { text: "爱是理解的别名。", author: "泰戈尔", tag: "爱" },
  { text: "我们爱一个人，不是因为他完美，而是因为他真实。", author: "佚名", tag: "爱" },
  { text: "科学的每一项巨大成就，都是以大胆的幻想为出发点的。", author: "杜威", tag: "科学" },
  { text: "如果我比别人看得更远，那是因为我站在巨人的肩膀上。", author: "牛顿", tag: "科学" },
  { text: "自由不是让你想做什么就做什么，自由是教你不想做什么，就可以不做什么。", author: "康德", tag: "自由" },
  { text: "努力不一定成功，但放弃一定失败。", author: "佚名", tag: "努力" },
  { text: "所谓天才，不过是把别人喝咖啡的功夫都用在工作上。", author: "鲁迅", tag: "努力" },
  { text: "种一棵树最好的时间是十年前，其次是现在。", author: "佚名", tag: "努力" },
];

const quote: ToolDef = {
  name: "content/quote",
  group: "content",
  summary: "随机返回一句名言，带作者与标签",
  methods: ["GET"],
  params: [{ name: "tag", description: "标签筛选：人生、勇气、时间、爱、科学、自由、努力", example: "勇气" }],
  run: (ctx) => {
    const tag = str(ctx, "tag");
    const pool = tag ? QUOTES.filter((item) => item.tag === tag) : QUOTES;
    if (pool.length === 0) throw new ToolError(400, "invalid_tag", "没有这个标签");
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const item = pool[new DataView(buffer.buffer).getUint32(0) % pool.length];
    return { ...item, total: pool.length };
  },
};

/* ------------------------------- poem ---------------------------- */

const POEMS: Array<{ title: string; author: string; dynasty: string; lines: string[] }> = [
  { title: "静夜思", author: "李白", dynasty: "唐", lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"] },
  { title: "登鹳雀楼", author: "王之涣", dynasty: "唐", lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"] },
  { title: "春晓", author: "孟浩然", dynasty: "唐", lines: ["春眠不觉晓，处处闻啼鸟。", "夜来风雨声，花落知多少。"] },
  { title: "水调歌头", author: "苏轼", dynasty: "宋", lines: ["明月几时有？把酒问青天。", "不知天上宫阙，今夕是何年。", "人有悲欢离合，月有阴晴圆缺，此事古难全。", "但愿人长久，千里共婵娟。"] },
  { title: "声声慢", author: "李清照", dynasty: "宋", lines: ["寻寻觅觅，冷冷清清，凄凄惨惨戚戚。", "乍暖还寒时候，最难将息。"] },
  { title: "念奴娇·赤壁怀古", author: "苏轼", dynasty: "宋", lines: ["大江东去，浪淘尽，千古风流人物。", "乱石穿空，惊涛拍岸，卷起千堆雪。"] },
  { title: "将进酒", author: "李白", dynasty: "唐", lines: ["君不见黄河之水天上来，奔流到海不复回。", "人生得意须尽欢，莫使金樽空对月。", "天生我材必有用，千金散尽还复来。"] },
  { title: "登高", author: "杜甫", dynasty: "唐", lines: ["风急天高猿啸哀，渚清沙白鸟飞回。", "无边落木萧萧下，不尽长江滚滚来。"] },
  { title: "山居秋暝", author: "王维", dynasty: "唐", lines: ["空山新雨后，天气晚来秋。", "明月松间照，清泉石上流。"] },
  { title: "青玉案·元夕", author: "辛弃疾", dynasty: "宋", lines: ["东风夜放花千树，更吹落、星如雨。", "众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。"] },
  { title: "锦瑟", author: "李商隐", dynasty: "唐", lines: ["锦瑟无端五十弦，一弦一柱思华年。", "此情可待成追忆，只是当时已惘然。"] },
  { title: "望岳", author: "杜甫", dynasty: "唐", lines: ["岱宗夫如何？齐鲁青未了。", "会当凌绝顶，一览众山小。"] },
];

const poem: ToolDef = {
  name: "content/poem",
  group: "content",
  summary: "返回一首古诗词，可按标题、作者或诗句搜索",
  methods: ["GET"],
  params: [{ name: "q", description: "搜索词：标题、作者或诗句片段", example: "李白" }],
  run: (ctx) => {
    const query = str(ctx, "q");
    if (query !== null && query.trim() !== "") {
      const needle = query.trim();
      const hits = POEMS.filter((item) =>
        item.title.includes(needle) || item.author.includes(needle) || item.lines.some((line) => line.includes(needle))
      );
      if (hits.length === 0) throw new ToolError(404, "not_found", "没有找到包含「" + needle + "」的诗词");
      return { total: hits.length, poems: hits };
    }
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const item = POEMS[new DataView(buffer.buffer).getUint32(0) % POEMS.length];
    return { total: POEMS.length, ...item, content: item.lines.join("\n") };
  },
};

/* ---------------------------- color-name ------------------------- */

const NAMED_COLORS: Array<[string, string]> = [
  ["black", "#000000"], ["white", "#ffffff"], ["red", "#ff0000"], ["lime", "#00ff00"], ["blue", "#0000ff"],
  ["yellow", "#ffff00"], ["cyan", "#00ffff"], ["magenta", "#ff00ff"], ["silver", "#c0c0c0"], ["gray", "#808080"],
  ["maroon", "#800000"], ["olive", "#808000"], ["green", "#008000"], ["purple", "#800080"], ["teal", "#008080"],
  ["navy", "#000080"], ["orange", "#ffa500"], ["pink", "#ffc0cb"], ["brown", "#a52a2a"], ["gold", "#ffd700"],
  ["indigo", "#4b0082"], ["violet", "#ee82ee"], ["coral", "#ff7f50"], ["salmon", "#fa8072"], ["khaki", "#f0e68c"],
  ["crimson", "#dc143c"], ["turquoise", "#40e0d0"], ["lavender", "#e6e6fa"], ["beige", "#f5f5dc"], ["ivory", "#fffff0"],
  ["chocolate", "#d2691e"], ["tomato", "#ff6347"], ["orchid", "#da70d6"], ["plum", "#dda0dd"], ["tan", "#d2b48c"],
  ["skyblue", "#87ceeb"], ["steelblue", "#4682b4"], ["slategray", "#708090"], ["seagreen", "#2e8b57"], ["forestgreen", "#228b22"],
  ["midnightblue", "#191970"], ["royalblue", "#4169e1"], ["dodgerblue", "#1e90ff"], ["deepskyblue", "#00bfff"], ["aquamarine", "#7fffd4"],
  ["goldenrod", "#daa520"], ["firebrick", "#b22222"], ["darkred", "#8b0000"], ["darkgreen", "#006400"], ["darkblue", "#00008b"],
  ["lightgray", "#d3d3d3"], ["lightblue", "#add8e6"], ["lightgreen", "#90ee90"], ["lightpink", "#ffb6c1"], ["lightyellow", "#ffffe0"],
  ["whitesmoke", "#f5f5f5"], ["gainsboro", "#dcdcdc"], ["dimgray", "#696969"], ["darkslategray", "#2f4f4f"], ["rebeccapurple", "#663399"],
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const digits = hex.replace("#", "");
  return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) };
}

function colorDistance(a: string, b: string): number {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const rmean = (x.r + y.r) / 2;
  const dr = x.r - y.r;
  const dg = x.g - y.g;
  const db = x.b - y.b;
  return Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db);
}

const colorName: ToolDef = {
  name: "content/color-name",
  group: "content",
  summary: "按颜色名查色值，或由色值找出最接近的颜色名",
  methods: ["GET"],
  params: [{ name: "q", description: "颜色名（lightblue）或色值（#add8e6）", required: true, example: "#add8e6" }],
  run: (ctx) => {
    const query = text(ctx, "q", { max: 40 }).trim().toLowerCase();
    if (query.startsWith("#") || /^[0-9a-f]{6}$/.test(query)) {
      const hex = query.startsWith("#") ? query : "#" + query;
      if (!/^#[0-9a-f]{6}$/.test(hex)) throw new ToolError(400, "invalid_color", "需要 #rrggbb 格式");
      const ranked = NAMED_COLORS.map(([name, value]) => ({ name, hex: value, distance: Math.round(colorDistance(hex, value)) })).sort(
        (a, b) => a.distance - b.distance
      );
      return { input: hex, nearest: ranked.slice(0, 3), total: NAMED_COLORS.length };
    }
    const hits = NAMED_COLORS.filter(([name]) => name.includes(query));
    if (hits.length === 0) throw new ToolError(404, "not_found", "没有收录这个颜色名");
    return { query, matches: hits.map(([name, hex]) => ({ name, hex })), total: hits.length };
  },
};

/* ----------------------------- unicode --------------------------- */

const BLOCKS: Array<[number, number, string]> = [
  [0x0000, 0x007f, "Basic Latin"],
  [0x0080, 0x00ff, "Latin-1 Supplement"],
  [0x0100, 0x017f, "Latin Extended-A"],
  [0x0370, 0x03ff, "Greek and Coptic"],
  [0x0400, 0x04ff, "Cyrillic"],
  [0x2000, 0x206f, "General Punctuation"],
  [0x20a0, 0x20cf, "Currency Symbols"],
  [0x2190, 0x21ff, "Arrows"],
  [0x2200, 0x22ff, "Mathematical Operators"],
  [0x2600, 0x26ff, "Miscellaneous Symbols"],
  [0x2700, 0x27bf, "Dingbats"],
  [0x3000, 0x303f, "CJK Symbols and Punctuation"],
  [0x3040, 0x309f, "Hiragana"],
  [0x30a0, 0x30ff, "Katakana"],
  [0x3400, 0x4dbf, "CJK Extension A"],
  [0x4e00, 0x9fff, "CJK Unified Ideographs"],
  [0xac00, 0xd7af, "Hangul Syllables"],
  [0xf900, 0xfaff, "CJK Compatibility Ideographs"],
  [0xfe30, 0xfe4f, "CJK Compatibility Forms"],
  [0xff00, 0xffef, "Halfwidth and Fullwidth Forms"],
  [0x1f300, 0x1f5ff, "Miscellaneous Symbols and Pictographs"],
  [0x1f600, 0x1f64f, "Emoticons"],
  [0x1f900, 0x1f9ff, "Supplemental Symbols and Pictographs"],
];

function blockOf(code: number): string | null {
  const hit = BLOCKS.find(([start, end]) => code >= start && code <= end);
  return hit ? hit[2] : null;
}

const unicode: ToolDef = {
  name: "content/unicode",
  group: "content",
  summary: "查看字符的码点、UTF-8 / UTF-16 字节、HTML 实体与所属 Unicode 区块",
  methods: ["GET"],
  params: [{ name: "char", description: "一个字符，或 U+4E00 这样的码点写法", required: true, example: "澪" }],
  run: (ctx) => {
    const raw = text(ctx, "char", { max: 16 }).trim();
    const codepointMatch = raw.match(/^(?:U\+|0x|&#x)?([0-9a-fA-F]{2,6})$/);
    let symbol = raw;
    if (codepointMatch && (raw.startsWith("U+") || raw.startsWith("0x") || raw.startsWith("&#x"))) {
      const code = parseInt(codepointMatch[1], 16);
      if (code > 0x10ffff) throw new ToolError(400, "invalid_codepoint", "码点超出 Unicode 范围");
      symbol = String.fromCodePoint(code);
    }
    const chars = [...symbol];
    if (chars.length !== 1) throw new ToolError(400, "invalid_char", "请只提供一个字符");
    const ch = chars[0];
    const code = ch.codePointAt(0) ?? 0;
    const utf8 = [...new TextEncoder().encode(ch)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const utf16 = [...ch].flatMap((part) => {
      const out: string[] = [];
      for (let i = 0; i < part.length; i += 1) out.push(part.charCodeAt(i).toString(16).padStart(4, "0"));
      return out;
    });
    return {
      char: ch,
      codepoint: "U+" + code.toString(16).toUpperCase().padStart(4, "0"),
      decimal: code,
      utf8,
      utf16,
      htmlEntity: "&#x" + code.toString(16).toUpperCase() + ";",
      block: blockOf(code),
      category: /[\p{L}]/u.test(ch) ? "letter" : /[\p{N}]/u.test(ch) ? "number" : /[\p{P}]/u.test(ch) ? "punctuation" : /[\p{S}]/u.test(ch) ? "symbol" : /\s/u.test(ch) ? "whitespace" : "other",
    };
  },
};

export const CONTENT_TOOLS: ToolDef[] = [hitokoto, quote, poem, colorName, unicode];
