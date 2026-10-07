// 26-09-11: 图片源固定 FIXED_IMAGE_PROXY —— 直接验证"图片不分手动/自动档"。
// 26-10-08: FIXED_IMAGE_PROXY = https://pbs.moonchan.xyz (单一源, 无 fallback)。
// 这个 hook 不读 config-mode-v5, 所以三种档位取值下结果必须完全一致。

import { renderHook } from "@testing-library/react";
import useFixedImageProxy from "./useFixedImageProxy";
import { FIXED_IMAGE_PROXY } from "../api/endpoints";
import { IMAGE_PROXY_KEY } from "../api/imageProxy";
import { CONFIG_MODE_KEY, MODE_AUTO, MODE_MANUAL, VIDEO_PROXY_KEY } from "../api/probe";

const STALE_IMAGE = "https://twimg.l.moonchan.xyz:8443"; // 旧版本存的固定图片源
const VIDEO = "https://pbs.moonchan.xyz"; // 视频源候选链中的一员, 本测试里作为"不该被动"的对照

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(STALE_IMAGE));
  localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify(VIDEO));
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
});

describe("useFixedImageProxy: 与档位无关", () => {
  // undefined = 用户还没选过档; 另外两种是配置页写进去的 JSON 字符串
  const cases: Array<[string, string | null]> = [
    ["未设置档位", null],
    ["自动档", JSON.stringify(MODE_AUTO)],
    ["手动档", JSON.stringify(MODE_MANUAL)],
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
