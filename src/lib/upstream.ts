/**
 * 开放接口路由表：本站对外提供的全部数据接口。
 *
 * 每条记录：m = 允许的方法（逗号分隔），c = 单次调用的积分消耗，
 * t = 分类中文名，s = 一句话说明。
 *
 * 带路径参数的上游路由（如 web/tomarkdown/async/{task_id}）放在 PREFIX 里，
 * 按前缀匹配，其余按完整路径精确匹配。
 */

export interface UpstreamRoute {
  /** 允许的 HTTP 方法，逗号分隔 */
  m: string;
  /** 单次调用消耗的积分（0 = 免费） */
  c: number;
  /** 分类 */
  t: string;
  /** 一句话说明 */
  s: string;
}

/** 精确匹配的路由 */
export const UPSTREAM_EXACT: Record<string, UpstreamRoute> = {
  "ai/models": { m: "GET", c: 2, t: "AI 能力", s: "查询 AI 模型列表" },
  "ai/translate": { m: "POST", c: 4, t: "翻译", s: "AI智能翻译" },
  "ai/translate/languages": { m: "GET", c: 0, t: "翻译", s: "AI翻译配置" },
  "answerbook/ask": { m: "GET,POST", c: 0, t: "随机生成", s: "答案之书 (POST)" },
  "api/get": { m: "GET", c: 0, t: "在线剪贴板", s: "步骤2 (方法一): 获取加密数据" },
  "api/store": { m: "POST", c: 0, t: "在线剪贴板", s: "步骤1：上传加密数据" },
  "avatar/gravatar": { m: "GET", c: 2, t: "图像处理", s: "获取Gravatar头像" },
  "convert/json": { m: "POST", c: 0, t: "格式转换", s: "JSON 格式化" },
  "convert/unixtime": { m: "GET", c: 0, t: "格式转换", s: "时间戳转换" },
  "daily/news-image": { m: "GET", c: 1, t: "每日内容", s: "每日新闻图" },
  "daily/word": { m: "GET", c: 1, t: "每日内容", s: "每日单词" },
  "dictionary/audio": { m: "GET", c: 1, t: "词典", s: "单词发音" },
  "dictionary/lookup": { m: "GET", c: 2, t: "词典", s: "单词查询" },
  "dictionary/suggest": { m: "GET", c: 1, t: "词典", s: "词典推荐语" },
  "execution/run": { m: "POST", c: 4, t: "代码执行", s: "在线运行代码" },
  "food/ingredient": { m: "GET", c: 1, t: "美食", s: "食材搜索" },
  "food/ingredient/detail": { m: "GET", c: 3, t: "美食", s: "食材营养详情" },
  "food/recipe": { m: "GET", c: 1, t: "美食", s: "菜谱搜索" },
  "food/recipe/detail": { m: "GET", c: 3, t: "美食", s: "菜谱详情" },
  "game/epic-free": { m: "GET", c: 1, t: "游戏数据", s: "Epic 免费游戏" },
  "game/minecraft/bedrockstatus": { m: "GET", c: 1, t: "游戏数据", s: "查询 MC 基岩版服务器" },
  "game/minecraft/historyid": { m: "GET", c: 1, t: "游戏数据", s: "查询 MC 曾用名" },
  "game/minecraft/mods": { m: "GET", c: 1, t: "游戏数据", s: "搜索 MC Mod/插件" },
  "game/minecraft/serverstatus": { m: "GET", c: 1, t: "游戏数据", s: "查询 MC 服务器" },
  "game/minecraft/userinfo": { m: "GET", c: 1, t: "游戏数据", s: "查询 MC 玩家" },
  "game/minecraft/version": { m: "GET", c: 1, t: "游戏数据", s: "Minecraft 最新版本" },
  "game/steam/servers": { m: "GET", c: 1, t: "游戏数据", s: "查询 Steam 游戏服务器" },
  "game/steam/summary": { m: "GET", c: 2, t: "游戏数据", s: "查询 Steam 用户" },
  "github/repo": { m: "GET", c: 2, t: "社交平台", s: "查询 GitHub 仓库" },
  "github/user": { m: "GET", c: 2, t: "社交平台", s: "查询 GitHub 用户信息" },
  "history/programmer": { m: "GET", c: 0, t: "生活杂项", s: "程序员历史事件" },
  "history/programmer/today": { m: "GET", c: 0, t: "生活杂项", s: "程序员历史上的今天" },
  "image/bing-daily": { m: "GET", c: 0, t: "图像处理", s: "获取必应每日壁纸" },
  "image/bing-daily/history": { m: "GET", c: 0, t: "图像处理", s: "查询必应壁纸历史" },
  "image/compress": { m: "POST", c: 2, t: "图像处理", s: "无损压缩图片" },
  "image/decode": { m: "POST", c: 2, t: "图像处理", s: "解码并缩放图片" },
  "image/frombase64": { m: "POST", c: 2, t: "图像处理", s: "通过Base64编码上传图片" },
  "image/matting": { m: "POST", c: 4, t: "图像处理", s: "图片抠图（背景移除）" },
  "image/motou": { m: "GET,POST", c: 2, t: "图像处理", s: "生成摸摸头GIF" },
  "image/nsfw": { m: "POST", c: 4, t: "图像处理", s: "图片敏感检测" },
  "image/ocr": { m: "POST", c: 4, t: "图像处理", s: "通用 OCR 文字识别" },
  "image/qrcode": { m: "GET", c: 0, t: "图像处理", s: "生成二维码" },
  "image/speechless": { m: "POST", c: 2, t: "图像处理", s: "生成你们怎么不说话了表情包" },
  "image/svg": { m: "POST", c: 1, t: "图像处理", s: "SVG转图片" },
  "image/tobase64": { m: "GET", c: 2, t: "图像处理", s: "图片转 Base64" },
  "misc/date-diff": { m: "POST", c: 0, t: "生活杂项", s: "计算两个日期之间的时间差值" },
  "misc/district": { m: "GET", c: 2, t: "生活杂项", s: "Adcode 国内外行政区域查询" },
  "misc/holiday-calendar": { m: "GET", c: 1, t: "生活杂项", s: "查询节假日与万年历" },
  "misc/hotboard": { m: "GET", c: 1, t: "生活杂项", s: "查询热榜" },
  "misc/lunartime": { m: "GET", c: 0, t: "生活杂项", s: "查询农历时间" },
  "misc/movie-box-office": { m: "GET", c: 1, t: "生活杂项", s: "查询电影票房" },
  "misc/movie-rating-rank": { m: "GET", c: 1, t: "生活杂项", s: "电影收视排行查询" },
  "misc/phoneinfo": { m: "GET", c: 2, t: "生活杂项", s: "查询手机归属地" },
  "misc/randomnumber": { m: "GET", c: 0, t: "生活杂项", s: "随机数生成" },
  "misc/timestamp": { m: "GET", c: 0, t: "生活杂项", s: "转换时间戳 (旧版，推荐使用/convert/unixtime)" },
  "misc/tracking/carriers": { m: "GET", c: 2, t: "生活杂项", s: "获取支持的快递公司列表" },
  "misc/tracking/detect": { m: "GET", c: 2, t: "生活杂项", s: "识别快递公司" },
  "misc/tracking/query": { m: "GET", c: 40, t: "生活杂项", s: "查询快递物流信息" },
  "misc/weather": { m: "GET", c: 2, t: "生活杂项", s: "查询天气" },
  "misc/weather/history": { m: "GET", c: 1, t: "生活杂项", s: "查询历史天气" },
  "misc/worldtime": { m: "GET", c: 0, t: "生活杂项", s: "查询世界时间" },
  "network/dns": { m: "GET", c: 2, t: "网络工具", s: "执行DNS解析查询" },
  "network/icp": { m: "GET", c: 4, t: "网络工具", s: "查询域名ICP备案信息" },
  "network/ipinfo": { m: "GET", c: 1, t: "网络工具", s: "查询 IP" },
  "network/myip": { m: "GET", c: 1, t: "网络工具", s: "查询我的 IP" },
  "network/ping": { m: "GET", c: 1, t: "网络工具", s: "Ping 主机" },
  "network/pingmyip": { m: "GET", c: 1, t: "网络工具", s: "Ping 我的 IP" },
  "network/portscan": { m: "GET", c: 1, t: "网络工具", s: "端口扫描" },
  "network/urlstatus": { m: "GET", c: 1, t: "网络工具", s: "检查URL的可访问性状态" },
  "network/whois": { m: "GET", c: 2, t: "网络工具", s: "查询域名的WHOIS注册信息" },
  "network/wxdomain": { m: "GET", c: 1, t: "网络工具", s: "检查域名在微信中的访问状态" },
  "random/image": { m: "GET", c: 0, t: "随机生成", s: "随机图片" },
  "random/string": { m: "GET", c: 0, t: "随机生成", s: "随机字符串" },
  "saying": { m: "GET", c: 0, t: "诗文", s: "一言" },
  "saying/random": { m: "GET", c: 1, t: "诗文", s: "一言（随机/每日/场景/此刻）" },
  "search/aggregate": { m: "POST", c: 4, t: "智能搜索", s: "智能搜索" },
  "search/engines": { m: "GET", c: 0, t: "智能搜索", s: "搜索引擎配置" },
  "sensitive-word/analyze": { m: "POST", c: 4, t: "内容安全", s: "分析敏感词" },
  "sensitive-word/analyze-query": { m: "GET", c: 4, t: "内容安全", s: "敏感词分析 (GET)" },
  "social/bilibili/archives": { m: "GET", c: 4, t: "社交平台", s: "查询 B站投稿" },
  "social/bilibili/liveroom": { m: "GET", c: 4, t: "社交平台", s: "查询 B站直播间" },
  "social/bilibili/replies": { m: "GET", c: 4, t: "社交平台", s: "查询 B站评论" },
  "social/bilibili/userinfo": { m: "GET", c: 4, t: "社交平台", s: "查询 B站用户" },
  "social/bilibili/videoinfo": { m: "GET", c: 4, t: "社交平台", s: "查询 B站视频" },
  "social/qq/groupinfo": { m: "GET", c: 6, t: "社交平台", s: "查询 QQ 群信息" },
  "social/qq/userinfo": { m: "GET", c: 6, t: "社交平台", s: "查询 QQ 信息" },
  "status/ratelimit": { m: "GET", c: 0, t: "服务状态", s: "限流状态" },
  "status/usage": { m: "GET", c: 0, t: "服务状态", s: "获取API端点使用统计" },
  "text/aes/decrypt": { m: "POST", c: 0, t: "文本处理", s: "AES 解密" },
  "text/aes/decrypt-advanced": { m: "POST", c: 1, t: "文本处理", s: "AES高级解密" },
  "text/aes/encrypt": { m: "POST", c: 0, t: "文本处理", s: "AES 加密" },
  "text/aes/encrypt-advanced": { m: "POST", c: 1, t: "文本处理", s: "AES高级加密" },
  "text/analyze": { m: "POST", c: 1, t: "文本处理", s: "文本分析" },
  "text/base64/decode": { m: "POST", c: 0, t: "文本处理", s: "Base64 解码" },
  "text/base64/encode": { m: "POST", c: 0, t: "文本处理", s: "Base64 编码" },
  "text/convert": { m: "POST", c: 1, t: "文本处理", s: "格式转换" },
  "text/markdown-to-html": { m: "POST", c: 1, t: "文本处理", s: "Markdown 转 HTML" },
  "text/markdown-to-pdf": { m: "POST", c: 2, t: "文本处理", s: "Markdown 转 PDF" },
  "text/md5": { m: "GET,POST", c: 0, t: "文本处理", s: "MD5 哈希 (POST)" },
  "text/md5/verify": { m: "POST", c: 0, t: "文本处理", s: "MD5 校验" },
  "text/profanitycheck": { m: "POST", c: 1, t: "内容安全", s: "敏感词检测（快速）" },
  "translate/stream": { m: "POST", c: 4, t: "翻译", s: "流式翻译（中英互译）" },
  "translate/text": { m: "POST", c: 2, t: "翻译", s: "翻译" },
  "watermark/decode": { m: "POST", c: 4, t: "水印与标识", s: "提取图片隐水印" },
  "watermark/embed": { m: "POST", c: 4, t: "水印与标识", s: "添加图片隐水印" },
  "watermark/label": { m: "POST", c: 4, t: "水印与标识", s: "添加 AI 生成内容标识" },
  "watermark/producer-code": { m: "POST", c: 1, t: "水印与标识", s: "生成 AIGC 服务提供者编码" },
  "web/tomarkdown/async": { m: "POST", c: 4, t: "网页解析", s: "网页转 Markdown" },
  "webparse/extractimages": { m: "GET", c: 2, t: "网页解析", s: "提取网页图片" },
  "webparse/metadata": { m: "GET", c: 1, t: "网页解析", s: "提取网页元数据" },
};

/** 前缀匹配的路由（路径里带参数，键是参数前的固定部分） */
export const UPSTREAM_PREFIX: Record<string, UpstreamRoute> = {
  "api/raw/{id}": { m: "GET", c: 0, t: "在线剪贴板", s: "步骤2 (方法二): 获取原始文本" },
  "web/tomarkdown/async/{task_id}": { m: "GET", c: 0, t: "网页解析", s: "转换任务状态" },
};

/** 全部接口的展示顺序（文档与 /api/v1/endpoints 用） */
export const UPSTREAM_PATHS: string[] = [
  "ai/models",
  "ai/translate",
  "ai/translate/languages",
  "answerbook/ask",
  "api/get",
  "api/raw/{id}",
  "api/store",
  "avatar/gravatar",
  "convert/json",
  "convert/unixtime",
  "daily/news-image",
  "daily/word",
  "dictionary/audio",
  "dictionary/lookup",
  "dictionary/suggest",
  "execution/run",
  "food/ingredient",
  "food/ingredient/detail",
  "food/recipe",
  "food/recipe/detail",
  "game/epic-free",
  "game/minecraft/bedrockstatus",
  "game/minecraft/historyid",
  "game/minecraft/mods",
  "game/minecraft/serverstatus",
  "game/minecraft/userinfo",
  "game/minecraft/version",
  "game/steam/servers",
  "game/steam/summary",
  "github/repo",
  "github/user",
  "history/programmer",
  "history/programmer/today",
  "image/bing-daily",
  "image/bing-daily/history",
  "image/compress",
  "image/decode",
  "image/frombase64",
  "image/matting",
  "image/motou",
  "image/nsfw",
  "image/ocr",
  "image/qrcode",
  "image/speechless",
  "image/svg",
  "image/tobase64",
  "misc/date-diff",
  "misc/district",
  "misc/holiday-calendar",
  "misc/hotboard",
  "misc/lunartime",
  "misc/movie-box-office",
  "misc/movie-rating-rank",
  "misc/phoneinfo",
  "misc/randomnumber",
  "misc/timestamp",
  "misc/tracking/carriers",
  "misc/tracking/detect",
  "misc/tracking/query",
  "misc/weather",
  "misc/weather/history",
  "misc/worldtime",
  "network/dns",
  "network/icp",
  "network/ipinfo",
  "network/myip",
  "network/ping",
  "network/pingmyip",
  "network/portscan",
  "network/urlstatus",
  "network/whois",
  "network/wxdomain",
  "random/image",
  "random/string",
  "saying",
  "saying/random",
  "search/aggregate",
  "search/engines",
  "sensitive-word/analyze",
  "sensitive-word/analyze-query",
  "social/bilibili/archives",
  "social/bilibili/liveroom",
  "social/bilibili/replies",
  "social/bilibili/userinfo",
  "social/bilibili/videoinfo",
  "social/qq/groupinfo",
  "social/qq/userinfo",
  "status/ratelimit",
  "status/usage",
  "text/aes/decrypt",
  "text/aes/decrypt-advanced",
  "text/aes/encrypt",
  "text/aes/encrypt-advanced",
  "text/analyze",
  "text/base64/decode",
  "text/base64/encode",
  "text/convert",
  "text/markdown-to-html",
  "text/markdown-to-pdf",
  "text/md5",
  "text/md5/verify",
  "text/profanitycheck",
  "translate/stream",
  "translate/text",
  "watermark/decode",
  "watermark/embed",
  "watermark/label",
  "watermark/producer-code",
  "web/tomarkdown/async",
  "web/tomarkdown/async/{task_id}",
  "webparse/extractimages",
  "webparse/metadata",
];

/** 按分类归集 */
export const UPSTREAM_CATEGORIES: { tag: string; paths: string[] }[] = (() => {
  const map = new Map<string, string[]>();
  for (const p of UPSTREAM_PATHS) {
    const r = UPSTREAM_EXACT[p] ?? UPSTREAM_PREFIX[p];
    if (!r) continue;
    const list = map.get(r.t) ?? [];
    list.push(p);
    map.set(r.t, list);
  }
  return [...map.entries()]
    .map(([tag, paths]) => ({ tag, paths }))
    .sort((a, b) => b.paths.length - a.paths.length);
})();

/** 查路由：先精确、再最长前缀 */
export function findUpstreamRoute(path: string): { route: UpstreamRoute; key: string } | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const exact = UPSTREAM_EXACT[clean];
  if (exact) return { route: exact, key: clean };
  let best = "";
  for (const key of Object.keys(UPSTREAM_PREFIX)) {
    if (clean.startsWith(key) && key.length > best.length) best = key;
  }
  if (best) return { route: UPSTREAM_PREFIX[best], key: best };
  return null;
}

/**
 * 额度档位：按积分消耗分三档。
 * 免费接口宽松，贵的接口（OCR、抠图、水印、代码执行）收紧，
 * 避免单张卡密把整天的上游预算打空。
 */
export function tierOf(credits: number): {
  name: "free" | "basic" | "premium";
  perMinute: number;
  perDay: number;
} {
  if (credits <= 0) return { name: "free", perMinute: 60, perDay: 2000 };
  if (credits <= 2) return { name: "basic", perMinute: 20, perDay: 300 };
  return { name: "premium", perMinute: 6, perDay: 60 };
}
