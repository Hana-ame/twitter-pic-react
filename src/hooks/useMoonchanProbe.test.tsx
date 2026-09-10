// 26-09-11: 图片源固定 pbs.moonchan.xyz —— 验证"无论自动档还是手动档"都成立。
// 这一层测的是 hook 的真实挂载路径 (useMoonchanProbe), 不是单独的函数。

import { renderHook, waitFor } from "@testing-library/react";
import useMoonchanProbe from "./useMoonchanProbe";
import {
  FIXED_IMAGE_PROXY,
} from "../api/endpoints";
import {
  CONFIG_MODE_KEY,
  MODE_AUTO,
  MODE_MANUAL,
  IMAGE_PROXY_KEY,
  VIDEO_PROXY_KEY,
  MOONCHAN_PROBE_TARGET,
} from "../api/probe";

const STALE_IMAGE = MOONCHAN_PROBE_TARGET; // 旧版本自动探测写进本地的 ech-proxy

const storedImage = () => localStorage.getItem(IMAGE_PROXY_KEY);
const fixedImageJSON = JSON.stringify(FIXED_IMAGE_PROXY);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("country", "CN"); // 非CN 会整段跳过替换, 这里只测档位差异
  localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(STALE_IMAGE));
});

describe("useMoonchanProbe: 图片固定源与档位无关", () => {
  it("自动档: 图片脏值被纠正, 视频可达时才切", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_AUTO));
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    renderHook(() => useMoonchanProbe(50));

    // 图片: 旧值 (ech-proxy) 被纠正回 pbs.moonchan.xyz
    await waitFor(() => expect(storedImage()).toBe(fixedImageJSON));
    // 视频: 探测健康 → 切到 ech-proxy
    await waitFor(() =>
      expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
        JSON.stringify(MOONCHAN_PROBE_TARGET),
      ),
    );
  });

  it("手动档: 图片同样被纠正, 但视频源绝不被探测碰", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_MANUAL));
    localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify("https://video.twimg.com"));
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    renderHook(() => useMoonchanProbe(50));

    await waitFor(() => expect(storedImage()).toBe(fixedImageJSON));
    expect(global.fetch).not.toHaveBeenCalled(); // 手动档不发探测请求
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
      JSON.stringify("https://video.twimg.com"),
    );
  });

  it("自动档探测失败: 图片仍固定, 视频保持原样", async () => {
    localStorage.setItem(CONFIG_MODE_KEY, JSON.stringify(MODE_AUTO));
    localStorage.setItem(VIDEO_PROXY_KEY, JSON.stringify("https://video.twimg.com"));
    global.fetch = jest.fn().mockRejectedValue(new Error("blocked")) as any;

    renderHook(() => useMoonchanProbe(50));

    await waitFor(() => expect(storedImage()).toBe(fixedImageJSON));
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBe(
      JSON.stringify("https://video.twimg.com"),
    );
  });
});
