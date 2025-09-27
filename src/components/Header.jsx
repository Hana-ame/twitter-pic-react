import React, { useEffect, useState } from 'react';
import getMetaData from '../api/getMetaData.ts';
import useLocalStorage from '../Tools/localstorage/useLocalStorageStatus.tsx';

const Header = ({ username, onClick }) => {
    // const [blockMap] = useLocalStorage("block-map", {});


    // 模拟从API获取的用户数据（实际应用中这里会是API调用）
    const [userData, setUserData] = useState({ loading: true });
    const [error, setError] = useState(false);
    const [blocked, setBlocked] = useState(false);

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

    // 当username变化时更新
    useEffect(() => {


        let flag = true;
        try {
            const s = window.localStorage.getItem("block-map");
            if (s) {
                let o = JSON.parse(s);
                if (typeof o !== 'object' || o === null || Array.isArray(o)) {
                    o = {};
                }
                if (o[username] === true) { // 或者 if (Boolean(o[username])) 用于更宽松的判断
                    setBlocked(true);
                    flag = false;
                }
            }
        } catch (e) {
            console.error(e);
        }

        if (flag) fetchAndSet();

        return
    }, [username])

    // 被屏蔽不返回
    if (blocked)
        return null;


    if (userData.loading)
        return <div className='flex items-center m-4 p-4 bg-gray-200 rounded-lg shadow-sm border border-gray-200 max-w-md'>
            loading
        </div>


    if (error) {
        return <div className='flex items-center m-4 p-4 bg-gray-200 rounded-lg shadow-sm border border-gray-200 max-w-md'
            onClick={() => { fetchAndSet() }}>
            点击重试
        </div>
    }

    return (
        <div className="flex items-center m-4 p-4 bg-gray-200 hover:bg-gray-100 hover:cursor-pointer rounded-lg shadow-sm border border-gray-200 max-w-md"
            onClick={() => onClick(userData)}>
            {/* 用户头像 */}
            <div className="flex-shrink-0 mr-4">
                <img
                    src={userData.account_info.profile_image.replace("pbs.twimg.com", "twimg.nmbyd3.top")}
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