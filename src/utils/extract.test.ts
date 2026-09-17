import { extractDisplayTags, PRESET_CATEGORIES } from "./extract";
import { GAY_TAGS } from "./gayMode";

describe("extractDisplayTags with Gay mode tag filtering", () => {
  test("default extractDisplayTags extracts highest scoring preset and other tags", () => {
    const tags = {
      "男性": 10,
      "女性": 5,
      "露屌": 8,
      "自拍": 4,
    };
    const result = extractDisplayTags(tags, PRESET_CATEGORIES);
    const names = result.map((t) => t.name);

    expect(names).toContain("男性");
    expect(names).toContain("露屌");
    expect(names).toContain("自拍");
  });

  test("extractDisplayTags with excludeTags (non-Gay mode) excludes 男同, 男性, 露屌", () => {
    const tags = {
      "男性": 10,
      "女性": 5,
      "露屌": 8,
      "男同": 7,
      "自拍": 4,
    };
    const result = extractDisplayTags(tags, PRESET_CATEGORIES, GAY_TAGS);
    const names = result.map((t) => t.name);

    // Should exclude Gay tags
    expect(names).not.toContain("男性");
    expect(names).not.toContain("露屌");
    expect(names).not.toContain("男同");

    // Should pick 女性 as the preset subject tag since 男性 is excluded
    expect(names).toContain("女性");
    expect(names).toContain("自拍");
  });

  test("handles empty or null tags safely", () => {
    expect(extractDisplayTags(null, PRESET_CATEGORIES, GAY_TAGS)).toEqual([]);
    expect(extractDisplayTags({}, PRESET_CATEGORIES, GAY_TAGS)).toEqual([]);
  });

  test("user with only Gay tags returns empty array in non-Gay mode", () => {
    const tags = {
      "男性": 10,
      "露屌": 8,
      "男同": 7,
    };
    const result = extractDisplayTags(tags, PRESET_CATEGORIES, GAY_TAGS);
    expect(result).toEqual([]);
  });

  test("tags with score <= 0 are not treated as tags", () => {
    const tags = {
      "女性": -1,
      "自拍": -2,
      "二次元": 3,
    };
    const result = extractDisplayTags(tags, PRESET_CATEGORIES);
    expect(result.map((t) => t.name)).toEqual(["二次元"]);
  });
});
