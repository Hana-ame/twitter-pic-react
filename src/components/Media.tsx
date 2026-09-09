import React from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints";
import {
  overrideImageProxy,
  overrideVideoProxy,
  // 兼容旧 import: App.jsx 之前从这里 import 这两个判断
  isMoonchanProxy,
  isNonCN,
} from "../api/proxyOverride";
import { DEFAULT_SIGNALING } from "../api/peerMedia";
import { PeerImage, PeerVideo } from "./PeerMedia";
import PhotoV2 from "./PhotoV2";

type MediaProps = {
  url: string;
  type: string;
};

// 从 localStorage 读取 PeerJS 配置
const getPeerId = () => localStorage.getItem("peerjs-peer-id") || "";
const getSignaling = () => ({
  host: localStorage.getItem("peerjs-signaling-host") || DEFAULT_SIGNALING.host,
  port: Number(localStorage.getItem("peerjs-signaling-port") || DEFAULT_SIGNALING.port),
  secure: true,
  key: localStorage.getItem("peerjs-signaling-key") || DEFAULT_SIGNALING.key,
  path: "/",
});

const Media = ({ url, type }: MediaProps) => {
  const [imageProxy] = useLocalStorage("image-proxy-v5", DEFAULT_IMAGE_PROXY);
  const [videoProxy] = useLocalStorage("video-proxy-v5", DEFAULT_VIDEO_PROXY);

  // 26-09-08: 展示与下载共用 src/api/proxyOverride.ts 的同一份替换逻辑。
  const imageProxyOverride = (url: string) => overrideImageProxy(url, imageProxy);
  const videoProxyOverride = (url: string) => overrideVideoProxy(url, videoProxy);

  // 26-09-08: PeerJS 分支 — 图源/视频源选 "peerjs" 时走 WebRTC DataChannel 拉取
  if (type === "photo") {
    if (imageProxy === "peerjs") {
      const peer = getPeerId();
      if (!peer) {
        return (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            请在设置页配置 PeerJS Peer ID
          </div>
        );
      }
      return (
        <PeerImage
          peer={peer}
          url={url}
          signaling={getSignaling()}
          className="mx-auto max-h-screen object-contain transition-opacity duration-200"
        />
      );
    }
    return <PhotoV2 url={imageProxyOverride(url)} />;
  }

  if (type === "video" || type === "animated_gif") {
    if (videoProxy === "peerjs") {
      const peer = getPeerId();
      if (!peer) {
        return (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            请在设置页配置 PeerJS Peer ID
          </div>
        );
      }
      return (
        <PeerVideo
          peer={peer}
          url={url}
          signaling={getSignaling()}
          controls
          playsInline
          className="w-full h-full"
        />
      );
    }
    return <Video url={videoProxyOverride(url)} />;
  }

  // LSP 提示返回值包含 undefined: 未知/文本类型(如 text, quote)时显式不渲染
  return null;
};

const Video: React.FC<{ url: string; poster?: string }> = ({ url, poster }) => {
  // 构造 iframe 内部的 HTML
  // 1. 设置 meta referrer 为 no-referrer (这是核心，用于绕过防盗链)
  // 2. 移除 autoplay，保留 controls 和 poster，这样默认显示封面且不自动播放
  const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="referrer" content="no-referrer">
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: black; }
                video { width: 100%; height: 100%; object-fit: contain; }
            </style>
        </head>
        <body>
            <video 
                id="v"
                controls 
                playsinline
                preload="metadata"
                poster="${poster || ""}"
            >
                <source src="${url}" type="video/mp4">
            </video>
        </body>
        </html>
    `;

  return (
    <div className="flex justify-center items-start">
      <div
        className="relative w-full max-w-4xl rounded-lg overflow-hidden bg-black"
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          title="video-player"
          srcDoc={iframeHtml}
          className="w-full h-full border-none"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default Media;
