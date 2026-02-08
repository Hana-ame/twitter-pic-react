import React, { useState, useEffect, useRef } from "react";

const PhotoV2: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string>("");
  const currentObjectURL = useRef<string | null>(null);

  // 记录已下载的数据量，用于控制更新频率
  const loadedBytes = useRef<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const revokeUrl = (url: string | null) => {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };

    const loadImage = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(url, { signal });

        if (!response.ok) throw new Error("Fetch failed");
        if (!response.body) throw new Error("No body");

        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        const contentType =
          response.headers.get("content-type") || "image/jpeg";

        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            chunks.push(value);
            loadedBytes.current += value.length;

            // 实时刷新策略：
            // 1. 每下载约 50KB 更新一次预览，或者最后下载完成时更新
            // 2. 较小的阈值能让“渐进感”更强，但太小会导致性能抖动
            if (done || loadedBytes.current > 50 * 1024) {
              const partialBlob = new Blob(chunks, { type: contentType });
              const newUrl = URL.createObjectURL(partialBlob);

              const oldUrl = currentObjectURL.current;

              // 直接更新显示。虽然 img 标签在 src 变化时会重新渲染，
              // 但由于是本地 Blob，解码速度非常快。
              setDisplayUrl(newUrl);
              currentObjectURL.current = newUrl;

              // 延迟释放旧 URL，确保浏览器已经切换到新图，防止白闪
              setTimeout(() => revokeUrl(oldUrl), 100);

              if (done) break;
              // 重置计数器，等待下一个 50KB
              loadedBytes.current = 0;
            }
          } else if (done) {
            break;
          }
        }
        setIsLoading(false);
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Abort successful: Socket closed.");
        } else {
          // 降级：如果 fetch 被跨域策略(CORS)拦截，直接赋值 URL
          // 此时虽然不能硬中止，但能保证图片能看
          setDisplayUrl(url);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      controller.abort(); // 这里会真正断开 HTTP 连接，新图片能立刻开始下载
      revokeUrl(currentObjectURL.current);
    };
  }, [url]);

  if (url.endsWith(".webp"))
    return (
      <div className="flex justify-center items-start max-h-screen">
        <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden bg-gray-50">
          <img
            src={url}
            alt={alt || url}
            className="mx-auto max-h-screen object-contain transition-opacity duration-200"
          />
        </div>
      </div>
    );

  return (
    <div className="flex justify-center items-start max-h-screen">
      <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden bg-gray-50">
        {isLoading && !displayUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {displayUrl && (
          <img
            src={displayUrl}
            alt={alt || url}
            className="mx-auto max-h-screen object-contain transition-opacity duration-200"
            style={{ opacity: isLoading ? 0.8 : 1 }} // 加载中给一点透明度，视觉暗示还在渐进中
          />
        )}
      </div>
    </div>
  );
};

export default PhotoV2;
