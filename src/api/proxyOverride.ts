// 26-09-08: 统一下载与展示的代理替换逻辑。
// 之前 App.jsx 的 getProxiedUrl 和 Media.tsx 的两个 override 是三份独立实现:
//   - App.jsx 用 URL 对象改 host/port, Media.tsx 用字符串 replace;
//   - 用户代理带端口/路径/尾斜杠时, 下载和展示会拼出不同的 URL。
// 现在两边都 import 这里的 overrideImageProxy / overrideVideoProxy, 单一实现。

import { FIXED_IMAGE_PROXY } from "./endpoints";

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";

// moonchan 系代理只在 CN 有效; 非CN 用户配了这个就弹回原站。
// 用 hostname 判断而不是完整 URL, 兼容用户输入带端口/路径/斜杠等变体。
export const isMoonchanProxy = (proxy?: string | null): boolean => {
  try {
    const host = new URL(proxy || "").hostname;
    return (
      host === "twimg.moonchan.xyz" ||
      host === "twimg.l.moonchan.xyz" ||
      host === "proxy.moonchan.xyz" ||
      host === "pbs.moonchan.xyz"
    );
  } catch {
    return false;
  }
};

// 非CN判断: CN / 空 / 脏值(非字符串) 都按 CN 处理(走代理), 只有明确非CN才弹回。
// 修复: Safari 隐私模式下 localStorage.getItem 会抛 SecurityError;
// 包 try/catch, 失败时按 CN 处理 (返回 false = 未禁用代理), 保持安全默认。
export const isNonCN = (): boolean => {
  let country: string | null;
  try {
    country = localStorage.getItem("country");
  } catch {
    // localStorage 被禁 (Safari 隐私模式 / 第三方 cookie 阻断)
    // 按 CN 处理, 走代理 —— 对墙内用户是正确选择, 对墙外用户最多多绕一次代理,
    // 不会出现 404 / 显示失败这种更糟的结果。
    return false;
  }
  return !(country === "CN" || country === "" || typeof country !== "string");
};

// 去掉尾斜杠, 避免 "https://proxy.com/" + "/media/xxx" 拼出双斜杠。
const normalizeProxy = (proxy: string): string =>
  proxy.replace(/\/+$/, "");

// 图片: pbs.twimg.com -> 固定源 pbs.moonchan.xyz
// 26-09-11: 图片一律走 pbs.moonchan.xyz —— 不看 localStorage 里的 image-proxy-v5。
// 旧版本的自动探测会把图片源写成 ech-proxy (twimg.l.moonchan.xyz:8443), 用户本地已存的
// 脏值(以及旧入口 twimg.moonchan.xyz)在这里被统一纠正, 不用清缓存。
// 唯一的例外是非CN: 完全不替换, 直接走原站 (moonchan 只在 CN 有效)。
export const overrideImageProxy = (url: string): string => {
  if (!url) return url;
  if (isNonCN()) return url;

  return url.replace(`https://${IMAGE_ORIGINAL_HOST}`, FIXED_IMAGE_PROXY);
};

// 视频: video.twimg.com -> videoProxy; proxy.moonchan.xyz 需要额外 proxy_host 参数
export const overrideVideoProxy = (
  url: string,
  videoProxy: string | null | undefined,
): string => {
  if (!url) return url;
  // 26-09-08: 与图片一致 —— 非CN 一律不替换。
  if (isNonCN()) return url;
  if (typeof videoProxy !== "string" || videoProxy === "") return url;

  const proxy = normalizeProxy(videoProxy);
  try {
    const proxyHost = new URL(proxy).hostname;
    const proxied = url.replace(`https://${VIDEO_ORIGINAL_HOST}`, proxy);
    if (proxyHost === "proxy.moonchan.xyz") {
      const parsed = new URL(proxied);
      parsed.searchParams.set("proxy_host", VIDEO_ORIGINAL_HOST);
      return parsed.toString();
    }
    return proxied;
  } catch {
    return url;
  }
};

// 统一入口: 按 media type 分派, 供下载与展示共用。
export const overrideProxyUrl = (
  url: string,
  type: string | undefined,
  videoProxy: string | null | undefined,
): string => {
  if (type === "video" || type === "animated_gif") {
    return overrideVideoProxy(url, videoProxy);
  }
  return overrideImageProxy(url);
};
