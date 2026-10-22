// ============================================================================
// 媒体资源转换器（直接替换 host，无任何 fallback 轮询）
// 设计规范：
//   1. 图片与视频封面（cover）：直接将 pbs.twimg.com 的 host 替换为 pbs.moonchan.xyz，保留完整 path+query；
//      例如：https://pbs.moonchan.xyz/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig
//   2. 视频点击链接（2026-10-23 起无广告、无 302 中转）：直接指向
//      https://twimg.moonchan.xyz/ext_tw_video/.../<file>.mp4?<query>（host 直接替换 video.twimg.com），
//      链接即最终播放地址，中间不再经过 /api/twitter/v2/video 端点，也不经 ouo.io 广告页。
// ============================================================================

import { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY } from "./endpoints";

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";

export { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY };

// 提取 media 相对路径与查询参数（保留完整 /path?query#hash）
export const extractMediaPath = (url: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url, `https://${IMAGE_ORIGINAL_HOST}`);
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "");
  }
};

// 提取 video 相对路径与查询参数（保留完整 /path?query#hash）
export const extractVideoPath = (url: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url, `https://${VIDEO_ORIGINAL_HOST}`);
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "");
  }
};

// 图片与视频封面（cover）：直接替换 host 为 https://pbs.moonchan.xyz，保留完整 path+query
export const imageProxyUrl = (url: string): string => {
  if (!url) return "";
  return FIXED_IMAGE_PROXY + extractMediaPath(url);
};

export const overrideImageProxy = (url: string): string => imageProxyUrl(url);

// 视频代理地址（直接替换 host 为 https://twimg.moonchan.xyz，保留完整 path+query）
export const overrideVideoProxy = (url: string): string => {
  if (!url) return "";
  return FIXED_VIDEO_PROXY + extractVideoPath(url);
};

// 解析视频封面图地址：使用 gallery_dl 添加的 cover 字段并直接替换 host 至 pbs.moonchan.xyz
export const resolveVideoCoverUrl = (
  cover?: string | null,
  fallbackUrl?: string | null
): string => {
  const rawCover = (cover || "").trim();
  if (rawCover) {
    return imageProxyUrl(rawCover);
  }
  const rawFallback = (fallbackUrl || "").trim();
  if (
    rawFallback &&
    !rawFallback.includes(".mp4") &&
    !rawFallback.includes("video.twimg.com")
  ) {
    return imageProxyUrl(rawFallback);
  }
  return "";
};

// 构造点击视频封面时的最终播放地址（2026-10-23 起无广告、无 302 中转）：
// 若后端已返回绝对地址（新版 V2 API 的 ouo_url 即直连 https://twimg.moonchan.xyz/...），原样采用；
// 否则由原始 video.twimg.com 地址直接拼直链 https://twimg.moonchan.xyz/<path>?<query>。
// 注意：不会再拼 /api/twitter/v2/video 端点（点击该端点会产生一次 302 跳转，已弃用）。
export const buildVideoDirectUrl = (
  rawVideoUrl: string,
  prebuiltDirectUrl?: string | null
): string => {
  const prebuilt = (prebuiltDirectUrl || "").trim();
  if (prebuilt.startsWith("http://") || prebuilt.startsWith("https://")) {
    return prebuilt;
  }
  return overrideVideoProxy(rawVideoUrl);
};

// 统一入口
export const overrideProxyUrl = (
  url: string,
  type?: string,
  cover?: string
): string => {
  if (type === "video" || type === "animated_gif" || type === "article:video") {
    return resolveVideoCoverUrl(cover, url);
  }
  return overrideImageProxy(url);
};
