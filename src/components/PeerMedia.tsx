// 26-09-08: PeerJS 媒体组件。参考 peerdrive-media react/components.jsx。
//
// 用法:
//   <PeerImage peer="node-1" url="https://pbs.twimg.com/media/xxx.jpg" alt="photo" />
//   <PeerVideo peer="node-1" url="https://video.twimg.com/topics/videos/xxx/master.mp4" />
//   <PeerMedia peer="node-1" url="https://..." />  // 按 MIME 自动选 img/video
//
// 26-09-08 第二轮改进:
//   - 错误状态显示重试按钮 (点击后自动重试)
//   - 加载状态显示重试次数
//
// 26-09-08 第三轮改进:
//   - 显示下载进度条 + 速度 + 预估剩余时间
//   - 显示缓存命中提示

import React from "react";
import { usePeerMedia } from "../hooks/usePeerMedia";
import { DEFAULT_SIGNALING } from "../api/peerMedia";

type SignalingConfig = {
  host: string;
  port: number;
  secure: boolean;
  key: string;
  path: string;
  config?: any;
};

// ====== 进度条组件 ======
function ProgressBar({ progress, loaded, total, speed, eta, fromCache, formatBytes }: {
  progress: number;
  loaded: number;
  total: number;
  speed: number;
  eta: number;
  fromCache: boolean;
  formatBytes: (b: number) => string;
}): React.ReactElement {
  if (fromCache) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1">
        <span className="text-green-500 text-sm">✓ 缓存命中</span>
        <span className="text-xs text-gray-400">{formatBytes(total)}</span>
      </div>
    );
  }

  const speedText = speed > 0 ? `${formatBytes(speed)}/s` : "";
  const etaText = eta > 0 && total > 0 ? `${eta}s` : "";
  const sizeText = total > 0 ? `${formatBytes(loaded)} / ${formatBytes(total)}` : `${formatBytes(loaded)}`;

  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
      {/* 进度条 */}
      <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* 进度百分比 */}
      <span className="text-sm text-gray-700 font-medium">{progress}%</span>
      {/* 速度 + 剩余时间 */}
      {(speedText || etaText) && (
        <div className="flex gap-3 text-xs text-gray-400">
          {speedText && <span>{speedText}</span>}
          {etaText && <span>剩余 {etaText}</span>}
        </div>
      )}
      {/* 已下载大小 */}
      {sizeText && <span className="text-xs text-gray-400">{sizeText}</span>}
    </div>
  );
}

// ====== 状态渲染 ======
function renderState(
  state: {
    status: string;
    error?: Error;
    retryCount?: number;
    progress?: number;
    loaded?: number;
    total?: number;
    speed?: number;
    eta?: number;
    fromCache?: boolean;
    formatBytes?: (b: number) => string;
  },
  opts: { loading?: React.ReactElement | null; error?: React.ReactElement | null; reload?: () => void }
): React.ReactElement | null {
  if (state.status === "loading") {
    const retryLabel = state.retryCount && state.retryCount > 0
      ? ` (重试 ${state.retryCount})`
      : "";
    if (opts.loading) return opts.loading;
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        {retryLabel && <span className="text-xs text-gray-400">{retryLabel}</span>}
        {state.progress !== undefined && state.formatBytes && (
          <ProgressBar
            progress={state.progress}
            loaded={state.loaded || 0}
            total={state.total || 0}
            speed={state.speed || 0}
            eta={state.eta || 0}
            fromCache={state.fromCache || false}
            formatBytes={state.formatBytes}
          />
        )}
      </div>
    );
  }
  if (state.status === "error") {
    if (opts.error) return opts.error;
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <span className="text-red-500 text-sm text-center px-4">
          {String(state.error?.message || state.error)}
        </span>
        {opts.reload && (
          <button
            onClick={opts.reload}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
          >
            重试
          </button>
        )}
      </div>
    );
  }
  return null;
}

// ====== PeerImage ======
type PeerImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  url: string;
  peer: string;
  signaling?: SignalingConfig;
  loading?: React.ReactElement | null;
  error?: React.ReactElement | null;
};

export function PeerImage({ url, peer, signaling, alt = "", loading, error, ...imgProps }: PeerImageProps): React.ReactElement | null {
  const state = usePeerMedia({ url, peer, signaling });
  if (state.status !== "ready") {
    return renderState(
      { ...state, formatBytes: state.formatBytes },
      { loading, error, reload: state.reload }
    );
  }
  return <img src={state.src} alt={alt} {...imgProps} />;
}

// ====== PeerVideo ======
type PeerVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  url: string;
  peer: string;
  signaling?: SignalingConfig;
  loading?: React.ReactElement | null;
  error?: React.ReactElement | null;
};

export function PeerVideo({ url, peer, signaling, controls = true, loading, error, ...videoProps }: PeerVideoProps): React.ReactElement | null {
  const state = usePeerMedia({ url, peer, signaling });
  if (state.status !== "ready") {
    return renderState(
      { ...state, formatBytes: state.formatBytes },
      { loading, error, reload: state.reload }
    );
  }
  return <video src={state.src} controls={controls} {...videoProps} />;
}

// ====== PeerMedia (自动分派) ======
type PeerMediaProps = {
  url: string;
  peer: string;
  signaling?: SignalingConfig;
  loading?: React.ReactElement | null;
  error?: React.ReactElement | null;
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
};

function isImageMime(mime: string | null): boolean {
  return typeof mime === "string" && mime.startsWith("image/");
}

function isVideoMime(mime: string | null): boolean {
  return typeof mime === "string" && mime.startsWith("video/");
}

export function PeerMedia({ url, peer, signaling, loading, error, imgProps = {}, videoProps = {} }: PeerMediaProps): React.ReactElement | null {
  const state = usePeerMedia({ url, peer, signaling });
  if (state.status !== "ready") {
    return renderState(
      { ...state, formatBytes: state.formatBytes },
      { loading, error, reload: state.reload }
    );
  }

  if (isImageMime(state.mime)) {
    return <img src={state.src} alt="" {...imgProps} />;
  }
  if (isVideoMime(state.mime)) {
    return <video src={state.src} controls {...videoProps} />;
  }
  // 非图/视频: 给个可下载链接兜底
  return (
    <a href={state.src} download target="_blank" rel="noreferrer" className="text-blue-500 underline">
      {url}
    </a>
  );
}

export default PeerMedia;
