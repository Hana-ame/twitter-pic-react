import React, { useState, useEffect } from "react";
import { FIXED_IMAGE_PROXY, FIXED_VIDEO_PROXY } from "../api/endpoints";
import {
  getLocalCacheStats,
  clearAllLocalCache,
} from "../api/clientCache";

const ImageConfig = () => {
  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-2 text-left">
      <h3 className="text-sm font-semibold text-gray-700">资源与视频访问架构</h3>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">{FIXED_IMAGE_PROXY}</span>
        <span className="text-xs text-green-600 font-medium">● 唯一资源 CDN</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        所有图片、用户头像及视频封面（<code>cover</code>）直接将 host 替换为{" "}
        <code>pbs.moonchan.xyz</code> 加载；点击视频封面直接打开{" "}
        <code>{FIXED_VIDEO_PROXY}/&lt;path&gt;?&lt;query&gt;</code> 上的原始视频，
        链接即最终播放地址，无任何中间 302（2026-10-23 起已移除 ouo.io 广告与后端跳转端点）。
      </p>
    </div>
  );
};

const CacheConfig = () => {
  const [stats, setStats] = useState(() => getLocalCacheStats());

  useEffect(() => {
    setStats(getLocalCacheStats());
  }, []);

  const handleClear = () => {
    clearAllLocalCache();
    setStats(getLocalCacheStats());
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-2 text-left">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">本地缓存管理</h3>
        <button
          onClick={handleClear}
          className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
        >
          清空本地缓存
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div>已缓存用户卡片：{stats.userCards} 个</div>
        <div>已缓存时间线：{stats.timelines} 个</div>
      </div>
      <p className="text-xs text-gray-400">
        配合 Cloudflare 边缘缓存（<code>?t=last_modify</code>）与本地{" "}
        <code>localStorage</code> 双层缓存，二次访问秒开。
      </p>
    </div>
  );
};

const Config = { ImageConfig, CacheConfig };
export default Config;
