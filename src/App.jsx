import React, { useState, useEffect } from 'react';

import useScreenMode from './Tools/hooks/useScreenMode';

import MediaList from './components/MediaList.tsx'; // 请替换为实际路径
import HeaderList from './components/HeaderList'; // 请替换为实际路径

import getList from './api/getUserList.ts';


// 主布局组件
const ResponsiveLayout = () => {
  const isMobile = useScreenMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userList, setUserList] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    getList("users").then(users => {
      setUserList(users)
    })
  }, [])

  // 切换抽屉状态
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* 主要内容区域 */}
      <div className={`flex-1 p-4 overflow-auto ${isMobile ? 'w-full' : 'w-3/4'}`}>
        <MediaList timeline={timeline} />
      </div>

      {/* 桌面模式下的用户列表 */}
      {!isMobile && (
        <div className="w-1/4 p-4 bg-white border-l border-gray-200 overflow-auto">
          <HeaderList userList={userList} onClick={(data) => { setTimeline(data.timeline) }} />
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
              <HeaderList userList={userList} onClick={(data) => { closeDrawer(); setTimeline(data.timeline) }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResponsiveLayout;