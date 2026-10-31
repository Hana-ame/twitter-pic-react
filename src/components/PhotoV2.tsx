import React, { useEffect, useState } from "react";
import { overrideImageProxy } from "../api/proxyOverride";

/**
 * 26-10-31: 图片改为原生 <img> 直接加载（删除 fetch + ReadableStream + Blob 渐进方案）。
 *
 * 为什么不用 fetch：
 *   1. 旧实现每张图挂载即 fetch 全量下载，列表一屏 12 张同时开 12 条流，慢网下互相挤带宽；
 *      切换账号/筛选时新图只能排在旧流后面。
 *   2. 旧实现的失败分支会 setDisplayUrl(imageUrl) 让 <img> 再发一次同样的请求，
 *      这条原生请求不受 AbortController 控制，切换后仍然挂着 —— 这才是"旧请求卡住新请求"的来源。
 *   3. 每 50KB 用已收全部 chunks new Blob(chunks) 一次，大图是 O(n²) 拷贝，主线程还抖。
 *   4. 图片只有 pbs.moonchan.xyz 一个源、也不需要字节级进度，fetch 没有收益。
 *
 * <img> 的收益：浏览器原生懒加载（离屏不发请求，切换时并发从 12 条降到 2~3 条）、
 * 原生优先级/取消、渐进解码（JPEG 边下边渲染）、直接复用 HTTP 缓存；
 * referrerPolicy 仍然是属性，行为与旧 fetch 的 no-referrer 一致。
 *
 * 唯一丢弃的是字节级进度条（旧实现也只转圈，没有百分比）。
 */
const PhotoV2: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
  const imageUrl = overrideImageProxy(url);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  // 失败重试：换 key 让浏览器重新发起一次请求
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus(imageUrl ? "loading" : "error");
  }, [imageUrl]);

  if (!imageUrl) return null;

  return (
    <div className="flex justify-center items-start max-h-screen">
      <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden bg-gray-50">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {status === "error" ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-3">
            <span>图片加载失败</span>
            <button
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              onClick={() => {
                setStatus("loading");
                setAttempt((n) => n + 1);
              }}
            >
              重试
            </button>
          </div>
        ) : (
          <img
            key={attempt}
            src={imageUrl}
            alt={alt || url}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            className="mx-auto max-h-screen object-contain transition-opacity duration-200"
            style={{ opacity: status === "loading" ? 0.8 : 1 }}
          />
        )}
      </div>
    </div>
  );
};

export default PhotoV2;