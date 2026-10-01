export const ENDPOINT = "https://x.moonchan.xyz/api/twitter"
// export const ENDPOINT = "http://172.29.89.192:8888/api/twitter"

// export const ENDPOINT = window.location.origin + "/api/twitter";
// export const ENDPOINT = "/api/twitter"

// 所有的media（pbs.twimg.com）都改成固定顺序的两次重试：twimg.l.moonchan.xyz:8443 , video-cf.twimg.com（无referer）
export const IMAGE_BASES = [
  "https://twimg.l.moonchan.xyz:8443",
  "https://video-cf.twimg.com",
] as const;

export const FIXED_IMAGE_PROXY = IMAGE_BASES[0];

// 兼容旧 import: 默认图片源 = 固定首选图片源。
export const DEFAULT_IMAGE_PROXY = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY = "https://twimg.l.moonchan.xyz:8443";
