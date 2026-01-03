// constants.js (建议放常量的位置)
export const PRESET_CATEGORIES = [
  {
    title: "主体",
    key: "subject",
    tags: ["男性", "女性", "男女性交", "二次元", "其他", "无关内容"],
  },
  {
    title: "类别",
    key: "nature",
    tags: ["商业AV", "自拍", "原创", "合集收集", "AI"],
  },
  { title: "审查", key: "censorship", tags: ["有马", "AI去马", "无马"] },
];

// 核心提取函数
export const extractDisplayTags = (tags, categories = PRESET_CATEGORIES) => {
  if (!tags || Object.keys(tags).length === 0) return [];

  // --- 第一步：处理预设分类 (保留原有逻辑：取分类内最高分) ---
  const presetResults = categories.reduce((acc, category) => {
    // 1. 获取该分类下所有 > 0 的标签
    const relevantTags = category.tags
      .map((t) => ({ name: t, score: tags[t] || 0 }))
      .filter((t) => t.score > 0);

    if (relevantTags.length === 0) return acc;

    // 2. 找到当前分类下的【最大分数】
    const maxScore = Math.max(...relevantTags.map((t) => t.score));

    // 3. 滤出分数等于最大值的 Tag (保留并列第一)
    const bestTags = relevantTags
      .filter((t) => t.score === maxScore)
      .map((t) => ({
        name: t.name,
        score: t.score,
        categoryTitle: null, // 用于UI展示 "[主体]"
        isPreset: true, // 标记为预设，用于区分样式
      }));

    return acc.concat(bestTags);
  }, []);

  // --- 第二步：处理其他标签 (保留原有逻辑：排除预设，正分，降序) ---

  // 1. 收集所有预设过的 tag 名字，用于排除
  const allPresetTags = new Set(categories.flatMap((c) => c.tags));

  const otherResults = Object.entries(tags)
    .filter(([name, score]) => !allPresetTags.has(name) && score > 0)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA) // 降序
    .map(([name, score]) => ({
      name,
      score,
      categoryTitle: null,
      isPreset: false,
    }));

  // --- 第三步：合并列表 ---
  return [...presetResults, ...otherResults];
};
