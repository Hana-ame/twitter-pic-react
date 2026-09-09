// 26-09-08: PeerJS 媒体加载 React Hook。参考 peerdrive-media react/usePeerMedia.js。
//
// 生命周期:
//   loading → ready (src=blobUrl) | error
//   url 变化时自动重载
//   卸载: abort 在途请求 + revokeObjectURL (防泄漏, React StrictMode 双跑安全)
//
// 26-09-08 第二轮改进:
//   - 自动重试 (失败后自动重试最多 2 次, 指数退避)
//   - reload 重置重试计数器
//
// 26-09-08 第三轮改进:
//   - 暴露 progress/speed/eta (下载进度、速度、预估剩余时间)
//   - 从缓存命中时 progress=100, speed=0, eta=0
//
// 用法:
//   const { status, src, mime, error, progress, speed, eta, reload } = usePeerMedia({ url, peer });
//   if (status === "loading") return <ProgressBar value={progress} speed={speed} eta={eta} />;
//   if (status === "ready") return <img src={src} />;

import { useEffect, useRef, useState, useCallback } from "react";
import client, { DEFAULT_SIGNALING } from "../api/peerMedia";

type SignalingConfig = typeof DEFAULT_SIGNALING;

type UsePeerMediaOptions = {
  url?: string;
  peer?: string;
  signaling?: SignalingConfig;
  maxRetries?: number;
};

type PeerMediaState = {
  status: "idle" | "loading" | "ready" | "error";
  src: string | null;
  mime: string | null;
  error: Error | null;
  retryCount: number;
  // 26-09-08: 下载进度
  progress: number;       // 0-100
  loaded: number;         // 已下载字节数
  total: number;          // 总字节数
  speed: number;          // 下载速度 (bytes/s)
  eta: number;            // 预估剩余时间 (秒)
  fromCache: boolean;     // 是否从缓存命中
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function usePeerMedia(opts: UsePeerMediaOptions = {}): PeerMediaState & { reload: () => void; formatBytes: (b: number) => string } {
  const { url, peer, signaling, maxRetries = 2 } = opts;
  const [state, setState] = useState<PeerMediaState>({
    status: "idle",
    src: null,
    mime: null,
    error: null,
    retryCount: 0,
    progress: 0,
    loaded: 0,
    total: 0,
    speed: 0,
    eta: 0,
    fromCache: false,
  });
  const [tick, setTick] = useState(0);
  const blobUrlRef = useRef<string | null>(null);
  const retryRef = useRef(0);
  const startTimeRef = useRef(0);
  const loadedRef = useRef(0);

  useEffect(() => {
    if (!peer || !url) {
      setState({
        status: "idle", src: null, mime: null, error: null, retryCount: 0,
        progress: 0, loaded: 0, total: 0, speed: 0, eta: 0, fromCache: false,
      });
      retryRef.current = 0;
      return undefined;
    }

    const ac = new AbortController();
    const currentRetry = retryRef.current;
    startTimeRef.current = Date.now();
    loadedRef.current = 0;

    setState((prev) => ({
      ...prev,
      status: "loading",
      src: null,
      error: null,
      retryCount: currentRetry,
      progress: 0,
      loaded: 0,
      total: 0,
      speed: 0,
      eta: 0,
      fromCache: false,
    }));

    client
      .load(url, {
        peer,
        signaling,
        signal: ac.signal,
        retry: { maxRetries, retryDelay: 1000, retryMultiplier: 2 },
        onProgress: (got, total, pct) => {
          if (ac.signal.aborted) return;
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const speed = elapsed > 0 ? got / elapsed : 0;
          const remaining = speed > 0 ? (total - got) / speed : 0;
          loadedRef.current = got;
          setState((prev) => ({
            ...prev,
            progress: pct,
            loaded: got,
            total,
            speed,
            eta: Math.ceil(remaining),
          }));
        },
      })
      .then((res) => {
        if (ac.signal.aborted) {
          URL.revokeObjectURL(res.blobUrl);
          return;
        }
        blobUrlRef.current = res.blobUrl;
        retryRef.current = 0;
        setState({
          status: "ready",
          src: res.blobUrl,
          mime: res.mime,
          error: null,
          retryCount: 0,
          progress: 100,
          loaded: res.size,
          total: res.size,
          speed: 0,
          eta: 0,
          fromCache: false,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        retryRef.current = maxRetries + 1;
        setState((prev) => ({
          ...prev,
          status: "error",
          src: null,
          error: err,
          retryCount: maxRetries,
          progress: 0,
          loaded: 0,
          total: 0,
          speed: 0,
          eta: 0,
        }));
      });

    return () => {
      ac.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url, peer, signaling, maxRetries, tick]);

  const reload = useCallback(() => {
    retryRef.current = 0;
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload, formatBytes };
}

export default usePeerMedia;
