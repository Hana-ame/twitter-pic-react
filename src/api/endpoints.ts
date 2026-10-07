export const ENDPOINT = "https://x.moonchan.xyz/api/twitter"
// export const ENDPOINT = "http://172.29.89.192:8888/api/twitter"

// export const ENDPOINT = window.location.origin + "/api/twitter";
// export const ENDPOINT = "/api/twitter"

// 26-10-08: 图片源固定为 https://pbs.moonchan.xyz —— 唯一来源, 没有任何 fallback / 候选列表。
// 实测 (真实资源, HEAD):
//   https://pbs.moonchan.xyz/media/HQQFyW8aIAAwogx?format=jpg&name=medium -> 200 image/jpeg, cf-cache-status: HIT
// 所以图片不再需要 twimg.l.moonchan.xyz:8443 / video-cf.twimg.com 这两个候选。
export const FIXED_IMAGE_PROXY = "https://pbs.moonchan.xyz";

// 26-10-08: 视频仍然保留候选列表, 这是刻意的, 不是漏改。
// 实测: pbs.moonchan.xyz 对视频只回 302 跳转到 https://twimg.moonchan.xyz, 而 twimg.moonchan.xyz
// 目前返回 Cloudflare 429 (body: "error code: 1027")。换过出口 IP、换浏览器 UA+Referer、等 90s
// 冷却后复测, 结果都不变。所以视频此刻不能像图片那样单一写死成 pbs.moonchan.xyz, 否则所有视频都会挂。
// 等 twimg.moonchan.xyz 恢复 (或 pbs.moonchan.xyz 改为直连 video.twimg.com) 再按图片的方式收敛。
export const VIDEO_BASES = [
  "https://twimg.l.moonchan.xyz:8443",
  "https://pbs.moonchan.xyz",
  "https://video-cf.twimg.com",
] as const;

export const FIXED_VIDEO_PROXY = VIDEO_BASES[0];

// 兼容旧 import: 默认源 = 固定源。
export const DEFAULT_IMAGE_PROXY: string = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY: string = FIXED_VIDEO_PROXY;
