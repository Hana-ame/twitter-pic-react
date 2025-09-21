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

const Main = ({ timeline }) => {
  return <main>
    {timeline?.length > 0 ? <MediaList timeline={timeline} /> : <HelpPage />}
  </main>
}
// 主布局组件
const ResponsiveLayout = () => {
  const isMobile = useScreenMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);

  // 首次加载时
  useEffect(() => {
    // 得到path，split by "/"，得到第一个非空字符串，然后console.log（如果为空直接return）
    const fullPath = window.location.pathname; // 获取完整路径，如 "/user/123/profile"
    const parts = fullPath.split('/');
    const firstNonEmptyPart = parts.find(elem => elem !== '');
    if (firstNonEmptyPart) {
      getMetaData(firstNonEmptyPart).then(data => setTimeline(data.timeline))
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

  const onClick = (data) => {
    window.history.pushState({}, null, '/' + data.account_info.name);
    setTimeline(data.timeline);
  }

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* 主要内容区域 */}
      <div className={`flex-1 p-4 overflow-auto ${isMobile ? 'w-full' : 'w-3/4'}`}>
        <Main timeline={timeline} />
      </div>

      {/* 桌面模式下的用户列表 */}
      {!isMobile && (
        <div className="w-1/4 p-4 bg-white border-l border-gray-200 overflow-auto">
          <SideBar onClick={(data) => { onClick(data) }} />
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
              <SideBar onClick={(data) => { closeDrawer(); onClick(data) }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResponsiveLayout;