import { useEffect, useState, useRef } from "react";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { delay } from "../Tools/utils";
import { testLatency } from "../Tools/network/testLatency";
import useMoonchanProbe from "../hooks/useMoonchanProbe";
import { client as peerMediaClient, DEFAULT_SIGNALING } from "../api/peerMedia";

// 定义常量，避免在组件内部重复创建数组
// 26-09-08: 移除 pbs-t-*/video-t-* 备源, 只保留 pbs.twimg.com 主源

const AutoConfig = () => {
  // 1. 生成时间戳
  // 使用 useRef 确保在组件的整个生命周期内 'now' 的值保持不变
  // 如果直接用 Date.now()，组件每次重渲染时间都会变，会导致下方判断逻辑失效
  const { current: now } = useRef(Date.now());

  const [image, setImage] = useLocalStorage(
    "image-proxy-v5",
    DEFAULT_IMAGE_PROXY
  );
  const [video, setVideo] = useLocalStorage(
    "video-proxy-v5",
    DEFAULT_VIDEO_PROXY
  );

  // 26-09-08: 探测 moonchan 备份 CDN 是否健康; 若是, 把图片/视频源切过去。
  // 与 App.jsx Main 里的 hook 重复调用没问题 —— probe.ts 内部有 5 分钟节流。
  useMoonchanProbe();

  // 如果本地存储中没有 'first-visit-at'，useLocalStorage 会使用默认值 'now'
  // 如果本地存储中有值，ts 就会等于旧的时间戳
  const [ts, setTS] = useLocalStorage("first-visit-at", now);
  
  useEffect(() => {
    const getRandomProxy = (arr) => {
      return arr[Math.floor(Math.random() * arr.length)];
    };

    // 修改初始化条件
    // 逻辑：如果从存储中取出的 ts 等于我们本次初始化的 now，
    // 说明本地存储中之前没有数据（这是第一次访问），触发初始化配置。
    if (ts === now) {
      console.log("检测到首次访问或配置丢失，正在初始化随机代理...");
      // setImage(getRandomProxy(IMAGE_PROXIES));
      // setVideo(getRandomProxy(VIDEO_PROXIES));
      // 26-09-08: 首次访问初始化, 与 DEFAULT_*_PROXY 保持一致
      setImage("https://pbs.moonchan.xyz");
      setVideo("https://pbs.moonchan.xyz");

      // 注意：useLocalStorage 通常在初始化默认值时就会自动写入 localStorage，
      // 所以这里不需要显式调用 setTS(now)，除非你的 hook 行为不同。
      setTS(now);
    }
  }, []); // 补全依赖数组

  return null;
};

const ConfigItem = ({ value, url, onClick, noTest }) => {
  const [latency, setLatency] = useState(-1);
  const [color, setColor] = useState(["text-gray-400", "bg-gray-400"]);

  useEffect(() => {
    if (noTest) {
      setColor(["text-gray-600 invisible", "bg-gray-400"]);
      return;
    }

    const f = async () => {
      const [delay, isFailed] = await testLatency(url + "/favicon.ico", {
        mode: "cors",
      });
      setLatency(delay);
      if (isFailed || delay < 100 || delay > 2250) {
        setColor(["text-red-600", "bg-red-600"]);
      } else {
        setColor(["text-green-600", "bg-green-600"]);
      }
    };

    f();

    return;
  }, []);

  const isActive = value === url;

  return (
    <div
      className={`flex justify-between items-center w-full p-3 rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer ${
        isActive ? "bg-blue-50 border-blue-300 shadow-sm" : "hover:bg-gray-50"
      }`}
      onClick={() => onClick(url)}
    >
      {/* 左边URL显示 */}
      <div className="flex items-center">
        <span
          className={`text-sm text-gray-500 truncate max-w-[200px] ${
            isActive ? "text-blue-600" : ""
          }`}
        >
          {url}
        </span>
      </div>

      {/* 右边延迟显示 */}
      <div className={`flex items-center space-x-2 ${color[0]}`}>
        <span
          className={`text-sm font-mono ${
            latency === -1 ? "animate-pulse" : ""
          }`}
        >
          {latency === -1 ? "测试中..." : `${Math.floor(latency)}ms`}
        </span>
        {/* 状态指示点 */}
        <div className={`w-2 h-2 rounded-full ${color[1]}`} />
      </div>
    </div>
  );
};

const ImageConfig = () => {
  const [imgProxy, setImgProxy] = useLocalStorage(
    "image-proxy-v5",
    DEFAULT_IMAGE_PROXY
  );

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
  ];
  const otherOptions = ["https://pbs.moonchan.xyz", "peerjs"];

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-1">
      {/* 输入框 */}
      <div className="space-y-2">
        <label
          htmlFor="override-input"
          className="block text-sm font-medium text-gray-700"
        >
          设置图源，可以输入自己的代理
        </label>
        <input
          id="override-input"
          type="text"
          value={imgProxy || ""}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="请输入覆盖值"
        />
      </div>

      {officialOptions.map((url) => (
        <ConfigItem
          key={url}
          value={imgProxy}
          url={url}
          onClick={handleButtonClick}
        />
      ))}
      {otherOptions.map((url) => (
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
  const [vidProxy, setVidPorxy] = useLocalStorage(
    "video-proxy-v5",
    DEFAULT_VIDEO_PROXY
  );

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
  ];
  const otherOptions = ["https://pbs.moonchan.xyz", "peerjs"];

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md space-y-1">
      {/* 输入框 */}
      <div className="space-y-2">
        <label
          htmlFor="override-input"
          className="block text-sm font-medium text-gray-700"
        >
          设置视频源，可以输入自己的代理
        </label>
        <input
          id="override-input"
          type="text"
          value={vidProxy || ""}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="请输入覆盖值"
        />
      </div>

      {officialOptions.map((url) => (
        <ConfigItem
          key={url}
          value={vidProxy}
          url={url}
          onClick={handleButtonClick}
        />
      ))}
      {otherOptions.map((url) => (
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

const PeerJSConfig = () => {
  const [peerId, setPeerId] = useLocalStorage("peerjs-peer-id", "");
  const [signalingHost, setSignalingHost] = useLocalStorage("peerjs-signaling-host", "0.peerjs.com");
  const [signalingPort, setSignalingPort] = useLocalStorage("peerjs-signaling-port", "443");
  const [signalingKey, setSignalingKey] = useLocalStorage("peerjs-signaling-key", "peerjs");

  // 26-09-08: 连接测试状态
  const [testState, setTestState] = useState({ status: "idle", latency: null, error: null });

  // 26-09-08: 连接统计 + 缓存统计
  const [connStats, setConnStats] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const getSignaling = () => ({
    host: signalingHost || DEFAULT_SIGNALING.host,
    port: Number(signalingPort) || DEFAULT_SIGNALING.port,
    secure: true,
    key: signalingKey || DEFAULT_SIGNALING.key,
    path: "/",
  });

  // 26-09-08: 定时刷新连接统计
  useEffect(() => {
    if (!peerId) return;
    const interval = setInterval(() => {
      setConnStats(peerMediaClient.getConnectionStatus(peerId, getSignaling()));
      setCacheStats(peerMediaClient.getCacheStats());
    }, 2000);
    return () => clearInterval(interval);
  }, [peerId, signalingHost, signalingPort, signalingKey]);

  const handleClearCache = () => {
    peerMediaClient.clearCache();
    setCacheStats(peerMediaClient.getCacheStats());
  };

  const handleTestConnection = async () => {
    if (!peerId) {
      setTestState({ status: "error", latency: null, error: "请先填写 Peer ID" });
      return;
    }
    setTestState({ status: "testing", latency: null, error: null });
    try {
      const result = await peerMediaClient.testConnection(peerId, getSignaling());
      if (result.success) {
        setTestState({ status: "success", latency: result.latency, error: null });
      } else {
        setTestState({ status: "error", latency: null, error: result.error || "连接失败" });
      }
    } catch (e) {
      setTestState({ status: "error", latency: null, error: e.message || "测试出错" });
    }
  };

  const getStatusDisplay = () => {
    switch (testState.status) {
      case "idle":
        return { text: "未测试", color: "text-gray-400" };
      case "testing":
        return { text: "测试中...", color: "text-blue-500 animate-pulse" };
      case "success":
        return { text: `✓ 连接成功 (${testState.latency}ms)`, color: "text-green-500" };
      case "error":
        return { text: `✗ ${testState.error}`, color: "text-red-500" };
      default:
        return { text: "", color: "" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-3">
      <h3 className="text-lg font-semibold text-gray-700">PeerJS 配置</h3>
      <p className="text-xs text-gray-500">
        选择 "peerjs" 作为图源/视频源时，通过 PeerJS WebRTC DataChannel 从 Node 端 peer 拉取媒体。
        需要先运行 peerdrive-media Node 端服务。
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Node Peer ID</label>
        <input
          type="text"
          value={peerId || ""}
          onChange={(e) => setPeerId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="例如: peerdrive-node-1"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">信令服务器</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={signalingHost || ""}
            onChange={(e) => setSignalingHost(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="0.peerjs.com"
          />
          <input
            type="text"
            value={signalingPort || ""}
            onChange={(e) => setSignalingPort(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="443"
          />
        </div>
        <input
          type="text"
          value={signalingKey || ""}
          onChange={(e) => setSignalingKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="peerjs"
        />
      </div>

      {/* 26-09-08: 连接测试 */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleTestConnection}
          disabled={testState.status === "testing"}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {testState.status === "testing" ? "测试中..." : "测试连接"}
        </button>
        <span className={`text-sm ${statusDisplay.color}`}>
          {statusDisplay.text}
        </span>
      </div>

      {/* 26-09-08: 连接统计 + 缓存统计 */}
      {peerId && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs text-blue-500 hover:text-blue-600 mb-2"
          >
            {showStats ? "▼ 隐藏统计" : "▶ 显示统计"}
          </button>
          {showStats && (
            <div className="space-y-3 text-xs">
              {/* 连接统计 */}
              {connStats && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div className="font-medium text-gray-700 mb-1">连接状态</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">连接</span>
                    <span className={connStats.connected ? "text-green-500" : "text-red-500"}>
                      {connStats.connected ? "已连接" : "未连接"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">在途请求</span>
                    <span>{connStats.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">总请求</span>
                    <span>{connStats.totalRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">成功</span>
                    <span className="text-green-500">{connStats.successRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">失败</span>
                    <span className="text-red-500">{connStats.failedRequests}</span>
                  </div>
                  {connStats.lastError && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">最后错误</span>
                      <span className="text-red-500 truncate ml-2" title={connStats.lastError}>
                        {connStats.lastError}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 缓存统计 */}
              {cacheStats && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700">下载缓存</span>
                    <button
                      onClick={handleClearCache}
                      className="px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">文件数</span>
                    <span>{cacheStats.count} / {cacheStats.maxCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">已用空间</span>
                    <span>
                      {(cacheStats.bytes / 1024 / 1024).toFixed(2)} MB / {(cacheStats.maxBytes / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        默认使用 PeerJS 公共信令服务器 (0.peerjs.com:443/peerjs)。
        也可自建信令服务器: <code>npx peerjs --port 9000</code>
      </p>
    </div>
  );
};

const Config = { ImageConfig, VideoConfig, AutoConfig, ConfigItem, PeerJSConfig };
export default Config;
