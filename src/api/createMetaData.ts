import { ENDPOINT, V2_ENDPOINT } from "./endpoints";
import { invalidateUserCache, updateCachedUserTags } from "./clientCache";

export default async function createMetaData(
  username: string,
  body: Record<string, number> | null = null,
  do_not_tag: boolean = true,
  do_not_renew: boolean = false
): Promise<Record<string, number> | void> {
  const cleanUser = (username || "").trim();
  if (!cleanUser) throw new Error("username is required");

  // 场景 A：仅修改现有用户的标签（do_not_renew = true, do_not_tag = false）
  // 优先调用新版 V2 一 IP 一票接口：POST /api/twitter/v2/users/:username/tags
  if (do_not_renew && !do_not_tag && body) {
    const v2Res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}/tags`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: body }),
      }
    );
    if (v2Res.ok) {
      const data = await v2Res.json();
      if (data?.tags) {
        updateCachedUserTags(cleanUser, data.tags);
        return data.tags;
      }
      return;
    }
  }

  // 场景 B：仅触发后台爬虫更新（do_not_tag = true, do_not_renew = false）
  // 优先调用新版 V2 刷新接口：POST /api/twitter/v2/users/:username/refresh
  if (do_not_tag && !do_not_renew) {
    invalidateUserCache(cleanUser);
    const v2Res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}/refresh`,
      { method: "POST" }
    );
    if (v2Res.ok) return;
  }

  // 场景 C：新增账号并附带初始标签（do_not_tag = false, do_not_renew = false）
  if (!do_not_tag && !do_not_renew && body) {
    invalidateUserCache(cleanUser);
    const v2Res = await fetch(
      `${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: body }),
      }
    );
    if (v2Res.ok) return;
  }

  // 兼容回退：调用旧版 V1 接口
  const url = new URL(`${ENDPOINT}/${encodeURIComponent(cleanUser)}`);
  if (do_not_tag) url.searchParams.append("do_not_tag", "true");
  if (do_not_renew) url.searchParams.append("do_not_renew", "true");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    throw new Error(`createMetaData failed: HTTP ${res.status} ${res.statusText}`);
  }
}
