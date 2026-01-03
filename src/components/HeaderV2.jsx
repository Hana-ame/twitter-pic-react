import React, { useEffect, useState } from "react";
import getMetaData from "../api/getMetaData.ts";
import { DEFAULT_IMAGE_PROXY } from "../api/endpoints.ts";
import { extractDisplayTags } from "../utils/extract.js";

const HeaderV2 = ({ user, onClick }) => {
  // 模拟从API获取的用户数据
  const [userData, setUserData] = useState({ loading: true });
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // 新增：用于存储经过筛选后需要显示的tag
  const [displayTags, setDisplayTags] = useState([]);

  function fetchAndSet() {
    setUserData({ loading: true });
    setError(false);

    getMetaData(user.username, user.last_modify)
      .then((data) => {
        if (data === null || data === undefined || data.error) {
          console.log(user, data);
          setError(true);
          setUserData({ error: data.error || "未知错误", loading: false });
        } else {
          setUserData(data);
        }
      })
      .catch((e) => {
        console.error(e);
        setError(true);
      });
  }
  // 当 user 变化时执行筛选和数据获取逻辑
  useEffect(() => {
    let flag = true; // 是否允许继续请求API
    const tagsToShow = []; // 临时存储需要高亮的tag

    try {
      // 1. 检查 Username 是否被手动屏蔽 (Block Map)
      const s = window.localStorage.getItem("block-map");
      if (s) {
        let o = JSON.parse(s);
        if (typeof o !== "object" || o === null || Array.isArray(o)) {
          o = {};
        }
        // 兼容 boolean 和 存数字的情况
        if (o[user.username]) {
          setBlocked(true);
          flag = false;
        }
      }

      // 2. 检查 Tags 规则 (Tag Rules)
      if (flag) {
        const rawRules = window.localStorage.getItem("tag-rules");

        // 使用了先前的
        const userTagKeys = extractDisplayTags(user.tags).map((t) => t.name);

        if (rawRules && userTagKeys.length > 0) {
          const rules = JSON.parse(rawRules);
          const blockRules = Array.isArray(rules.block) ? rules.block : [];
          const highlightRules = Array.isArray(rules.highlight)
            ? rules.highlight
            : [];

          for (let tag of userTagKeys) {
            // 2.1 检查是否触犯屏蔽词
            if (blockRules.includes(tag)) {
              setBlocked(true);
              flag = false;
              break;
            }

            // 2.2 检查是否命中高亮词
            if (highlightRules.includes(tag)) {
              tagsToShow.push(tag);
            }
          }
        }
      }
    } catch (e) {
      console.error("筛选逻辑出错:", e);
      setError(true);
      flag = false;
    }

    // 更新状态
    setDisplayTags(tagsToShow);

    if (flag) {
      fetchAndSet();
    }
  }, [user]);

  // 被屏蔽不返回
  // 不渲染
  if (blocked) return null;

  if (userData.loading)
    return (
      <div className="flex items-center m-4 p-4 bg-gray-200 rounded-lg shadow-sm border border-gray-200 max-w-md h-24">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );

  if (error) {
    return (
      <div
        className="flex items-center m-4 p-4 bg-red-50 rounded-lg shadow-sm border border-red-200 max-w-md cursor-pointer hover:bg-red-100 transition-colors"
        onClick={() => {
          fetchAndSet();
        }}
      >
        <span className="text-red-500 text-sm">
          {userData.error || "加载失败"}, 点击重试
        </span>
      </div>
    );
  }

  return (
    // 添加 relative 以便内部 absolute 定位
    <div
      className="relative flex items-center m-4 p-4 bg-gray-200 hover:bg-gray-100 hover:cursor-pointer rounded-lg shadow-sm border border-gray-200 max-w-md transition-all"
      onClick={() => onClick(userData)}
    >
      {/* 用户头像 */}
      <div className="flex-shrink-0 mr-4">
        <img
          src={userData.account_info?.profile_image?.replace(
            "https://pbs.twimg.com",
            DEFAULT_IMAGE_PROXY
          )}
          alt={userData.account_info?.nick}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm bg-gray-300"
        />
      </div>

      {/* 用户信息 */}
      <div className="flex flex-col min-w-0 pr-2">
        {" "}
        {/* min-w-0 修复 truncate 在 flex 中不生效的问题 */}
        <span className="text-lg font-semibold text-gray-900 truncate">
          {userData.account_info?.nick}
        </span>
        <span className="text-md text-gray-500 truncate">
          @{userData.account_info?.name}
        </span>
      </div>

      {/* Tag 显示区域：右下角 */}
      {displayTags.length > 0 && (
        <div className="absolute bottom-2 right-2 flex flex-wrap justify-end gap-1 pointer-events-none">
          {displayTags.map((tag, index) => (
            <span
              key={index}
              className="px-1.5 py-0.5 text-xs font-medium text-blue-800 bg-blue-100 rounded-md border border-blue-200 opacity-90"
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
