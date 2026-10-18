import { ENDPOINT, V2_ENDPOINT } from "./endpoints";
import {
  V2UserDetail,
  V2TimelineItem,
  buildCfCacheVersion,
  getCachedTimeline,
  setCachedTimeline,
  getCachedUserCard,
} from "./clientCache";
import { resolveVideoCoverUrl, buildOuoVideoUrl } from "./proxyOverride";

function normalizeTimelineItems(rawTimeline: any[]): V2TimelineItem[] {
  if (!Array.isArray(rawTimeline)) return [];
  const seen = new Set<string>();
  const out: V2TimelineItem[] = [];

  for (const item of rawTimeline) {
    if (!item || !item.url) continue;
    const rawUrl = String(item.url).trim();
    if (!rawUrl || seen.has(rawUrl)) continue;
    seen.add(rawUrl);

    const type = String(item.type || "photo").trim();
    const isVideo =
      type === "video" || type === "animated_gif" || type === "article:video";

    const cover = isVideo
      ? resolveVideoCoverUrl(item.cover, rawUrl)
      : item.cover
      ? resolveVideoCoverUrl(item.cover, "")
      : undefined;

    const ouoUrl = isVideo ? buildOuoVideoUrl(rawUrl, item.ouo_url) : undefined;

    out.push({
      tweet_id: item.tweet_id,
      url: rawUrl,
      type,
      date: item.date,
      cover,
      ouo_url: ouoUrl,
    });
  }
  return out;
}

export default async function getMetaData(
  username: string,
  t: string = "",
  forceRefresh: boolean = false
): Promise<V2UserDetail> {
  const cleanUser = (username || "").trim();
  if (!cleanUser) {
    throw new Error("username is required");
  }

  const card = getCachedUserCard(cleanUser);
  const versionKey = t || card?.last_modify || "";

  // 1. 优先命中本地双层缓存（内存 + localStorage），若 last_modify 未变则 0ms 直接返回
  if (!forceRefresh) {
    const cached = getCachedTimeline(cleanUser, versionKey || undefined);
    if (cached && Array.isArray(cached.timeline)) {
      return cached;
    }
  }

  const cfT = buildCfCacheVersion(versionKey);

  // 2. 请求新版 twitter-pic-go V2 时间线接口（带 ?t= 命中 Cloudflare 边缘缓存）
  try {
    const v2Url = new URL(`${V2_ENDPOINT}/users/${encodeURIComponent(cleanUser)}/timeline`);
    v2Url.searchParams.set("t", cfT);
    const v2Res = await fetch(v2Url.toString());
    if (v2Res.ok) {
      const data = await v2Res.json();
      const timeline = normalizeTimelineItems(data.timeline || []);
      const detail: V2UserDetail = {
        username: data.username || cleanUser,
        account_info: {
          name: data.account_info?.name || data.username || cleanUser,
          nick: data.account_info?.nick || card?.nick || cleanUser,
          profile_image:
            data.account_info?.profile_image || card?.avatar || "",
          profile_banner:
            data.account_info?.profile_banner || card?.banner || "",
        },
        total_urls: data.total_urls ?? timeline.length,
        photo_count: data.photo_count,
        video_count: data.video_count,
        tags: data.tags || card?.tags || {},
        emojis: data.emojis || {},
        last_modify: data.last_modify || versionKey,
        status: data.status || "SUCCESS",
        timeline,
      };
      setCachedTimeline(detail);
      return detail;
    }
  } catch (err) {
    console.warn("V2 timeline request failed, falling back to .json.gz:", err);
  }

  // 3. 兼容兜底：请求 /api/twitter/<username>.json.gz?t=<cfT> 并在客户端完成 cover + ouo.io 转换
  const legacyUrl = new URL(`${ENDPOINT}/${encodeURIComponent(cleanUser)}.json.gz`);
  legacyUrl.searchParams.set("t", cfT);

  const res = await fetch(legacyUrl.toString());
  if (!res.ok) {
    throw new Error(
      `getMetaData failed: HTTP ${res.status} ${res.statusText} for user "${cleanUser}"`
    );
  }

  const raw = await res.json();
  if (raw?.error) {
    throw new Error(raw.error);
  }

  const timeline = normalizeTimelineItems(raw?.timeline || []);
  const detail: V2UserDetail = {
    username: raw?.account_info?.name || cleanUser,
    account_info: {
      name: raw?.account_info?.name || cleanUser,
      nick: raw?.account_info?.nick || card?.nick || cleanUser,
      profile_image: raw?.account_info?.profile_image || card?.avatar || "",
      profile_banner: raw?.account_info?.profile_banner || card?.banner || "",
    },
    total_urls: timeline.length,
    tags: card?.tags || {},
    last_modify: versionKey,
    status: "SUCCESS",
    timeline,
  };
  setCachedTimeline(detail);
  return detail;
}
