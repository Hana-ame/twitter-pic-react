import { useCallback, useEffect, useRef, useState } from "react";
import { isReachable, MOONCHAN_PROBE_URL } from "../api/probe";

export type EchProxyStatus = "checking" | "enabled" | "disabled";

/**
 * 26-09-08: ech-proxy (twimg.l.moonchan.xyz:8443) 是否开着。
 *
 * 和自动档探测共用 isReachable()，保证配置页显示的"已开启 / 需下载"
 * 与实际会不会切过去是同一个判定，不会出现"显示已开启但自动档没切"。
 *
 * 只探测，不测延迟 —— 通不通才是这里关心的事。
 *
 * @returns [status, recheck] —— recheck 用于手动刷新 (如"重新探测"按钮)。
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
    void isReachable(MOONCHAN_PROBE_URL, timeoutMs).then((ok) => {
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
