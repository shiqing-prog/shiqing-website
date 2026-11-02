import { DESKTOP_UA, fetchJson, fetchText } from "./http";

/**
 * 视频链接解析。
 *
 * 目前两条路：
 *   1. 哔哩哔哩：走官方 web 接口，能拿到标题、UP 主、封面、分 P 与 720P 以内的
 *      MP4 直链（游客身份，清晰度取决于该视频本身开放的权限）。
 *   2. 其它站点：抓页面 OpenGraph / video 标签，给出标题、封面、描述、作者，
 *      有 og:video 就一并返回直链。
 *
 * 拿不到直链时返回 playable: false，不假装成功。
 */

export interface VideoInfo {
  platform: string;
  /** 视频唯一标识（B 站是 bvid） */
  id: string;
  title: string;
  author: string | null;
  cover: string | null;
  description: string | null;
  /** 秒 */
  duration: number | null;
  /** 播放页地址 */
  page_url: string;
  playable: boolean;
}

export interface VideoPart {
  index: number;
  title: string;
  duration: number | null;
  /** 直链接（playable 为 true 时才有） */
  url: string | null;
  size: number | null;
  quality: string | null;
}

export interface VideoParseResult {
  video: VideoInfo;
  parts: VideoPart[];
  /** 取不到直链时的原因 */
  reason?: string;
}

/**
 * B 站接口只认「格式像样的 buvid3」，值本身是随机 UUID，不用真去首页换。
 * 直接现造一个既省一次请求，也不会被首页那步 412 卡住。
 */
function biliCookie(): string {
  try {
    return "buvid3=" + crypto.randomUUID().toUpperCase() + "infoc";
  } catch {
    return "buvid3=" + Math.random().toString(36).slice(2).toUpperCase() + "infoc";
  }
}

export function detectPlatform(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("bilibili.com") || host.includes("b23.tv")) return "bilibili";
  if (host.includes("douyin.com")) return "douyin";
  if (host.includes("kuaishou.com")) return "kuaishou";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) return "xiaohongshu";
  if (host.includes("weibo.com") || host.includes("weibo.cn")) return "weibo";
  if (host.includes("qq.com")) return "tencent-video";
  if (host.includes("iqiyi.com")) return "iqiyi";
  if (host.includes("youku.com")) return "youku";
  if (host.includes("mgtv.com")) return "mgtv";
  return "unknown";
}

/** 从链接里抠出 B 站 bvid 或 av 号 */
export function parseBiliId(input: string): { bvid?: string; aid?: string } {
  const bv = /(BV[0-9A-Za-z]{10})/.exec(input);
  if (bv) return { bvid: bv[1] };
  const av = /av(\d+)/i.exec(input);
  if (av) return { aid: av[1] };
  return {};
}

interface BiliViewData {
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  pic: string;
  desc: string;
  duration: number;
  owner?: { name?: string };
  pages?: { cid: number; page: number; part: string; duration: number }[];
}

/**
 * 直连 B 站接口；云端出口经常整段 412（风控按 IP 打），
 * 这时换同协议的公共镜像（域名前缀不同、路径参数完全一致）重试一次。
 */
const BILI_MIRROR = "https://api.biliapi.net";

const BILI_PROXY_BASE = (process.env.BILI_PROXY_BASE ?? "").replace(/\/+$/, "");
const BILI_PROXY_KEY = process.env.BILI_PROXY_KEY ?? "";

/** 直连和镜像都被封时记一笔，5 分钟内别再白试，直接走中转（省掉两次 412 往返） */
let biliDirectDeadUntil = 0;
const BILI_DIRECT_COOLDOWN = 5 * 60 * 1000;

async function biliFetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  if (Date.now() >= biliDirectDeadUntil) {
    try {
      return await fetchJson<T>(url, { headers, timeoutMs: 9000 });
    } catch (error) {
      console.error("[bili-direct]", url, String(error));
    }
    const mirror = url.replace("https://api.bilibili.com", BILI_MIRROR);
    if (mirror !== url) {
      try {
        return await fetchJson<T>(mirror, { headers, timeoutMs: 14000 });
      } catch (error) {
        console.error("[bili-mirror]", mirror, String(error));
      }
    }
    biliDirectDeadUntil = Date.now() + BILI_DIRECT_COOLDOWN;
  }
  // 第三通道：自建中转（家庭宽带出口）。云端机房 IP 被平台整段风控时靠它绕出去
  if (BILI_PROXY_BASE && BILI_PROXY_KEY) {
    const proxied = BILI_PROXY_BASE + "/bili/" + url.replace("https://api.bilibili.com/", "");
    try {
      return await fetchJson<T>(proxied, {
        headers: { "x-bili-key": BILI_PROXY_KEY },
        timeoutMs: 20000,
      });
    } catch (error) {
      console.error("[bili-proxy]", proxied, String(error));
    }
  }
  return null;
}

async function bilibiliView(bvid: string, cookie: string): Promise<BiliViewData | null> {
  const url =
    "https://api.bilibili.com/x/web-interface/view?bvid=" + encodeURIComponent(bvid);
  const data = await biliFetchJson<{ code: number; message?: string; data?: BiliViewData }>(url, {
    referer: "https://www.bilibili.com",
    cookie,
  });
  if (!data || data.code !== 0 || !data.data) return null;
  return data.data;
}

interface BiliPlayData {
  quality?: number;
  format?: string;
  accept_description?: string[];
  accept_quality?: number[];
  durl?: { url: string; size: number; length: number }[];
  dash?: unknown;
}

async function bilibiliPlay(bvid: string, cid: number, cookie: string): Promise<BiliPlayData | null> {
  const url =
    "https://api.bilibili.com/x/player/playurl?bvid=" +
    encodeURIComponent(bvid) +
    "&cid=" +
    cid +
    "&qn=64&fnval=1&fnver=0&fourk=0";
  const data = await biliFetchJson<{ code: number; data?: BiliPlayData }>(url, {
    referer: "https://www.bilibili.com",
    cookie,
  });
  if (!data || data.code !== 0 || !data.data) return null;
  return data.data;
}

function qualityLabel(q: number | undefined): string | null {
  if (!q) return null;
  const table: Record<number, string> = {
    16: "360P",
    32: "480P",
    64: "720P",
    74: "720P60",
    80: "1080P",
    112: "1080P+",
    116: "1080P60",
    120: "4K",
  };
  return table[q] ?? q + "P";
}

async function parseBilibili(input: string): Promise<VideoParseResult> {
  const cookie = biliCookie();
  let bvid = parseBiliId(input).bvid ?? "";
  // b23.tv 短链先跟一次跳转
  if (!bvid && /b23\.tv/.test(input)) {
    try {
      const response = await fetch(input, {
        method: "GET",
        headers: { "user-agent": DESKTOP_UA },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      bvid = parseBiliId(response.url).bvid ?? "";
    } catch {
      /* 跳转失败就走下面的错误分支 */
    }
  }
  if (!bvid) {
    return {
      video: {
        platform: "bilibili",
        id: "",
        title: "",
        author: null,
        cover: null,
        description: null,
        duration: null,
        page_url: input,
        playable: false,
      },
      parts: [],
      reason: "没从这个链接里找到 BV 号",
    };
  }

  const view = await bilibiliView(bvid, cookie);
  if (!view) {
    return {
      video: {
        platform: "bilibili",
        id: bvid,
        title: "",
        author: null,
        cover: null,
        description: null,
        duration: null,
        page_url: "https://www.bilibili.com/video/" + bvid,
        playable: false,
      },
      parts: [],
      reason: "视频不存在，或被平台限制访问",
    };
  }

  const pageUrl = "https://www.bilibili.com/video/" + bvid;
  const base: VideoInfo = {
    platform: "bilibili",
    id: bvid,
    title: view.title,
    author: view.owner?.name ?? null,
    cover: view.pic ?? null,
    description: view.desc ?? null,
    duration: view.duration ?? null,
    page_url: pageUrl,
    playable: false,
  };

  const pages = view.pages?.length ? view.pages : [{ cid: view.cid, page: 1, part: view.title, duration: view.duration }];
  const parts: VideoPart[] = [];
  // 只解析第一个分 P 的直链，多 P 视频逐个请求太慢
  const first = pages[0];
  const play = await bilibiliPlay(bvid, first.cid, cookie);
  const direct = play?.durl?.[0];
  if (direct?.url) {
    base.playable = true;
    parts.push({
      index: first.page,
      title: first.part,
      duration: first.duration ?? null,
      url: direct.url,
      size: direct.size ?? null,
      quality: qualityLabel(play?.quality),
    });
  }
  for (const page of pages.slice(1)) {
    parts.push({
      index: page.page,
      title: page.part,
      duration: page.duration ?? null,
      url: null,
      size: null,
      quality: null,
    });
  }

  return {
    video: base,
    parts,
    reason: base.playable ? undefined : "这个视频没有开放游客直链（可能是番剧、付费或充电专属）",
  };
}

/** 通用：抓页面 OpenGraph / video 标签 */
async function parseGeneric(input: string): Promise<VideoParseResult> {
  const platform = detectPlatform(input);
  let html = "";
  try {
    html = await fetchText(input, {
      headers: { accept: "text/html,application/xhtml+xml" },
      timeoutMs: 10000,
    });
  } catch {
    return {
      video: {
        platform,
        id: "",
        title: "",
        author: null,
        cover: null,
        description: null,
        duration: null,
        page_url: input,
        playable: false,
      },
      parts: [],
      reason: "页面打不开（可能需要登录，或链接已失效）",
    };
  }

  const pick = (patterns: RegExp[]): string | null => {
    for (const re of patterns) {
      const m = re.exec(html);
      if (m?.[1]) return decodeHtml(m[1]);
    }
    return null;
  };

  const title =
    pick([
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ]) ?? "";
  const videoUrl = pick([
    /<meta[^>]+property=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const cover = pick([
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const description = pick([
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const author = pick([
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
  ]);

  return {
    video: {
      platform,
      id: "",
      title,
      author,
      cover,
      description,
      duration: null,
      page_url: input,
      playable: Boolean(videoUrl),
    },
    parts: videoUrl
      ? [{ index: 1, title, duration: null, url: videoUrl, size: null, quality: null }]
      : [],
    reason: videoUrl ? undefined : "页面里没有可直接播放的地址，只能取到标题与封面",
  };
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/** 对外入口：给个链接，尽力解析 */
export async function parseVideo(input: string): Promise<VideoParseResult> {
  const platform = detectPlatform(input);
  if (platform === "bilibili" || /BV[0-9A-Za-z]{10}/.test(input)) {
    return parseBilibili(input);
  }
  return parseGeneric(input);
}
