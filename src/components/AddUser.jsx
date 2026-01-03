import { useEffect, useState } from "react";
import createMetaData from "../api/createMetaData.ts";
import TagSelectorModal from "./TagSelectorModal"; // 引入公共组件

const AddUser = ({ username }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showModal, setShowModal] = useState(false); // 控制模态框

  useEffect(() => {
    setIsClicked(false);
  }, [username]);

  const onClick = () => {
    if (isClicked) return;

    const usernameRegex = /^[a-zA-Z0-9_]*$/;
    if (!usernameRegex.test(username)) {
      alert("不支持昵称或中文添加，或者请使用@后面的字符串（删去@）");
      return;
    }

    // 验证通过，打开 Tag 选择器，而不是直接 createMetaData
    setShowModal(true);
  };

  const handleConfirm = (tags) => {
    // 关闭模态框
    setShowModal(false);
    // 提交数据 (username + tags)
    createMetaData(username, tags, false);
    // 标记为已点击
    setIsClicked(true);
  };

  return (
    <>
      <div
        className={`flex items-center m-4 p-4 rounded-lg shadow-sm border border-gray-200 w-auto transition-colors ${
          isClicked
            ? "hover:cursor-not-allowed bg-gray-100 text-gray-400"
            : "hover:cursor-pointer bg-gray-200 hover:bg-gray-100"
        }`}
        onClick={onClick}
        disabled={isClicked}
      >
        <p className="w-md font-medium">
          {isClicked ? "已添加" : "添加 @" + username}
        </p>
      </div>

      {/* 使用公共组件 */}
      <TagSelectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        username={username}
        initialValues={{ 其他: 1 }} // 新增用户，初始标签为空
      />
    </>
  );
};
export default AddUser;
