import React, { useEffect, useState } from "react";
import getMetaData from "../api/getMetaData";
import { overrideImageProxy } from "../api/proxyOverride";
import { extractDisplayTags } from "../utils/extract.js";
import {
  useGayMode,
  useGayTags,
  isGayTag,
  hasGayTag,
} from "../utils/gayMode";
import { getCachedUserCard } from "../api/clientCache";

const HeaderV2 = ({ user, onClick }) => {
  const [card, setCard] = useState(() => user || {});
  const [loadingClick, setLoadingClick] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [displayTags, setDisplayTags] = useState([]);
  const [gayMode] = useGayMode();
  const [gayTags] = useGayTags();

  useEffect(() => {
    if (!user || !user.username) return;
    const cached = getCachedUserCard(user.username);
    setCard(cached ? { ...user, ...cached, tags: user.tags || cached.tags } : user);
  }, [user]);

  useEffect(() => {
    if (!user || !user.username) return;
    let flag = true;
    const tagsToShow = [];

    try {
      const s = window.localStorage.getItem("block-map");
      if (s) {
        let o = JSON.parse(s);
        if (typeof o !== "object" || o === null || Array.isArray(o)) {
          o = {};
        }
        if (o[user.username]) {
          setBlocked(true);
          flag = false;
        }
      }

      if (flag) {
        const rawRules = window.localStorage.getItem("tag-rules");
        const userTagKeys = extractDisplayTags(user.tags).map((t) => t.name);

        const hasGay =
          hasGayTag(user.tags, gayTags) || hasGayTag(userTagKeys, gayTags);
        const matchesGay = gayMode ? hasGay : !hasGay;
        if (!matchesGay) {
          setBlocked(true);
          flag = false;
        }

        if (flag && userTagKeys.length > 0) {
          let blockRules = ["无关内容"];
          let highlightRules = [];

          if (rawRules) {
            try {
              const rules = JSON.parse(rawRules);
              if (Array.isArray(rules.block)) {
                blockRules = rules.block.filter((t) => !isGayTag(t, gayTags));
                if (blockRules.length === 0) blockRules = ["无关内容"];
              }
              if (Array.isArray(rules.highlight))
                highlightRules = rules.highlight;
            } catch (err) {
              console.error("解析 tag-rules 出错:", err);
            }
          }

          for (let tag of userTagKeys) {
            const isGayBypass = gayMode && isGayTag(tag, gayTags);
            if (!isGayBypass && blockRules.includes(tag)) {
              setBlocked(true);
              flag = false;
              break;
            }

            if (highlightRules.includes(tag)) {
              if (gayMode || !isGayTag(tag, gayTags)) {
                tagsToShow.push(tag);
              }
            } else if (gayMode && isGayTag(tag, gayTags)) {
              tagsToShow.push(tag);
            }
          }
        }
      }
    } catch (e) {
      console.error("筛选逻辑出错:", e);
    }

    setDisplayTags(tagsToShow);
    if (flag) {
      setBlocked(false);
    }
  }, [user, gayMode, gayTags]);

  if (blocked || !user?.username) return null;

  const handleCardClick = async () => {
    if (loadingClick) return;
    setLoadingClick(true);
    setErrorMsg("");
    try {
      const detail = await getMetaData(user.username, user.last_modify || "");
      onClick(detail);
    } catch (err) {
      console.error("加载用户详情失败:", err);
      setErrorMsg(err.message || "加载失败，点击重试");
    } finally {
      setLoadingClick(false);
    }
  };

  const avatarSrc = overrideImageProxy(
    card?.avatar || card?.account_info?.profile_image || ""
  );
  const nick = card?.nick || card?.account_info?.nick || user.username;

  return (
    <div
      className={`relative flex items-center m-3 p-3.5 bg-gray-100 hover:bg-blue-50/60 hover:cursor-pointer rounded-lg shadow-sm border border-gray-200 max-w-md transition-all ${
        loadingClick ? "opacity-70 pointer-events-none" : ""
      }`}
      onClick={handleCardClick}
    >
      <div className="flex-shrink-0 mr-3.5">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={nick}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-gray-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-white shadow-sm">
            {(nick || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-2 flex-1">
        <span className="text-base font-semibold text-gray-900 truncate">
          {nick}
        </span>
        <span className="text-xs text-gray-500 truncate">
          @{user.username}
          {card?.total_urls ? ` · ${card.total_urls} 媒体` : ""}
        </span>
        {errorMsg && (
          <span className="text-xs text-red-500 mt-0.5 truncate">
            {errorMsg}
          </span>
        )}
      </div>

      {loadingClick && (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1" />
      )}

      {displayTags.length > 0 && (
        <div className="absolute bottom-1.5 right-2 flex flex-wrap justify-end gap-1 pointer-events-none">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs font-medium text-blue-800 bg-blue-100 rounded border border-blue-200 opacity-90"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeaderV2;
