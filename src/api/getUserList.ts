import { ENDPOINT, V2_ENDPOINT } from "./endpoints";
import {
  V2UserCard,
  getCachedUserCard,
  setCachedUserCards,
} from "./clientCache";

export type SearchMethod = "username" | "nick" | "tag";

// 获取全局用户富卡片列表（走新版 /api/twitter/v2/users，单次返回头像/昵称/标签，消除 N+1）
export async function getUserList(after?: string): Promise<V2UserCard[]> {
  try {
    const params = new URLSearchParams({ limit: "25" });
    if (after) params.set("after", after);
    const res = await fetch(`${V2_ENDPOINT}/users?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const users: V2UserCard[] = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
        ? data
        : [];
      setCachedUserCards(users);
      return users;
    }
  } catch (err) {
    console.warn("V2 getUserList fallback to V1:", err);
  }

  // 兼容回退：旧版 /api/twitter/?list=users
  const res = await fetch(
    `${ENDPOINT}/?list=users${after ? "&after=" + encodeURIComponent(after) : ""}`
  );
  if (!res.ok) return [];
  const legacyUsers = await res.json();
  return Array.isArray(legacyUsers) ? legacyUsers : [];
}

// 搜索用户富卡片列表（支持 username / nick / tag）
export async function searchUserList(
  by: SearchMethod,
  search: string
): Promise<V2UserCard[]> {
  const q = (search || "").trim();
  if (!q) return [];
  if (by !== "username" && by !== "nick" && by !== "tag") return [];

  try {
    const params = new URLSearchParams({
      q,
      by,
      limit: "25",
    });
    const res = await fetch(`${V2_ENDPOINT}/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const users: V2UserCard[] = Array.isArray(data?.users) ? data.users : [];
      setCachedUserCards(users);
      return users;
    }
  } catch (err) {
    console.warn("V2 searchUserList fallback to V1:", err);
  }

  const response = await fetch(
    `${ENDPOINT}/?by=${by}&search=${encodeURIComponent(q)}`
  );
  if (!response.ok) return [];
  const legacy = await response.json();
  return Array.isArray(legacy) ? legacy : [];
}

// 批量获取指定用户名列表的富卡片（优先命中本地缓存，仅对缺失项发起 1 次 /v2/users/batch 请求）
export async function getBatchUsers(
  usernames: string[]
): Promise<Record<string, V2UserCard>> {
  const result: Record<string, V2UserCard> = {};
  const missing: string[] = [];

  for (const raw of usernames) {
    const u = (raw || "").trim();
    if (!u) continue;
    const cached = getCachedUserCard(u);
    if (cached && (cached.avatar || cached.nick)) {
      result[u] = cached;
    } else {
      missing.push(u);
    }
  }

  if (missing.length === 0) {
    return result;
  }

  const chunkSize = 80;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    try {
      const res = await fetch(
        `${V2_ENDPOINT}/users/batch?keys=${encodeURIComponent(chunk.join(","))}`
      );
      if (res.ok) {
        const data = await res.json();
        const users: V2UserCard[] = Array.isArray(data?.users)
          ? data.users
          : [];
        setCachedUserCards(users);
        for (const u of users) {
          if (u && u.username) {
            result[u.username] = u;
          }
        }
      }
    } catch (err) {
      console.warn("getBatchUsers chunk error:", err);
    }
  }

  return result;
}
