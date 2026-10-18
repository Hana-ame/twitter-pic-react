import { ENDPOINT, V2_ENDPOINT } from "./endpoints";
import { getCachedUserCard, updateCachedUserTags } from "./clientCache";

export default async function getTags(
  username: string,
  signal?: AbortSignal
): Promise<{ username: string; tags: Record<string, number> }> {
  const cleanUser = (username || "").trim();
  if (!cleanUser) return { username: "", tags: {} };

  try {
    const res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}`,
      { signal }
    );
    if (res.ok) {
      const data = await res.json();
      const tags = data?.tags || {};
      updateCachedUserTags(cleanUser, tags);
      return { username: cleanUser, tags };
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  const cached = getCachedUserCard(cleanUser);
  if (cached?.tags && Object.keys(cached.tags).length > 0) {
    return { username: cleanUser, tags: cached.tags };
  }

  const res = await fetch(`${ENDPOINT}/tags/${encodeURIComponent(cleanUser)}`, {
    signal,
  });
  const data = await res.json();
  if (data?.tags) {
    updateCachedUserTags(cleanUser, data.tags);
  }
  return data;
}
