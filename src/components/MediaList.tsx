import React, { useEffect, useState, useMemo } from "react";
import { PhotoProvider } from "react-photo-view";
import Media from "./Media";
import { V2TimelineItem } from "../api/clientCache";

type MediaListProps = {
  timeline: V2TimelineItem[];
  showAll: boolean;
  mediaFilter?: "all" | "photo" | "video";
};

const MediaList: React.FC<MediaListProps> = ({
  timeline,
  showAll,
  mediaFilter = "all",
}) => {
  const [limit, setLimit] = useState(12);

  // 去重并按类型筛选
  const filteredTimeline = useMemo(() => {
    if (!timeline || !Array.isArray(timeline)) return [];
    const seen = new Set<string>();
    return timeline.filter((item) => {
      if (!item || !item.url) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);

      const t = (item.type || "").toLowerCase();
      const isVideo =
        t === "video" || t === "animated_gif" || t === "article:video";
      if (mediaFilter === "photo") return !isVideo;
      if (mediaFilter === "video") return isVideo;
      return true;
    });
  }, [timeline, mediaFilter]);

  useEffect(() => {
    if (showAll) {
      setLimit(filteredTimeline.length || 12);
    } else {
      setLimit(12);
    }
  }, [timeline, mediaFilter, showAll, filteredTimeline.length]);

  const displayTimeline = filteredTimeline.slice(0, limit);

  if (filteredTimeline.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        当前筛选条件下暂无媒体内容
      </div>
    );
  }

  return (
    <PhotoProvider>
      <div className="space-y-3">
        {displayTimeline.map((status) => (
          <Media
            key={status.url}
            url={status.url}
            type={status.type}
            cover={status.cover}
            ouoUrl={status.ouo_url}
          />
        ))}
      </div>
      {limit < filteredTimeline.length && (
        <div className="flex justify-center my-4">
          <button
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 flex items-center justify-center w-full h-16"
            onClick={() => setLimit((prev) => prev + 12)}
          >
            加载更多 ({limit} / {filteredTimeline.length})
          </button>
        </div>
      )}
    </PhotoProvider>
  );
};

export default MediaList;
