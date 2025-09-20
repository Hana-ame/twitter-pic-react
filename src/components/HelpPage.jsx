const HelpPage = () => (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
        {/* 主标题 */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Hints:</h1>

        {/* 豆腐块容器 - 使用Grid布局实现居中豆腐块 */}
        <div className="max-w-md mx-auto grid grid-cols-1 gap-5">
            {/* 豆腐块1 */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">开始游览</h2>
                <p className="text-gray-500">
                    在右侧点击想看的用户（手机点击右上角蓝色按钮）
                </p>
            </div>

            {/* 豆腐块2 */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">如何添加</h2>
                <p className="text-gray-500">
                    在搜索栏中输入用户名（@之后的字符串）
                </p>
                <p className="text-gray-500">
                    点击添加 @...
                </p>
                <p className="text-gray-500">
                    等待一段时间后（约1分钟）刷新
                </p>
            </div>

            {/* 豆腐块3 */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">操作技巧</h2>
        <p className="text-gray-500">
          <img src="https://upload.moonchan.xyz/api/01LLWEUUZ6EVLA2ZKA2NGL5OHMVYCIOR3F/image.png" alt="https://upload.moonchan.xyz/api/01LLWEUUZ6EVLA2ZKA2NGL5OHMVYCIOR3F/image.png" />
        </p>
      </div>

            {/* 豆腐块4 */}
            {/* <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">故障排除</h2>
                <p className="text-gray-500">
                当遇到异常情况时，可以参考这里的步骤进行自查和恢复系统正常运行。
                </p>
            </div> */}

            {/* 豆腐块5 */}
            {/* <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">更新日志</h2>
                <p className="text-gray-500">
                    了解每次版本更新的内容和优化，及时掌握系统的最新功能和改进。
                </p>
            </div> */}

            {/* 豆腐块6 */}
            {/* <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">联系我们</h2>
        <p className="text-gray-500">
          如果未能解决您的问题，可以通过这里提供的方式获取进一步的技术支持。
        </p>
      </div> */}
        </div>

        {/* 底部填充区域 */}
        <div className="max-w-2xl mx-auto mt-10 text-center text-gray-400">
            <p className="mt-2">纯纯看图模式，文案？不存在的</p>
            <p className="mt-2">大概试过了应该可以不用翻墙的</p>
            <p className="mt-2">先开两天看看有没有人玩</p>
        </div>
    </div>
);

export default HelpPage;