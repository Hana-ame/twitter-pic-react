import { useState } from 'react';

import { getUserList } from '../api/getUserList.ts';

export default function LoadMoreButton({ after, setUserList }) {
    const [noMore, setNoMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const click = (after) => {
        getUserList(after).then(users => {
            setUserList(prev => [...prev, ...users])
            console.log(users)
            if (!(users?.length)) setNoMore(true);
        })
    }

    const handleClick = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            await click(after); // 假设 click 返回一个 Promise
        } catch (error) {
            console.error("加载失败:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
        ${after ? "" : "invisible"}
        ${noMore ? "invisible" : ""}
      `}
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {isLoading ? '加载中...' : '加载更多'}
        </button>
    );
}