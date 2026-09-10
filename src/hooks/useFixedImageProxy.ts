import { useEffect } from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { normalizeStoredImageProxy } from "../api/imageProxy";

/**
 * 26-09-11: 图片源固定 pbs.moonchan.xyz —— 挂载时把本地存的历史值纠正回固定源。
 *
 * 这个 hook **不读自动档 / 手动档**, 也不管非CN、不探测、不发请求:
 * 图片在所有档位下的行为完全一致。档位只决定视频源 (见 useMoonchanProbe)。
 *
 * 挂载位置: App 的 ResponsiveLayout, 所有页面都会跑到一次。
 */
export default function useFixedImageProxy(): void {
  const [, setImage] = useLocalStorage("image-proxy-v5", "");

  // 依赖 setImage 是安全的: normalizeStoredImageProxy 幂等 —— 写完之后本地值就是
  // 固定源, 再跑一次不会写, 因此最多两轮就稳定 (不会自激循环)。
  useEffect(() => {
    normalizeStoredImageProxy(setImage);
  }, [setImage]);
}
