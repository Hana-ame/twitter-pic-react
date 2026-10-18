# twitter-pic-react (v2 重置分支 — 适配新版 twitter-pic-go)

本分支为适配新版 `twitter-pic-go`（`/api/twitter/v2`）的重置版本：

## 核心改动说明

1. **移除旧广告栏，切换为后端专属视频端点 + `ouo.io` 广告中转变现**：
   - 彻底删除原版顶部、底部及侧边栏的 `<Advertisement />` 横幅与 `/ads.json`。
   - 所有视频条目仅展示 `gallery_dl` 采集的 `cover` 封面图（直接将 `pbs.twimg.com` 的 host 替换为 `pbs.moonchan.xyz`，完整保留 path 与 query，如 `https://pbs.moonchan.xyz/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig`）。
   - 点击视频封面时，请求 `twitter-pic-go` 新增的视频专属端点：
     `https://x.moonchan.xyz/api/twitter/v2/video/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/xxx.mp4?tag=12`
   - Go 后端收到视频链接后，将其 host 直接替换为 `twimg.moonchan.xyz`（即 `https://twimg.moonchan.xyz/ext_tw_video/1916894180884062208/pu/vid/avc1/720x1280/xxx.mp4?tag=12`），并通过 `ouo.io/qs/6z4kqAz7?s=` 或 `ouo.io/api/6z4kqAz7?s=` **302 Redirect** 到 `ouo.io` 广告中转页获取收益，广告完成后自动跳往 `https://twimg.moonchan.xyz/...` 播放。

2. **移除「下载全部」功能**：
   - 删除原版瀑布流顶部的「下载 / 兼容下载 / 应急下载」按钮及流式打包逻辑，防止批量拉取打满反代与源站带宽。

3. **全面对接新版 `twitter-pic-go` V2 API（消除 N+1 风暴）**：
   - **侧边栏用户列表**：调用 `GET /api/twitter/v2/users?limit=25&after=`，单次返回头像、昵称、标签与更新时间，`HeaderV2` 直接渲染卡片，不再对侧边栏每个用户并发拉取 `.json.gz`。
   - **搜索与标签反查**：调用 `GET /api/twitter/v2/search?q=&by=username|nick|tag`。
   - **收藏夹与排行榜**：调用 `GET /api/twitter/v2/users/batch?keys=` 与 `GET /api/twitter/v2/ranking`。
   - **单用户时间线**：点击某个用户时才按需请求 `GET /api/twitter/v2/users/:username/timeline?t=<last_modify>`。

4. **Cloudflare 边缘缓存 + 浏览器双层本地缓存（`src/api/clientCache.ts`）**：
   - **CF 边缘缓存**：请求自动携带确定性版本参数 `?t=<last_modify>`，未更新账号在全球 Cloudflare 边缘节点稳定命中 `HIT`（`s-maxage=86400`）。
   - **浏览器双层缓存**：内置 L1 内存 Map + L2 `localStorage` 有界 LRU 缓存（自动校验 `last_modify` 时间戳），二次点开同一账号 0ms 瞬时渲染。
