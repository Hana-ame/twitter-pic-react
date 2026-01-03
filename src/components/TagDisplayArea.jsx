import React, { useMemo } from "react";
import { extractDisplayTags, PRESET_CATEGORIES } from "../utils/extract.js"; 

const TagDisplayArea = ({ tags }) => {
  // 使用 useMemo 避免每次渲染都重新计算
  const displayList = useMemo(() => {
    return extractDisplayTags(tags, PRESET_CATEGORIES);
  }, [tags]);

  if (displayList.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
      {displayList.map((item) => {
        // 根据 isPreset 渲染不同的样式
        if (item.isPreset) {
          return (
            <span
              key={`${item.categoryTitle}-${item.name}`} // 确保唯一key
              className="px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center"
              title={`权重: ${item.score}`}
            >
              {item.name}
            </span>
          );
        } else {
          return (
            <span
              key={item.name}
              className="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200"
              title={`权重: ${item.score}`}
            >
              {item.name}
            </span>
          );
        }
      })}
    </div>
  );
};

export default TagDisplayArea;
