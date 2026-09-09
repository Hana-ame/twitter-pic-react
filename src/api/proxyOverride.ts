// 26-09-08: 统一下载与展示的代理替换逻辑。
// 之前 App.jsx 的 getProxiedUrl 和 Media.tsx 的两个 override 是三份独立实现:
//   - App.jsx 用 URL 对象改 host/port, Media.tsx 用字符串 replace;
//   - 用户代理带端口/路径/尾斜杠时, 下载和展示会拼出不同的 URL。
// 现在两边都 import 这里的 overrideImageProxy / overrideVideoProxy, 单一实现。

export const IMAGE_ORIGINAL_HOST = "pbs.twimg.com";
export const VIDEO_ORIGINAL_HOST = "video.twimg.com";
// 用户代理是 twimg.moonchan.xyz 时, 实际要打到 pbs.moonchan.xyz
const MOONCHAN_IMAGE_REDIRECT = "pbs.moonchan.xyz";

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
export const isNonCN = (): boolean => {
  const country = localStorage.getItem("country");
  return !(country === "CN" || country === "" || typeof country !== "string");
};

// 去掉尾斜杠, 避免 "https://proxy.com/" + "/media/xxx" 拼出双斜杠。
const normalizeProxy = (proxy: string): string =>
  proxy.replace(/\/+$/, "");

// 图片: pbs.twimg.com -> imageProxy
export const overrideImageProxy = (
  url: string,
  imageProxy: string | null | undefined,
): string => {
  if (!url) return url;
  // 26-09-08: 非CN一律不替换 —— 无论代理是 moonchan 还是自定义第三方, 都直接走原站。
  // CN / 空 / 脏值 都按 CN 处理(走代理), 只有明确非CN才跳过 override。
  if (isNonCN()) return url;
  if (typeof imageProxy !== "string" || imageProxy === "") return url;

  const proxy = normalizeProxy(imageProxy);
  try {
    const proxyHost = new URL(proxy).hostname;
    // moonchan 图片入口 twimg.moonchan.xyz 需要重定向到 pbs.moonchan.xyz
    if (proxyHost === "twimg.moonchan.xyz") {
      return url.replace(
        `https://${IMAGE_ORIGINAL_HOST}`,
        `https://${MOONCHAN_IMAGE_REDIRECT}`,
      );
    }
    return url.replace(`https://${IMAGE_ORIGINAL_HOST}`, proxy);
  } catch {
    return url;
  }
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
  imageProxy: string | null | undefined,
  videoProxy: string | null | undefined,
): string => {
  if (type === "video" || type === "animated_gif") {
    return overrideVideoProxy(url, videoProxy);
  }
  return overrideImageProxy(url, imageProxy);
};
