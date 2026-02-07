import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";
import Config from "./Config";
import FavList from "./FavList.jsx";
import TagController from "./TagController.tsx";

const Block = ({ title, children, closed, onClick }) => {
  if (closed)
    return (
      <div className="bg-white rounded-lg shadow-sm p-2 text-center border border-gray-100 relative">
        <h2
          className="text-sm font-semibold text-gray-700"
          onClick={() => onClick(title)}
        >
          {title}
        </h2>
      </div>
    );

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
  const [isClosedMap, setIsClosedMap] = useLocalStorage("closedMap", {});

  const handleOnClickBlock = (blockTitle) => {
    setIsClosedMap((prev) => ({
      ...prev,
      [blockTitle]: !(prev[blockTitle] ?? false),
    }));
  };
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* 豆腐块容器 - 使用Grid布局实现居中豆腐块 */}
      <div className="max-w-md mx-auto grid grid-cols-1 gap-2">
        <Block
          title="迁移"
          closed={isClosedMap["迁移"]}
          onClick={() => handleOnClickBlock("迁移")}
        >
          <p className="text-gray-500">请迁移至<a
            className="text-blue-500 cursor-pointer border-blue-700"
            href="https://x.810114.xyz/"
          >https://x.810114.xyz/</a>域名</p>
          <p className="text-gray-500">如遇问题，请允许使用剪贴板</p>
          <p className="text-gray-500">如允许后依然不能解决，请至</p>
          <p className="text-gray-500">
            <a
              className="text-blue-500 cursor-pointer border-blue-700"
              href="https://810114.xyz/?bid=893"
            >
              这里
            </a>上传你的操作流程。
          </p>
          <p className="text-gray-500">nmbyd3.top域名有效期至6月为止</p>
          <p className="text-gray-500">另外，收藏夹中尚未恢复的项目请自行手动添加</p>
          <p className="text-gray-500">更新后被发现的tag错误与添加时被发现的tag错误，封禁措施是相同的</p>
        </Block>
        <Block
          title="每月1T"
          closed={isClosedMap["翻墙"]}
          onClick={() => handleOnClickBlock("翻墙")}
        >
          <a
            className="text-blue-500 cursor-pointer border-blue-700"
            href="https://c.810114.xyz/sub/a7r03an0fbqsmmbn"
          >https://c.810114.xyz/sub/a7r03an0fbqsmmbn</a>
        </Block>
        
        <Block
          title="恢复"
          closed={isClosedMap["恢复"]}
          onClick={() => handleOnClickBlock("恢复")}
        >
          <p className="text-gray-500">傻逼印度人开的机房被勒索病毒黑了😅。</p>
          <p className="text-gray-500">
            数据按照回不来做打算，上次备份还是去年的。还没有tag的那部分。
          </p>

          <p className="text-gray-500">
            <a
              className="text-blue-500 cursor-pointer border-blue-700"
              href="https://810114.xyz/?bid=893"
            >
              导出收藏夹，在这里发送，择日进行批量添加。
            </a>
          </p>
        </Block>

        <Block
          title="Ban男同性恋决议"
          closed={isClosedMap["notice260117"]}
          onClick={() => handleOnClickBlock("notice260117")}
        >
          <p className="text-gray-500">
            男同性恋群体指令遵从性过于糟糕，即日起无条件直接ban
          </p>
          <p className="text-gray-500">
            （人话：给你们写tag功能不好好用，学不会那就别用了）
          </p>
          <p className="text-gray-500">
            先搞明白男娘两个字是什么意思吧
            <img src="https://upload.moonchan.xyz/api/01LLWEUU6JF65XQD3F6NEJHVFXPSNE66SL/image.webp" />
          </p>
          <p className="text-gray-500">
            性交呢，我请问了
            <img src="https://upload.moonchan.xyz/api/01LLWEUU32WYONYFXNRBBZTN6PHJKGX6UH/image.webp" />
          </p>
        </Block>
        <Block
          title="提示"
          closed={isClosedMap["notice260116"]}
          onClick={() => handleOnClickBlock("notice260116")}
        >
          <p className="text-gray-500">
            打错tag请自行down vote。否则看到会直接ban。
          </p>
        </Block>

        <Block
          title="迁移手滑了，只好回档了。我的锅"
          closed={isClosedMap["notice26"]}
          onClick={() => handleOnClickBlock("notice26")}
        >
          <p className="text-gray-500">现在添加twitter账号的时候必须带上tag</p>
          <p className="text-gray-500">
            不带的话会失败,失败的情况不会有提示,瞎敲会被ban
          </p>
          <p className="text-gray-500">另外,现在开始也可以为tag进行投票了</p>
          <p className="text-gray-500">
            在首页的tag设置栏目也可以选择高亮的tag和屏蔽的tag,往下拉一点就能看到
          </p>
          <p className="text-gray-500">
            另外,还顺带附有一些vmess翻墙订阅,不定期分享
            <a
              className="text-blue-500 cursor-pointer border-blue-700"
              href="https://810114.xyz/?bid=810514"
            >
              连接
            </a>
          </p>
        </Block>

        <Block
          title="提示"
          closed={isClosedMap["notice251220"]}
          onClick={() => handleOnClickBlock("notice251220")}
        >
          <p className="text-gray-500">
            自己搭建代理服务器，参考代码
            <a
              className="text-blue-500 cursor-pointer border-blue-700"
              href="https://pastebin.com/raw/3bL3GfAP"
            >
              https://pastebin.com/raw/3bL3GfAP
            </a>
          </p>
        </Block>

        {/* 豆腐块6 */}
        <Block
          title="守则"
          closed={isClosedMap["守则"]}
          onClick={handleOnClickBlock}
        >
          <p className="text-gray-500">
            二次元的女的和三次元的女的至少占一个你再加吧
          </p>
          <p className="text-gray-500">阳痿禁止使用本站</p>
        </Block>

        {/* 豆腐块4 */}
        <Block
          title="反馈"
          closed={isClosedMap["反馈"]}
          onClick={handleOnClickBlock}
        >
          <a href="https://810114.xyz/?bid=103">
            <p className="text-blue-500 cursor-pointer border-blue-700">
              任何反馈请点击这里。
            </p>
            <p className="text-gray-500">
              仔细描述问题,环境,操作步骤,并附上截图以获得解答
            </p>
          </a>
        </Block>

        <Block
          title="tag设置"
          closed={isClosedMap["tag设置"]}
          onClick={handleOnClickBlock}
        >
          <TagController></TagController>
        </Block>

        <Block
          title="收藏夹"
          closed={isClosedMap["收藏夹"]}
          onClick={handleOnClickBlock}
        >
          <FavList onClick={onClick}></FavList>
        </Block>
        {/* 豆腐块5 */}
        <Block
          title="设置"
          closed={isClosedMap["设置"]}
          onClick={handleOnClickBlock}
        >
          <Config.ImageConfig />
          <br />
          <Config.VideoConfig />
          <Config.AutoConfig />
        </Block>

        {/* 豆腐块1 */}
        <Block
          title="开始游览"
          closed={isClosedMap["开始游览"]}
          onClick={handleOnClickBlock}
        >
          <p className="text-gray-500">
            在右侧点击想看的用户（手机点击右上角蓝色按钮）
          </p>
        </Block>

        {/* 豆腐块2 */}
        <Block
          title="如何添加"
          closed={isClosedMap["如何添加"]}
          onClick={handleOnClickBlock}
        >
          <p className="text-gray-500">在搜索栏中输入用户名（@之后的字符串）</p>
          <p className="text-gray-500">点击添加 @...</p>
          <p className="text-gray-500">等待一段时间后（约1分钟）刷新</p>
          <p className="text-gray-500">
            恭喜郁奈s打舞萌找到小男友,bilibili已取关,教程图就换成柴吧
            <img
              src="https://upload.moonchan.xyz/api/01LLWEUU474CGPN2VLB5FKOYKHSPQFGPL2/%E6%95%99%E7%A8%8B.webp"
              alt="https://upload.moonchan.xyz/api/01LLWEUUZ6EVLA2ZKA2NGL5OHMVYCIOR3F/image.png"
            />
          </p>
        </Block>

        {/* 豆腐块3 */}
        <Block
          title="推广"
          closed={isClosedMap["推广"]}
          onClick={handleOnClickBlock}
        >
          <a href="https://ex.810114.xyz/">
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
    </div>
  );
};

export default HelpPage;
