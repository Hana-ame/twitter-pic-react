import React, { useState, useRef } from 'react';

const SearchBar = ({ onChange, placeholder = "...", className = "" }) => {
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef(null);

  // 处理输入变化
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onChange(value); // 立即提交所有修改
  };

  // 清除搜索内容
  const handleClear = () => {
    setSearchValue("");
    onChange(""); // 提交空值
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 搜索图标 */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="h-5 w-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>

      {/* 搜索输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors duration-200"
      />

      {/* 清除按钮（有内容时显示） */}
      {searchValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="清除搜索"
        >
          <svg 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;