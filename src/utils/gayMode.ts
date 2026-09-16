import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus";
import { useCallback } from "react";

export const GAY_TAGS = new Set<string>(["男同", "男性", "露屌"]);
export const GAY_MODE_KEY = "gay-mode";
export const TP_GAY_MODE_KEY = "tp_gay_mode_v1";

/**
 * 检查标签是否属于 Gay 模式控制的标签 (男同 / 男性 / 露屌)
 */
export function isGayTag(tag: string): boolean {
  return GAY_TAGS.has(tag);
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
