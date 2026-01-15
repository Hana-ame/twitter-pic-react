import React, { useEffect, useState } from "react";

// --- 配置常量 ---
const PRESET_CATEGORIES = [
  {
    title: "主体",
    tags: ["男性", "女性", "男女性交", "二次元", "其他", "无关内容"],
  },
  {
    title: "类别性质",
    tags: [
      "商业AV",
      "自拍",
      "原创",
      "合集收集",
      "AI",
      "欧美",
      "黑人",
      "SM",
      "",
    ],
  },
  { title: "露出度", tags: ["不露", "露逼", "露屌", "露奶", "露脸"] },
  { title: "审查", tags: ["有马", "AI去马", "无马"] },
];

const INITIAL_FIXED_TAGS = [
  "男娘",
  "女装",
  "COS",
  "Lolita",
  "露出",
  "白幼瘦",
  "白虎",
  "大奶",
  "贫乳",
  "广告",
  "阳痿",
  "盗图",
  "多人运动",
  "裸舞",
];
const LOCAL_STORAGE_KEY = "user_custom_tags";

const TagSelectorModal = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  initialValues = {},
}) => {
  const [tagScores, setTagScores] = useState({});
  const [displayOtherTags, setDisplayOtherTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 初始化：打开时加载数据并进行归一化处理
  useEffect(() => {
    if (isOpen) {
      // 1. 处理传入的 tag 数据 (归一化逻辑)
      const rawData = initialValues || {};
      const normalizedData = {};

      Object.entries(rawData).forEach(([tag, score]) => {
        let finalScore = score;

        // 逻辑：>1 设为 1, <-1 设为 -1, 其他保持不变(0, 1, -1)
        if (score > 1) {
          finalScore = 1;
        } else if (score < -1) {
          finalScore = -1;
        }

        // 仅当分数不为0时存入 state (以此保持 state 简洁)
        // 如果你需要显式保留0，可以去掉这个 if 判断
        if (finalScore !== 0) {
          normalizedData[tag] = finalScore;
        }
      });

      setTagScores(normalizedData);

      // 2. 从 localStorage 读取历史自定义 tags
      try {
        const storedTags = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_KEY) || "[]"
        );
        // 合并固定tag和存储的tag，去重
        const mergedTags = Array.from(
          new Set([...INITIAL_FIXED_TAGS, ...storedTags])
        );
        setDisplayOtherTags(mergedTags);
      } catch (e) {
        setDisplayOtherTags(INITIAL_FIXED_TAGS);
      }

      // 重置输入状态
      setCustomTagInput("");
      setIsAddingTag(false);
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  // 标签点击逻辑 (0 -> 1 -> -1 -> 0)
  const handleTagClick = (tag) => {
    setTagScores((prev) => {
      const currentScore = prev[tag] || 0;
      let nextScore;
      // 状态轮转逻辑
      if (currentScore === 0) nextScore = 1;
      else if (currentScore === 1) nextScore = -1;
      else nextScore = 0;

      const newState = { ...prev, [tag]: nextScore };
      // 如果分数为0，从对象中移除该key，保持数据整洁
      if (nextScore === 0) delete newState[tag];
      return newState;
    });
  };

  // 样式获取
  const getTagClass = (tag) => {
    const score = tagScores[tag] || 0;
    const baseClass =
      "px-3 py-1 rounded-md text-sm border transition-colors duration-200 cursor-pointer select-none";

    if (score === 1)
      return `${baseClass} bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200`;
    if (score === -1)
      return `${baseClass} bg-red-100 text-red-700 border-red-300 hover:bg-red-200`;
    return `${baseClass} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`;
  };

  // 添加自定义标签逻辑
  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) {
      setIsAddingTag(false);
      return;
    }

    const newTag = customTagInput.trim();

    // 1. 更新显示列表
    if (!displayOtherTags.includes(newTag)) {
      const newTagsList = [...displayOtherTags, newTag];
      setDisplayOtherTags(newTagsList);

      // 2. 存入 LocalStorage (仅存储非预设的)
      const customOnly = newTagsList.filter(
        (t) => !INITIAL_FIXED_TAGS.includes(t)
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOnly));
    }

    // 3. 默认选中为蓝色 (+1)
    setTagScores((prev) => ({ ...prev, [newTag]: 1 }));

    setCustomTagInput("");
    setIsAddingTag(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {initialValues && Object.keys(initialValues).length > 0
                ? "修改标签"
                : "添加标签"}
              <span className="text-blue-600 ml-2">@{username}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-blue-600 font-bold">蓝色(+1)</span> /
              <span className="text-red-600 font-bold"> 红色(-1)</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {PRESET_CATEGORIES.map((category) => (
            <div key={category.title}>
              <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                {category.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={getTagClass(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
              其他 / 自定义
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {displayOtherTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={getTagClass(tag)}
                >
                  {tag}
                </button>
              ))}

              {isAddingTag ? (
                <input
                  autoFocus
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag()}
                  onBlur={handleAddCustomTag}
                  className="px-2 py-1 text-sm border border-blue-400 rounded-md outline-none w-24"
                  placeholder="输入..."
                />
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="px-3 py-1 rounded-md text-sm border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + 添加
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(tagScores)}
            className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm font-medium transition-colors"
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagSelectorModal;
