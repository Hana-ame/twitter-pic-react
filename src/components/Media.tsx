import React from "react";

export type MediaProps = {
  url: string;
  type: string;
  cover?: string;
  ouoUrl?: string;
};

// 将外部输入做 HTML 实体转义, 防止 srcDoc 模板被 URL 注入 (iframe 沙箱逃逸 / 属性注入)
const escapeHtml = (s: string): string => {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

// 原版源头地址：不做任何代理 host 改写。
// 图片一律 pbs.twimg.com；视频一律 video.twimg.com（原 host 已是 video.twimg.com 时原样保留）。
const originalPhotoUrl = (url: string): string => {
  if (!url) return "";
  return url.replace("https://pbs.moonchan.xyz", "https://pbs.twimg.com");
};

const originalVideoUrl = (url: string): string => {
  if (!url) return "";
  let u = url
    .replace("https://twimg.moonchan.xyz", "https://video.twimg.com")
    .replace("https://pbs.moonchan.xyz", "https://pbs.twimg.com");
  // 视频一律落在 video.twimg.com（少数条目视频 url 写成 pbs.twimg.com 的情况也纠正）
  u = u.replace("https://pbs.twimg.com", "https://video.twimg.com");
  return u;
};

// cover 也回原版源头：pbs.twimg.com / video.twimg.com 上的缩略图
const originalCoverUrl = (cover?: string | null, fallbackUrl?: string | null): string => {
  const raw = (cover || "").trim();
  if (raw) return originalPhotoUrl(raw);
  const fb = (fallbackUrl || "").trim();
  if (fb && !fb.includes(".mp4")) return originalPhotoUrl(fb);
  return "";
};

/**
 * 视频全套 iframe：
 * 1. iframe srcDoc 内 <meta name="referrer" content="no-referrer"> —— 图片/视频全都不发 Referer，
 *    这是绕过 twimg 防盗链的核心；
 * 2. 全部用原版源头：video.twimg.com（视频）/ pbs.twimg.com（封面 poster），不做任何代理改写；
 * 3. cover 作为 iframe 内 <video poster>；
 * 4. sandbox 不含 allow-same-origin（与 allow-scripts 同用等于没有沙箱）；
 * 5. 无 autoplay，保留 controls + poster，默认显示封面不自动播放；
 * 6. 高度由 CSS aspect-ratio 撑开 —— 必须是斜杠写法 "16/9"，写成 "16:9" 是无效值，
 *    浏览器会忽略该属性导致容器高度塌成 0（原版 68dc740 就是 "16/9"）。
 */
const VideoIframe: React.FC<{
  url: string;
  cover?: string;
  ouoUrl?: string;
}> = ({ url, cover }) => {
  const target = originalVideoUrl(url);
  const posterUrl = originalCoverUrl(cover, url);
  const safeUrl = escapeHtml(target);
  const safePoster = escapeHtml(posterUrl);

  const iframeHtml = `<!DOCTYPE html>
<html>
<head>
    <meta name="referrer" content="no-referrer">
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: black; }
        video { display: block; width: 100%; height: 100%; object-fit: contain; }
    </style>
</head>
<body>
    <video
        id="v"
        controls
        playsinline
        preload="metadata"
        poster="${safePoster}"
    >
        <source src="${safeUrl}" type="video/mp4">
    </video>
</body>
</html>`;

  return (
    <div className="flex justify-center items-start my-3">
      <div
        className="relative w-full max-w-4xl rounded-xl overflow-hidden bg-black shadow-md"
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          title="video-player"
          srcDoc={iframeHtml}
          className="w-full h-full border-none"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-presentation"
          allowFullScreen
        />
      </div>
    </div>
  );
};

/**
 * 图片：原版源头 pbs.twimg.com，不发 Referer。
 */
const PhotoOriginal: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
  const imageUrl = originalPhotoUrl(url);

  if (!imageUrl) return null;

  return (
    <div className="flex justify-center items-start max-h-screen">
      <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden bg-gray-50">
        <img
          src={imageUrl}
          alt={alt || url}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="mx-auto max-h-screen object-contain"
        />
      </div>
    </div>
  );
};

const Media: React.FC<MediaProps> = ({ url, type, cover, ouoUrl }) => {
  const cleanType = (type || "").toLowerCase();

  if (
    cleanType === "video" ||
    cleanType === "animated_gif" ||
    cleanType === "article:video"
  ) {
    return <VideoIframe url={url} cover={cover} ouoUrl={ouoUrl} />;
  }

  if (
    cleanType === "photo" ||
    cleanType === "card" ||
    cleanType === "article:cover" ||
    cleanType === "article:image"
  ) {
    return <PhotoOriginal url={url} alt={url} />;
  }

  return null;
};

export default Media;
