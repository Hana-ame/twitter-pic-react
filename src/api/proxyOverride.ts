// 26-09-08: 统一下载与展示的代理替换逻辑。
// 之前 App.jsx 的 getProxiedUrl 和 Media.tsx 的两个 override 是三份独立实现:
//   - App.jsx 用 URL 对象改 host/port, Media.tsx 用字符串 replace;
//   - 用户代理带端口/路径/尾斜杠时, 下载和展示会拼出不同的 URL。
// 现在两边都 import 这里的 overrideImageProxy / overrideVideoProxy, 单一实现。

import { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY, VIDEO_BASES } from "./endpoints";

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";

export { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY, VIDEO_BASES };

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

// 26-10-08: 图片只有一个源 FIXED_IMAGE_PROXY (https://pbs.moonchan.xyz), 没有 fallback / 候选列表。
// 之前这里返回 IMAGE_BASES 映射出的候选数组 + 各调用方的 onError 换源, 现在收敛成返回单个 URL。
// 保留 host 无关的取路径逻辑 (extractMediaPath): 输入可能是 pbs.twimg.com 原链, 也可能是旧版本
// 已经替换过的 moonchan 链, 两种都能正确提取 path+query。
export const imageProxyUrl = (url: string): string => {
  if (!url) return "";
  return FIXED_IMAGE_PROXY + extractMediaPath(url);
};

// 去掉尾斜杠, 避免 "https://proxy.com/" + "/media/xxx" 拼出双斜杠。
const normalizeBase = (proxy: string): string => proxy.replace(/\/+$/, "");

// 视频 URL 候选列表。
// 26-10: 选什么就是什么 —— 用户在配置页选了具体源 (ech-proxy / video-cf / 自定义),
// 就只返回那一个源, 不再自动降级到别的源 (自动档已删除, 用户选源不被任何代码改写)。
// 未选择 (空串 / undefined) 时才保留旧的全量降级链:
// twimg.l.moonchan.xyz:8443 -> pbs.moonchan.xyz（视频 302 正常重定向） -> video-cf.twimg.com（无referer）
export const getVideoCandidates = (
  url: string,
  videoProxy?: string | null,
): string[] => {
  if (!url) return [];
  const path = extractVideoPath(url);
  if (typeof videoProxy === "string" && videoProxy !== "" && videoProxy !== "peerjs") {
    return [normalizeBase(videoProxy) + path];
  }
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

// 图片: pbs.twimg.com -> 固定源 https://pbs.moonchan.xyz, 没有 fallback。
export const overrideImageProxy = (url: string): string => imageProxyUrl(url);

// 视频: 已选源 → 只用该源 (选什么就是什么); 未选 → 固定首选源 ech-proxy, 降级链见 VIDEO_BASES。
// 26-10-08: 视频不能收敛成单一 pbs.moonchan.xyz —— 它只回 302 到 twimg.moonchan.xyz,
// 后者当前是 Cloudflare 429 (error 1027), 见 endpoints.ts 的 VIDEO_BASES 注释。
export const overrideVideoProxy = (
  url: string,
  videoProxy?: string | null | undefined,
): string => {
  if (!url) return url;
  if (videoProxy === "peerjs") return url;
  const candidates = getVideoCandidates(url, videoProxy);
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
