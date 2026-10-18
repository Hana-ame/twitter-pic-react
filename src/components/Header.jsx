import React, { useEffect, useState } from "react";
import getMetaData from "../api/getMetaData";
import { getBatchUsers } from "../api/getUserList";
import { getCachedUserCard } from "../api/clientCache";
import { overrideImageProxy } from "../api/proxyOverride";

const Header = ({ username, userCard, onClick }) => {
  const [card, setCard] = useState(
    () => userCard || getCachedUserCard(username) || null
  );
  const [loading, setLoading] = useState(!card);
  const [clicking, setClicking] = useState(false);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      const s = window.localStorage.getItem("block-map");
      if (s) {
        const o = JSON.parse(s);
        if (o && typeof o === "object" && o[username] === true) {
          setBlocked(true);
          return;
        }
      }
    } catch {}

    if (userCard) {
      setCard(userCard);
      setLoading(false);
      return;
    }

    const cached = getCachedUserCard(username);
    if (cached && (cached.avatar || cached.nick)) {
      setCard(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getBatchUsers([username])
      .then((map) => {
        if (cancelled) return;
        if (map[username]) {
          setCard(map[username]);
        } else {
          setCard({ username, nick: username, avatar: "", total_urls: 0, tags: {} });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username, userCard]);

  if (blocked) return null;

  if (loading) {
    return (
      <div className="flex items-center m-2 p-3 bg-gray-100 rounded-lg border border-gray-200 max-w-md text-xs text-gray-500">
        加载中 @{username}...
      </div>
    );
  }

  const handleClick = async () => {
    if (clicking) return;
    setClicking(true);
    setError(false);
    try {
      const detail = await getMetaData(username, card?.last_modify || "");
      onClick(detail);
    } catch {
      setError(true);
    } finally {
      setClicking(false);
    }
  };

  const avatarSrc = overrideImageProxy(card?.avatar || "");
  const nick = card?.nick || username;

  return (
    <div
      className="flex items-center m-2 p-3 bg-gray-100 hover:bg-blue-50/60 hover:cursor-pointer rounded-lg shadow-sm border border-gray-200 max-w-md transition-all"
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mr-3">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={nick}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover border border-white shadow-sm bg-gray-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
            {(nick || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-gray-900 truncate">
          {nick}
        </span>
        <span className="text-xs text-gray-500 truncate">@{username}</span>
        {error && (
          <span className="text-xs text-red-500">加载失败，点击重试</span>
        )}
      </div>
    </div>
  );
};

export default Header;
