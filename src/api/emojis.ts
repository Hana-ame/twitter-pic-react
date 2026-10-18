import { ENDPOINT, V2_ENDPOINT } from "./endpoints";
import {
  V2UserCard,
  setCachedUserCards,
  updateCachedUserEmojis,
} from "./clientCache";

export async function getEmojis(
  username: string,
  signal?: AbortSignal
): Promise<Record<string, number>> {
  const cleanUser = (username || "").trim();
  if (!cleanUser) return {};

  try {
    const res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}/emojis`,
      { signal }
    );
    if (res.ok) {
      const data = await res.json();
      updateCachedUserEmojis(cleanUser, data || {});
      return data || {};
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  const res = await fetch(
    `${ENDPOINT}/emojis?username=${encodeURIComponent(cleanUser)}`,
    { method: "GET", signal }
  );
  const data = await res.json();
  updateCachedUserEmojis(cleanUser, data || {});
  return data || {};
}

export async function getRanking(): Promise<{
  rankings: Record<string, any>;
  users: Record<string, V2UserCard>;
}> {
  try {
    const res = await fetch(`${V2_ENDPOINT}/ranking`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rankings) {
        const usersMap: Record<string, V2UserCard> = data.users || {};
        setCachedUserCards(Object.values(usersMap));
        return { rankings: data.rankings, users: usersMap };
      }
    }
  } catch (err) {
    console.warn("V2 ranking fallback to V1:", err);
  }

  const res = await fetch(`${ENDPOINT}/emojis?username=`);
  const rankings = await res.json();
  return { rankings: rankings || {}, users: {} };
}

export async function voteUpEmoji(
  username: string,
  emoji: string
): Promise<Record<string, number>> {
  const cleanUser = (username || "").trim();
  try {
    const res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}/emojis?emoji=${encodeURIComponent(emoji)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, emoji }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      updateCachedUserEmojis(cleanUser, data || {});
      return data || {};
    }
  } catch {}

  const params = new URLSearchParams({ username: cleanUser, emoji });
  const res = await fetch(`${ENDPOINT}/emojis?${params.toString()}`, {
    method: "POST",
  });
  const data = await res.json();
  updateCachedUserEmojis(cleanUser, data || {});
  return data || {};
}
