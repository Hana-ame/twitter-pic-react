import React, { useState, useEffect } from 'react';

import useScreenMode from './Tools/hooks/useScreenMode';

import MediaList from './components/MediaList.tsx'; // 请替换为实际路径
import HeaderList from './components/HeaderList'; // 请替换为实际路径

import { getUserList, searchUserList } from './api/getUserList.ts';
import SearchBar from './components/SearchBar.jsx';
import HelpPage from './components/HelpPage.jsx';
import SearchList from './components/SearchList.jsx';
import LoadMoreButton from './components/LoadMoreButton.jsx';
import AddUser from './components/AddUser.jsx';
import getMetaData from './api/getMetaData.ts';
import useLocalStorage from './Tools/localstorage/useLocalStorageStatus.tsx';

const SideBar = ({ onClick }) => {
  const [userList, setUserList] = useState(null);
  const [search, setSearch] = useState("");

  // 仅作初始化
  useEffect(() => {
    getUserList().then(users => {
      setUserList(users)
    })
  }, [])


  return <>
    <SearchBar onChange={setSearch} />
    <div className={search !== "" ? "" : "hidden"}>
      <AddUser username={search} />
      <SearchList by="username" search={search} onClick={onClick} />
      <SearchList by="nick" search={search} onClick={onClick} />
    </div>
    <div className={search === "" ? "" : "hidden"}>
      <HeaderList userList={userList} onClick={onClick} />
      <LoadMoreButton after={userList?.at(-1) || ""} setUserList={setUserList} />
    </div>
  </>
}

const Main = ({ profile }) => {
  const [blockMap, setBlockMap] = useLocalStorage("block-map", {});
  const [showAll, setShowAll] = useState(false);

  const username = profile?.account_info?.name;

  const handleBlockUser = () => {
    if (!username) return;

    setBlockMap(prev => ({
      ...prev,
      [username]: !(prev[username] || false) // 如果不存在，默认为false然后取反
    }))
  }

  if (!(profile?.timeline?.length > 0)) return <HelpPage />

  return <main>
    <div className="mb-4 flex space-x-2">
      {/* 展开全部按钮 */}
      <button
        onClick={() => setShowAll(true)}
        className="flex-1 py-2 px-4 flex items-center justify-center bg-green-100 text-green-700 rounded-md hover:bg-green-500 hover:text-white transition-colors duration-200"
        aria-label="展开全部"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 9l6 6 6-6" />
        </svg>
        展开全部
      </button>

      {/* 屏蔽用户按钮 */}
      <button
        onClick={handleBlockUser}
        className={`flex-1 py-2 px-4 flex items-center justify-center rounded-md  hover:text-white transition-colors duration-200 ${username && blockMap[username] ? "bg-red-500 text-white" : "bg-red-100 hover:bg-red-500 text-red-700"}`}
        aria-label="屏蔽用户"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        {username && blockMap[username] ? "取消屏蔽" : "屏蔽用户"}
      </button>
    </div>
    <MediaList timeline={profile?.timeline} showAll={showAll} />
  </main>
}
// 主布局组件
const ResponsiveLayout = () => {
  const isMobile = useScreenMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // 首次加载时
  useEffect(() => {
    // 得到path，split by "/"，得到第一个非空字符串，然后console.log（如果为空直接return）
    const fullPath = window.location.pathname; // 获取完整路径，如 "/user/123/profile"
    const parts = fullPath.split('/');
    const firstNonEmptyPart = parts.find(elem => elem !== '');
    if (firstNonEmptyPart) {
      getMetaData(firstNonEmptyPart).then(data => setProfile(data))
    }
  }, [])

  // 切换抽屉状态
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleSetProfile = (profile) => {
    window.history.pushState({}, null, '/' + profile.account_info.name);
    setProfile(profile);
  }

  const onClickHome = () => {
    window.history.pushState({}, null, '/');
    setProfile(null);
  }

  return (
    <div className="flex h-screen bg-gray-100 relative">

      {/* 主要内容区域 */}
      <div className={`flex-1 p-4 overflow-auto ${isMobile ? 'w-full' : 'w-3/4'}`}>

        {/* 添加的返回主页按钮 */}
        <div className="mb-4"> {/* 添加一些底部外边距 */}
          <button
            onClick={onClickHome}
            className="w-full py-2 px-4 flex items-center justify-center bg-gray-100 text-gray-700 rounded-md hover:bg-blue-500 hover:text-white transition-colors duration-200"
            aria-label="返回主页"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            返回主页
          </button>
        </div>

        <Main profile={profile} />
      </div>

      {/* 桌面模式下的用户列表 */}
      {!isMobile && (
        <div className="w-1/4 p-4 bg-white border-l border-gray-200 overflow-auto">
          <SideBar onClick={(data) => { handleSetProfile(data) }} />
        </div>
      )}

      {/* 移动模式下的抽屉按钮 */}
      {isMobile && (
        <button
          onClick={toggleDrawer}
          className="fixed top-4 right-4 z-50 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          aria-label="打开用户列表"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      )}

      {/* 移动模式下的抽屉式用户列表 */}
      {isMobile && (
        <>
          {/* 抽屉遮罩层 */}
          {drawerOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={closeDrawer}
            />
          )}

          {/* 抽屉内容 */}
          <div
            className={`fixed top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
          >
            <div className="p-4 border-b border-gray-200 flex justify-end">
              <button
                onClick={closeDrawer}
                className="p-2 text-gray-500 hover:text-gray-700"
                aria-label="关闭抽屉"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto h-full">
              <SideBar onClick={(profile) => { closeDrawer(); handleSetProfile(profile) }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResponsiveLayout;