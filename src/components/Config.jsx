import { useEffect, useState } from "react";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints.ts";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";
import { delay } from "../Tools/utils.ts";
import { testLatency } from "../Tools/network/tesLatency.ts";

const AutoConfig = () => {
    const [image, setImage] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY);
    const [video, setVideo] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY)
    const [hint, setHint] = useState("测试中 ...")
    useEffect(() => {


    }, [])

    return <div className="invisiable">{hint}</div>
}

const ConfigItem = ({ value, url, onClick, noTest }) => {
    const [latency, setLatency] = useState(-1);
    const [color, setColor] = useState(["text-gray-400", "bg-gray-400"]);

    useEffect(() => {
        if (noTest) {
            setColor(["text-gray-600 invisible", "bg-gray-400"])
            return
        }

        const f = async () => {
            const [delay, isFailed] = await testLatency(url + "/favicon.ico", {
                mode: 'cors',
            });
            setLatency(delay);
            if (isFailed || delay < 100 || delay > 2250) {
                setColor(["text-red-600", "bg-red-600"]);
            } else {
                setColor(["text-green-600", "bg-green-600"] );
            }
        };

        f();

        return
    }, []);

    const isActive = value === url;

    return (
        <div
            className={`flex justify-between items-center w-full p-3 rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer ${isActive
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'hover:bg-gray-50'
                }`}
            onClick={() => onClick(url)}
        >
            {/* 左边URL显示 */}
            <div className="flex items-center">
                <span className={`text-sm text-gray-500 truncate max-w-[200px] ${isActive ? 'text-blue-600' : ''
                    }`}>
                    {url}
                </span>
            </div>

            {/* 右边延迟显示 */}
            <div className={`flex items-center space-x-2 ${color[0]}`}>
                <span className={`text-sm font-mono ${latency === -1 ? 'animate-pulse' : ''}`}>
                    {latency === -1 ? '测试中...' : `${Math.floor(latency)}ms`}
                </span>
                {/* 状态指示点 */}
                <div className={`w-2 h-2 rounded-full ${color[1]}`} />
            </div>
        </div>
    );
};


const ImageConfig = () => {
    const [imgProxy, setImgProxy] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY);

    // 处理输入框变化
    const handleInputChange = (event) => {
        setImgProxy(event.target.value);
    };

    // 处理按钮点击，设置对应的默认值
    const handleButtonClick = (value) => {
        setImgProxy(value);
    };

    // 三个默认选项
    const officialOptions = [
        "https://pbs.twimg.com",
        // "https://p.twimg.com",
        "https://pbs-t-1.twimg.com",
        "https://pbs-t-2.twimg.com",
        "https://pbs-t-3.twimg.com",
        "https://pbs-t-4.twimg.com",
    ];
    const otherOptions = [
        "https://twimg.nmbyd2.top",
        "https://twimg.moonchan.xyz",
    ]

    return (
        <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-1">

            {/* 输入框 */}
            <div className="space-y-2">
                <label htmlFor="override-input" className="block text-sm font-medium text-gray-700">
                    设置图源，可以输入自己的代理
                </label>
                <input
                    id="override-input"
                    type="text"
                    value={imgProxy || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="请输入覆盖值"
                />
            </div>

            {officialOptions.map(url => (
                <ConfigItem
                    key={url}
                    value={imgProxy}
                    url={url}
                    onClick={handleButtonClick}
                />
            ))}
            {otherOptions.map(url => (
                <ConfigItem
                    key={url}
                    value={imgProxy}
                    url={url}
                    onClick={handleButtonClick}
                    noTest={true}
                />
            ))}
        </div>
    );
};


const VideoConfig = () => {
    const [vidProxy, setVidPorxy] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY)

    // 处理输入框变化
    const handleInputChange = (event) => {
        setVidPorxy(event.target.value);
    };

    // 处理按钮点击，设置对应的默认值
    const handleButtonClick = (value) => {
        setVidPorxy(value);
    };

    // 三个默认选项
    // 三个默认选项
    const officialOptions = [
        "https://video.twimg.com",
        // "https://video-s.twimg.com",
        // "https://video-cf.twimg.com",
        "https://video-t-1.twimg.com",
        "https://video-t-2.twimg.com",
        "https://video-t-3.twimg.com",
        "https://video-t-4.twimg.com",
    ];
    const otherOptions = [
        "https://twimg.nmbyd2.top",
        "https://proxy.moonchan.xyz",
    ]

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-1">

            {/* 输入框 */}
            <div className="space-y-2">
                <label htmlFor="override-input" className="block text-sm font-medium text-gray-700">
                    设置视频源，可以输入自己的代理
                </label>
                <input
                    id="override-input"
                    type="text"
                    value={vidProxy || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="请输入覆盖值"
                />
            </div>


            {officialOptions.map(url => (
                <ConfigItem
                    key={url}
                    value={vidProxy}
                    url={url}
                    onClick={handleButtonClick}
                />
            ))}
            {otherOptions.map(url => (
                <ConfigItem
                    key={url}
                    value={vidProxy}
                    url={url}
                    onClick={handleButtonClick}
                    noTest={true}
                />
            ))}
        </div>
    );
};

const Config = { ImageConfig, VideoConfig, AutoConfig, ConfigItem };
export default Config;