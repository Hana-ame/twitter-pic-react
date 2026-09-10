import { useEffect, useRef } from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import {
  runMoonchanProbe,
  normalizeImageProxy,
  CONFIG_MODE_KEY,
  MODE_AUTO,
} from "../api/probe";

/**
 * 26-09-08: 探测 moonchan 备份 CDN, 健康则把视频代理切过去。
 *
 * 26-09-08: 改成跟随配置模式 —— 只有自动档才允许自动改源。
 * - 手动档 (config-mode-v5 === "manual"): 完全不探测, 用户手填的地址不会被冲掉。
 * - 从手动档切回自动档: 传 force 绕过节流立刻重探, 让"切档即生效"看得见。
 * - 首次挂载: 走 runMoonchanProbe 内部的时间戳节流 (跨组件、跨标签页共享),
 *   所以同一个页面里挂多个 hook 也不会重复发请求。
 * - useLocalStorage 在写值时会手动派发 storage 事件, 所以这里读到的 mode
 *   和其它组件里的 ModeToggle 是同步的。
 *
 * 26-09-11: 图片源固定 pbs.moonchan.xyz —— 任何档位 / 任何网络下都先把本地存的
 * 历史值纠正回固定源 (旧版本探测写过 ech-proxy), 探测本身只管视频。
 *
 * @param timeoutMs favicon 请求超时; 默认 5s。
 */
export default function useMoonchanProbe(timeoutMs = 5000): void {
  const [, setImage] = useLocalStorage("image-proxy-v5", "");
  const [, setVideo] = useLocalStorage("video-proxy-v5", "");
  const [mode] = useLocalStorage<string>(CONFIG_MODE_KEY, MODE_AUTO);

  // 只区分"首次执行"和"之后的模式切换", 不区分具体值。
  const initializedRef = useRef(false);

  useEffect(() => {
    const isFirstRun = !initializedRef.current;
    initializedRef.current = true;

    // 图片固定源: 与档位、网络无关, 先纠正本地存的历史值。
    normalizeImageProxy(setImage);

    // 手动档: 不探测也不改视频源, 保持用户手选的源。
    if (mode !== MODE_AUTO) return;

    // setValue 的引用来自 useLocalStorage, 不进依赖数组, 避免 storedValue 变化触发重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    void runMoonchanProbe(setVideo, timeoutMs, { force: !isFirstRun });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
}
