import { useEffect, useState } from 'react';

import { PhotoProvider } from 'react-photo-view';

import Media from './Media.tsx';

const MediaList = ({ timeline }: { timeline: any[] }) => {
    // 一种兼容性更好的检查方式是组合两种方法
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        setLimit(10);
    }, [timeline])

    useEffect(() => {
        if (timeline && (typeof timeline === 'object' || Array.isArray(timeline))) {
            setLoading(false);
        }
    }, [loading])

    if (loading) {
        return <div>Loading...</div>;
    }

    return <PhotoProvider>
        {timeline.slice(0, limit).map(status => <Media key={status.url} url={status.url} type={status.type} />)}
        {limit < timeline.length && <div className="flex justify-center my-4">
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
        </div>}
    </PhotoProvider>

};

export default MediaList;