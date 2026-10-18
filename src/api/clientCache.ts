// ============================================================================
// 双层本地缓存与 Cloudflare 边缘缓存协同管理器 (clientCache.ts)
//
// 设计目标：
//   1. Cloudflare 边缘缓存友好（CF Cache）：
//      对所有只读详情请求自动拼接确定性版本参数 `?t=<last_modify>`，
//      使未更新账号在全球边缘节点 100% 命中 `cf-cache-status: HIT`（s-maxage=86400），
//      而一旦后台爬虫更新了该账号，`last_modify` 变化立即自动穿透拿新数据。
//   2. 浏览器双层本地缓存（Local Cache = L1 内存 Map + L2 localStorage 有界 LRU）：
//      - 用户富卡片缓存（UserCardCache）：侧边栏、搜索、排行榜返回的富卡片自动入库；
//        收藏夹（FavList）和排行榜优先从本地缓存直接秒读，仅对缺失账号发起单次 `/v2/users/batch`。
//      - 用户时间线缓存（TimelineCache）：按 `username` + `last_modify` 校验缓存，
//        二次点开同一账号 0ms 瞬时渲染，且在 `localStorage` 中严格限制条数与容量，杜绝 QuotaExceededError。
// ============================================================================

export interface V2UserCard {
  username: string;
  nick: string;
  avatar: string;
  banner?: string;
  total_urls: number;
  photo_count?: number;
  video_count?: number;
  tags: Record<string, number>;
  last_modify?: string;
  status?: string;
  json_gz_url?: string;
}

export interface V2TimelineItem {
  tweet_id?: number;
  url: string;
  type: string;
  date?: string;
  cover?: string;
  ouo_url?: string;
}

export interface V2UserDetail {
  username: string;
  account_info: {
    name: string;
    nick: string;
    profile_image: string;
    profile_banner?: string;
  };
  total_urls: number;
  photo_count?: number;
  video_count?: number;
  tags: Record<string, number>;
  emojis?: Record<string, number>;
  last_modify?: string;
  status?: string;
  timeline: V2TimelineItem[];
}

const LS_CARDS_KEY = "tp_v2_user_cards_cache_v1";
const LS_TIMELINES_KEY = "tp_v2_timelines_cache_v1";

const MAX_MEM_CARDS = 500;
const MAX_LS_CARDS = 160;
const CARD_TTL_MS = 30 * 60 * 1000; // 30 分钟

const MAX_MEM_TIMELINES = 30;
const MAX_LS_TIMELINES = 10;
const MAX_LS_TIMELINE_ITEMS = 150; // localStorage 中每个账号最多存前 150 条以保护 5MB 配额
const TIMELINE_TTL_MS = 30 * 60 * 1000; // 30 分钟

interface CachedEntry<T> {
  data: T;
  lastModify: string;
  savedAt: number;
}

const memCards = new Map<string, CachedEntry<V2UserCard>>();
const memTimelines = new Map<string, CachedEntry<V2UserDetail>>();
let lsLoaded = false;

function ensureLoadedFromStorage(): void {
  if (lsLoaded || typeof window === "undefined") return;
  lsLoaded = true;
  try {
    const rawCards = window.localStorage.getItem(LS_CARDS_KEY);
    if (rawCards) {
      const parsed = JSON.parse(rawCards) as Record<string, CachedEntry<V2UserCard>>;
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.data && now - (v.savedAt || 0) < CARD_TTL_MS) {
          memCards.set(k, v);
        }
      }
    }
  } catch {
    // 忽略损坏的本地缓存
  }

  try {
    const rawTimelines = window.localStorage.getItem(LS_TIMELINES_KEY);
    if (rawTimelines) {
      const parsed = JSON.parse(rawTimelines) as Record<string, CachedEntry<V2UserDetail>>;
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed)) {
        if (v && v.data && now - (v.savedAt || 0) < TIMELINE_TTL_MS) {
          memTimelines.set(k, v);
        }
      }
    }
  } catch {
    // 忽略损坏的本地缓存
  }
}

function persistCardsToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.from(memCards.entries()).slice(-MAX_LS_CARDS);
    const obj: Record<string, CachedEntry<V2UserCard>> = {};
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    window.localStorage.setItem(LS_CARDS_KEY, JSON.stringify(obj));
  } catch {
    // QuotaExceededError 时自动清理旧缓存重试
    try {
      window.localStorage.removeItem(LS_CARDS_KEY);
    } catch {}
  }
}

function persistTimelinesToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.from(memTimelines.entries()).slice(-MAX_LS_TIMELINES);
    const obj: Record<string, CachedEntry<V2UserDetail>> = {};
    for (const [k, v] of entries) {
      obj[k] = {
        ...v,
        data: {
          ...v.data,
          timeline: Array.isArray(v.data.timeline)
            ? v.data.timeline.slice(0, MAX_LS_TIMELINE_ITEMS)
            : [],
        },
      };
    }
    window.localStorage.setItem(LS_TIMELINES_KEY, JSON.stringify(obj));
  } catch {
    try {
      window.localStorage.removeItem(LS_TIMELINES_KEY);
    } catch {}
  }
}

/**
 * 生成用于 Cloudflare 边缘缓存的确定性版本参数 `t`
 * 优先使用账号的 `last_modify`（精确到秒），若无则按当日 UTC 日期分桶。
 */
export function buildCfCacheVersion(lastModify?: string | null): string {
  if (lastModify && typeof lastModify === "string" && lastModify.trim() !== "") {
    return lastModify.trim();
  }
  const cached = getCachedUserCard(lastModify || "");
  if (cached?.last_modify) {
    return cached.last_modify;
  }
  return new Date().toISOString().split("T")[0];
}

export function getCachedUserCard(
  username: string,
  expectedLastModify?: string
): V2UserCard | null {
  if (!username) return null;
  ensureLoadedFromStorage();
  const key = username.toLowerCase();
  const entry = memCards.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CARD_TTL_MS) {
    memCards.delete(key);
    return null;
  }
  if (
    expectedLastModify &&
    entry.lastModify &&
    expectedLastModify !== entry.lastModify
  ) {
    return null;
  }
  // LRU 刷新
  memCards.delete(key);
  memCards.set(key, entry);
  return entry.data;
}

export function setCachedUserCard(card: V2UserCard): void {
  if (!card || !card.username) return;
  ensureLoadedFromStorage();
  const key = card.username.toLowerCase();
  if (memCards.has(key)) memCards.delete(key);
  memCards.set(key, {
    data: card,
    lastModify: card.last_modify || "",
    savedAt: Date.now(),
  });
  while (memCards.size > MAX_MEM_CARDS) {
    const oldest = memCards.keys().next().value;
    if (!oldest) break;
    memCards.delete(oldest);
  }
  persistCardsToStorage();
}

export function setCachedUserCards(cards: V2UserCard[]): void {
  if (!Array.isArray(cards) || cards.length === 0) return;
  ensureLoadedFromStorage();
  const now = Date.now();
  for (const card of cards) {
    if (!card || !card.username) continue;
    const key = card.username.toLowerCase();
    if (memCards.has(key)) memCards.delete(key);
    memCards.set(key, {
      data: card,
      lastModify: card.last_modify || "",
      savedAt: now,
    });
  }
  while (memCards.size > MAX_MEM_CARDS) {
    const oldest = memCards.keys().next().value;
    if (!oldest) break;
    memCards.delete(oldest);
  }
  persistCardsToStorage();
}

export function getCachedTimeline(
  username: string,
  expectedLastModify?: string
): V2UserDetail | null {
  if (!username) return null;
  ensureLoadedFromStorage();
  const key = username.toLowerCase();
  const entry = memTimelines.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TIMELINE_TTL_MS) {
    memTimelines.delete(key);
    return null;
  }
  if (
    expectedLastModify &&
    entry.lastModify &&
    expectedLastModify !== entry.lastModify
  ) {
    memTimelines.delete(key);
    return null;
  }
  memTimelines.delete(key);
  memTimelines.set(key, entry);
  return entry.data;
}

export function setCachedTimeline(detail: V2UserDetail): void {
  if (!detail || !detail.username) return;
  ensureLoadedFromStorage();
  const key = detail.username.toLowerCase();
  const lm = detail.last_modify || "";
  if (memTimelines.has(key)) memTimelines.delete(key);
  memTimelines.set(key, {
    data: detail,
    lastModify: lm,
    savedAt: Date.now(),
  });
  while (memTimelines.size > MAX_MEM_TIMELINES) {
    const oldest = memTimelines.keys().next().value;
    if (!oldest) break;
    memTimelines.delete(oldest);
  }
  persistTimelinesToStorage();

  // 同步更新富卡片缓存
  setCachedUserCard({
    username: detail.username,
    nick: detail.account_info?.nick || detail.username,
    avatar: detail.account_info?.profile_image || "",
    banner: detail.account_info?.profile_banner || "",
    total_urls: detail.total_urls || detail.timeline?.length || 0,
    photo_count: detail.photo_count,
    video_count: detail.video_count,
    tags: detail.tags || {},
    last_modify: lm,
    status: detail.status || "SUCCESS",
  });
}

export function invalidateUserCache(username: string): void {
  if (!username) return;
  ensureLoadedFromStorage();
  const key = username.toLowerCase();
  memCards.delete(key);
  memTimelines.delete(key);
  persistCardsToStorage();
  persistTimelinesToStorage();
}

export function updateCachedUserTags(
  username: string,
  tags: Record<string, number>
): void {
  if (!username) return;
  ensureLoadedFromStorage();
  const key = username.toLowerCase();
  const cardEntry = memCards.get(key);
  if (cardEntry) {
    cardEntry.data = { ...cardEntry.data, tags: { ...tags } };
    persistCardsToStorage();
  }
  const tlEntry = memTimelines.get(key);
  if (tlEntry) {
    tlEntry.data = { ...tlEntry.data, tags: { ...tags } };
    persistTimelinesToStorage();
  }
}

export function updateCachedUserEmojis(
  username: string,
  emojis: Record<string, number>
): void {
  if (!username) return;
  ensureLoadedFromStorage();
  const key = username.toLowerCase();
  const tlEntry = memTimelines.get(key);
  if (tlEntry) {
    tlEntry.data = { ...tlEntry.data, emojis: { ...emojis } };
    persistTimelinesToStorage();
  }
}

export function getLocalCacheStats(): {
  userCards: number;
  timelines: number;
} {
  ensureLoadedFromStorage();
  return {
    userCards: memCards.size,
    timelines: memTimelines.size,
  };
}

export function clearAllLocalCache(): void {
  memCards.clear();
  memTimelines.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LS_CARDS_KEY);
      window.localStorage.removeItem(LS_TIMELINES_KEY);
    } catch {}
  }
}
