// 26-09-11: 图片源 = 固定 https://pbs.moonchan.xyz。
//
// 本文件只处理"本地存的图片源一律纠正回固定值"这一件事, 与自动档 / 手动档
// 完全无关 —— 它不读 config-mode-v5, 也不接受任何档位参数。
// 真正决定图片 URL 的是 proxyOverride.ts 的 overrideImageProxy(), 那个函数同样
// 不看档位、不看本地存储。
//
// 为什么要纠正本地值: 旧版本的自动探测会把 image-proxy-v5 写成 ech-proxy,
// 更早的图片源配置还能选 twimg.moonchan.xyz / peerjs / 第三方地址。这些值现在
// 已经不影响图片 URL 了, 这里顺手把存储改回固定源, 免得留下让人误会的脏值。

import { FIXED_IMAGE_PROXY } from "./endpoints";

export const IMAGE_PROXY_KEY = "image-proxy-v5";

/**
 * 把本地存的图片源纠正为 FIXED_IMAGE_PROXY。
 *
 * - 幂等: 已经是固定源就不写, 不会每次挂载都重复写 localStorage + 派发 storage 事件。
 * - 不看档位, 不看网络, 不看其它任何配置。
 */
export function normalizeStoredImageProxy(setImage: (v: string) => void): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(IMAGE_PROXY_KEY);
  } catch {
    return;
  }
  // useLocalStorage 存的是 JSON, 字符串值带引号 (如 "\"https://pbs.moonchan.xyz\"");
  // 两种写法都算已经是固定源。
  if (raw === JSON.stringify(FIXED_IMAGE_PROXY) || raw === FIXED_IMAGE_PROXY) return;
  setImage(FIXED_IMAGE_PROXY);
}
