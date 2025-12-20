import { useState, useRef, useEffect } from "react"
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx"
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints.ts"

type MediaProps = {
    url: string,
    type: string,
}

const Media = ({ url, type }: MediaProps) => {
    const [imageProxy] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY)
    const [videoProxy] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY)

    const imageProxyOverride = (url: string) => {
        // console.log(url, imageProxy)
        return url.replace("https://pbs.twimg.com", imageProxy)
    }

    const videoProxyOverride = (url: string) => {
        url = url.replace("https://video.twimg.com", videoProxy)
        if (videoProxy === "https://proxy.moonchan.xyz") {
            const newUrl = new URL(url);
            newUrl.searchParams.set("proxy_host", "video.twimg.com");
            return newUrl.toString();
        }
        return url;
    }

    if (type === "photo") return <Photo url={imageProxyOverride(url)} />
    if (type === "video" || type === "animated_gif") return <Video url={videoProxyOverride(url)} />
}


// 图片组件
const Photo: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
    const ref = useRef<HTMLImageElement>(null)
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const current = ref.current;
        return () => {
            if (current) {
                current.src = ""
                current.srcset = ""
            }
        }
    }, [ref])

    return (
        <div className="flex justify-center items-start max-h-screen"> {/* 实现水平居中，容器高度为屏幕高度 */}
            <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden"> {/* 修改：限制最大宽度，高度继承 */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {/* <PhotoView key={url} src={url}> */}
                <img
                    ref={ref}
                    src={url}
                    alt={alt || 'Image'}
                    className="mx-auto max-h-screen object-contain transition-opacity duration-300"
                    onLoad={() => setIsLoading(false)}
                    loading="lazy"
                />
                {/* </PhotoView> 修改：添加 mx-auto 实现水平居中，max-h-screen 限制最大高度 */}
            </div>
        </div>
    );

};

const Video: React.FC<{ url: string; poster?: string }> = ({ url, poster }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    
    // 构造 iframe 内部的 HTML
    // 1. 设置 meta referrer 为 no-referrer 确保双重保险
    // 2. 简单的 CSS 让视频居中且自适应
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
                autoplay 
                playsinline
                poster="${poster || ''}"
            >
                <source src="${url}" type="video/mp4">
            </video>
            <script>
                // 如果需要与父级通信，可以在这里添加逻辑
            </script>
        </body>
        </html>
    `;

    const handlePlay = () => {
        setIsPlaying(true);
    };

    return (
        <div className="flex justify-center items-start">
            <div className="relative w-full max-w-4xl rounded-lg overflow-hidden group bg-black" style={{ aspectRatio: '16/9' }}>
                
                {!isPlaying ? (
                    // 封面状态
                    <div className="relative w-full h-full cursor-pointer" onClick={handlePlay}>
                        {poster ? (
                            <img
                                src={poster}
                                alt="Video thumbnail"
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <span className="text-gray-500">点击播放视频</span>
                            </div>
                        )}
                        
                        {/* 播放按钮叠加层 */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-10 transition-all duration-300">
                            <button className="bg-opacity-100 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    // 播放状态：加载 iframe
                    <iframe
                        title="video-player"
                        srcDoc={iframeHtml}
                        className="w-full h-full border-none"
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                        allowFullScreen
                    />
                )}
            </div>
        </div>
    );
};

export default Media;