import { useEffect } from "react";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints.ts";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";

const AutoConfig = () => {
    const [image, setImage] = useLocalStorage("image-proxy-v3", DEFAULT_IMAGE_PROXY);
    const [video, SetVideo] = useLocalStorage("video-proxy-v3", DEFAULT_VIDEO_PROXY)

    useEffect(() => {
        const f = async () => {
            // 能翻墙
            if ((await fetch("https://pbs.twimg.com/favicon.ico")).ok){
                setImage("https://pbs.twimg.com")
                SetVideo("https://video.twimg.com")
                return;
            }else {
                setImage((prev) => prev.replace("https://pbs.twimg.com", "https://twimg.nmbyd2.top"))
            }
            
            // 检测是否额度还在,如果在的话就下一个
            const resp = await fetch("https://twimg.nmbyd2.top/favicon.ico")
            if (resp.ok) {
                setImage((prev) => prev.replace("https://twimg.moonchan.xyz", "https://twimg.nmbyd2.top"))
                SetVideo((prev) => prev.replace("https://proxy.moonchan.xyz", "https://video.twimg.com"))
            } else {
                setImage((prev) => prev.replace("https://twimg.nmbyd2.top", "https://twimg.moonchan.xyz"))
                SetVideo((prev) => prev.replace("https://twimg.nmbyd2.top", "https://video.twimg.com"))
            }
        }
        f()
    }, [])

    return <div className="invisible"></div>
}



const ImageConfig = () => {
    const [override, setOverride] = useLocalStorage("image-proxy-v3", DEFAULT_IMAGE_PROXY);

    // 处理输入框变化
    const handleInputChange = (event) => {
        setOverride(event.target.value);
    };

    // 处理按钮点击，设置对应的默认值
    const handleButtonClick = (value) => {
        setOverride(value);
    };

    // 三个默认选项
    const defaultOptions = [
        ["官方（需翻墙）", "https://pbs.twimg.com"],
        ["分流", "https://twimg.nmbyd2.top"],
        ["分流v4", "https://twimg.moonchan.xyz"],
        ["分流v6", "https://twimg.nmbyd3.top"],
    ];

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">

            {/* 输入框 */}
            <div className="space-y-2">
                <label htmlFor="override-input" className="block text-sm font-medium text-gray-700">
                    设置图源，可以输入自己的代理
                </label>
                <input
                    id="override-input"
                    type="text"
                    value={override || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="请输入覆盖值"
                />
            </div>

            {/* 当前值显示 */}
            {/* <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">当前值:</p>
                <p className="text-lg font-semibold text-gray-800 break-all">{override}</p>
            </div> */}

            {/* 默认选项按钮 */}
            <div className="space-y-3">
                {/* <p className="text-sm font-medium text-gray-700">快速选择:</p> */}
                <div className="flex flex-wrap gap-2">
                    {defaultOptions.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleButtonClick(option[1])}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${override === option[1]
                                ? 'bg-blue-500 text-white shadow-inner'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {option[0]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


const VideoConfig = () => {
    const [override, setOverride] = useLocalStorage("video-proxy-v3", DEFAULT_VIDEO_PROXY)

    // 处理输入框变化
    const handleInputChange = (event) => {
        setOverride(event.target.value);
    };

    // 处理按钮点击，设置对应的默认值
    const handleButtonClick = (value) => {
        setOverride(value);
    };

    // 三个默认选项
    const defaultOptions = [
        ["官方", "https://video.twimg.com"],
        ["分流", "https://twimg.nmbyd2.top"],
        ["分流v4", "https://proxy.moonchan.xyz"],
    ];

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">

            {/* 输入框 */}
            <div className="space-y-2">
                <label htmlFor="override-input" className="block text-sm font-medium text-gray-700">
                    设置视频源，可以输入自己的代理
                </label>
                <input
                    id="override-input"
                    type="text"
                    value={override || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="请输入覆盖值"
                />
            </div>

            {/* 当前值显示 */}
            {/* <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">当前值:</p>
                <p className="text-lg font-semibold text-gray-800 break-all">{override}</p>
            </div> */}

            {/* 默认选项按钮 */}
            <div className="space-y-3">
                {/* <p className="text-sm font-medium text-gray-700">快速选择:</p> */}
                <div className="flex flex-wrap gap-2">
                    {defaultOptions.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleButtonClick(option[1])}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${override === option[1]
                                ? 'bg-blue-500 text-white shadow-inner'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {option[0]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Config = { ImageConfig, VideoConfig, AutoConfig };
export default Config;