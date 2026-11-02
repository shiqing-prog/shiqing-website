import { DESKTOP_UA, fetchJson, fetchText } from "./http";

/**
 * 音乐解析：网易云 / QQ 音乐 / 酷狗。
 *
 * 三家平台各有一套自己的门道，这里统一成两个动作：
 *   search(platform, keyword, limit) -> Track[]
 *   url(platform, id, quality)       -> PlayUrl
 *
 * 拿不到直链不报错，而是返回 playable: false + 原因——版权曲本来就该这样，
 * 调用方可以据此决定要不要换源。
 */

export type MusicPlatform = "netease" | "tencent" | "kugou";

export const MUSIC_PLATFORMS: MusicPlatform[] = ["netease", "tencent", "kugou"];

export interface Track {
  platform: MusicPlatform;
  id: string;
  name: string;
  artists: string[];
  album: string;
  /** 秒 */
  duration: number | null;
  cover: string | null;
  /** 能否拿到直链（已知则填，未知为 null） */
  playable: boolean | null;
}

export interface PlayUrl {
  platform: MusicPlatform;
  id: string;
  playable: boolean;
  url: string | null;
  /** 码率 bps */
  bitrate: number | null;
  /** 字节 */
  size: number | null;
  format: string | null;
  /** 直链有效期（秒），0 表示未知 */
  expires_in: number;
  reason?: string;
}

function clampLimit(limit: number, max = 20): number {
  if (!Number.isFinite(limit) || limit <= 0) return 8;
  return Math.min(Math.floor(limit), max);
}

/* ------------------------------------------------------------------ */
/* 网易云                                                              */
/* ------------------------------------------------------------------ */

const GD_BASE = "https://music-api.gdstudio.xyz/api.php";

interface GdTrack {
  id?: string;
  name?: string;
  artist?: string[];
  album?: string;
  pic_id?: string;
}

/** 网易云曲目详情（批量补封面，一次请求） */
async function neteaseDetail(ids: string[]): Promise<Map<string, { cover: string | null; duration: number | null }>> {
  const out = new Map<string, { cover: string | null; duration: number | null }>();
  if (!ids.length) return out;
  // 方括号必须转义：Workers 的 fetch 遇到未编码的 [ ] 会直接抛错
  const list = "%5B" + ids.map((id) => encodeURIComponent(id)).join(",") + "%5D";
  try {
    const data = await fetchJson<{
      songs?: { id: number; duration?: number; dt?: number; picUrl?: string; al?: { picUrl?: string } }[];
    }>("https://music.163.com/api/song/detail/?ids=" + list, {
      headers: { referer: "https://music.163.com" },
      timeoutMs: 6000,
    });
    for (const song of data.songs ?? []) {
      // 这个接口把 picUrl 放在顶层、时长叫 duration（毫秒）；别照新版 song/detail 的 al/dt 去读
      const ms = song.duration ?? song.dt ?? 0;
      out.set(String(song.id), {
        cover: song.picUrl ?? song.al?.picUrl ?? null,
        duration: ms > 0 ? Math.round(ms / 1000) : null,
      });
    }
  } catch (error) {
    console.error("[neteaseDetail]", String(error));
  }
  return out;
}

/** 用图集接口单独补一张封面（详情接口拿不到时的兜底） */
async function gdPic(picId: string): Promise<string | null> {
  try {
    const data = await fetchJson<{ url?: string }>(
      GD_BASE + "?types=pic&source=netease&id=" + encodeURIComponent(picId) + "&size=300",
      { timeoutMs: 6000 }
    );
    return data.url ?? null;
  } catch (error) {
    console.error("[gdPic]", picId, String(error));
    return null;
  }
}

async function neteaseSearch(keyword: string, limit: number): Promise<Track[]> {
  const url =
    GD_BASE +
    "?types=search&source=netease&name=" +
    encodeURIComponent(keyword) +
    "&count=" +
    limit +
    "&pages=1";
  const list = await fetchJson<GdTrack[]>(url, { timeoutMs: 12000 });
  if (!Array.isArray(list)) return [];
  const detail = await neteaseDetail(list.map((t) => String(t.id ?? "")).filter(Boolean));
  // 详情接口有时拿不到（风控/频率），缺封面的再逐首问一次图集接口
  const fallback = new Map<string, string>();
  await Promise.all(
    list
      .filter((t) => t.pic_id && !detail.get(String(t.id ?? ""))?.cover)
      .map(async (t) => {
        const id = String(t.id ?? "");
        const url = await gdPic(String(t.pic_id));
        if (url) fallback.set(id, url);
      })
  );
  return list.map((t) => {
    const id = String(t.id ?? "");
    const meta = detail.get(id);
    return {
      platform: "netease" as const,
      id,
      name: t.name ?? "",
      artists: Array.isArray(t.artist) ? t.artist : [],
      album: t.album ?? "",
      duration: meta?.duration ?? null,
      cover: meta?.cover ?? fallback.get(id) ?? null,
      playable: null,
    };
  });
}

async function neteaseUrl(id: string, quality: string): Promise<PlayUrl> {
  const br = quality === "128" ? 128000 : quality === "192" ? 192000 : 320000;
  const url = GD_BASE + "?types=url&source=netease&id=" + encodeURIComponent(id) + "&br=" + br / 1000;
  const data = await fetchJson<{ url?: string; br?: number; size?: number }>(url, { timeoutMs: 12000 });
  if (!data.url) {
    return {
      platform: "netease",
      id,
      playable: false,
      url: null,
      bitrate: null,
      size: null,
      format: null,
      expires_in: 0,
      reason: "该曲目没有可用的公开播放地址（可能需要会员）",
    };
  }
  return {
    platform: "netease",
    id,
    playable: true,
    url: data.url,
    bitrate: data.br ?? null,
    size: data.size ?? null,
    format: data.url.includes(".flac") ? "flac" : "mp3",
    expires_in: 7200,
  };
}

/* ------------------------------------------------------------------ */
/* QQ 音乐                                                             */
/* ------------------------------------------------------------------ */

interface QqSong {
  songmid?: string;
  songname?: string;
  albumname?: string;
  albummid?: string;
  interval?: number;
  singer?: { name?: string }[];
}

async function tencentSearch(keyword: string, limit: number): Promise<Track[]> {
  const url =
    "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?format=json&p=1&n=" +
    limit +
    "&w=" +
    encodeURIComponent(keyword);
  const data = await fetchJson<{ data?: { song?: { list?: QqSong[] } } }>(url, {
    headers: { referer: "https://y.qq.com/" },
    timeoutMs: 10000,
  });
  const list = data.data?.song?.list ?? [];
  return list.map((s) => ({
    platform: "tencent" as const,
    id: String(s.songmid ?? ""),
    name: s.songname ?? "",
    artists: (s.singer ?? []).map((x) => x.name ?? "").filter(Boolean),
    album: s.albumname ?? "",
    duration: s.interval ?? null,
    cover: s.albummid
      ? "https://y.gtimg.cn/music/photo_new/T002R300x300M000" + s.albummid + ".jpg"
      : null,
    playable: null,
  }));
}

interface VkeyInfo {
  purl?: string;
  filename?: string;
}

async function tencentUrl(id: string): Promise<PlayUrl> {
  const body = JSON.stringify({
    req_0: {
      module: "vkey.GetVkeyServer",
      method: "CgiGetVkey",
      param: {
        guid: "10000",
        songmid: [id],
        songtype: [0],
        uin: "0",
        loginflag: 1,
        platform: "20",
      },
    },
    comm: { uin: "0", format: "json", ct: 24, cv: 0 },
  });
  const data = await fetchJson<{
    req_0?: { data?: { sip?: string[]; midurlinfo?: VkeyInfo[] } };
  }>("https://u.y.qq.com/cgi-bin/musicu.fcg", {
    method: "POST",
    headers: { "content-type": "application/json", referer: "https://y.qq.com/" },
    body,
    timeoutMs: 10000,
  });
  const sip = data.req_0?.data?.sip?.[0] ?? "";
  const info = data.req_0?.data?.midurlinfo?.[0];
  const purl = info?.purl ?? "";
  if (!purl) {
    return {
      platform: "tencent",
      id,
      playable: false,
      url: null,
      bitrate: null,
      size: null,
      format: null,
      expires_in: 0,
      reason: "该曲目需要会员，没有公开播放地址",
    };
  }
  const filename = info?.filename ?? "";
  return {
    platform: "tencent",
    id,
    playable: true,
    url: sip + purl,
    bitrate: filename.startsWith("M800") ? 320000 : filename.startsWith("M500") ? 128000 : null,
    size: null,
    format: purl.endsWith(".flac") ? "flac" : "m4a",
    expires_in: 3600,
  };
}

/* ------------------------------------------------------------------ */
/* 酷狗                                                                */
/* ------------------------------------------------------------------ */

interface KgSong {
  FileHash?: string;
  SongName?: string;
  SingerName?: string;
  AlbumName?: string;
  Duration?: number;
  Image?: string;
}

async function kugouSearch(keyword: string, limit: number): Promise<Track[]> {
  const url =
    "https://songsearch.kugou.com/song_search_v2?keyword=" +
    encodeURIComponent(keyword) +
    "&page=1&pagesize=" +
    limit +
    "&platform=WebFilter&userid=0&clientver=2000&iscorrection=1&privilege_filter=0&filter=10";
  const data = await fetchJson<{ data?: { lists?: KgSong[] } }>(url, { timeoutMs: 10000 });
  const list = data.data?.lists ?? [];
  return list.map((s) => ({
    platform: "kugou" as const,
    id: String(s.FileHash ?? ""),
    name: s.SongName ?? "",
    artists: (s.SingerName ?? "").split(/[、&]/).map((x) => x.trim()).filter(Boolean),
    album: s.AlbumName ?? "",
    duration: s.Duration ?? null,
    cover: s.Image ? s.Image.replace("{size}", "400") : null,
    playable: null,
  }));
}

/* ------------------------------------------------------------------ */
/* 对外入口                                                            */
/* ------------------------------------------------------------------ */

export async function searchMusic(
  platform: MusicPlatform,
  keyword: string,
  limit: number
): Promise<Track[]> {
  const n = clampLimit(limit);
  if (platform === "netease") return neteaseSearch(keyword, n);
  if (platform === "tencent") return tencentSearch(keyword, n);
  return kugouSearch(keyword, n);
}

export async function musicUrl(platform: MusicPlatform, id: string, quality = "320"): Promise<PlayUrl> {
  if (platform === "netease") return neteaseUrl(id, quality);
  if (platform === "tencent") return tencentUrl(id);
  return {
    platform: "kugou",
    id,
    playable: false,
    url: null,
    bitrate: null,
    size: null,
    format: null,
    expires_in: 0,
    reason: "酷狗暂时只开放搜索，直链需要平台签名，后续版本再补",
  };
}

/** 判断字符串像不像平台 id（防止有人往 search 里塞奇怪的东西） */
export function isPlatformId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** 给错误信息用 */
export function platformLabel(platform: MusicPlatform): string {
  return platform === "netease" ? "网易云音乐" : platform === "tencent" ? "QQ 音乐" : "酷狗音乐";
}

export { DESKTOP_UA, fetchText };
