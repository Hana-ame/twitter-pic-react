// 26-09-11: 图片源固定 pbs.moonchan.xyz 的回归测试。
// 覆盖: 展示/下载用的 URL 替换, 以及自动探测不再改图片源。

import {
  overrideImageProxy,
  overrideVideoProxy,
} from "./proxyOverride";
import {
  runMoonchanProbe,
  normalizeImageProxy,
  MOONCHAN_PROBE_TARGET,
  IMAGE_PROXY_KEY,
  VIDEO_PROXY_KEY,
} from "./probe";
import { FIXED_IMAGE_PROXY } from "./endpoints";

const PHOTO = "https://pbs.twimg.com/media/AAA.jpg";
const VIDEO = "https://video.twimg.com/amplify_video/1/vid/720x1280/BBB.mp4";

beforeEach(() => {
  localStorage.clear();
});

describe("overrideImageProxy: 图片一律走 pbs.moonchan.xyz", () => {
  it("CN 下替换 pbs.twimg.com", () => {
    localStorage.setItem("country", "CN");
    expect(overrideImageProxy(PHOTO)).toBe(
      `${FIXED_IMAGE_PROXY}/media/AAA.jpg`,
    );
  });

  it("非 CN 保持原站(不做任何代理替换)", () => {
    localStorage.setItem("country", "US");
    expect(overrideImageProxy(PHOTO)).toBe(PHOTO);
  });

  it("空 URL 原样返回", () => {
    expect(overrideImageProxy("")).toBe("");
  });
});

describe("overrideVideoProxy: 视频仍按所选视频源替换", () => {
  it("ech-proxy: video.twimg.com 换成探测目标主机", () => {
    localStorage.setItem("country", "CN");
    expect(overrideVideoProxy(VIDEO, MOONCHAN_PROBE_TARGET)).toBe(
      VIDEO.replace("https://video.twimg.com", MOONCHAN_PROBE_TARGET),
    );
  });

  it("非 CN 保持原站", () => {
    localStorage.setItem("country", "US");
    expect(overrideVideoProxy(VIDEO, MOONCHAN_PROBE_TARGET)).toBe(VIDEO);
  });
});

describe("normalizeImageProxy: 纠正本地存的历史图片源", () => {
  it("ech-proxy 脏值被改回固定源", () => {
    localStorage.setItem(
      IMAGE_PROXY_KEY,
      JSON.stringify(MOONCHAN_PROBE_TARGET),
    );
    const setImage = jest.fn();
    normalizeImageProxy(setImage);
    expect(setImage).toHaveBeenCalledWith(FIXED_IMAGE_PROXY);
  });

  it("旧 twimg 入口 / peerjs 也被改回固定源", () => {
    for (const stale of ["https://twimg.moonchan.xyz", "peerjs"]) {
      localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(stale));
      const setImage = jest.fn();
      normalizeImageProxy(setImage);
      expect(setImage).toHaveBeenCalledWith(FIXED_IMAGE_PROXY);
    }
  });

  it("已经是固定源时不重复写", () => {
    localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(FIXED_IMAGE_PROXY));
    const setImage = jest.fn();
    normalizeImageProxy(setImage);
    expect(setImage).not.toHaveBeenCalled();
  });
});

describe("runMoonchanProbe: 只切视频源", () => {
  it("ech-proxy 可达时切视频源, 图片源不被探测改写", async () => {
    localStorage.setItem("country", "CN");
    const setImage = jest.fn();
    const setVideo = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    const result = await runMoonchanProbe(setVideo, 5000, { force: true });

    expect(result).toEqual({ switched: true, reason: "switched" });
    expect(setVideo).toHaveBeenCalledWith(MOONCHAN_PROBE_TARGET);
    expect(setImage).not.toHaveBeenCalled();
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBeNull(); // 探测只回调 setter, 不直接写存储
  });

  it("手动档不探测也不改源", async () => {
    localStorage.setItem("country", "CN");
    const setVideo = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    // 两种写法都算手动档: useLocalStorage 写的 JSON 字符串, 和裸字符串
    for (const raw of [JSON.stringify("manual"), "manual"]) {
      localStorage.setItem("config-mode-v5", raw);
      setVideo.mockClear();
      const result = await runMoonchanProbe(setVideo, 5000, { force: true });

      expect(result).toEqual({ switched: false, reason: "manual" });
      expect(setVideo).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    }
  });
});
