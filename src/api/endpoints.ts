// ============================================================================
// 新版 twitter-pic-react API 与资源 CDN 端点配置
// 配套后端：twitter-pic-go 新版 V2 API (/api/twitter/v2) + 旧版 V1 兼容兜底 (/api/twitter)
// ============================================================================

export const ENDPOINT =
  process.env.REACT_APP_API_ENDPOINT || "https://x.moonchan.xyz/api/twitter";

// 新版 V2 API 根地址（对齐 twitter-pic-go 的 /api/twitter/v2 路由组）
export const V2_ENDPOINT =
  process.env.REACT_APP_V2_ENDPOINT || `${ENDPOINT}/v2`;

// 唯一图片与视频封面（cover）资源 CDN：直接将 pbs.twimg.com 的 host 替换为 pbs.moonchan.xyz
export const FIXED_IMAGE_PROXY = "https://pbs.moonchan.xyz";

// 视频代理目标域名（由后端视频端点直接替换 video.twimg.com 的 host 为 twimg.moonchan.xyz）
export const FIXED_VIDEO_PROXY = "https://twimg.moonchan.xyz";

// 后端专属视频处理与 ouo.io 广告跳转端点：
// 前端点击视频封面时访问 `${VIDEO_REDIRECT_ENDPOINT}/<video_path>?<query>`，
// 后端将该视频链接的 host 直接替换为 twimg.moonchan.xyz，并通过 ouo.io/qs 或 ouo.io/api
// 302 重定向到 ouo.io 广告中转页面收钱，随后转到 https://twimg.moonchan.xyz/<video_path>?<query>。
export const VIDEO_REDIRECT_ENDPOINT =
  process.env.REACT_APP_VIDEO_ENDPOINT || `${V2_ENDPOINT}/video`;

export const DEFAULT_IMAGE_PROXY: string = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY: string = FIXED_VIDEO_PROXY;
