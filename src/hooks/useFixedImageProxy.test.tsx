// 26-09-11: 图片源固定 FIXED_IMAGE_PROXY —— 直接验证"图片不分手动/自动档"。
// 26-10-08: FIXED_IMAGE_PROXY = https://pbs.moonchan.xyz (单一源, 无 fallback)。
// 这个 hook 不读 config-mode-v5, 所以残留档位 key 取什么值结果都必须完全一致。

import { renderHook } from "@testing-library/react";
import useFixedImageProxy from "./useFixedImageProxy";
import { FIXED_IMAGE_PROXY } from "../api/endpoints";
import { IMAGE_PROXY_KEY } from "../api/imageProxy";
// 26-10: 自动/手动档已删除, probe.ts 一并移除。档位 key 只作为"历史残留"出现。
const CONFIG_MODE_KEY = "config-mode-v5";
const VIDEO_PROXY_KEY = "video-proxy-v5";

const STALE_IMAGE = "https://twimg.l.moonchan.xyz:8443"; // 旧版本存的固定图片源
const VIDEO = "https://pbs.moonchan.xyz"; // 视频源候选链中的一员, 本测试里作为"不该被动"的对照

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(STALE_IMAGE));
  localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify(VIDEO));
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
});

describe("useFixedImageProxy: 与档位无关", () => {
  // null = 无残留; 另外两种是自动档时代写进 localStorage 的残留值
  const cases: Array<[string, string | null]> = [
    ["无残留档位 key", null],
    ["残留自动档", JSON.stringify("auto")],
    ["残留手动档", JSON.stringify("manual")],
  ];

  it.each(cases)("%s: 图片被纠正为 FIXED_IMAGE_PROXY", (_name, mode) => {
    if (mode !== null) localStorage.setItem(CONFIG_MODE_KEY, mode);

    renderHook(() => useFixedImageProxy());

    expect(localStorage.getItem(IMAGE_PROXY_KEY)).toBe(
      JSON.stringify(FIXED_IMAGE_PROXY),
    );
  });

  it.each(cases)("%s: 不发探测请求, 不动视频源", (_name, mode) => {
    if (mode !== null) localStorage.setItem(CONFIG_MODE_KEY, mode);

    renderHook(() => useFixedImageProxy());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(JSON.stringify(VIDEO));
  });
});
