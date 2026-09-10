// 26-09-11: 图片源固定 pbs.moonchan.xyz —— 直接验证"图片不分手动/自动档"。
// 这个 hook 不读 config-mode-v5, 所以三种档位取值下结果必须完全一致。

import { renderHook } from "@testing-library/react";
import useFixedImageProxy from "./useFixedImageProxy";
import { FIXED_IMAGE_PROXY } from "../api/endpoints";
import { IMAGE_PROXY_KEY } from "../api/imageProxy";
import { CONFIG_MODE_KEY, MODE_AUTO, MODE_MANUAL, VIDEO_PROXY_KEY } from "../api/probe";

const STALE_IMAGE = "https://twimg.l.moonchan.xyz:8443"; // 旧版本探测写进本地的 ech-proxy
const VIDEO = "https://twimg.l.moonchan.xyz:8443";

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

  it.each(cases)("%s: 图片被纠正为 pbs.moonchan.xyz", (_name, mode) => {
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
