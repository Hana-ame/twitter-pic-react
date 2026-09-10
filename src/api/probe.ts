// 26-09-08: moonchan / ech-proxy 备份源探测。
// 探测目标 https://twimg.l.moonchan.xyz:8443/favicon.ico 可达时,
// 把 video-proxy-v5 切到 https://twimg.l.moonchan.xyz:8443 (ech-proxy),
// 让视频源走这个节点。
// 探测不到 (超时 / 连不上 / 抛错) 就什么都不改, 保持用户当前配置。
// 26-09-08: 非CN 一律不探测(moonchan 只在 CN 有效, 探测本身也走外网被墙)。
// 26-09-08: 手动档一律不探测 / 不改写 (用户在配置页选的源必须原样保留)。
// 26-09-11: 图片源固定 pbs.moonchan.xyz, 探测不再动 image-proxy-v5 ——
//           ech-proxy 只承接视频, 图片全部走 pbs.moonchan.xyz (见 proxyOverride.ts)。

import { isNonCN } from "./proxyOverride";
import { FIXED_IMAGE_PROXY } from "./endpoints";

export const MOONCHAN_PROBE_URL = "https://twimg.l.moonchan.xyz:8443/favicon.ico";
export const MOONCHAN_PROBE_TARGET = "https://twimg.l.moonchan.xyz:8443";

export const IMAGE_PROXY_KEY = "image-proxy-v5";
export const VIDEO_PROXY_KEY = "video-proxy-v5";
// 用于节流: 同一时间窗内不重复探测, 避免多次挂载时重复发请求。
const PROBE_TS_KEY = "moonchan-probe-ts";
const PROBE_TS_TTL_MS = 5 * 60 * 1000; // 5 分钟

// 26-09-08: 配置模式。手动档下禁止自动探测覆盖用户手选的源。
export const CONFIG_MODE_KEY = "config-mode-v5";
export const MODE_AUTO = "auto";
export const MODE_MANUAL = "manual";

/** 用户是否处于手动档 (读不到 / 异常都按自动档处理, 保持旧行为)。 */
export function isManualMode(): boolean {
  try {
    const raw = localStorage.getItem(CONFIG_MODE_KEY);
    // 26-09-11: Config.jsx 用 useLocalStorage 写这个 key, 存进去的是 JSON 字符串
    // (即 '"manual"', 带引号); 旧实现直接和 "manual" 比, 永远不相等 —— 手动档下
    // 探测照样会覆盖用户选的源。这里两种写法都认。
    return raw === MODE_MANUAL || raw === JSON.stringify(MODE_MANUAL);
  } catch {
    return false;
  }
}

/**
 * 26-09-11: 图片源固定 pbs.moonchan.xyz, 这里把 localStorage 里的历史值纠正回来。
 *
 * 旧版本的自动探测会把 image-proxy-v5 写成 ech-proxy (twimg.l.moonchan.xyz:8443),
 * 或者在更早的图片源配置里被选成 twimg.moonchan.xyz / peerjs / 第三方地址;
 * 这些值现在都不该再影响图片 —— overrideImageProxy 本身已经忽略它们,
 * 这一步只是让本地存储和 UI 显示保持一致。
 * 档位无关 —— 图片不提供手动配置 (配置页已无图片源选项), 任何档位都按固定源算。
 */
export function normalizeImageProxy(setImage: (v: string) => void): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(IMAGE_PROXY_KEY);
  } catch {
    return;
  }
  // useLocalStorage 存的是 JSON, 字符串值带引号 (如 "\"https://pbs.moonchan.xyz\"");
  // 两种写法都算已经是固定源, 免得每次挂载都重复写一遍 + 派发 storage 事件。
  if (raw === JSON.stringify(FIXED_IMAGE_PROXY) || raw === FIXED_IMAGE_PROXY) return;
  setImage(FIXED_IMAGE_PROXY);
}

/**
 * 探测一个 URL 是否可达。
 *
 * 26-09-08: 用 mode:"no-cors" + 不读响应 —— 目标是本地/自建反代 (ech-proxy)，
 * 它不回 CORS 头，用 cors 模式永远拿不到可读的 res.ok，健康节点也会被误判成不可达。
 * no-cors 下能 resolve (哪怕是 opaque 响应) 就说明 TLS + HTTP 已经打通；
 * 连不上 / 超时 / DNS 挂掉才会 reject。配置页的"已开启"检测和自动档共用这个判定。
 * 带超时，超时或抛错都返回 false。
 */
export async function isReachable(
  url: string,
  timeoutMs = 5000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {
      method: "GET",
      signal: controller.signal,
      mode: "no-cors",
      cache: "no-store", // 别拿旧缓存判定，重探要看到真实结果
    });
    return true;
  } catch {
    // 超时 / 网络错误 / DNS 失败都走这里，视为不可达。
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** runMoonchanProbe 的结果: switched 表示这次是否真的把视频源切过去了。 */
export interface MoonchanProbeResult {
  switched: boolean;
  /** 没切的原因 (切成功时为 "switched")。给配置页显示成人类可读的文案。 */
  reason: "switched" | "manual" | "non-cn" | "throttled" | "unreachable";
}

/**
 * 探测 MOONCHAN_PROBE_URL; 若可达, 把视频源切到 MOONCHAN_PROBE_TARGET (ech-proxy)。
 *
 * 26-09-11: 只管视频 —— 图片源固定 pbs.moonchan.xyz, 不在这里改 (见 normalizeImageProxy)。
 *
 * - 手动档: 直接跳过 —— 用户在配置页手选的源不许被自动探测覆盖。
 * - 非CN: 直接跳过, 不发请求(moonchan 只在 CN 有效, 非CN 走外网探测本身也会被墙)。
 * - 节流: 距离上次探测小于 PROBE_TS_TTL_MS 直接返回, 不发请求。
 *        (用户显式切回自动档 / 点"重新探测"时传 force 绕过节流, 见 options.force)
 * - 幂等: 当前 video 已经等于 probe target 时, setVideo 是 no-op
 *        (值一样, 触发同一份 useLocalStorage 的 setValue, 结果等价于不切)。
 * - 失败静默: 探测不可达不写任何东西, 让用户保持原配置。
 */
export async function runMoonchanProbe(
  setVideo: (v: string) => void,
  timeoutMs = 5000,
  options: { force?: boolean } = {},
): Promise<MoonchanProbeResult> {
  // 26-09-08: 手动档不自动改源, 免得把用户自己填的地址冲掉。
  if (isManualMode()) return { switched: false, reason: "manual" };

  // 26-09-08: 非CN 不探测 —— 与 override 侧保持一致的"非CN 不做任何代理切换"策略。
  if (isNonCN()) return { switched: false, reason: "non-cn" };

  // 节流: 时间戳在 localStorage 里, 多标签页共享。force 用于模式切换后的重探。
  if (!options.force) {
    const lastTs = Number(localStorage.getItem(PROBE_TS_KEY) || 0);
    if (Date.now() - lastTs < PROBE_TS_TTL_MS) {
      return { switched: false, reason: "throttled" };
    }
  }

  const healthy = await isReachable(MOONCHAN_PROBE_URL, timeoutMs);
  if (!healthy) return { switched: false, reason: "unreachable" };

  setVideo(MOONCHAN_PROBE_TARGET);
  localStorage.setItem(PROBE_TS_KEY, String(Date.now()));
  return { switched: true, reason: "switched" };
}
