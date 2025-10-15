// 25-10-14：timeline去重 
import { useEffect, useState, useMemo } from 'react';
import { PhotoProvider } from 'react-photo-view';
import Media from './Media.tsx';

const MediaList = ({ timeline, showAll }: { timeline: any[], showAll: boolean }) => {
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(false);

    // 使用useMemo对timeline进行去重处理
    const uniqueTimeline = useMemo(() => {
        if (!timeline || !Array.isArray(timeline)) return [];
        
        // 方法1: 使用Set根据url去重（推荐）
        const seen = new Set();
        return timeline.filter(item => {
            if (!item || !item.url) return false;
            if (seen.has(item.url)) {
                return false;
            }
            seen.add(item.url);
            return true;
        });
        
        // 方法2: 使用Reduce根据url去重
        // return timeline.reduce((acc, current) => {
        //     if (!current || !current.url) return acc;
        //     const exists = acc.find(item => item.url === current.url);
        //     if (!exists) {
        //         acc.push(current);
        //     }
        //     return acc;
        // }, []);
        
        // 方法3: 使用Map根据url去重
        // const map = new Map();
        // timeline.forEach(item => {
        //     if (item && item.url && !map.has(item.url)) {
        //         map.set(item.url, item);
        //     }
        // });
        // return Array.from(map.values());
    }, [timeline]);

    useEffect(() => {
        setLoading(true);
        if (showAll) setLimit(999999999);
        else setLimit(10);
    }, [timeline, showAll]);

    useEffect(() => {
        if (timeline && (typeof timeline === 'object' || Array.isArray(timeline))) {
            setLoading(false);
        }
    }, [loading, timeline]);

    if (loading) {
        return <div>Loading...</div>;
    }

    // 使用去重后的timeline
    const displayTimeline = uniqueTimeline.slice(0, limit);

    return (
        <PhotoProvider>
            {displayTimeline.map(status => (
                <Media key={status.url} url={status.url} type={status.type} />
            ))}
            {limit < uniqueTimeline.length && (
                <div className="flex justify-center my-4">
                    <button
                        className={`mb-24
                            bg-gradient-to-r from-blue-500 to-indigo-600
                            hover:from-blue-600 hover:to-indigo-700
                            text-white font-semibold
                            py-2 px-4 rounded shadow-md
                            hover:shadow-lg transition duration-300 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
                            disabled:opacity-75 disabled:cursor-not-allowed
                            flex items-center justify-center w-full h-24
                        `}
                        onClick={() => setLimit(limit + 10)}
                    >
                        加载更多
                    </button>
                </div>
            )}
        </PhotoProvider>
    );
};

export default MediaList;