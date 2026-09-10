import { useEffect, useState, useRef } from "react";
import { DEFAULT_IMAGE_PROXY, DEFAULT_VIDEO_PROXY } from "../api/endpoints";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
// import { delay } from "../Tools/utils"; // 26-09-08: 旧版已不需要
import { testLatency } from "../Tools/network/testLatency";
import useMoonchanProbe from "../hooks/useMoonchanProbe";
import { client as peerMediaClient, DEFAULT_SIGNALING } from "../api/peerMedia";
import { CONFIG_MODE_KEY, MODE_AUTO, MODE_MANUAL } from "../api/probe";

// 26-09-08: 配置模式 — 自动档 (探测自动选源) / 手动档 (自己填, 探测不许覆盖)
const MODE_KEY = CONFIG_MODE_KEY;

const AutoConfig = () => {
  const { current: now } = useRef(Date.now());

  const [image, setImage] = useLocalStorage(
    "image-proxy-v5",
    DEFAULT_IMAGE_PROXY
  );
  const [video, setVideo] = useLocalStorage(
    "video-proxy-v5",
    DEFAULT_VIDEO_PROXY
  );

  useMoonchanProbe();

  const [ts, setTS] = useLocalStorage("first-visit-at", now);

  useEffect(() => {
    if (ts === now) {
      setImage("https://pbs.moonchan.xyz");
      setVideo("https://pbs.moonchan.xyz");
      setTS(now);
    }
  }, []);

  return null;
};

// ====== 模式切换按钮 ======
function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex items-center gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => onModeChange(MODE_AUTO)}
        className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
          mode === MODE_AUTO
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        自动档
      </button>
      <button
        onClick={() => onModeChange(MODE_MANUAL)}
        className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
          mode === MODE_MANUAL
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        手动档
      </button>
    </div>
  );
}

const ConfigItem = ({ value, url, label, note, noteColor, onClick, noTest, disabled }) => {
  const [latency, setLatency] = useState(-1);
  const [color, setColor] = useState(["text-gray-400", "bg-gray-400"]);

  useEffect(() => {
    if (noTest) {
      setColor(["text-gray-600 invisible", "bg-gray-400"]);
      return;
    }
    const f = async () => {
      const [d, isFailed] = await testLatency(url + "/favicon.ico", {
        mode: "cors",
      });
      setLatency(d);
      if (isFailed || d < 100 || d > 2250) {
        setColor(["text-red-600", "bg-red-600"]);
      } else {
        setColor(["text-green-600", "bg-green-600"]);
      }
    };
    f();
  }, []);

  const isActive = value === url;
  const displayLabel = label || url;
  const finalNoteColor = noteColor || "text-amber-600";

  const bgClass = disabled
    ? isActive
      ? "bg-blue-50 border-blue-300 opacity-70"
      : "bg-gray-50 opacity-50"
    : isActive
    ? "bg-blue-50 border-blue-300 shadow-sm"
    : "hover:bg-gray-50";

  const cursorClass = disabled ? "cursor-not-allowed" : "cursor-pointer";

  return (
    <div
      className={`flex items-center w-full p-3 rounded-lg border border-gray-200 transition-all duration-200 ${cursorClass} ${bgClass}`}
      onClick={() => { if (!disabled) onClick(url); }}
    >
      <span className={`w-5 flex-shrink-0 flex items-center justify-center ${isActive ? "" : "invisible"}`}>
        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`block text-sm font-medium truncate ${
            isActive ? "text-blue-600" : "text-gray-700"
          }`}
        >
          {displayLabel}
        </span>
        {note && (
          <span className={`block text-xs mt-0.5 truncate ${finalNoteColor}`} title={note}>
            {note}
          </span>
        )}
      </div>
      <div className={`flex items-center space-x-2 ml-2 flex-shrink-0 ${color[0]}`}>
        <span
          className={`text-sm font-mono ${
            latency === -1 ? "animate-pulse" : ""
          }`}
        >
          {latency === -1 ? "测试中..." : `${Math.floor(latency)}ms`}
        </span>
        <div className={`w-2 h-2 rounded-full ${color[1]}`} />
      </div>
    </div>
  );
};

// 26-09-08: 图片源固定 pbs.moonchan.xyz, 无需配置。保留组件供兼容, HelpPage 已注释掉。
const ImageConfig = () => {
  const [imgProxy] = useLocalStorage("image-proxy-v5", DEFAULT_IMAGE_PROXY);

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">图片源</h3>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">pbs.moonchan.xyz</span>
        <span className="text-xs text-green-500">● 固定</span>
      </div>
      <p className="text-xs text-gray-400">图片源固定使用 pbs.moonchan.xyz，无需配置。</p>
    </div>
  );
};

const VideoConfig = () => {
  const [vidProxy, setVidProxy] = useLocalStorage(
    "video-proxy-v5",
    DEFAULT_VIDEO_PROXY
  );
  const [mode, setMode] = useLocalStorage(MODE_KEY, MODE_AUTO);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");

  // ech-proxy 开启检测: 探测 twimg.l.moonchan.xyz:8443/favicon.ico
  // 能通 → "已开启" (绿), 不通 → "需下载 APK/EXE" (黄)
  const [echStatus, setEchStatus] = useState("checking"); // checking | enabled | disabled

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch("https://twimg.l.moonchan.xyz:8443/favicon.ico", {
      signal: controller.signal,
      mode: "no-cors", // 不需要读响应, 只要能通就算开启
    })
      .then((res) => setEchStatus("enabled"))
      .catch(() => setEchStatus("disabled"))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const echNote =
    echStatus === "checking"
      ? "检测中..."
      : echStatus === "enabled"
      ? "已开启"
      : "需下载 APK/EXE";
  const echNoteColor =
    echStatus === "enabled" ? "text-green-600" : "text-amber-600";

  // 预设选项。手动档整列可点; 自动档同列表灰色不可点, 只表示当前源。
  const predefinedOptions = [
    { url: "https://video.twimg.com", label: "原站" },
    { url: "https://twimg.l.moonchan.xyz:8443", label: "ech-proxy", note: echNote, noteColor: echNoteColor, noTest: true },
    { url: "peerjs", label: "PeerJS", note: "需配置 Peer ID", noTest: true },
  ];

  // 当前源不在预设里 → 用的是自定义地址
  const isCustomUrl = !!vidProxy && !predefinedOptions.some((opt) => opt.url === vidProxy);
  // 自定义条目占位 url: 未启用时它不等于任何源, 所以不会误打勾。
  const CUSTOM_SENTINEL = "__custom__";

  // 点预设项: 选中并收起自定义编辑器
  const selectPreset = (url) => {
    setVidProxy(url);
    setShowCustomInput(false);
  };

  // 点"自定义": 只负责展开输入框, 不改动当前源
  const openCustomEditor = () => {
    setCustomUrlInput(isCustomUrl ? vidProxy : "");
    setShowCustomInput(true);
  };

  const handleCustomSubmit = () => {
    const v = customUrlInput.trim();
    if (!v) return;
    setVidProxy(v);
    // 填回去就等于某个预设 → 收起编辑器, 高亮那一行
    setShowCustomInput(!predefinedOptions.some((opt) => opt.url === v));
  };

  const handleCustomCancel = () => {
    setShowCustomInput(false);
    setCustomUrlInput("");
  };

  const renderPresets = (disabled, onSelect) =>
    predefinedOptions.map((opt) => (
      <ConfigItem
        key={opt.url}
        value={vidProxy}
        url={opt.url}
        label={opt.label}
        note={opt.note}
        noteColor={opt.noteColor}
        onClick={onSelect}
        noTest={opt.noTest || false}
        disabled={disabled}
      />
    ));

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">视频源</h3>

      <ModeToggle mode={mode} onModeChange={setMode} />

      {mode === MODE_AUTO ? (
        // 自动档: 只读展示, 当前源打勾 (自定义源也列出)
        <div className="space-y-1">
          {renderPresets(true, setVidProxy)}
          {isCustomUrl && (
            <ConfigItem
              value={vidProxy}
              url={vidProxy}
              label="自定义"
              note={vidProxy}
              onClick={() => {}}
              noTest
              disabled
            />
          )}
        </div>
      ) : (
        // 手动档: 列表常驻, 点"自定义"在它下面展开输入框
        <div className="space-y-2">
          {renderPresets(false, selectPreset)}

          <ConfigItem
            value={vidProxy}
            url={isCustomUrl ? vidProxy : CUSTOM_SENTINEL}
            label="自定义"
            note={isCustomUrl ? vidProxy : "手动填写代理地址"}
            onClick={openCustomEditor}
            noTest
          />

          {showCustomInput && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomSubmit();
                  if (e.key === "Escape") handleCustomCancel();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="https://your-proxy.com"
                autoFocus
              />
              <p className="text-xs text-gray-400">替换 video.twimg.com 部分</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCustomSubmit}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  确认
                </button>
                <button
                  onClick={handleCustomCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PeerJSConfig = () => {
  const [peerId, setPeerId] = useLocalStorage("peerjs-peer-id", "");
  const [signalingHost, setSignalingHost] = useLocalStorage("peerjs-signaling-host", "0.peerjs.com");
  const [signalingPort, setSignalingPort] = useLocalStorage("peerjs-signaling-port", "443");
  const [signalingKey, setSignalingKey] = useLocalStorage("peerjs-signaling-key", "peerjs");

  const [testState, setTestState] = useState({ status: "idle", latency: null, error: null });
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

const Config = { ImageConfig, VideoConfig, AutoConfig, ConfigItem, ModeToggle, PeerJSConfig };
export default Config;
