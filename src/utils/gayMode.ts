import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { useCallback, useState, useEffect } from "react";

export const DEFAULT_GAY_TAGS: string[] = ["男性", "男娘", "人妖", "露屌", "阳痿", "男同"];
export const GAY_TAGS = new Set<string>(DEFAULT_GAY_TAGS);
export const GAY_TAGS_KEY = "gay-tags";
export const TP_GAY_TAGS_KEY = "tp_gay_tags_v1";
export const GAY_MODE_KEY = "gay-mode";
export const TP_GAY_MODE_KEY = "tp_gay_mode_v1";

/**
 * 规范化并读取当前配置的 Gay 标签列表
 */
export function getGayTags(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_GAY_TAGS];
  try {
    const raw = window.localStorage.getItem(GAY_TAGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => String(t).trim().replace(/^#+/, "")).filter(Boolean);
      }
    }
    const rawGo = window.localStorage.getItem(TP_GAY_TAGS_KEY);
    if (rawGo) {
      const parsedGo = JSON.parse(rawGo);
      if (Array.isArray(parsedGo) && parsedGo.length > 0) {
        return parsedGo.map((t) => String(t).trim().replace(/^#+/, "")).filter(Boolean);
      }
    }
  } catch (e) {}
  return [...DEFAULT_GAY_TAGS];
}

/**
 * 保存 Gay 标签列表并同步多存储 key 与跨组件事件
 */
export function saveGayTags(tags: string[]): void {
  if (typeof window === "undefined") return;
  const clean = Array.from(new Set(tags.map((t) => String(t).trim().replace(/^#+/, "")).filter(Boolean)));
  try {
    window.localStorage.setItem(GAY_TAGS_KEY, JSON.stringify(clean));
    window.localStorage.setItem(TP_GAY_TAGS_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent("gay-tags-change", { detail: clean }));
  } catch (e) {}
}

/**
 * 检查标签是否属于 Gay 模式控制的标签 (支持自定义列表或传入集合)
 */
export function isGayTag(tag: string, customGayTags?: string[] | Set<string>): boolean {
  const clean = tag.replace(/^#+/, "").trim();
  if (customGayTags) {
    return customGayTags instanceof Set ? customGayTags.has(clean) : customGayTags.includes(clean);
  }
  const current = getGayTags();
  return current.includes(clean);
}

/**
 * 判断标签列表或标签字典中是否包含任一 Gay 标签
 * 标签 score 为 < 0 的不要当做标签
 */
export function hasGayTag(
  tags: string[] | Record<string, any> | undefined | null,
  customGayTags?: string[] | Set<string>
): boolean {
  if (!tags) return false;
  const check = (t: string) => isGayTag(t, customGayTags);
  if (Array.isArray(tags)) {
    return tags.some((t) => typeof t === "string" && check(t));
  }
  if (typeof tags === "object") {
    return Object.entries(tags).some(([t, score]) => {
      const num = typeof score === "number" ? score : Number(score);
      if (!isNaN(num) && num < 0) return false;
      return check(t);
    });
  }
  return false;
}

/**
 * 判断用户标签是否符合当前 Gay 模式筛选（正好取反）：
 * - gayMode = true：只显示包含 Gay 标签的用户
 * - gayMode = false：只显示不包含 Gay 标签的用户
 */
export function matchesGayMode(
  tags: string[] | Record<string, any> | undefined | null,
  gayMode: boolean,
  customGayTags?: string[] | Set<string>
): boolean {
  const has = hasGayTag(tags, customGayTags);
  return gayMode ? has : !has;
}

/**
 * 获取 Gay 模式的初始状态，兼容 twitter-pic-go 的 tp_gay_mode_v1 键
 */
export function getInitialGayMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(GAY_MODE_KEY);
    if (v !== null) {
      const parsed = JSON.parse(v);
      if (typeof parsed === "boolean") return parsed;
    }
    const vGo = window.localStorage.getItem(TP_GAY_MODE_KEY);
    if (vGo === "1" || vGo === "true") return true;
  } catch (e) {}
  return false;
}

/**
 * React Hook: 获取与切换 Gay 模式，自动与 LocalStorage 及其他组件同步
 */
export function useGayMode(): [
  boolean,
  () => void,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  const [gayMode, setGayModeInternal] = useLocalStorage<boolean>(
    GAY_MODE_KEY,
    getInitialGayMode()
  );

  const setGayMode = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof value === "function" ? value(gayMode) : value;
      setGayModeInternal(nextValue);
      try {
        window.localStorage.setItem(TP_GAY_MODE_KEY, nextValue ? "1" : "0");
      } catch (e) {}
    },
    [gayMode, setGayModeInternal]
  );

  const toggleGayMode = useCallback(() => {
    setGayMode((prev) => !prev);
  }, [setGayMode]);

  return [gayMode, toggleGayMode, setGayMode];
}

/**
 * React Hook: 获取与配置 Gay 标签列表
 */
export function useGayTags(): [
  string[],
  (tags: string[]) => void,
  (tag: string) => void,
  (tag: string) => void,
  () => void
] {
  const [tags, setTagsState] = useState<string[]>(getGayTags);

  useEffect(() => {
    const handleTagsChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setTagsState(detail);
      } else {
        setTagsState(getGayTags());
      }
    };
    window.addEventListener("gay-tags-change", handleTagsChange);
    window.addEventListener("storage", handleTagsChange);
    return () => {
      window.removeEventListener("gay-tags-change", handleTagsChange);
      window.removeEventListener("storage", handleTagsChange);
    };
  }, []);

  const setGayTags = useCallback((next: string[]) => {
    saveGayTags(next);
    setTagsState(next);
  }, []);

  const addGayTag = useCallback((newTag: string) => {
    const clean = newTag.replace(/^#+/, "").trim();
    if (!clean) return;
    setTagsState((prev) => {
      if (prev.includes(clean)) return prev;
      const next = [...prev, clean];
      saveGayTags(next);
      return next;
    });
  }, []);

  const removeGayTag = useCallback((tagToRemove: string) => {
    const clean = tagToRemove.replace(/^#+/, "").trim();
    setTagsState((prev) => {
      const next = prev.filter((t) => t !== clean);
      saveGayTags(next);
      return next;
    });
  }, []);

  const resetGayTags = useCallback(() => {
    setGayTags([...DEFAULT_GAY_TAGS]);
  }, [setGayTags]);

  return [tags, setGayTags, addGayTag, removeGayTag, resetGayTags];
}
