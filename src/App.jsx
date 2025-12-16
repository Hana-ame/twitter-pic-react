import React, { useState, useEffect } from "react";
import { downloadZip } from "client-zip"; // 引入 client-zip
import streamSaver from "streamsaver"; // 引入 StreamSaver

// ... 其他原本的 import ...
// 假设这些是你项目中原本存在的 import
import useScreenMode from "./Tools/hooks/useScreenMode";
import MediaList from "./components/MediaList.tsx";
import HeaderList from "./components/HeaderList";
import { getUserList } from "./api/getUserList.ts";
import SearchBar from "./components/SearchBar.jsx";
import HelpPage from "./components/HelpPage.jsx";
import SearchList from "./components/SearchList.jsx";
import LoadMoreButton from "./components/LoadMoreButton.jsx";
import AddUser from "./components/AddUser.jsx";
import getMetaData from "./api/getMetaData.ts";
import useLocalStorage from "./Tools/localstorage/useLocalStorageStatus.tsx";
import createMetaData from "./api/createMetaData.ts";
import Advertisement from "./components/Advertisement.jsx";
import FavList from "./components/FavList.jsx";

// 如果这些常量在其他文件定义了，请改为 import
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "./api/endpoints.ts";

// --- 关键配置 ---
// 指定你刚才放在 public 目录下的 mitm.html 的路径
// 如果你的项目部署在子路径，记得加上前缀
streamSaver.mitm = "/mitm.html";

// ... SideBar 组件保持不变 ...
const SideBar = ({ onClick }) => {
  const [userList, setUserList] = useState(null);
  const [search, setSearch] = useState("");
  // 添加收藏夹显示状态
  const [showFav, setShowFav] = useState(false);

  // 仅作初始化
  useEffect(() => {
    getUserList().then((users) => {
      setUserList(users);
    });
  }, []);

  return (
    <>
      {/* 添加切换收藏夹的按钮 */}
      <button
        className={`
        bg-gradient-to-r from-blue-500 to-indigo-600
        hover:from-blue-600 hover:to-indigo-700
        text-white font-semibold
        py-2 px-4 rounded shadow-md
        hover:shadow-lg transition duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
        disabled:opacity-75 disabled:cursor-not-allowed
        flex items-center justify-center w-full h-auto
      `}
        onClick={() => setShowFav(!showFav)}
      >
        {showFav ? "显示用户列表" : "显示收藏夹"}
      </button>

      {/* 根据 showFav 状态显示收藏夹或用户列表 */}

      <div className={showFav ? "" : "hidden"}>
        <FavList onClick={onClick} />
      </div>

      <div className={showFav ? "hidden" : ""}>
        <SearchBar onChange={setSearch} />
        <div className={search !== "" ? "" : "hidden"}>
          <AddUser username={search} />
          <SearchList by="username" search={search} onClick={onClick} />
          <SearchList by="nick" search={search} onClick={onClick} />
        </div>
        <div className={search === "" ? "" : "hidden"}>
          <HeaderList userList={userList} onClick={onClick} />
          <LoadMoreButton
            after={userList?.at(-1) || ""}
            setUserList={setUserList}
          />
        </div>
      </div>

      <Advertisement />
    </>
  );
};

// 显示图片。瀑布流。
const Main = ({ profile, handleSetProfile }) => {
  const [blockMap, setBlockMap] = useLocalStorage("block-map", {});
  const [favMap, setFavMap] = useLocalStorage("fav-map", {});
  const [showAll, setShowAll] = useState(false);

  // --- 新增：Proxy 设置 ---
  const [imageProxy] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY);
  const [videoProxy] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY);

  // --- 新增：下载状态管理 ---
  const [downloadStatus, setDownloadStatus] = useState(""); // "" | "loading" | "error" | "success"
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    setShowAll(false);
    setDownloadStatus("");
    setStatusMsg("");
  }, [profile]);

  const username = profile?.account_info?.name;

  // ... 原有的 handleBlockUser 和 handleFavorite 保持不变 ...
  const handleBlockUser = () => {
    if (!username) return;

    setBlockMap((prev) => ({
      ...prev,
      [username]: !(prev[username] || false), // 如果不存在，默认为false然后取反
    }));
  };

  const handleFavorite = () => {
    if (!username) return;

    setFavMap((prev) => {
      const isCurrentlyFavorited = prev[username];

      if (isCurrentlyFavorited) {
        // 如果当前已收藏，则删除该键[1,4](@ref)
        const { [username]: _, ...rest } = prev;
        return rest;
      } else {
        // 如果当前未收藏，则添加该键并设置为 true[2](@ref)
        return {
          ...prev,
          [username]: true,
        };
      }
    });
  };

  // --- 新增：核心 URL 替换逻辑 ---
  const getProxiedUrl = (originalUrl, type) => {
    try {
      const targetProxy = type === "video" ? videoProxy : imageProxy;

      // 如果没有设置代理，或者代理为空，返回原链接
      if (!targetProxy || targetProxy.trim() === "") {
        return originalUrl;
      }

      const urlObj = new URL(originalUrl);
      const proxyObj = new URL(targetProxy);

      // 替换协议、主机名和端口
      urlObj.protocol = proxyObj.protocol;
      urlObj.host = proxyObj.host;
      urlObj.port = proxyObj.port;

      return urlObj.toString();
    } catch (e) {
      console.error("URL转换失败", e);
      return originalUrl;
    }
  };

  // --- 新增：流式打包下载逻辑 ---
  // --- 修复后的流式打包下载逻辑 ---
  // 核心下载函数
  const handleBatchDownload = async () => {
    if (!profile?.timeline || profile.timeline.length === 0) return;

    try {
      setDownloadStatus("loading");
      setStatusMsg("准备数据流...");

      const filename = `${username}_media_${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
      let writable;
      let fileHandle;

      // --- 分支判断：PC 原生 vs 移动端 StreamSaver ---
      if (window.showSaveFilePicker) {
        // [方案 A] PC Chrome/Edge 原生文件系统 (体验最好)
        try {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: "ZIP Archive",
                accept: { "application/zip": [".zip"] },
              },
            ],
          });
          writable = await fileHandle.createWritable();
        } catch (err) {
          // 用户在弹窗中点了取消
          if (err.name === "AbortError") {
            setStatusMsg("已取消");
            setDownloadStatus("");
            return;
          }
          throw err;
        }
      } else {
        // [方案 B] Android / iOS / Firefox 等 (使用 StreamSaver)
        setStatusMsg("正在初始化下载流...");
        // StreamSaver 创建一个写入流
        const fileStream = streamSaver.createWriteStream(filename);
        writable = fileStream;
      }

      // --- 通用的数据构建逻辑 (PC/移动端共用) ---
      const fileIterators = profile.timeline.map(async (item, index) => {
        // 1. 文件名处理
        let fileName = "unknown";
        try {
          const urlPath = item.url.split("?")[0];
          const extractedName = urlPath.split("/").pop();
          if (extractedName && extractedName.trim() !== "") {
            fileName = extractedName;
          } else {
            const ext = item.type === "video" ? "mp4" : "jpg";
            fileName = `${item.tweet_id || index}.${ext}`;
          }
        } catch (e) {
          fileName = `file_${index}.${item.type === "video" ? "mp4" : "jpg"}`;
        }

        // 2. 代理转换
        const finalUrl = getProxiedUrl(item.url, item.type);

        try {
          // 3. Fetch 请求
          const response = await fetch(finalUrl, {
            cache: "force-cache",
            mode: "cors",
          });

          if (!response.ok) {
            return {
              name: `ERROR_${fileName}.txt`,
              lastModified: new Date(),
              input: new Blob([`Download failed: ${response.status}`]),
            };
          }

          setStatusMsg(`处理: ${fileName}`);

          return {
            name: fileName,
            lastModified: new Date(item.date || Date.now()),
            input: response,
          };
        } catch (networkError) {
          return {
            name: `ERR_${fileName}.txt`,
            lastModified: new Date(),
            input: new Blob([`Net Error: ${networkError.message}`]),
          };
        }
      });

      setStatusMsg("正在打包并传输...");

      // --- 管道传输 ---
      // client-zip 将多个 fetch 流合并为一个 zip 流
      const zipResponse = downloadZip(fileIterators);

      // 将 zip 流 泵入 (Pipe) 到 写入流 (无论是 PC 的硬盘还是 StreamSaver)
      // client-zip 生成的是 ReadableStream，可以直接 pipeTo WritableStream
      if (window.WritableStream && writable.locked === false) {
        await zipResponse.body.pipeTo(writable);
      } else {
        // 针对一些极少数不支持 pipeTo 的旧浏览器环境的降级写法 (通常不需要)
        const reader = zipResponse.body.getReader();
        const writer = writable.getWriter();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
        writer.close();
      }

      setStatusMsg("下载完成！");
      setDownloadStatus("success");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (error) {
      console.error("Download Error:", error);
      setStatusMsg("出错: " + error.message);
      setDownloadStatus("error");
    }
  };

  if (!(profile?.timeline?.length > 0))
    return <HelpPage onClick={handleSetProfile} />;

  return (
    <main>
      <div className="mb-4 flex flex-col space-y-2">
        {/* 第一行按钮组 */}
        <div className="flex space-x-2">
          {/* 展开全部按钮 */}
          <button
            onClick={() => setShowAll(true)}
            className="flex-1 py-2 px-4 flex items-center justify-center bg-green-100 text-green-700 rounded-md hover:bg-green-500 hover:text-white transition-colors duration-200"
          >
            {/* ... SVG 省略 ... */}
            <span className="ml-2">展开全部</span>
          </button>

          {/* 收藏按钮 */}
          <button
            onClick={handleFavorite}
            className={`flex-1 py-2 px-4 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 ${
              favMap?.[username]
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 hover:bg-yellow-500 text-yellow-700"
            }`}
          >
            {/* ... SVG 省略 ... */}
            <span className="ml-2">
              {favMap?.[username] ? "已收藏" : "收藏"}
            </span>
          </button>

          {/* 更新按钮 */}
          <button
            onClick={() => createMetaData(username)}
            className="flex-1 py-2 px-4 flex items-center justify-center bg-blue-100 text-blue-700 rounded-md hover:bg-blue-500 hover:text-white transition-colors duration-200"
            aria-label="更新"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="ml-2">更新</span>
          </button>

          {/* 屏蔽按钮 */}
          <button
            onClick={handleBlockUser}
            className={`flex-1 py-2 px-4 flex items-center justify-center rounded-md  hover:text-white transition-colors duration-200 ${
              username && blockMap[username]
                ? "bg-red-500 text-white"
                : "bg-red-100 hover:bg-red-500 text-red-700"
            }`}
            aria-label="屏蔽用户"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="ml-2">
              {username && blockMap[username] ? "取消屏蔽" : "屏蔽"}
            </span>
          </button>
        </div>

        {/* 第二行：新增打包下载按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={handleBatchDownload}
            disabled={downloadStatus === "loading"}
            className={`
            w-full py-2 px-4 flex items-center justify-center rounded-md transition-colors duration-200
            ${
              downloadStatus === "loading"
                ? "bg-gray-300 cursor-not-allowed text-gray-600"
                : "bg-indigo-100 text-indigo-700 hover:bg-indigo-500 hover:text-white"
            }
          `}
          >
            {downloadStatus === "loading" ? (
              // Loading SVG
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              // Download SVG
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}

            {statusMsg || `打包下载全部 (${profile?.total_urls || 0})`}
          </button>
        </div>
      </div>

      <MediaList timeline={profile?.timeline} showAll={showAll} />
      <Advertisement />
    </main>
  );
};

// ... 保持 ResponsiveLayout 不变 ...
// 主布局组件
const ResponsiveLayout = () => {
  const isMobile = useScreenMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // 首次加载时
  useEffect(() => {
    // 得到path，split by "/"，得到第一个非空字符串，然后console.log（如果为空直接return）
    const fullPath = window.location.pathname; // 获取完整路径，如 "/user/123/profile"
    const parts = fullPath.split("/");
    const firstNonEmptyPart = parts.find((elem) => elem !== "");
    if (firstNonEmptyPart) {
      getMetaData(firstNonEmptyPart).then((data) => setProfile(data));
    }
  }, []);

  // 切换抽屉状态
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleSetProfile = (profile) => {
    window.history.pushState({}, null, "/" + profile.account_info.name);
    setProfile(profile);
  };

  const onClickHome = () => {
    window.history.pushState({}, null, "/");
    setProfile(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* 主要内容区域 */}
      <div
        className={`flex-1 p-4 overflow-auto ${isMobile ? "w-full" : "w-3/4"}`}
      >
        <Advertisement />

        {/* 添加的返回主页按钮 */}
        <div className="mb-4">
          {" "}
          {/* 添加一些底部外边距 */}
          <button
            onClick={onClickHome}
            className="w-full py-2 px-4 flex items-center justify-center bg-gray-100 text-gray-700 rounded-md hover:bg-blue-500 hover:text-white transition-colors duration-200"
            aria-label="返回主页"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            返回主页
          </button>
        </div>

        <Main profile={profile} handleSetProfile={handleSetProfile} />
      </div>

      {/* 桌面模式下的用户列表 */}
      {!isMobile && (
        <div className="w-1/4 p-4 bg-white border-l border-gray-200 overflow-auto">
          <SideBar
            onClick={(data) => {
              handleSetProfile(data);
            }}
          />
        </div>
      )}

      {/* 移动模式下的抽屉按钮 */}
      {isMobile && (
        <button
          onClick={toggleDrawer}
          className="fixed top-4 right-4 z-50 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          aria-label="打开用户列表"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      )}

      {/* 移动模式下的抽屉式用户列表 */}
      {isMobile && (
        <>
          {/* 抽屉遮罩层 */}
          {drawerOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={closeDrawer}
            />
          )}

          {/* 抽屉内容 */}
          <div
            className={`fixed top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-4 border-b border-gray-200 flex justify-end">
              <button
                onClick={closeDrawer}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="关闭抽屉"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-auto h-full">
              <SideBar
                onClick={(profile) => {
                  closeDrawer();
                  handleSetProfile(profile);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResponsiveLayout;
