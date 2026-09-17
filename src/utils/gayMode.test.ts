import { isGayTag, hasGayTag, matchesGayMode, getInitialGayMode, getGayTags, saveGayTags, GAY_TAGS, GAY_MODE_KEY, TP_GAY_MODE_KEY } from "./gayMode";

describe("gayMode utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("GAY_TAGS contains 男性, 男娘, 人妖, 露屌, 阳痿, 男同", () => {
    expect(GAY_TAGS.has("男性")).toBe(true);
    expect(GAY_TAGS.has("男娘")).toBe(true);
    expect(GAY_TAGS.has("人妖")).toBe(true);
    expect(GAY_TAGS.has("露屌")).toBe(true);
    expect(GAY_TAGS.has("阳痿")).toBe(true);
    expect(GAY_TAGS.has("男同")).toBe(true);
    expect(GAY_TAGS.size).toBe(6);
  });

  test("isGayTag returns true only for Gay tags", () => {
    expect(isGayTag("男同")).toBe(true);
    expect(isGayTag("男性")).toBe(true);
    expect(isGayTag("男娘")).toBe(true);
    expect(isGayTag("人妖")).toBe(true);
    expect(isGayTag("露屌")).toBe(true);
    expect(isGayTag("阳痿")).toBe(true);

    expect(isGayTag("女性")).toBe(false);
    expect(isGayTag("自拍")).toBe(false);
    expect(isGayTag("BANNED")).toBe(false);
    expect(isGayTag("二次元")).toBe(false);
  });

  test("getInitialGayMode defaults to false", () => {
    expect(getInitialGayMode()).toBe(false);
  });

  test("getInitialGayMode reads gay-mode key when set to true", () => {
    localStorage.setItem(GAY_MODE_KEY, JSON.stringify(true));
    expect(getInitialGayMode()).toBe(true);
  });

  test("getInitialGayMode falls back to tp_gay_mode_v1 when gay-mode is not set", () => {
    localStorage.setItem(TP_GAY_MODE_KEY, "1");
    expect(getInitialGayMode()).toBe(true);
  });

  test("hasGayTag detects gay tags in arrays and objects", () => {
    expect(hasGayTag(["二次元", "男同"])).toBe(true);
    expect(hasGayTag(["二次元", "男性"])).toBe(true);
    expect(hasGayTag(["露屌", "自拍"])).toBe(true);
    expect(hasGayTag(["阳痿", "自拍"])).toBe(true);
    expect(hasGayTag(["人妖"])).toBe(true);
    expect(hasGayTag(["男娘"])).toBe(true);
    expect(hasGayTag(["二次元", "自拍"])).toBe(false);
    expect(hasGayTag({ 男同: 1, 二次元: 2 })).toBe(true);
    expect(hasGayTag({ 自拍: 1, 二次元: 2 })).toBe(false);
    expect(hasGayTag([])).toBe(false);
    expect(hasGayTag(null)).toBe(false);
  });

  test("matchesGayMode performs exact inversion", () => {
    // Normal mode (gayMode = false):
    // Gay users should NOT match; Non-gay users SHOULD match
    expect(matchesGayMode(["男同"], false)).toBe(false);
    expect(matchesGayMode(["二次元"], false)).toBe(true);
    expect(matchesGayMode([], false)).toBe(true);

    // Gay mode (gayMode = true):
    // Gay users SHOULD match; Non-gay users should NOT match
    expect(matchesGayMode(["男同"], true)).toBe(true);
    expect(matchesGayMode(["男性", "自拍"], true)).toBe(true);
    expect(matchesGayMode(["露屌"], true)).toBe(true);
    expect(matchesGayMode(["男娘"], true)).toBe(true);
    expect(matchesGayMode(["人妖"], true)).toBe(true);
    expect(matchesGayMode(["阳痿"], true)).toBe(true);
    expect(matchesGayMode(["二次元"], true)).toBe(false);
    expect(matchesGayMode([], true)).toBe(false);
  });

  test("getGayTags and saveGayTags allow custom gay list configuration", () => {
    expect(getGayTags()).toEqual(["男性", "男娘", "人妖", "露屌", "阳痿", "男同"]);

    // Save custom tags
    saveGayTags(["男同", "男娘", "#伪娘"]);
    expect(getGayTags()).toEqual(["男同", "男娘", "伪娘"]);

    // Matches with custom tags
    expect(matchesGayMode(["男娘"], true)).toBe(true);
    expect(matchesGayMode(["女性"], true)).toBe(false);

    // Check localStorage fallback
    localStorage.removeItem("gay-tags");
    expect(getGayTags()).toEqual(["男同", "男娘", "伪娘"]); // from tp_gay_tags_v1

    localStorage.clear();
    expect(getGayTags()).toEqual(["男性", "男娘", "人妖", "露屌", "阳痿", "男同"]); // default fallback
  });
});
