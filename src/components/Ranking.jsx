import React, { useState, useEffect } from "react";
import { getRanking } from "../api/emojis";
import Header from "./Header";

const Ranking = ({ handleSetProfile }) => {
  const [data, setData] = useState({});
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeEmoji, setActiveEmoji] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getRanking();
        const rankings = res?.rankings || {};
        setData(rankings);
        setUsersMap(res?.users || {});
        const keys = Object.keys(rankings);
        if (keys.length > 0 && !activeEmoji) {
          setActiveEmoji(keys[0]);
        }
      } catch (error) {
        console.error("获取排行榜数据失败:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderList = (title, listData) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">{title}</h3>
      </div>

      <div className="divide-y divide-gray-50">
        {listData && listData.length > 0 ? (
          listData.map((item, index) => (
            <div
              key={item.username}
              className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center w-full min-w-0">
                <div
                  className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
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
                <div className="flex-1 min-w-0">
                  <Header
                    username={item.username}
                    userCard={usersMap[item.username]}
                    onClick={handleSetProfile}
                  />
                </div>
              </div>
              <div className="text-sm flex-shrink-0 ml-2">
                <span className="text-blue-600 font-bold mr-0.5">
                  {item.votes}
                </span>
                <span className="text-gray-400">票</span>
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
      <div className="flex justify-center flex-wrap gap-2 mb-6">
        {emojiKeys.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setActiveEmoji(emoji)}
            className={`w-12 h-12 text-2xl rounded-lg transition-all duration-200 flex items-center justify-center focus:outline-none ${
              activeEmoji === emoji
                ? "bg-blue-100 shadow-sm border border-blue-200 scale-110"
                : "bg-gray-100 hover:bg-gray-200 border border-transparent"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {activeEmoji && data[activeEmoji] ? (
        <div className="space-y-6">
          {renderList("📅 日榜", data[activeEmoji].day)}
          {renderList("📆 周榜", data[activeEmoji].week)}
          {renderList("🗓 月榜", data[activeEmoji].month)}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-10">
          请选择上方表情查看对应排行榜
        </div>
      )}
    </div>
  );
};

export default Ranking;
