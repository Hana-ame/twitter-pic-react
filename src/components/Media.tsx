import React from "react";
import { resolveVideoCoverUrl, buildOuoVideoUrl } from "../api/proxyOverride";
import PhotoV2 from "./PhotoV2";

export type MediaProps = {
  url: string;
  type: string;
  cover?: string;
  ouoUrl?: string;
};

/**
 * 视频封面卡片：
 * 1. 绝不渲染 <video> 或 <iframe>，不在页面内发起任何 .mp4 请求（彻底防止打满 VPS 出站带宽）；
 * 2. 封面图固定使用 gallery_dl 添加的 cover 字段并经由唯一资源 CDN https://pbs.moonchan.xyz 加载；
 *    例如：https://pbs.moonchan.xyz/ext_tw_video_thumb/1916894180884062208/pu/img/X472TmC88Oy-kvGn?format=jpg&name=orig
 * 3. 点击封面后跳转到 http://ouo.io/api/6z4kqAz7?s=<video_url> 获取广告收益并限流。
 */
const VideoCoverCard: React.FC<{
  url: string;
  cover?: string;
  ouoUrl?: string;
}> = ({ url, cover, ouoUrl }) => {
  const coverImgUrl = resolveVideoCoverUrl(cover, url);
  const targetOuoUrl = buildOuoVideoUrl(url, ouoUrl);

  return (
    <div className="flex justify-center items-start my-3">
      <a
        href={targetOuoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full max-w-4xl rounded-xl overflow-hidden bg-gray-900 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer"
        title="点击通过 ouo.io 跳转观看视频"
      >
        {coverImgUrl ? (
          <img
            src={coverImgUrl}
            alt="视频封面"
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full max-h-[80vh] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          <div
            className="w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-gray-300"
            style={{ aspectRatio: "16/9" }}
          >
            <span className="text-base font-medium">视频资源（无预览封面）</span>
            <span className="text-xs text-gray-400 mt-1">点击跳转播放</span>
          </div>
        )}

        {/* 半透明暗角遮罩与中央播放图标 */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/65 group-hover:bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-200 border border-white/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 ml-1"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 右上角视频跳转标识 */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-medium backdrop-blur-sm border border-white/15 pointer-events-none">
          ▶ 视频 · 点击跳转播放
        </div>
      </a>
    </div>
  );
};

const Media: React.FC<MediaProps> = ({ url, type, cover, ouoUrl }) => {
  const cleanType = (type || "").toLowerCase();

  if (
    cleanType === "video" ||
    cleanType === "animated_gif" ||
    cleanType === "article:video"
  ) {
    return <VideoCoverCard url={url} cover={cover} ouoUrl={ouoUrl} />;
  }

  if (
    cleanType === "photo" ||
    cleanType === "card" ||
    cleanType === "article:cover" ||
    cleanType === "article:image"
  ) {
    return <PhotoV2 url={url} />;
  }

  return null;
};

export default Media;
