// --- 常量定义 (确保与 Modal 中一致，最好提取到单独的 constants 文件) ---
const PRESET_CATEGORIES = [
  {
    title: "主体",
    key: "subject",
    tags: ["男性", "女性", "男女性交", "二次元", "其他"],
  },
  {
    title: "类别",
    key: "nature",
    tags: ["商业AV", "自拍", "原创", "合集收集", "AI"],
  },
  {
    title: "露出",
    key: "exposure",
    tags: ["不露", "露逼", "露屌", "露奶", "露脸"],
  },
  { title: "审查", key: "censorship", tags: ["有马", "AI去马", "无马"] },
];

// --- 新增：标签展示组件 ---
const TagDisplayArea = ({ tags }) => {
  if (!tags || Object.keys(tags).length === 0) return null;

  // 1. 提取预设分类的最高分 Tag
  const categoryHighlights = PRESET_CATEGORIES.map((category) => {
    const relevantTags = category.tags
      .map((t) => ({ name: t, score: tags[t] || 0 }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score);

    // 如果没有 tag，直接返回空数组
    if (relevantTags.length === 0) return { title: category.title, tags: [] };

    // 获取最高分
    const maxScore = relevantTags[0].score;
    // 过滤出所有等于最高分的 tag
    const bestTags = relevantTags.filter((t) => t.score === maxScore);

    return { title: category.title, tags: bestTags };
  }).filter((item) => item.tags.length > 0);

  // 2. 提取并排序"其他" Tag
  // 收集所有预设过的 tag 名字，用于排除
  const allPresetTags = new Set(PRESET_CATEGORIES.flatMap((c) => c.tags));

  const otherTags = Object.entries(tags)
    .filter(([name, score]) => !allPresetTags.has(name) && score > 0) // 排除预设，且只显示正分
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA) // 按分数降序
    .map(([name, score]) => ({ name, score }));

  if (categoryHighlights.length === 0 && otherTags.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
      {/* 渲染分类最佳 Tag */}
      {categoryHighlights.map((item) => (
        <span
          key={item.title}
          className="px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center"
        >
          <span className="text-blue-400 mr-1 opacity-75">[{item.title}]</span>
          {item.name}
        </span>
      ))}

      {/* 渲染其他 Tag */}
      {otherTags.map((item) => (
        <span
          key={item.name}
          className="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200"
          title={`权重: ${item.score}`}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

export default TagDisplayArea;
