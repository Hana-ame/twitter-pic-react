import { useEffect, useState } from "react";
import createMetaData from "../api/createMetaData.ts";

const AddUser = ({ username }) => {
    const [isClicked, setIsClicked] = useState(false);
    useEffect(() => {
        setIsClicked(false);
    }, [username])
    const onClick = () => {
        const usernameRegex = /^[a-zA-Z0-9_]*$/
        // 如果username不是只包含数字字母和下划线的字符串
        if (!usernameRegex.test(username)) {
            // 提示用户使用@之后的字符串
            alert("不支持昵称或中文添加，或者请使用@后面的字符串（删去@）");
            return; // 停止执行后续操作
        }

        // 提示不能添加，要求用户使用@之后的字符串
        !isClicked && createMetaData(username)
        setIsClicked(true);
    }
    // 假设使用Tailwind CSS
    return <div
        className={`flex items-center m-4 p-4 rounded-lg shadow-sm border border-gray-200 w-auto ${isClicked ? "hover:cursor-not-allowed bg-gray-100" : "hover:cursor-pointer bg-gray-200 hover:bg-gray-100"}`} // 加载状态
        onClick={onClick}
        disabled={isClicked}
    >
        <p className="w-md">{'添加 @' + username}</p>
    </div>
}
export default AddUser;