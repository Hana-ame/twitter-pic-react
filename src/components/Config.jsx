import { useEffect, useState } from "react";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints.ts";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";
import { delay } from "../Tools/utils.ts";

const AutoConfig = () => {
    const [image, setImage] = useLocalStorage("image-proxy-v3", DEFAULT_IMAGE_PROXY);
    const [video, setVideo] = useLocalStorage("video-proxy-v3", DEFAULT_VIDEO_PROXY)
    const [hint, setHint] = useState("测试中 ...")
    useEffect(() => {
        /**
         * 带超时功能的fetch封装
         * @param {string} resource 请求的URL
         * @param {object} options 请求选项，同fetch API。可在此对象中设置timeout属性。
         * @returns {Promise} 返回fetch的Promise，超时或失败时会reject
         */
        function testWithTimeout(resource, options = {}) {
            return new Promise((resolve, reject) => {
                // 从options中提取timeout，默认设置为8000毫秒
                const { timeout = 8000 } = options;

                // 创建AbortController实例，用于控制请求的中止
                const controller = new AbortController();
                // 设置一个定时器，在超时时间后触发中止操作
                const id = setTimeout(() => {
                    controller.abort();
                    resolve(false);
                }, timeout);

                // 发起fetch请求，将AbortController的signal与请求关联
                fetch(resource, {
                    ...options, // 合并用户传入的options
                    signal: controller.signal // 设置中止信号
                }).then((response) => {
                    // 请求成功完成，清除超时定时器
                    clearTimeout(id);
                    resolve(true);
                }).catch((error) => {
                    // 请求出错，清除超时定时器
                    clearTimeout(id);
                    // throw error; // 重新抛出错误，以便外部捕获
                    resolve(true);
                });

            })
        }

        const f = async () => {
            // 能翻墙



            // if ((await testWithTimeout("https://twitter.com/favicon.ico", {
            //     timeout: 2500,
            // }))) {
            //     if (["https://twimg.nmbyd2.top", "https://twimg.moonchan.xyz"].includes(image))
            //         setImage("https://pbs.twimg.com")
            //     if (["https://twimg.nmbyd2.top", "https://proxy.moonchan.xyz"].includes(video))
            //         SetVideo("https://video.twimg.com")
            //     setHint("能够访问官方网址, 已设置为官方网址")
            //     return;
            // } else {


            // } else {
            const r = await (await fetch("https://proxy.moonchan.xyz/", {
                headers: {
                    "x-scheme": "http",
                    "x-host": "127.25.23.101:8080",
                }
            })).json();

            if (r["Cf-Ipcountry"][0] === "CN") {
                // 检测是否额度还在,如果在的话就下一个
                if ((await fetch("https://twimg.nmbyd2.top/favicon.ico",)).ok) {
                    if (["https://pbs.twimg.com", "https://twimg.moonchan.xyz"].includes(image))
                        setImage("https://twimg.nmbyd2.top");
                    if (["https://twimg.nmbyd2.top", "https://proxy.moonchan.xyz"].includes(video))
                        setVideo("https://twimg.nmbyd2.top");
                } else {
                    if (["https://pbs.twimg.com", "https://twimg.nmbyd2.top"].includes(image))
                        setImage("https://twimg.moonchan.xyz");
                    if (["https://twimg.nmbyd2.top"].includes(video))
                        setVideo("https://video.twimg.com");
                }
                setHint("不能访问官方网址, 已设置为分流网址")
            } else {
                if (["https://twimg.nmbyd2.top", "https://twimg.nmbyd3.top", "https://twimg.moonchan.xyz"].includes(image))
                    setImage("https://pbs.twimg.com");
                if (["https://twimg.nmbyd2.top", "https://proxy.moonchan.xyz"].includes(video))
                    setVideo("https://twimg.nmbyd2.top");
                setHint("IP属地: " + r["Cf-Ipcountry"][0]);
            }


            // } else {

            // // 检测是否额度还在,如果在的话就下一个
            // if ((await fetch("https://twimg.nmbyd2.top/favicon.ico",)).ok) {
            //     if (["https://twimg.moonchan.xyz"].includes(image))
            //         setImage("https://twimg.nmbyd2.top")
            //     if (["https://twimg.nmbyd2.top", "https://proxy.moonchan.xyz"].includes(video))
            //         SetVideo("https://twimg.nmbyd2.top")
            // } else {
            //     if (["https://twimg.nmbyd2.top"].includes(image))
            //         setImage("https://twimg.moonchan.xyz")
            //     if (["https://twimg.nmbyd2.top"].includes(video))
            //         SetVideo("https://video.twimg.com")
            // }
            // setHint("不能访问官方网址, 已设置为分流网址")
            // }
        }
        f()
    }, [])

    return <div className="invisiable">{hint}</div>
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