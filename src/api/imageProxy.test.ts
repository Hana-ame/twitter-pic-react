// 所有的media（pbs.twimg.com）都改成固定顺序的两次重试：twimg.l.moonchan.xyz:8443 , video-cf.twimg.com（无referer）

import {
  overrideImageProxy,
  overrideVideoProxy,
  getImageCandidates,
  IMAGE_BASES,
} from "./proxyOverride";
import { IMAGE_PROXY_KEY, normalizeStoredImageProxy } from "./imageProxy";
import {
  runMoonchanProbe,
  MOONCHAN_PROBE_TARGET,
  VIDEO_PROXY_KEY,
} from "./probe";
import { FIXED_IMAGE_PROXY } from "./endpoints";

const PHOTO = "https://pbs.twimg.com/media/AAA.jpg";
const VIDEO = "https://video.twimg.com/amplify_video/1/vid/720x1280/BBB.mp4";

beforeEach(() => {
  localStorage.clear();
});

describe("overrideImageProxy & getImageCandidates: 固定顺序两次重试", () => {
  it("首选源替换为 twimg.l.moonchan.xyz:8443", () => {
    expect(overrideImageProxy(PHOTO)).toBe(
      `${FIXED_IMAGE_PROXY}/media/AAA.jpg`,
    );
  });

  it("getImageCandidates 返回固定两次重试候选列表", () => {
    expect(getImageCandidates(PHOTO)).toEqual([
      "https://twimg.l.moonchan.xyz:8443/media/AAA.jpg",
      "https://video-cf.twimg.com/media/AAA.jpg",
    ]);
  });

  it("已经替换过的 URL 也能正确提取候选列表", () => {
    expect(
      getImageCandidates("https://twimg.l.moonchan.xyz:8443/media/AAA.jpg?name=orig"),
    ).toEqual([
      "https://twimg.l.moonchan.xyz:8443/media/AAA.jpg?name=orig",
      "https://video-cf.twimg.com/media/AAA.jpg?name=orig",
    ]);
  });

  it("空 URL 原样返回", () => {
    expect(overrideImageProxy("")).toBe("");
    expect(getImageCandidates("")).toEqual([]);
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

describe("normalizeStoredImageProxy: 纠正本地存的历史图片源", () => {
  it("旧 twimg 入口 / 旧 pbs.moonchan.xyz / peerjs / 第三方地址都被改回固定首选源", () => {
    for (const stale of [
      "https://twimg.moonchan.xyz",
      "https://pbs.moonchan.xyz",
      "peerjs",
      "https://my-own-proxy.example",
    ]) {
      localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(stale));
      const setImage = jest.fn();
      normalizeStoredImageProxy(setImage);
      expect(setImage).toHaveBeenCalledWith(FIXED_IMAGE_PROXY);
    }
  });

  it("已经是固定源时不重复写", () => {
    localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(FIXED_IMAGE_PROXY));
    const setImage = jest.fn();
    normalizeStoredImageProxy(setImage);
    expect(setImage).not.toHaveBeenCalled();
  });
});

describe("runMoonchanProbe: 只切视频源, 图片源不受影响", () => {
  it("ech-proxy 可达时切视频源, 且完全不碰 image-proxy-v5", async () => {
    localStorage.setItem("country", "CN");
    const setVideo = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    const result = await runMoonchanProbe(setVideo, 5000, { force: true });

    expect(result).toEqual({ switched: true, reason: "switched" });
    expect(setVideo).toHaveBeenCalledWith(MOONCHAN_PROBE_TARGET);
    expect(localStorage.getItem(VIDEO_PROXY_KEY)).toBeNull(); // 只回调 setter, 不直接写存储
    expect(localStorage.getItem(IMAGE_PROXY_KEY)).toBeNull(); // 探测不碰图片源
  });

  it("手动档不探测也不改源 (两种存储写法都认)", async () => {
    localStorage.setItem("country", "CN");
    const setVideo = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

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
