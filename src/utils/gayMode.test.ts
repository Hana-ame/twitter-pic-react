import { isGayTag, getInitialGayMode, GAY_TAGS, GAY_MODE_KEY, TP_GAY_MODE_KEY } from "./gayMode";

describe("gayMode utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("GAY_TAGS contains 男同, 男性, 露屌", () => {
    expect(GAY_TAGS.has("男同")).toBe(true);
    expect(GAY_TAGS.has("男性")).toBe(true);
    expect(GAY_TAGS.has("露屌")).toBe(true);
    expect(GAY_TAGS.size).toBe(3);
  });

  test("isGayTag returns true only for Gay tags", () => {
    expect(isGayTag("男同")).toBe(true);
    expect(isGayTag("男性")).toBe(true);
    expect(isGayTag("露屌")).toBe(true);

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
});
