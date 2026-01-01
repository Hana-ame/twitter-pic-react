import { useEffect, useState } from "react";
// 模拟 API 调用，实际使用请替换引用
import createMetaData from "../api/createMetaData.ts";

// --- 配置常量 ---
const PRESET_CATEGORIES = [
  {
    title: "主体",
    tags: ["男性", "女性", "男女性交", "二次元", "其他"],
  },
  {
    title: "类别性质",
    tags: ["商业AV", "自拍", "原创", "合集收集", "AI"],
  },
  {
    title: "露出度",
    tags: ["不露", "露逼", "露屌", "露奶", "露脸"],
  },
  {
    title: "审查",
    tags: ["有马", "AI去马", "无马"],
  },
];

// "其他" 分类初始只有预设，支持动态添加
const INITIAL_OTHER_TAGS = [
  "男娘",
  "女装",
  "COS",
  "Lolita",
  "露出",
  "白幼瘦",
  "白虎",
  "大奶",
  "贫乳",
];

/**
 * 标签选择弹窗组件
 */
const TagSelectorModal = ({ isOpen, onClose, onConfirm, username }) => {
  // 存储标签状态：Key是标签名，Value是状态 (0: 无, 1: 蓝, -1: 红)
  const [tagScores, setTagScores] = useState({});
  // 存储动态添加的标签列表（合并了预设的“其他”和用户输入的）
  const [otherTags, setOtherTags] = useState(INITIAL_OTHER_TAGS);
  // 自定义标签输入框状态
  const [customTagInput, setCustomTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 重置状态当弹窗打开时
  useEffect(() => {
    if (isOpen) {
      setTagScores({});
      setOtherTags(INITIAL_OTHER_TAGS);
      setCustomTagInput("");
      setIsAddingTag(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 处理标签点击：0 -> 1 -> -1 -> 0
  const handleTagClick = (tag) => {
    setTagScores((prev) => {
      const currentScore = prev[tag] || 0;
      let nextScore;

      if (currentScore === 0) nextScore = 1; // 变蓝
      else if (currentScore === 1) nextScore = -1; // 变红
      else nextScore = 0; // 变无色

      // 如果是0，从对象中删除以保持整洁，或者保留为0皆可
      const newState = { ...prev, [tag]: nextScore };
      if (nextScore === 0) delete newState[tag];
      return newState;
    });
  };

  // 获取标签样式
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

  // 添加自定义标签
  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) {
      setIsAddingTag(false);
      return;
    }

    const newTag = customTagInput.trim();

    // 1. 加入到“其他”列表
    if (!otherTags.includes(newTag)) {
      setOtherTags((prev) => [...prev, newTag]);
    }

    // 2. 默认置为蓝色 (+1)
    setTagScores((prev) => ({ ...prev, [newTag]: 1 }));

    setCustomTagInput("");
    setIsAddingTag(false);
  };

  const handleSubmit = () => {
    onConfirm(tagScores);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            为 <span className="text-blue-600">@{username}</span> 添加标签
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            点击一次: <span className="text-blue-600 font-bold">蓝色(+1)</span>{" "}
            / 点击两次: <span className="text-red-600 font-bold">红色(-1)</span>{" "}
            / 点击三次: 重置
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* 预设分类 */}
          {PRESET_CATEGORIES.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
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

          {/* 其他分类 (含自定义) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              其他 tag
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {otherTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={getTagClass(tag)}
                >
                  {tag}
                </button>
              ))}

              {/* 添加按钮 / 输入框 */}
              {isAddingTag ? (
                <div className="flex items-center space-x-2">
                  <input
                    autoFocus
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustomTag()}
                    onBlur={handleAddCustomTag} // 失去焦点自动提交
                    className="px-2 py-1 text-sm border border-blue-400 rounded-md outline-none w-24"
                    placeholder="输入标签"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="px-3 py-1 rounded-md text-sm border border-dashed border-gray-400 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + 自定义
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors font-medium"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 主组件
 */
const AddUser = ({ username }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setIsClicked(false);
  }, [username]);

  const handleInitialClick = () => {
    if (isClicked) return;

    const usernameRegex = /^[a-zA-Z0-9_]*$/;
    if (!usernameRegex.test(username)) {
      alert("不支持昵称或中文添加，或者请使用@后面的字符串（删去@）");
      return;
    }

    // 验证通过，打开 Tag 选择弹窗
    setShowModal(true);
  };

  const handleModalConfirm = (tagData) => {
    // 关闭弹窗
    setShowModal(false);

    // 只有在这里才真正触发 API 调用
    // 将 username 和 选中的 tagData 一起传给后端
    // tagData 格式如: { "女性": 1, "男性": -1, "自定义标签": 1 }
    createMetaData(username, tagData);

    // 设置为已点击状态 (禁用按钮)
    setIsClicked(true);
  };

  return (
    <>
      <div
        className={`flex items-center m-4 p-4 rounded-lg shadow-sm border border-gray-200 w-auto transition-colors duration-200 
                ${
                  isClicked
                    ? "hover:cursor-not-allowed bg-gray-100 text-gray-400"
                    : "hover:cursor-pointer bg-gray-200 hover:bg-gray-100 text-gray-800"
                }`}
        onClick={handleInitialClick}
      >
        <p className="w-md font-medium">
          {isClicked ? "已添加" : "添加 @" + username}
        </p>
      </div>

      {/* Tag 选择弹窗 */}
      <TagSelectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleModalConfirm}
        username={username}
      />
    </>
  );
};

import { useEffect, useState } from "react";

// --- 常量配置 ---
const PRESET_CATEGORIES = [
  { title: "主体", tags: ["男性", "女性", "男女性交", "二次元", "其他"] },
  { title: "类别性质", tags: ["商业AV", "自拍", "原创", "合集收集", "AI"] },
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
];
const LOCAL_STORAGE_KEY = "user_custom_tags"; // LocalStorage Key

const TagSelectorModal = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  initialValues = {},
}) => {
  const [tagScores, setTagScores] = useState({});
  const [displayOtherTags, setDisplayOtherTags] = useState(INITIAL_FIXED_TAGS);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 初始化逻辑：打开时加载数据
  useEffect(() => {
    if (isOpen) {
      // 1. 回显 API 获取的 tag 数据
      setTagScores(initialValues || {});

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
        console.error("读取本地Tags失败", e);
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
      if (currentScore === 0) nextScore = 1;
      else if (currentScore === 1) nextScore = -1;
      else nextScore = 0;

      const newState = { ...prev, [tag]: nextScore };
      if (nextScore === 0) delete newState[tag];
      return newState;
    });
  };

  // 样式获取
  const getTagClass = (tag) => {
    const score = tagScores[tag] || 0;
    // 基础样式
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

      // 2. 存入 LocalStorage (排除预设的，只存用户新增的，或者为了简单全部存入去重也可，这里选择只存新增的逻辑略复杂，简单做法是存全部非预设，或者直接存全部)
      // 为了简单且符合要求“每次都会自动append”，我们将新列表里的非默认项存起来
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
    // 修改点：去除 backdrop-blur，使用深色半透明背景 bg-black/60
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            管理标签 <span className="text-blue-600">@{username}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-blue-600 font-bold">蓝色(+1)</span> /
            <span className="text-red-600 font-bold"> 红色(-1)</span> /
            再次点击重置
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {PRESET_CATEGORIES.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
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
                  placeholder="新标签"
                />
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="px-3 py-1 rounded-md text-sm border border-dashed border-gray-400 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + 新增
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(tagScores)}
            className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm font-medium"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};
export default AddUser;
