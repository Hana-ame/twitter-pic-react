import React, { useState, useEffect } from "react";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react"; // 假设使用 lucide-react 图标库，如果没有可用文字代替

const STORAGE_KEY = "tag-rules";

interface TagSettings {
  highlight: string[];
  block: string[];
}

const TagController = () => {
  const [inputValue, setInputValue] = useState("");
  const [highlight, setHighlight] = useState<string[]>([]);
  const [block, setBlock] = useState<string[]>([]);

  // 1. 初始化：从 LocalStorage 读取
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed: TagSettings = JSON.parse(savedData);
        setHighlight(parsed.highlight || []);
        setBlock(parsed.block || ["无关内容"]);
      } catch (e) {
        console.error("Failed to parse tag settings", e);
      }
    }
  }, []);

  // 2. 监听变化：保存到 LocalStorage
  useEffect(() => {
    const data: TagSettings = { highlight, block };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [highlight, block]);

  // 添加 Tag 的逻辑 (type: 'highlight' | 'block')
  const addTag = (type: "highlight" | "block") => {
    const tag = inputValue.trim();
    if (!tag) return;

    if (type === "highlight") {
      // 如果存在于屏蔽列表，先移除
      setBlock((prev) => prev.filter((t) => t !== tag));
      // 添加到高亮列表（去重）
      setHighlight((prev) => Array.from(new Set([...prev, tag])));
    } else {
      // 如果存在于高亮列表，先移除
      setHighlight((prev) => prev.filter((t) => t !== tag));
      // 添加到屏蔽列表（去重）
      setBlock((prev) => Array.from(new Set([...prev, tag])));
    }
    setInputValue("");
  };

  const removeTag = (tag: string, type: "highlight" | "block") => {
    if (type === "highlight") {
      setHighlight((prev) => prev.filter((t) => t !== tag));
    } else {
      setBlock((prev) => prev.filter((t) => t !== tag));
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">标签显示控制</h3>

      {/* 输入区域 */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag("highlight")}
          placeholder="输入标签名称..."
          className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 按钮区域 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => addTag("highlight")}
          disabled={!inputValue.trim()}
          className="flex-1 flex items-center justify-center gap-1 bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 disabled:opacity-50 transition"
        >
          <Eye size={16} /> 高亮
        </button>
        <button
          onClick={() => addTag("block")}
          disabled={!inputValue.trim()}
          className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 disabled:opacity-50 transition"
        >
          <EyeOff size={16} /> 屏蔽
        </button>
      </div>

      <div className="space-y-4">
        {/* 高亮列表 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            高亮显示 ({highlight.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {highlight.length === 0 && (
              <span className="text-xs text-gray-400">无高亮标签</span>
            )}
            {highlight.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-sm rounded border border-green-200"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag, "highlight")}
                  className="hover:text-green-900"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 屏蔽列表 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            已屏蔽 ({block.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {block.length === 0 && (
              <span className="text-xs text-gray-400">无屏蔽标签</span>
            )}
            {block.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag, "block")}
                  className="hover:text-red-900"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagController;
