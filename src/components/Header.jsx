import React, { useEffect, useState } from 'react';
import getMetaData from '../api/getMetaData.ts';

const Header = ({ username, onClick }) => {
    // 模拟从API获取的用户数据（实际应用中这里会是API调用）
    const [userData, setUserData] = useState({ loading: true });
    const [error, setError] = useState(false);

    function fetchAndSet() {
        setUserData({ loading: true })
        setError(false)

        getMetaData(username).then(data => {
            // console.log(data);
            setUserData(data);
        }).catch(e => {
            // console.error(e)
            setError(true)
        })

    }

    useEffect(() => {

        fetchAndSet()

        return () => { }
    }, [username])

    if (userData.loading) {
        return <div className='flex items-center m-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md'>
            loading
        </div>
    }

    if (error) {
        return <div className='flex items-center m-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md'
            onClick={() => { fetchAndSet() }}>
            点击重试
        </div>
    }

    return (
        <div className="flex items-center m-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md"
            onClick={() => onClick(userData)}>
            {/* 用户头像 */}
            <div className="flex-shrink-0 mr-4">
                <img
                    src={userData.account_info.profile_image}
                    alt={userData.account_info.nick}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                />
            </div>

            {/* 用户信息 */}
            <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-900 truncate">
                    {userData.account_info.nick}
                </span>
                <span className="text-md text-gray-500 truncate">
                    @{userData.account_info.name}
                </span>
            </div>
        </div>
    );
};

export default Header;