// 26-09-11: useMoonchanProbe 只管视频源 —— 图片源固定 pbs.moonchan.xyz, 由
// useFixedImageProxy / overrideImageProxy 负责, 与本 hook 无关。
// 这里同时验证: 无论自动档还是手动档, 探测都不会碰 image-proxy-v5。

import { renderHook, waitFor } from "@testing-library/react";
import useMoonchanProbe from "./useMoonchanProbe";
import { IMAGE_PROXY_KEY } from "../api/imageProxy";
import {
  CONFIG_MODE_KEY,
  MODE_AUTO,
  MODE_MANUAL,
  VIDEO_PROXY_KEY,
  MOONCHAN_PROBE_TARGET,
} from "../api/probe";

const VIDEO_SELECTED = "https://video.twimg.com";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("country", "CN");
  // 故意留一个脏的图片源: 探测 hook 不许动它
  localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(MOONCHAN_PROBE_TARGET));
  global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
});

describe("useMoonchanProbe: 只影响视频源", () => {
  it("自动档 + ech-proxy 可达: 视频切过去, 图片源原样不动", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_AUTO));

    renderHook(() => useMoonchanProbe(50));

    await waitFor(() =>
      expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
        JSON.stringify(MOONCHAN_PROBE_TARGET),
      ),
    );
    expect(localStorage.getItem(IMAGE_PROXY_KEY)).toBe(
      JSON.stringify(MOONCHAN_PROBE_TARGET),
    );
  });

  it("手动档: 不探测, 视频源保持用户所选, 图片源同样不动", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_MANUAL));
    localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify(VIDEO_SELECTED));

    renderHook(() => useMoonchanProbe(50));

    // 手动档下 hook 直接返回, 没有异步任务 —— 同步断言即可
    expect(global.fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
      JSON.stringify(VIDEO_SELECTED),
    );
    expect(localStorage.getItem(IMAGE_PROXY_KEY)).toBe(
      JSON.stringify(MOONCHAN_PROBE_TARGET),
    );
  });

  it("自动档但探测失败: 视频源保持原样, 图片源不动", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_AUTO));
    localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify(VIDEO_SELECTED));
    global.fetch = jest.fn().mockRejectedValue(new Error("blocked")) as any;

    renderHook(() => useMoonchanProbe(50));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
      JSON.stringify(VIDEO_SELECTED),
    );
    expect(localStorage.getItem(IMAGE_PROXY_KEY)).toBe(
      JSON.stringify(MOONCHAN_PROBE_TARGET),
    );
  });
});
