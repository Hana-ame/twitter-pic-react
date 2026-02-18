import React, { useState, useEffect } from "react";
import { getRanking } from "../api/emojis.ts";

import Header from "./Header.jsx";

/**
 * Ranking 组件重构思路：
 * 1. 顶部 Tab 改为 Emoji 选择器，遍历 data 的 key 生成按钮。
 * 2. 选中某个 Emoji 后，下方同时展示该 Emoji 的 Day、Week、Month 三个榜单。
 * 3. 榜单采用纵向排列，移动端适配良好。
 * 4. 保持朴素统一的 UI 风格。
 */

const Ranking = ({ handleSetProfile }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeEmoji, setActiveEmoji] = useState(null); // 当前选中的表情

  // 初始化获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const json = await getRanking();
        setData(json || {});

        // 26.02.18 观感太差
        // 默认选中第一个 Emoji
        // const keys = Object.keys(json || {});
        // if (keys.length > 0) {
        //   setActiveEmoji(keys[0]);
        // }
      } catch (error) {
        console.error("获取排行榜数据失败:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 渲染单个榜单列表
  const renderList = (title, listData) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* 榜单标题 */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">{title}</h3>
          {/* <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {listData?.length || 0} 人参与
          </span> */}
        </div>

        {/* 列表内容 */}
        <div className="divide-y divide-gray-50">
          {listData && listData.length > 0 ? (
            listData.map((item, index) => (
              <div
                key={item.username}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center w-full">
                  {/* 排名徽章 */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      index === 0
                        ? "bg-yellow-400 text-white shadow-sm"
                        : index === 1
                          ? "bg-gray-300 text-white"
                          : index === 2
                            ? "bg-orange-300 text-white"
                            : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-gray-800 group-hover:text-blue-600 transition-colors font-medium w-full">
                    {/* @{item.username} */}
                    <Header key={item.username} username={item.username} onClick={handleSetProfile} />
                  </span>
                </div>
                {/* 票数 */}
                <div className="text-sm">
                  <span className="text-blue-600 font-bold mr-0.5">
                    {item.votes}
                  </span>
                  <span className="text-gray-300">票</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-gray-300 text-sm">
              暂无数据
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const emojiKeys = Object.keys(data);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* 第一部分：表情选择器 Tab */}
      <div className="flex justify-center flex-wrap gap-2 mb-6">
        {emojiKeys.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setActiveEmoji(emoji)}
            className={`
              w-12 h-12 text-2xl rounded-lg transition-all duration-200 flex items-center justify-center
              focus:outline-none
              ${
                activeEmoji === emoji
                  ? "bg-blue-100 shadow-sm border border-blue-200 scale-110"
                  : "bg-gray-100 hover:bg-gray-200 border border-transparent"
              }
            `}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 第二部分：榜单内容区域 */}
      {activeEmoji && data[activeEmoji] ? (
        <div className="space-y-6">
          {/* 日榜 */}
          {renderList("📅 日榜", data[activeEmoji].day)}
          {/* 周榜 */}
          {renderList("📆 周榜", data[activeEmoji].week)}
          {/* 月榜 */}
          {renderList("🗓 月榜", data[activeEmoji].month)}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-10">暂无排行数据</div>
      )}
    </div>
  );
};

export default Ranking;
