import {
  overrideImageProxy,
  overrideVideoProxy,
  imageProxyUrl,
  resolveVideoCoverUrl,
  buildOuoVideoUrl,
} from "./proxyOverride";
import { IMAGE_PROXY_KEY, normalizeStoredImageProxy } from "./imageProxy";
import {
  FIXED_IMAGE_PROXY,
  FIXED_VIDEO_PROXY,
  VIDEO_REDIRECT_ENDPOINT,
} from "./endpoints";

const PHOTO = "https://pbs.twimg.com/media/AAA.jpg";
const COVER =
  "https://pbs.twimg.com/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig";
const VIDEO =
  "https://video.twimg.com/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";

beforeEach(() => {
  localStorage.clear();
});

describe("overrideImageProxy & resolveVideoCoverUrl: 直接替换 host 为 pbs.moonchan.xyz", () => {
  it("普通图片替换 host 为 https://pbs.moonchan.xyz", () => {
    expect(overrideImageProxy(PHOTO)).toBe(
      `${FIXED_IMAGE_PROXY}/media/AAA.jpg`
    );
    expect(imageProxyUrl(PHOTO)).toBe("https://pbs.moonchan.xyz/media/AAA.jpg");
  });

  it("视频封面 cover 替换 host 为 https://pbs.moonchan.xyz 并完整保留 path 与 format=jpg&name=orig", () => {
    expect(resolveVideoCoverUrl(COVER, VIDEO)).toBe(
      "https://pbs.moonchan.xyz/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig"
    );
  });

  it("无 cover 时绝不把 .mp4 当作图片封面返回", () => {
    expect(resolveVideoCoverUrl("", VIDEO)).toBe("");
  });
});

describe("overrideVideoProxy & buildOuoVideoUrl: 视频指向 Go 后端专属视频端点并保留完整 path+query", () => {
  it("overrideVideoProxy 直接替换 host 为 https://twimg.moonchan.xyz 并保留完整 path+query", () => {
    expect(overrideVideoProxy(VIDEO)).toBe(
      `${FIXED_VIDEO_PROXY}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });

  it("buildOuoVideoUrl 指向 Go 后端专属视频端点 /api/twitter/v2/video/<path+query>", () => {
    expect(buildOuoVideoUrl(VIDEO)).toBe(
      `${VIDEO_REDIRECT_ENDPOINT}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });

  it("若后端已返回相对路径 /api/twitter/v2/video/... 则自动补齐完整后端端点地址", () => {
    const serverRel =
      "/api/twitter/v2/video/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12";
    expect(buildOuoVideoUrl(VIDEO, serverRel)).toBe(
      `${VIDEO_REDIRECT_ENDPOINT}/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/BBB.mp4?tag=12`
    );
  });
});

describe("normalizeStoredImageProxy: 纠正本地存的历史图片源", () => {
  it("旧代理地址都被改回固定源 https://pbs.moonchan.xyz", () => {
    for (const stale of [
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
