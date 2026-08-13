import { useState, useRef, useEffect } from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints";
import PhotoV2 from "./PhotoV2";

type MediaProps = {
  url: string;
  type: string;
};

// 26-08-14: moonchan 系代理只在 CN 有效。
// 非CN用户若配置的是 {twimg,proxy,pbs}.moonchan.xyz, 直接弹回原站
// (pbs.twimg.com / video.twimg.com); 自己输入的第三方代理不弹, 照常替换。
// 用 hostname 判断而不比较完整 URL, 兼容用户输入带路径/斜杠等变体。
export const isMoonchanProxy = (proxy?: string | null): boolean => {
  try {
    const host = new URL(proxy || "").hostname;
    return (
      host === "twimg.moonchan.xyz" ||
      host === "proxy.moonchan.xyz" ||
      host === "pbs.moonchan.xyz"
    );
  } catch {
    return false;
  }
};

// 非CN判断: CN / 空 / 脏值(非字符串)都按 CN 处理(走代理), 只有明确非CN才弹回
export const isNonCN = (): boolean => {
  const country = localStorage.getItem("country");
  return !(country === "CN" || country === "" || typeof country !== "string");
};

const Media = ({ url, type }: MediaProps) => {
  const [imageProxy] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY);
  const [videoProxy] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY);

  const imageProxyOverride = (url: string) => {
    // 26-08-14: 非CN时 moonchan 系代理弹回原站 pbs.twimg.com;
    // 自定义第三方代理不弹, 继续走下面的替换逻辑。
    if (isNonCN() && isMoonchanProxy(imageProxy)) {
      return url;
    }
    // 防御: 代理为空/脏值时拼出的 URL 是坏的, 直接用原站 (原逻辑会 replace 出坏 URL)
    if (typeof imageProxy !== "string" || imageProxy === "") {
      return url;
    }

    if (imageProxy === "https://twimg.moonchan.xyz") {
      const newUrl = new URL(url);
      newUrl.hostname = "pbs.moonchan.xyz"
      // newUrl.searchParams.set("proxy_host", "pbs.twimg.com"); // proxy没cache.
      return newUrl.toString();
    } else {
      url = url.replace("https://pbs.twimg.com", imageProxy);
      return url
    }
  };

  const videoProxyOverride = (url: string) => {
    // 26-08-14: 同图片, 非CN时 moonchan 系代理弹回原站 video.twimg.com
    if (isNonCN() && isMoonchanProxy(videoProxy)) {
      return url;
    }
    // 防御: 空代理直接用原站, 避免拼出坏 URL
    if (typeof videoProxy !== "string" || videoProxy === "") {
      return url;
    }

    url = url.replace("https://video.twimg.com", videoProxy);
    if (videoProxy === "https://proxy.moonchan.xyz") {
      const newUrl = new URL(url);
      newUrl.searchParams.set("proxy_host", "video.twimg.com");
      return newUrl.toString();
    }

    return url;
  };

  if (type === "photo") return <PhotoV2 url={imageProxyOverride(url)} />;
  if (type === "video" || type === "animated_gif")
    return <Video url={videoProxyOverride(url)} />;

  // LSP 提示返回值包含 undefined: 未知/文本类型(如 text, quote)时显式不渲染
  return null;
};

// 图片组件
// const Photo: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
//   const ref = useRef<HTMLImageElement>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const current = ref.current;
//     return () => {
//       if (current) {
//         current.src = "";
//         current.srcset = "";
//       }
//     };
//   }, [ref]);

//   return (
//     <div className="flex justify-center items-start max-h-screen">
//       {" "}
//       {/* 实现水平居中，容器高度为屏幕高度 */}
//       <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden">
//         {" "}
//         {/* 修改：限制最大宽度，高度继承 */}
//         {isLoading && (
//           <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
//             <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//           </div>
//         )}
//         {/* <PhotoView key={url} src={url}> */}
//         <img
//           ref={ref}
//           src={url}
//           alt={alt || "Image"}
//           className="mx-auto max-h-screen object-contain transition-opacity duration-300"
//           onLoad={() => setIsLoading(false)}
//           loading="lazy"
//         />
//         {/* </PhotoView> 修改：添加 mx-auto 实现水平居中，max-h-screen 限制最大高度 */}
//       </div>
//     </div>
//   );
// };

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
