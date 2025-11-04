import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";
import Config from "./Config";
import FavList from "./FavList.jsx";

const Block = ({ title, children, closed, onClick }) => {
    if (closed) return <div className="bg-white rounded-lg shadow-sm p-2 text-center border border-gray-100 relative">
        <h2 className="text-sm font-semibold text-gray-700" onClick={() => onClick(title)}>{title}</h2>
    </div>
        ;

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100 relative">
            {onClick && (
                <button
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    onClick={() => onClick(title)}
                    aria-label="关闭"
                >
                    ×
                </button>
            )}

            <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
            {children}
        </div>
    );
};


const HelpPage = ({ onClick }) => {

    const [isClosedMap, setIsClosedMap] = useLocalStorage("closedMap", {})

    const handleOnClickBlock = (blockTitle) => {
        setIsClosedMap(prev => ({
            ...prev,
            [blockTitle]: !(prev[blockTitle] ?? false)
        }));
    };
    return <div className="min-h-screen bg-gray-50 py-8 px-4">
        {/* 主标题 */}
        {/* <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Hints:</h1> */}

        {/* 豆腐块容器 - 使用Grid布局实现居中豆腐块 */}
        <div className="max-w-md mx-auto grid grid-cols-1 gap-2">

            <Block title="提示" closed={isClosedMap["notice251009"]} onClick={() => handleOnClickBlock("notice251009")}>
                <p className="text-gray-500">
                    对于同一个账号,每日只能更新一次,多点没用.
                </p>
            </Block>

            {/* 豆腐块6 */}
            <Block title="守则" closed={isClosedMap["守则"]} onClick={handleOnClickBlock}>
                <p className="text-gray-500">
                    二次元的女的和三次元的女的至少占一个你再加吧
                </p>
                <p className="text-gray-500">
                    阳痿禁止使用本站
                </p>
            </Block>

            {/* 豆腐块4 */}
            <Block title="反馈" closed={isClosedMap["反馈"]} onClick={handleOnClickBlock}>
                <p className="text-gray-500">
                    已迁移至服务器长期运行。
                </p>
                <p className="text-gray-500">
                    TODO List:
                </p>
                <ul>
                    <li><s>收藏导入导出</s></li>
                </ul>
                <a href="https://nmbyd3.top/?bid=103">
                    <p className="text-blue-500 cursor-pointer border-blue-700">
                        任何反馈请点击这里。
                    </p>
                </a>
            </Block>

            <Block title="收藏夹" closed={isClosedMap["收藏夹"]} onClick={handleOnClickBlock}>
                <FavList onClick={onClick}></FavList>
            </Block>
            {/* 豆腐块5 */}
            <Block title="设置" closed={isClosedMap["设置"]} onClick={handleOnClickBlock}>
                <Config.ImageConfig />
                <br />
                <Config.VideoConfig />
                <Config.AutoConfig />
            </Block>

            {/* 豆腐块1 */}
            <Block title="开始游览" closed={isClosedMap["开始游览"]} onClick={handleOnClickBlock}>
                <p className="text-gray-500">
                    在右侧点击想看的用户（手机点击右上角蓝色按钮）
                </p>
            </Block>

            {/* 豆腐块2 */}
            <Block title="如何添加" closed={isClosedMap["如何添加"]} onClick={handleOnClickBlock}>
                <p className="text-gray-500">
                    在搜索栏中输入用户名（@之后的字符串）
                </p>
                <p className="text-gray-500">
                    点击添加 @...
                </p>
                <p className="text-gray-500">
                    等待一段时间后（约1分钟）刷新
                </p>
                <p className="text-gray-500">
                    恭喜郁奈s打舞萌找到小男友,bilibili已取关,教程图就换成柴吧
                    <img src="https://upload.moonchan.xyz/api/01LLWEUU474CGPN2VLB5FKOYKHSPQFGPL2/%E6%95%99%E7%A8%8B.webp" alt="https://upload.moonchan.xyz/api/01LLWEUUZ6EVLA2ZKA2NGL5OHMVYCIOR3F/image.png" />
                </p>
            </Block>

            {/* 豆腐块3 */}
            <Block title="推广" closed={isClosedMap["推广"]} onClick={handleOnClickBlock}>
                <a href="https://ex.nmbyd3.top/">
                    <p className="text-blue-500 cursor-pointer border-blue-700">
                        exhentai镜像，点我访问
                    </p>
                </a>
            </Block>

        </div>

        {/* 底部填充区域 */}
        <div className="max-w-2xl mx-auto mt-10 text-center text-gray-400">
            <p className="mt-2">纯纯看图模式，文案？不存在的</p>
            <p className="mt-2">大概试过了应该可以不用翻墙的</p>
            <p className="mt-2">先开两天看看有没有人玩</p>
        </div>
    </div >
};

export default HelpPage;