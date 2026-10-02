// 26-09-08: 统一下载与展示的代理替换逻辑。
// 之前 App.jsx 的 getProxiedUrl 和 Media.tsx 的两个 override 是三份独立实现:
//   - App.jsx 用 URL 对象改 host/port, Media.tsx 用字符串 replace;
//   - 用户代理带端口/路径/尾斜杠时, 下载和展示会拼出不同的 URL。
// 现在两边都 import 这里的 overrideImageProxy / overrideVideoProxy, 单一实现。

import { FIXED_IMAGE_PROXY, IMAGE_BASES, FIXED_VIDEO_PROXY, VIDEO_BASES } from "./endpoints";

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";

export { FIXED_IMAGE_PROXY, IMAGE_BASES, FIXED_VIDEO_PROXY, VIDEO_BASES };

// 提取 media 相对路径与查询参数
export const extractMediaPath = (url: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url, `https://${IMAGE_ORIGINAL_HOST}`);
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "");
  }
};

// 提取 video 相对路径与查询参数
export const extractVideoPath = (url: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url, `https://${VIDEO_ORIGINAL_HOST}`);
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "");
  }
};

// 所有的media（图片: pbs.twimg.com）都按顺序降级尝试：twimg.l.moonchan.xyz:8443 -> pbs.moonchan.xyz -> video-cf.twimg.com（无referer）
export const getImageCandidates = (url: string): string[] => {
  if (!url) return [];
  const path = extractMediaPath(url);
  return IMAGE_BASES.map((b) => b + path);
};

// 所有的media（视频: video.twimg.com）都按顺序降级尝试：twimg.l.moonchan.xyz:8443 -> pbs.moonchan.xyz（视频 302 正常重定向） -> video-cf.twimg.com（无referer）
export const getVideoCandidates = (url: string): string[] => {
  if (!url) return [];
  const path = extractVideoPath(url);
  return VIDEO_BASES.map((b) => b + path);
};

// moonchan 系代理只在 CN 有效; 非CN 用户配了这个就弹回原站。
// 用 hostname 判断而不是完整 URL, 兼容用户输入带端口/路径/斜杠等变体。
export const isMoonchanProxy = (proxy?: string | null): boolean => {
  try {
    const host = new URL(proxy || "").hostname;
    return (
      host === "twimg.moonchan.xyz" ||
      host === "twimg.l.moonchan.xyz" ||
      host === "proxy.moonchan.xyz" ||
      host === "video-cf.twimg.com" ||
      host === "pbs.moonchan.xyz"
    );
  } catch {
    return false;
  }
};

// 去掉 ipinfo 检查，完全按候选源顺序尝试
export const isNonCN = (): boolean => false;

// 图片: pbs.twimg.com -> 固定首选源 twimg.l.moonchan.xyz:8443，降级到 pbs.moonchan.xyz -> video-cf.twimg.com（无referer）
export const overrideImageProxy = (url: string): string => {
  if (!url) return url;
  const candidates = getImageCandidates(url);
  return candidates[0] || url;
};

// 视频: video.twimg.com -> 固定首选源 twimg.l.moonchan.xyz:8443，降级到 pbs.moonchan.xyz（302 正常） -> video-cf.twimg.com（无referer）
export const overrideVideoProxy = (
  url: string,
  videoProxy?: string | null | undefined,
): string => {
  if (!url) return url;
  if (videoProxy === "peerjs") return url;
  const candidates = getVideoCandidates(url);
  return candidates[0] || url;
};

// 统一入口: 按 media type 分派, 供下载与展示共用。
export const overrideProxyUrl = (
  url: string,
  type: string | undefined,
  videoProxy?: string | null | undefined,
): string => {
  if (type === "video" || type === "animated_gif") {
    return overrideVideoProxy(url, videoProxy);
  }
  return overrideImageProxy(url);
};
