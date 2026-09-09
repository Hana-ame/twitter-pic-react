import { useEffect } from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { runMoonchanProbe } from "../api/probe";

/**
 * 26-09-08: 挂载时探测 moonchan 备份 CDN, 健康则把图片/视频代理切过去。
 *
 * - 依赖数组为空, 只在首次挂载触发一次; 后续重渲染不会重复跑。
 * - 真正的节流由 runMoonchanProbe 内部的时间戳保证 (跨组件、跨标签页共享),
 *   所以同一个页面里挂多个 hook 也不会重复发请求。
 * - setValue 的引用来自 useLocalStorage, 稳定到 key 不变即稳定; 因此不把
 *   setImage / setVideo 放进依赖, 避免 storedValue 变化触发重跑。
 *
 * @param timeoutMs favicon 请求超时; 默认 5s。
 * @param oncePerSession 默认 true —— 同一会话(5 分钟内)不重复探测。
 */
export default function useMoonchanProbe(timeoutMs = 5000): void {
  const [, setImage] = useLocalStorage("image-proxy-v5", "");
  const [, setVideo] = useLocalStorage("video-proxy-v5", "");

  useEffect(() => {
    void runMoonchanProbe(setImage, setVideo, timeoutMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
