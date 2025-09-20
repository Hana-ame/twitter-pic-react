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
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setLimit(limit + 10)}
            >
                Load More
            </button>
        </div>}
    </PhotoProvider>

};

export default MediaList;