export const ENDPOINT = "https://x.moonchan.xyz/api/twitter"
// export const ENDPOINT = "http://172.29.89.192:8888/api/twitter"

// export const ENDPOINT = window.location.origin + "/api/twitter";
// export const ENDPOINT = "/api/twitter"

// 26-09-11: 图片源固定为 pbs.moonchan.xyz —— 所有图片 (pbs.twimg.com) 一律走这个源,
// 不再由自动探测 / 配置改成 ech-proxy, 见 api/proxyOverride.ts 的 overrideImageProxy。
export const FIXED_IMAGE_PROXY = "https://pbs.moonchan.xyz";

// 兼容旧 import: 默认图片源 = 固定图片源。
export const DEFAULT_IMAGE_PROXY = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY = "https://pbs.moonchan.xyz";
