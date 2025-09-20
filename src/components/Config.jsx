import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";

const Config = () => {
    const [override, setOverride] = useLocalStorage("override-v2", "https://twimg.moonchan.xyz");

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

export default Config;