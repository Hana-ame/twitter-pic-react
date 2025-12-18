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

  // Proxy 设置
  const [imageProxy] = useLocalStorage("image-proxy-v4", DEFAULT_IMAGE_PROXY);
  const [videoProxy] = useLocalStorage("video-proxy-v4", DEFAULT_VIDEO_PROXY);

  // 下载状态管理
  const [downloadStatus, setDownloadStatus] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // --- 新增：专门用于手机端调试的日志状态 ---
  const [debugLog, setDebugLog] = useState("");

  useEffect(() => {
    setShowAll(false);
    setDownloadStatus("");
    setStatusMsg("");
    setDebugLog(""); // 切页清空日志
  }, [profile]);

  const username = profile?.account_info?.name;

  // 辅助函数：追加日志到屏幕
  const logToScreen = (msg) => {
    console.log(msg); // 依然保留控制台输出
    setDebugLog((prev) => prev + "\n" + msg);
  };

  // ... handleBlockUser, handleFavorite, getProxiedUrl, extractFileName 保持不变 ...
  // 请确保保留上面的 extractFileName 和 getProxiedUrl 函数！
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
  // 1. 极其严苛的文件名提取逻辑
  const extractFileName = (urlStr, index, type) => {
    try {
      if (!urlStr) throw new Error("URL is empty");

      const url = new URL(urlStr);
      // 获取路径最后一段，并移除参数（如 ?tag=21）
      let baseName = url.pathname.split("/").pop() || "";
      baseName = baseName.split("?")[0];

      // 处理 Twitter 的 format 参数情况 (如 G7FkId5aoAA3odu?format=jpg)
      const format = url.searchParams.get("format");

      let finalName = "";
      if (baseName.includes(".")) {
        finalName = baseName;
      } else if (format) {
        finalName = `${baseName}.${format}`;
      } else {
        finalName = `${baseName || index}.${type === "video" ? "mp4" : "jpg"}`;
      }

      // 最终检查：确保文件名不为空且不包含非法字符
      return finalName.trim() || `file_${index}_${Date.now()}`;
    } catch (e) {
      return `file_${index}_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`;
    }
  };

  // 2. 核心下载函数
  // ---------------------------------------------------------
  // --- 核心修复：handleBatchDownload ---
  // ---------------------------------------------------------
  const handleBatchDownload = async () => {
    if (!profile?.timeline || profile.timeline.length === 0) return;

    try {
      setDownloadStatus("loading");
      setStatusMsg("初始化中...");
      setDebugLog("开始下载流程..."); // Log start

      const zipFilename = `${username}_media_${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
      let writable;
      let useNativeFS = false;

      // 1. 尝试获取写入流
      if (window.showSaveFilePicker) {
        try {
          // PC 端逻辑
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: zipFilename,
            types: [
              {
                description: "ZIP Archive",
                accept: { "application/zip": [".zip"] },
              },
            ],
          });
          writable = await fileHandle.createWritable();
          useNativeFS = true;
          logToScreen("模式: PC Native FileSystem");
        } catch (err) {
          if (err.name === "AbortError")
            return setDownloadStatus(""), setStatusMsg("");
          throw err;
        }
      } else {
        // 手机/不支持原生FS的浏览器
        // [关键] StreamSaver 在手机上必须通过点击事件同步触发创建，否则可能被拦截
        logToScreen("模式: StreamSaver (Mobile/Legacy)");
        try {
          // 确保 mitm 地址绝对正确，建议在生产环境写死完整域名，例如 https://your-site.com/mitm.html
          // 如果是在本地测试，确保 localhost 访问
          writable = streamSaver.createWriteStream(zipFilename);
          logToScreen("StreamSaver流创建成功");
        } catch (err) {
          logToScreen("StreamSaver创建失败: " + err.message);
          throw err;
        }
      }

      // 2. 异步生成器 (保持不变，这部分逻辑是好的)
      async function* createZipFolder() {
        for (let i = 0; i < profile.timeline.length; i++) {
          const item = profile.timeline[i];
          const fileName = extractFileName(item.url, i, item.type);
          const finalUrl = getProxiedUrl(item.url, item.type);

          setStatusMsg(
            `处理 (${i + 1}/${profile.timeline.length}): ${fileName}`
          );

          try {
            const response = await fetch(finalUrl, { cache: "force-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            yield {
              name: fileName,
              lastModified: new Date(item.date || Date.now()),
              input: response,
            };
          } catch (err) {
            logToScreen(`文件失败[${i}]: ${fileName} - ${err.message}`);
            yield {
              name: `FAILED_${fileName}.txt`,
              lastModified: new Date(),
              input: `URL: ${finalUrl}\nError: ${err.message}`,
            };
          }
        }
      }

      // 3. 开始传输
      setStatusMsg("正在打包...");
      const zipResponse = downloadZip(createZipFolder());

      // [核心修复点] 手机端坚决不使用 pipeTo
      // StreamSaver 的 writable stream 在手机浏览器上对 pipeTo 的兼容性很差
      if (useNativeFS) {
        // PC 端原生支持 pipeTo，效率最高
        logToScreen("使用 pipeTo 传输");
        await zipResponse.body.pipeTo(writable);
      } else {
        // 手机端/StreamSaver：强制使用手动泵 (Manual Pump)
        logToScreen("使用 Manual Reader/Writer Loop 传输");

        const reader = zipResponse.body.getReader();
        const writer = writable.getWriter();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
          logToScreen("写入循环完成");
          writer.close();
        } catch (pumpErr) {
          logToScreen("写入循环中断: " + pumpErr.message);
          writer.abort(pumpErr); // 尝试通知 StreamSaver 停止
          throw pumpErr;
        }
      }

      setStatusMsg("下载完成！");
      logToScreen("全部流程结束: Success");
      setDownloadStatus("success");
      setTimeout(() => {
        setStatusMsg("");
        setDownloadStatus("");
      }, 3000);
    } catch (error) {
      logToScreen(
        "致命错误: " + error.message + "\nStack: " + (error.stack || "N/A")
      );
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 9l6 6 6-6"
              />
            </svg>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill={favMap?.[username] ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
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
              className="h-5 w-5"
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
              className="h-5 w-5"
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

        {/* 在按钮组下方，增加一个用于显示 Debug 日志的区域 */}
        {/* 只有在有日志内容时才显示，方便手机查看报错 */}
        {/* {debugLog && (
          <div className="mt-4 p-2 bg-black text-green-400 text-xs font-mono whitespace-pre-wrap break-all rounded border border-green-600 overflow-auto max-h-40">
            <strong>Debug Console:</strong>
            {debugLog}
          </div>
        )} */}

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
                className="h-5 w-5"
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
              className="h-5 w-5"
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
