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

// 视频直连代理域名：点击视频时直接指向 https://twimg.moonchan.xyz/<path>?<query>
// （host 直接替换 video.twimg.com），链接即最终播放地址，无任何中间 302。
export const FIXED_VIDEO_PROXY = "https://twimg.moonchan.xyz";

// 【遗留】旧版后端视频处理端点 /api/twitter/v2/video：点击该端点会产生一次 302 跳转
// （历史上还经 ouo.io 广告中转）。2026-10-23 起前端不再使用（统一直连 twimg.moonchan.xyz）；
// 后端仍保留该端点以兼容旧客户端（直接 302 到同一直连地址，无广告）。
export const VIDEO_REDIRECT_ENDPOINT =
  process.env.REACT_APP_VIDEO_ENDPOINT || `${V2_ENDPOINT}/video`;

export const DEFAULT_IMAGE_PROXY: string = FIXED_IMAGE_PROXY;
export const DEFAULT_VIDEO_PROXY: string = FIXED_VIDEO_PROXY;
