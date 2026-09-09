// 26-09-08: moonchan 备份 CDN 探测。
// 探测目标 https://twimg.l.moonchan.xyz/favicon.ico 返回 200 时,
// 把 image-proxy-v4 和 video-proxy-v4 都切到 https://twimg.l.moonchan.xyz,
// 让所有图片源和视频源统一走这个健康节点。
// 探测不到 (超时 / 非 2xx / 抛错) 就什么都不改, 保持用户当前配置。
// 26-09-08: 非CN 一律不探测(moonchan 只在 CN 有效, 探测本身也走外网被墙)。

import { isNonCN } from "./proxyOverride";

export const MOONCHAN_PROBE_URL = "https://twimg.l.moonchan.xyz/favicon.ico";
export const MOONCHAN_PROBE_TARGET = "https://twimg.l.moonchan.xyz";

export const IMAGE_PROXY_KEY = "image-proxy-v4";
export const VIDEO_PROXY_KEY = "video-proxy-v4";
// 用于节流: 同一时间窗内不重复探测, 避免多次挂载时重复发请求。
const PROBE_TS_KEY = "moonchan-probe-ts";
const PROBE_TS_TTL_MS = 5 * 60 * 1000; // 5 分钟

/**
 * 探测一个 URL 是否健康 (返回 2xx)。
 * 带超时, 超时或非 2xx 都返回 false。不依赖 CORS 头 —— 只要能拿到状态码就视为可达。
 */
export async function isReachable(
  url: string,
  timeoutMs = 5000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      // 只要 2xx, 不需要读 body; mode 保持默认让 CDN 决定是否放行跨域。
    });
    return res.ok; // 200-299 都算健康
  } catch {
    // 超时 / CORS 拦截 / 网络错误都走这里, 视为不可达。
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 探测 MOONCHAN_PROBE_URL; 若健康 (200), 把图片源和视频源都切到 MOONCHAN_PROBE_TARGET。
 *
 * - 非CN: 直接跳过, 不发请求(moonchan 只在 CN 有效, 非CN 走外网探测本身也会被墙)。
 * - 节流: 距离上次探测小于 PROBE_TS_TTL_MS 直接返回 false, 不发请求。
 * - 幂等: 当前 image/video 已经等于 probe target 时, setImage/setVideo 是 no-op
 *        (值一样, 触发同一份 useLocalStorage 的 setValue, 结果等价于不切)。
 * - 失败静默: 探测不可达不写任何东西, 让用户保持原配置。
 *
 * @returns 本次是否实际执行了探测并做了切换 (节流 / 非CN / 不可达 都返回 false)。
 */
export async function runMoonchanProbe(
  setImage: (v: string) => void,
  setVideo: (v: string) => void,
  timeoutMs = 5000,
): Promise<boolean> {
  // 26-09-08: 非CN 不探测 —— 与 override 侧保持一致的"非CN 不做任何代理切换"策略。
  if (isNonCN()) return false;

  // 节流: 时间戳在 localStorage 里, 多标签页共享。
  const lastTs = Number(localStorage.getItem(PROBE_TS_KEY) || 0);
  if (Date.now() - lastTs < PROBE_TS_TTL_MS) {
    return false;
  }

  const healthy = await isReachable(MOONCHAN_PROBE_URL, timeoutMs);
  if (!healthy) return false;

  setImage(MOONCHAN_PROBE_TARGET);
  setVideo(MOONCHAN_PROBE_TARGET);
  localStorage.setItem(PROBE_TS_KEY, String(Date.now()));
  return true;
}
