import { useCallback, useEffect, useRef, useState } from "react";

// 26-10: 自动档已删除 (api/probe.ts 移除) —— 这里只剩"ech-proxy 开没开"的展示检测,
// 检测结果只用来打标注, 不会改任何源。选什么源就是什么源。
export const ECH_PROXY_URL = "https://twimg.l.moonchan.xyz:8443";
const ECH_PROBE_URL = `${ECH_PROXY_URL}/favicon.ico`;

/**
 * 探测一个 URL 是否可达。
 *
 * 用 mode:"no-cors" + 不读响应 —— 目标是本地/自建反代 (ech-proxy)，
 * 它不回 CORS 头，用 cors 模式永远拿不到可读的 res.ok，健康节点也会被误判成不可达。
 * no-cors 下能 resolve (哪怕是 opaque 响应) 就说明 TLS + HTTP 已经打通；
 * 连不上 / 超时 / DNS 挂掉才会 reject。
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
      cache: "no-store", // 别拿旧缓存判定，重测要看到真实结果
    });
    return true;
  } catch {
    // 超时 / 网络错误 / DNS 失败都走这里，视为不可达。
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type EchProxyStatus = "checking" | "enabled" | "disabled";

/**
 * 26-09-08: ech-proxy (twimg.l.moonchan.xyz:8443) 是否开着。
 * 26-10: 只探测打标注, 不做任何切换 (自动档已删, 用户在配置页选什么就是什么)。
 *
 * 只探测，不测延迟 —— 通不通才是这里关心的事。
 *
 * @returns [status, recheck] —— recheck 用于手动刷新 (如"重新检测"按钮)。
 */
export default function useEchProxyStatus(
  timeoutMs = 5000,
): [EchProxyStatus, () => void] {
  const [status, setStatus] = useState<EchProxyStatus>("checking");
  // 组件卸载 / 新一轮检测后，旧请求的结果直接丢弃，避免乱序回写。
  const runIdRef = useRef(0);

  const check = useCallback(() => {
    const runId = ++runIdRef.current;
    setStatus("checking");
    void isReachable(ECH_PROBE_URL, timeoutMs).then((ok) => {
      if (runId === runIdRef.current) setStatus(ok ? "enabled" : "disabled");
    });
  }, [timeoutMs]);

  useEffect(() => {
    check();
    return () => {
      // 让在途请求的回写失效
      runIdRef.current += 1;
    };
  }, [check]);

  return [status, check];
}
