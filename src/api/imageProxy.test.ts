import {
  overrideImageProxy,
  overrideVideoProxy,
  imageProxyUrl,
  resolveVideoCoverUrl,
  buildVideoDirectUrl,
} from "./proxyOverride";
import { IMAGE_PROXY_KEY, normalizeStoredImageProxy } from "./imageProxy";
import { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY } from "./endpoints";

const PHOTO = "https://pbs.twimg.com/media/AAA.jpg";
const COVER =
  "https://pbs.twimg.com/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig";
const VIDEO =
  "https://video.twimg.com/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";

beforeEach(() => {
  localStorage.clear();
});

describe("overrideImageProxy & resolveVideoCoverUrl: 直接替换 host 为 video-cf.twimg.com", () => {
  it("普通图片替换 host 为 https://video-cf.twimg.com", () => {
    expect(overrideImageProxy(PHOTO)).toBe(
      `${FIXED_IMAGE_PROXY}/media/AAA.jpg`
    );
    expect(imageProxyUrl(PHOTO)).toBe("https://video-cf.twimg.com/media/AAA.jpg");
  });

  it("视频封面 cover 替换 host 为 https://video-cf.twimg.com 并完整保留 path 与 format=jpg&name=orig", () => {
    expect(resolveVideoCoverUrl(COVER, VIDEO)).toBe(
      "https://video-cf.twimg.com/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig"
    );
  });

  it("无 cover 时绝不把 .mp4 当作图片封面返回", () => {
    expect(resolveVideoCoverUrl("", VIDEO)).toBe("");
  });
});

describe("overrideVideoProxy & buildVideoDirectUrl: 视频直连 video-cf.twimg.com，无 302 中间跳转", () => {
  it("overrideVideoProxy 直接替换 host 为 https://video-cf.twimg.com 并保留完整 path+query", () => {
    expect(overrideVideoProxy(VIDEO)).toBe(
      `${FIXED_VIDEO_PROXY}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });

  it("buildVideoDirectUrl 直连 https://video-cf.twimg.com/<path+query>（不再拼 /api/twitter/v2/video 端点）", () => {
    expect(buildVideoDirectUrl(VIDEO)).toBe(
      `${FIXED_VIDEO_PROXY}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });

  it("后端已返回绝对直链（新版 V2 API 的 ouo_url）时统一改写 host 至 video-cf.twimg.com", () => {
    // 已是 video-cf 的直链原样保留
    const serverDirect =
      "https://video-cf.twimg.com/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";
    expect(buildVideoDirectUrl(VIDEO, serverDirect)).toBe(serverDirect);
    // 旧版 twimg.moonchan.xyz 直链（历史缓存/旧契约）也改写为 video-cf
    const legacyDirect =
      "https://twimg.moonchan.xyz/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";
    expect(buildVideoDirectUrl(VIDEO, legacyDirect)).toBe(serverDirect);
  });

  it("后端返回旧版相对路径 /api/twitter/v2/video/... 时忽略并改由原始地址拼直链（不再补齐端点）", () => {
    const serverRel =
      "/api/twitter/v2/video/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";
    expect(buildVideoDirectUrl(VIDEO, serverRel)).toBe(
      `${FIXED_VIDEO_PROXY}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });
});

describe("normalizeStoredImageProxy: 纠正本地存的历史图片源", () => {
  it("旧代理地址都被改回固定源 https://video-cf.twimg.com", () => {
    for (const stale of [
      "https://pbs.moonchan.xyz",
      "https://twimg.moonchan.xyz",
      "https://twimg.l.moonchan.xyz:8443",
      "peerjs",
    ]) {
      localStorage.setItem(IMAGE_PROXY_KEY, JSON.stringify(stale));
      const setImage = jest.fn();
      normalizeStoredImageProxy(setImage);
      expect(setImage).toHaveBeenCalledWith(FIXED_IMAGE_PROXY);
    }
  });
});
