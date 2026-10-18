// ============================================================================
// 媒体资源与视频跳转链接转换器（直接替换 host，无任何 fallback 轮询）
// 设计规范：
//   1. 图片与视频封面（cover）：直接将 pbs.twimg.com 的 host 替换为 pbs.moonchan.xyz，保留完整 path+query；
//      例如：https://pbs.moonchan.xyz/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig
//   2. 视频点击链接：前端点击视频封面时，指向 twitter-pic-go 的专属视频处理端点：
//      https://x.moonchan.xyz/api/twitter/v2/video/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/xxx.mp4?tag=12
//      后端收到请求后，直接替换 host 为 twimg.moonchan.xyz（保留完整 path+query），
//      并通过 ouo.io/qs 或 ouo.io/api 重定向到 ouo.io 广告中转页收钱，最后转到 https://twimg.moonchan.xyz/...
// ============================================================================

import {
  FIXED_IMAGE_PROXY,
  FIXED_VIDEO_PROXY,
  VIDEO_REDIRECT_ENDPOINT,
} from "./endpoints";

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";

export { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY, VIDEO_REDIRECT_ENDPOINT };

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

// 构造点击视频封面时访问的后端专属视频端点 URL：
// https://x.moonchan.xyz/api/twitter/v2/video/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/xxx.mp4?tag=12
// 后端收到后会将 host 替换为 twimg.moonchan.xyz 并通过 ouo.io 重定向到广告中转页面收钱。
export const buildOuoVideoUrl = (
  rawVideoUrl: string,
  prebuiltEndpointUrl?: string | null
): string => {
  const baseEndpoint = VIDEO_REDIRECT_ENDPOINT.replace(/\/+$/, "");
  const prebuilt = (prebuiltEndpointUrl || "").trim();
  if (prebuilt) {
    if (prebuilt.startsWith("http://") || prebuilt.startsWith("https://")) {
      return prebuilt;
    }
    if (prebuilt.startsWith("/api/twitter/v2/video/")) {
      const suffix = prebuilt.slice("/api/twitter/v2/video".length);
      return `${baseEndpoint}${suffix}`;
    }
  }
  if (!rawVideoUrl) return "";
  const pathAndQuery = extractVideoPath(rawVideoUrl);
  if (!pathAndQuery) return "";
  return `${baseEndpoint}${pathAndQuery.startsWith("/") ? pathAndQuery : "/" + pathAndQuery}`;
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
