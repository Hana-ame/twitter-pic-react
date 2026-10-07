// 图片固定单一源 https://pbs.moonchan.xyz (无 fallback)；视频保留顺序降级重试链。

import {
  overrideImageProxy,
  overrideVideoProxy,
  imageProxyUrl,
  getVideoCandidates,
  VIDEO_BASES,
} from "./proxyOverride";
import { IMAGE_PROXY_KEY, normalizeStoredImageProxy } from "./imageProxy";
import {
  runMoonchanProbe,
  MOONCHAN_PROBE_TARGET,
  VIDEO_PROXY_KEY,
} from "./probe";
import { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY } from "./endpoints";

const PHOTO = "https://pbs.twimg.com/media/AAA.jpg";
const VIDEO = "https://video.twimg.com/amplify_video/1/vid/720x1280/BBB.mp4";

beforeEach(() => {
  localStorage.clear();
});

describe("overrideImageProxy & imageProxyUrl: 图片固定单一源 pbs.moonchan.xyz", () => {
  it("替换为 FIXED_IMAGE_PROXY", () => {
    expect(overrideImageProxy(PHOTO)).toBe(
      `${FIXED_IMAGE_PROXY}/media/AAA.jpg`,
    );
  });

  it("只返回一个 URL, 没有备选源", () => {
    expect(imageProxyUrl(PHOTO)).toBe("https://pbs.moonchan.xyz/media/AAA.jpg");
    // 图片不再有 IMAGE_BASES 那样的候选数组; 只有 VIDEO_BASES 存在。
    expect(VIDEO_BASES).toHaveLength(3);
  });

  it("已经替换过的 URL 也能正确提取 path+query", () => {
    expect(
      imageProxyUrl("https://twimg.l.moonchan.xyz:8443/media/AAA.jpg?name=orig"),
    ).toBe("https://pbs.moonchan.xyz/media/AAA.jpg?name=orig");
  });

  it("空 URL 返回空字符串", () => {
    expect(overrideImageProxy("")).toBe("");
    expect(imageProxyUrl("")).toBe("");
  });
});

describe("overrideVideoProxy & getVideoCandidates: 视频走顺序降级重试", () => {
  it("首选源替换为 twimg.l.moonchan.xyz:8443", () => {
    expect(overrideVideoProxy(VIDEO)).toBe(
      `${FIXED_VIDEO_PROXY}/amplify_video/1/vid/720x1280/BBB.mp4`,
    );
  });

  it("getVideoCandidates 返回顺序降级候选列表", () => {
    expect(getVideoCandidates(VIDEO)).toEqual([
      "https://twimg.l.moonchan.xyz:8443/amplify_video/1/vid/720x1280/BBB.mp4",
      "https://pbs.moonchan.xyz/amplify_video/1/vid/720x1280/BBB.mp4",
      "https://video-cf.twimg.com/amplify_video/1/vid/720x1280/BBB.mp4",
    ]);
  });

  it("空 URL 原样返回", () => {
    expect(overrideVideoProxy("")).toBe("");
    expect(getVideoCandidates("")).toEqual([]);
  });
});

describe("normalizeStoredImageProxy: 纠正本地存的历史图片源", () => {
  it("旧 ech-proxy / 旧 twimg 入口 / peerjs / 第三方地址都被改回固定源", () => {
    // 注意: pbs.moonchan.xyz 现在就是固定源本身, 不能出现在 stale 列表里。
    for (const stale of [
      "https://twimg.moonchan.xyz",
      "https://twimg.l.moonchan.xyz:8443",
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
