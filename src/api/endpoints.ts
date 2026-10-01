export const ENDPOINT = "https://x.moonchan.xyz/api/twitter"
// export const ENDPOINT = "http://172.29.89.192:8888/api/twitter"

// export const ENDPOINT = window.location.origin + "/api/twitter";
// export const ENDPOINT = "/api/twitter"

// 所有的media（图片 pbs.twimg.com / 视频 video.twimg.com）都改成固定顺序的两次重试：twimg.l.moonchan.xyz:8443 , video-cf.twimg.com（无referer）
export const IMAGE_BASES = [
  "https://twimg.l.moonchan.xyz:8443",
  "https://video-cf.twimg.com",
] as const;

export const VIDEO_BASES = [
  "https://twimg.l.moonchan.xyz:8443",
  "https://video-cf.twimg.com",
] as const;

export const FIXED_IMAGE_PROXY = IMAGE_BASES[0];
export const FIXED_VIDEO_PROXY = VIDEO_BASES[0];

// 兼容旧 import: 默认源 = 固定首选源。
export const DEFAULT_IMAGE_PROXY: string = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY: string = FIXED_VIDEO_PROXY;
