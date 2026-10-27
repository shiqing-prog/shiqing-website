/**
 * 纯 JS 实现的 MD5（RFC 1321）。
 *
 * 为什么需要它：浏览器 WebCrypto 只提供 SHA-1/SHA-256 之类的摘要，没有 MD5；
 * 但 MD5 在「校验老文件」「对接只认 MD5 的第三方接口」「算各语言实现里的
 * 文件指纹」这些场景仍然天天被用到，所以工具页内置一份同步实现比假装支持要好。
 *
 * 只用于工具页的本地计算，不参与任何安全校验（MD5 早已不适合做密码学用途）。
 */

/** 每轮的左移位数 */
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** T[i] = floor(abs(sin(i + 1)) * 2^32) */
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
}

const encoder = new TextEncoder();

/** 计算 MD5，返回 32 位小写十六进制字符串 */
export function md5(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  const len = bytes.length;

  // 补位：0x80 之后补 0，末尾 8 字节写原始比特长度（小端）
  const total = (((len + 8) >>> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  const bits = len * 8;
  view.setUint32(total - 8, bits >>> 0, true);
  view.setUint32(total - 4, Math.floor(bits / 4294967296) >>> 0, true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(off + i * 4, true);

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // MD5 的四个状态字按小端序输出
  return [a0, b0, c0, d0]
    .map((h) => {
      const hex = h.toString(16).padStart(8, "0");
      return (hex.match(/../g) ?? []).reverse().join("");
    })
    .join("");
}
