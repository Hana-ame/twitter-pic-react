import { useState, useRef, useEffect } from "react"
import { PhotoView } from "react-photo-view"
import urlOverride from "../api/urlOverride.ts"
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx"

type MediaProps = {
    url: string,
    type: string,
}

const Media = ({ url, type }: MediaProps) => {
    const [override] = useLocalStorage("override-v2", "https://twimg.moonchan.xyz")

    if (type === "photo") return <Photo url={urlOverride(url, override)} />
    if (type === "video") return <Video url={url} />
}


// 图片组件
const Photo: React.FC<{ url: string; alt?: string }> = ({ url, alt }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="flex justify-center items-start max-h-screen"> {/* 实现水平居中，容器高度为屏幕高度 */}
            <div className="relative w-full max-w-6xl h-full rounded-lg overflow-hidden"> {/* 修改：限制最大宽度，高度继承 */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {/* <PhotoView key={url} src={url}> */}
                <img
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

// 视频组件
const Video: React.FC<{ url: string; poster?: string }> = ({ url, poster }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPoster, setShowPoster] = useState(true);

    const handlePlay = () => {
        try {
            if (videoRef.current) {
                if (isPlaying) {
                    videoRef.current?.pause();
                } else {
                    videoRef.current?.play();
                    setShowPoster(false);
                }
                setIsPlaying(!isPlaying);
            }
        } catch (e) {
            // The play() request was interrupted because the media was removed from the document.
        }
    };

    return (
        <div className="flex justify-center items-start"> {/* 新增外层容器用于居中 */}
            <div className="relative w-full max-w-4xl max-h-screen h-auto rounded-lg overflow-hidden group"> {/* 添加 max-w-4xl 限制最大宽度 */}
                {showPoster && poster && (
                    <img
                        src={poster}
                        alt="Video thumbnail"
                        className="w-auto h-auto object-cover max-h-screen" // 为图片也添加高度限制
                    />
                )}

                <video
                    ref={videoRef}
                    className="w-full max-h-screen object-contain mx-auto" // 添加 mx-auto 实现水平居中
                    poster={poster}
                    controls={isPlaying}
                >
                    <source src={url} type="video/mp4" />
                    您的浏览器不支持视频播放。
                </video>

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-10 transition-all duration-300">
                        <button
                            onClick={handlePlay}
                            className="bg-opacity-100 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
                        >
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Media;