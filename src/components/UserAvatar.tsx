/**
 * 通用用户头像：有 avatar（文件库文件 id）显示图片，否则昵称首字渐变圆
 * 文件基址与 wrangler vars FILE_PUBLIC_BASE 一致
 */
export const FILE_BASE = "https://files.shiqing.site";

export default function UserAvatar({
  nickname,
  avatar,
  size = 36,
  className = "",
}: {
  nickname: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${FILE_BASE}/download/${avatar}`}
        alt={nickname}
        width={size}
        height={size}
        loading="lazy"
        className={`inline-block shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(size * 0.42, 12),
        background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
      }}
    >
      {nickname.slice(0, 1)}
    </span>
  );
}
