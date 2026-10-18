import React, { useState, useRef, useEffect } from "react";
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { getBatchUsers } from "../api/getUserList";
import Header from "./Header";

const FavList = ({ onClick }) => {
  const [favMap, setFavMap] = useLocalStorage("fav-map", {});
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [cardsMap, setCardsMap] = useState({});
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [importText, showImport]);

  const [limit, setLimit] = useState(15);
  const allUsernames = Object.keys(favMap).reverse();
  const visibleUsernames = allUsernames.slice(0, limit);

  // 批量水合当前可见收藏用户的富卡片（优先命中本地缓存，缺失项合并为 1 次 /v2/users/batch 请求）
  useEffect(() => {
    if (visibleUsernames.length === 0) return;
    let cancelled = false;
    getBatchUsers(visibleUsernames).then((res) => {
      if (!cancelled) {
        setCardsMap((prev) => ({ ...prev, ...res }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favMap, limit]);

  const handleExport = () => {
    const baseUrl = `${window.location.origin}/`;
    const textToCopy = Object.keys(favMap)
      .map((key) => baseUrl + key)
      .join("\n");

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => alert("已复制到剪贴板"))
      .catch((err) => console.error("复制失败: ", err));
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n").filter((line) => line.trim());
    const newFavMap = { ...favMap };
    let cnt = 0;

    lines.forEach((line) => {
      const cleanLine = line.trim();
      const parts = cleanLine.replace(/\/+$/, "").split("/");
      const key = parts.pop();
      if (key && !key.includes(".") && !key.includes(":")) {
        newFavMap[key] = true;
        cnt++;
      }
    });

    setFavMap(newFavMap);
    setImportText("");
    setShowImport(false);
    alert(`成功导入 ${cnt} 个收藏`);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        {visibleUsernames.map((username) => (
          <Header
            key={username}
            username={username}
            userCard={cardsMap[username]}
            onClick={onClick}
          />
        ))}

        {limit < allUsernames.length && (
          <button
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-300 ease-in-out flex items-center justify-center w-full h-14 mt-4"
            onClick={() => setLimit((prev) => prev + 20)}
          >
            加载更多 ({visibleUsernames.length} / {allUsernames.length})
          </button>
        )}
      </div>

      <div className="flex w-full space-x-2">
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          导出收藏
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          {showImport ? "取消导入" : "导入收藏"}
        </button>
      </div>

      {showImport && (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`每行一个URL，例如：https://${window.location.host}/username`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            style={{ minHeight: "80px" }}
          />
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            确认导入
          </button>
        </div>
      )}
    </div>
  );
};

export default FavList;
