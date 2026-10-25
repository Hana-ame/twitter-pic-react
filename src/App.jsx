import React, { useState, useEffect } from "react";
import useScreenMode from "./Tools/hooks/useScreenMode";
import MediaList from "./components/MediaList";
import HeaderList from "./components/HeaderListV2";
import { getUserList } from "./api/getUserList";
import SearchBar from "./components/SearchBar";
import HelpPage from "./components/HelpPage";
import SearchList from "./components/SearchListV2";
import LoadMoreButton from "./components/LoadMoreButton";
import AddUser from "./components/AddUser";
import getMetaData from "./api/getMetaData";
import useLocalStorage from "./Tools/localstorage/useLocalStorageStatus";
import createMetaData from "./api/createMetaData";
import FavList from "./components/FavList";
import getTags from "./api/getTags";
import TagSelectorModal from "./components/TagSelectorModal";
import TagDisplayArea from "./components/TagDisplayArea";
import { getEmojis, voteUpEmoji } from "./api/emojis";
import useFixedImageProxy from "./hooks/useFixedImageProxy";
import Ranking from "./components/Ranking";
import { useGayMode } from "./utils/gayMode";
import { downloadZip } from "client-zip";
import { overrideImageProxy, buildVideoDirectUrl } from "./api/proxyOverride";

// 侧边栏组件：已移除旧版广告栏，使用新版 V2 富卡片列表接口（零 N+1 请求）
const SideBar = ({ onClick }) => {
  const [userList, setUserList] = useState(null);
  const [search, setSearch] = useState("");
  const [showFav, setShowFav] = useState(false);

  useEffect(() => {
    getUserList().then((users) => {
      setUserList(users);
    });
  }, []);

  return (
    <>
      <button
        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 flex items-center justify-center w-full h-auto mb-2"
        onClick={() => setShowFav(!showFav)}
      >
        {showFav ? "显示用户列表" : "显示收藏夹"}
      </button>

      <div className={showFav ? "" : "hidden"}>
        <FavList onClick={onClick} />
      </div>

      <div className={showFav ? "hidden" : ""}>
        <SearchBar onChange={setSearch} placeholder="搜索用户名 / 昵称 / 标签..." />
        <div className={search !== "" ? "" : "hidden"}>
          <AddUser username={search} />
          <SearchList by="username" search={search} onClick={onClick} />
          <SearchList by="nick" search={search} onClick={onClick} />
          <SearchList by="tag" search={search} onClick={onClick} />
        </div>
        <div className={search === "" ? "" : "hidden"}>
          <HeaderList userList={userList} onClick={onClick} />
          <LoadMoreButton
            after={userList?.at(-1)?.username || ""}
            setUserList={setUserList}
          />
        </div>
      </div>
    </>
  );
};

// 主内容区：已移除旧版广告栏，恢复批量下载按钮，视频统一使用 cover 封面 + 点击直连 twimg.moonchan.xyz 播放（无 302 中转）
const Main = ({ profile, handleSetProfile }) => {
  const [blockMap, setBlockMap] = useLocalStorage("block-map", {});
  const [favMap, setFavMap] = useLocalStorage("fav-map", {});
  const [showAll, setShowAll] = useState(false);
  const [mediaFilter, setMediaFilter] = useState("all");

  const [showTagModal, setShowTagModal] = useState(false);
  const [userTags, setUserTags] = useState({});
  const [loadingTags, setLoadingTags] = useState(false);
  const [lastUsername, setLastUsername] = useState("");
  const [refreshMsg, setRefreshMsg] = useState("");

  const [emojiCounts, setEmojiCounts] = useState({});
  const [votingEmoji, setVotingEmoji] = useState(null);

  // 批量下载状态
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadMsg, setDownloadMsg] = useState("");

  const username = profile?.account_info?.name || profile?.username;

  useEffect(() => {
    setShowAll(false);
    setMediaFilter("all");
    setRefreshMsg("");
    setDownloadStatus("");
    setDownloadMsg("");
    if (profile?.tags && Object.keys(profile.tags).length > 0) {
      setUserTags(profile.tags);
    }
    if (profile?.emojis && Object.keys(profile.emojis).length > 0) {
      setEmojiCounts(profile.emojis);
    }
  }, [profile]);

  // 加载或同步标签
  useEffect(() => {
    if (!username) {
      setUserTags({});
      return;
    }
    if (profile?.tags && Object.keys(profile.tags).length > 0) {
      setUserTags(profile.tags);
      return;
    }
    const controller = new AbortController();
    let stale = false;
    getTags(username, controller.signal)
      .then((data) => {
        if (!stale) setUserTags(data.tags || {});
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
      });
    return () => {
      stale = true;
      controller.abort();
    };
  }, [username, profile]);

  // 加载或同步 Emoji 计数
  useEffect(() => {
    if (!username) return;
    if (profile?.emojis && Object.keys(profile.emojis).length > 0) {
      setEmojiCounts(profile.emojis);
      return;
    }
    setEmojiCounts({});
    const controller = new AbortController();
    let stale = false;
    getEmojis(username, controller.signal)
      .then((data) => {
        if (!stale) setEmojiCounts(data || {});
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
      });
    return () => {
      stale = true;
      controller.abort();
    };
  }, [username, profile]);

  const handleModifyTagsClick = async () => {
    if (!username) return;
    setLoadingTags(true);
    try {
      const data = await getTags(username);
      setUserTags(data.tags || {});
      setShowTagModal(true);
    } catch (error) {
      console.error("获取Tags失败", error);
      alert("无法获取现有标签");
    } finally {
      setLoadingTags(false);
    }
  };

  const handleConfirmTags = async (newTags) => {
    setShowTagModal(false);
    setUserTags(newTags);
    try {
      const updated = await createMetaData(username, newTags, false, true);
      if (updated && typeof updated === "object") {
        setUserTags(updated);
      }
    } catch (e) {
      alert("保存失败，请重试");
    }
  };

  const handleBlockUser = () => {
    if (!username) return;
    setBlockMap((prev) => ({
      ...prev,
      [username]: !(prev[username] || false),
    }));
  };

  const handleFavorite = () => {
    if (!username) return;
    setFavMap((prev) => {
      const isCurrentlyFavorited = prev[username];
      if (isCurrentlyFavorited) {
        const { [username]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [username]: true,
      };
    });
  };

  const handleRefreshUser = async () => {
    if (!username || lastUsername === username) return;
    setLastUsername(username);
    try {
      await createMetaData(username, null, true, false);
      setRefreshMsg("已提交后台更新队列");
      setTimeout(() => setRefreshMsg(""), 3000);
    } catch (err) {
      setRefreshMsg("更新提交失败");
      setTimeout(() => setRefreshMsg(""), 3000);
    }
  };

  const handleEmojiVote = async (emoji) => {
    if (votingEmoji) return;
    setVotingEmoji(emoji);
    try {
      const updated = await voteUpEmoji(username, emoji);
      if (updated && typeof updated === "object" && updated[emoji] !== undefined) {
        setEmojiCounts(updated);
      } else {
        setEmojiCounts((prev) => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + 1,
        }));
      }
    } catch (err) {
      console.error("投票失败:", err);
    } finally {
      setVotingEmoji(null);
    }
  };

  // 批量下载（三个按钮共用打包逻辑，区别在落盘方式）
  //   - 下载全部（原生）：PC 用 showSaveFilePicker 流式写盘，移动端 Blob 兜底
  //   - 兼容下载：强制 Blob 打包 + <a download>，给 showSaveFilePicker 不可用/被拦的浏览器
  //   - 应急下载：不打包，逐个触发浏览器下载（fetch blob + <a download>，300ms 间隔）
  // 视频用 ouo_url（直链 twimg.moonchan.xyz），图片用 overrideImageProxy（pbs.moonchan.xyz）
  // 文件名：**一律用原始文件名**（URL 路径最后一段，字母/数字混合，如
  // G7FkId5aoAA3odu.jpg），绝不重命名成 tweet_id / item_N 这类数字名
  // （number 存不下且丢失原始名；原始文件名就是字母）。
  // 原始名缺失时（理论不该发生）才用字母占位 media.jpg / media.mp4。
  const makeDlName = (item, i) => {
    const isVid = item.type === "video" || item.type === "animated_gif";
    const ext = isVid ? "mp4" : "jpg";
    try {
      if (!item.url) return `media.${ext}`;
      const url = new URL(item.url);
      let baseName = url.pathname.split("/").pop() || "";
      baseName = baseName.split("?")[0];
      const format = url.searchParams.get("format");
      let finalName = "";
      if (baseName.includes(".")) {
        finalName = baseName;
      } else if (format) {
        finalName = `${baseName}.${format}`;
      } else if (baseName) {
        finalName = `${baseName}.${ext}`;
      } else {
        finalName = `media.${ext}`;
      }
      const cleaned = finalName
        .trim()
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
      return cleaned || `media.${ext}`;
    } catch (e) {
      return `media.${ext}`;
    }
  };
  const dlUrlOf = (item) =>
    item.type === "video" || item.type === "animated_gif"
      ? item.ouo_url || buildVideoDirectUrl(item.url)
      : overrideImageProxy(item.url);

  const runZipDownload = async (forceBlob) => {
    const timeline = profile?.timeline || [];
    if (timeline.length === 0) return;
    setDownloadStatus("loading");
    setDownloadMsg("初始化中...");
    const zipName = `${username || "media"}_${new Date()
      .toISOString()
      .slice(0, 10)}.zip`;
    try {
      async function* gen() {
        for (let i = 0; i < timeline.length; i++) {
          const item = timeline[i];
          const name = makeDlName(item, i);
          setDownloadMsg(`下载中 (${i + 1}/${timeline.length}) ${name}`);
          try {
            const resp = await fetch(dlUrlOf(item));
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            yield {
              name,
              lastModified: new Date(item.date || Date.now()),
              input: resp.body,
            };
          } catch (err) {
            yield {
              name: `FAILED_${name}.txt`,
              lastModified: new Date(),
              input: `URL: ${dlUrlOf(item)}\nError: ${err.message}`,
            };
          }
        }
      }
      const zipResp = downloadZip(gen());
      if (!forceBlob && window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: zipName,
          types: [
            {
              description: "ZIP Archive",
              accept: { "application/zip": [".zip"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await zipResp.body.pipeTo(writable);
      } else {
        setDownloadMsg("正在打包...");
        const blob = await zipResp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setDownloadMsg("下载完成！");
      setDownloadStatus("success");
      setTimeout(() => {
        setDownloadMsg("");
        setDownloadStatus("");
      }, 3000);
    } catch (err) {
      if (err.name === "AbortError") {
        setDownloadMsg("");
        setDownloadStatus("");
        return;
      }
      setDownloadMsg("出错: " + err.message);
      setDownloadStatus("error");
    }
  };

  const handleBatchDownload = () => runZipDownload(false);
  const handleCompatibleDownload = () => runZipDownload(true);

  // 应急下载：逐个触发浏览器下载（不打包 zip）
  const handleEmergencyDownload = async () => {
    const timeline = profile?.timeline || [];
    if (timeline.length === 0) return;
    if (
      !window.confirm(
        `即将开始下载 ${timeline.length} 个文件，浏览器可能会提示“允许下载多个文件”，请点击允许。`,
      )
    )
      return;
    setDownloadStatus("loading");
    setDownloadMsg("正在启动批量下载...");
    try {
      for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        const name = makeDlName(item, i);
        setDownloadMsg(`推送 (${i + 1}/${timeline.length}) ${name}`);
        try {
          const resp = await fetch(dlUrlOf(item));
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          // fetch 失败则交给浏览器直接打开
          window.open(dlUrlOf(item), "_blank");
        }
      }
      setDownloadMsg("已全部移交浏览器下载队列");
      setDownloadStatus("success");
      setTimeout(() => {
        setDownloadMsg("");
        setDownloadStatus("");
      }, 3000);
    } catch (err) {
      setDownloadMsg("出错: " + err.message);
      setDownloadStatus("error");
    }
  };

  if (!(profile?.timeline?.length > 0)) {
    return <HelpPage onClick={handleSetProfile} />;
  }

  return (
    <main>
      <div className="mb-4 flex flex-col space-y-2">
        {/* 第一行：展开全部 + 收藏 + 更新 + 屏蔽 + 修改标签 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAll(true)}
            className="flex-1 min-w-[90px] py-2 px-2 flex items-center justify-center bg-green-100 text-green-700 rounded-md hover:bg-green-500 hover:text-white transition-colors duration-200 text-sm font-medium"
          >
            <span>展开全部 ({profile?.timeline?.length || 0})</span>
          </button>

          <button
            onClick={handleFavorite}
            className={`flex-1 min-w-[80px] py-2 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 text-sm font-medium ${
              favMap?.[username]
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 hover:bg-yellow-500 text-yellow-700"
            }`}
          >
            <span>{favMap?.[username] ? "★ 已收藏" : "☆ 收藏"}</span>
          </button>

          <button
            onClick={handleRefreshUser}
            className="flex-1 min-w-[80px] py-2 px-2 flex items-center justify-center bg-blue-100 text-blue-700 rounded-md hover:bg-blue-500 hover:text-white transition-colors duration-200 text-sm font-medium"
            aria-label="更新"
          >
            <span>{refreshMsg || "更新"}</span>
          </button>

          <button
            onClick={handleBlockUser}
            className={`flex-1 min-w-[80px] py-2 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 text-sm font-medium ${
              username && blockMap[username]
                ? "bg-red-500 text-white"
                : "bg-red-100 hover:bg-red-500 text-red-700"
            }`}
            aria-label="屏蔽用户"
          >
            <span>{username && blockMap[username] ? "取消屏蔽" : "屏蔽"}</span>
          </button>

          <button
            onClick={handleModifyTagsClick}
            disabled={loadingTags}
            className={`py-2 px-3 flex items-center justify-center rounded-md border border-gray-300 transition-colors duration-200 text-sm font-medium ${
              loadingTags
                ? "bg-gray-100 cursor-wait text-gray-400"
                : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            }`}
            title="修改标签"
          >
            <span>{loadingTags ? "加载中..." : "🏷 修改标签"}</span>
          </button>
        </div>

        {/* 第二行：下载按钮组（三个平分一行） */}
        <div className="flex gap-1">
          <button
            onClick={handleBatchDownload}
            disabled={downloadStatus === "loading"}
            title="流式打包下载，适合大文件（PC 首选）"
            className={`flex-1 py-2 px-2 flex items-center justify-center rounded-md transition-colors duration-200 text-sm font-medium ${
              downloadStatus === "loading"
                ? "bg-gray-300 text-gray-500 cursor-wait"
                : downloadStatus === "success"
                ? "bg-green-500 text-white"
                : downloadStatus === "error"
                ? "bg-red-100 text-red-700 hover:bg-red-500 hover:text-white"
                : "bg-indigo-100 text-indigo-700 hover:bg-indigo-500 hover:text-white"
            }`}
          >
            {downloadStatus === "loading"
              ? "⏬ 下载中..."
              : downloadStatus === "success"
              ? "✓ 完成"
              : downloadStatus === "error"
              ? "✗ 重试"
              : "⬇ 下载全部"}
          </button>
          <button
            onClick={handleCompatibleDownload}
            disabled={downloadStatus === "loading"}
            title="兼容模式：强制打包成 Blob 下载"
            className={`flex-1 py-2 px-2 flex items-center justify-center rounded-md transition-colors duration-200 text-sm font-medium ${
              downloadStatus === "loading"
                ? "bg-gray-300 text-gray-500 cursor-wait"
                : "bg-green-100 text-green-700 hover:bg-green-500 hover:text-white"
            }`}
          >
            兼容下载
          </button>
          <button
            onClick={handleEmergencyDownload}
            disabled={downloadStatus === "loading"}
            title="应急下载：不打包，逐个触发浏览器下载"
            className={`flex-1 py-2 px-2 flex items-center justify-center rounded-md transition-colors duration-200 text-sm font-medium ${
              downloadStatus === "loading"
                ? "bg-gray-300 text-gray-500 cursor-wait"
                : "bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white"
            }`}
          >
            应急下载
          </button>
          {downloadMsg && (
            <p className="w-full text-xs text-gray-500">{downloadMsg}</p>
          )}
        </div>

        {/* 第三行：媒体类型筛选（全部 / 图片 / 视频） */}
        <div className="flex space-x-2">
          {[
            { key: "all", label: "全部媒体" },
            { key: "photo", label: "仅看图片" },
            { key: "video", label: "仅看视频 (点击直连播放)" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMediaFilter(tab.key)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                mediaFilter === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 第四行：表情投票组 */}
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            {
              emoji: "😍",
              bg: "bg-red-100",
              text: "text-red-700",
              hover: "hover:bg-red-500 hover:text-white",
            },
            {
              emoji: "😋",
              bg: "bg-orange-100",
              text: "text-orange-700",
              hover: "hover:bg-orange-500 hover:text-white",
            },
            {
              emoji: "😱",
              bg: "bg-purple-100",
              text: "text-purple-700",
              hover: "hover:bg-purple-500 hover:text-white",
            },
            {
              emoji: "🤢",
              bg: "bg-green-100",
              text: "text-green-700",
              hover: "hover:bg-green-600 hover:text-white",
            },
            {
              emoji: "🐷",
              bg: "bg-pink-100",
              text: "text-pink-700",
              hover: "hover:bg-pink-500 hover:text-white",
            },
            {
              emoji: "😅",
              bg: "bg-cyan-100",
              text: "text-cyan-700",
              hover: "hover:bg-cyan-500 hover:text-white",
            },
            {
              emoji: "💩",
              bg: "bg-amber-100",
              text: "text-amber-700",
              hover: "hover:bg-amber-500 hover:text-white",
            },
          ].map((item) => {
            const isVoting = votingEmoji === item.emoji;
            const count = emojiCounts[item.emoji] || 0;

            return (
              <button
                key={item.emoji}
                onClick={() => handleEmojiVote(item.emoji)}
                disabled={!!votingEmoji}
                className={`flex-1 shrink-0 min-w-[60px] py-2 px-2 flex items-center justify-center rounded-md transition-colors duration-200 ${
                  isVoting
                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                    : `${item.bg} ${item.text} ${item.hover}`
                }`}
                title={`为 ${item.emoji} 投票`}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="ml-1 text-sm font-bold">
                  {isVoting ? "..." : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <TagDisplayArea tags={userTags} />

      <MediaList
        timeline={profile?.timeline}
        showAll={showAll}
        mediaFilter={mediaFilter}
      />

      <TagSelectorModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onConfirm={handleConfirmTags}
        username={username}
        initialValues={userTags}
      />
    </main>
  );
};

// 主布局组件（已移除顶部与底部旧广告栏）
const ResponsiveLayout = () => {
  const isMobile = useScreenMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [gayMode, toggleGayMode] = useGayMode();

  useFixedImageProxy();

  const [ranking, setRanking] = useState(false);

  useEffect(() => {
    const fullPath = window.location.pathname;
    const parts = fullPath.split("/");
    const firstNonEmptyPart = parts.find((elem) => elem !== "");
    if (firstNonEmptyPart) {
      getMetaData(firstNonEmptyPart)
        .then((data) => setProfile(data))
        .catch((err) => console.error("加载初始用户失败:", err));
    }
  }, []);

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);
  const closeDrawer = () => setDrawerOpen(false);

  const handleSetProfile = (nextProfile) => {
    const name =
      nextProfile?.account_info?.name || nextProfile?.username || "";
    if (name) {
      window.history.pushState({}, null, "/" + name);
    }
    setProfile(nextProfile);
    setRanking(false);
  };

  const onClickHome = () => {
    window.history.pushState({}, null, "/");
    setProfile(null);
    setRanking(false);
  };

  const onClickRanking = () => {
    window.history.pushState({}, null, "/");
    setProfile(null);
    setRanking(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      <div
        className={`flex-1 p-4 overflow-auto ${isMobile ? "w-full" : "w-3/4"}`}
      >
        <div className="mb-4 flex space-x-2">
          <button
            onClick={onClickHome}
            className="flex-1 py-2 px-3 flex items-center justify-center bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-blue-500 hover:text-white transition-colors duration-200 shadow-sm"
          >
            <span className="font-medium">🏠 返回主页</span>
          </button>

          <button
            onClick={onClickRanking}
            className="flex-1 py-2 px-3 flex items-center justify-center bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-purple-500 hover:text-white transition-colors duration-200 shadow-sm"
          >
            <span className="font-medium">📊 排行榜</span>
          </button>

          <button
            onClick={toggleGayMode}
            className={`flex-1 py-2 px-3 flex items-center justify-center rounded-md transition-colors duration-200 shadow-sm ${
              gayMode
                ? "bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 font-semibold"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-200"
            }`}
            title="切换 Gay 模式（显示男同/男性/露屌等标签）"
          >
            <span className="text-base mr-1">🌈</span>
            <span className="font-medium">
              {gayMode ? "Gay模式 (开)" : "Gay模式"}
            </span>
          </button>
        </div>

        {ranking && profile === null ? (
          <Ranking handleSetProfile={handleSetProfile} />
        ) : (
          <Main profile={profile} handleSetProfile={handleSetProfile} />
        )}

        {/* 免责与协议（2026-10-22 加） */}
        <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 pb-6">
          <p className="mb-1">
            <a href="#terms" className="mr-2 hover:text-gray-600">Terms of Service</a>
            <span>·</span>
            <a href="#privacy" className="mx-2 hover:text-gray-600">Privacy Policy</a>
            <span>·</span>
            <a href="mailto:DMCA@moonchan.xyz" className="ml-2 hover:text-gray-600">DMCA</a>
          </p>
          <p>🔞 本网站包含成人内容，仅限年满 18 周岁的成年人访问。</p>
        </footer>
      </div>

      {!isMobile && (
        <div className="w-1/4 p-4 bg-white border-l border-gray-200 overflow-auto">
          <SideBar onClick={(data) => handleSetProfile(data)} />
        </div>
      )}

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

      {isMobile && (
        <>
          {drawerOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={closeDrawer}
            />
          )}

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
                ✕
              </button>
            </div>
            <div className="overflow-auto h-full p-2">
              <SideBar
                onClick={(nextProfile) => {
                  closeDrawer();
                  handleSetProfile(nextProfile);
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
