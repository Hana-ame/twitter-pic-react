import { useState, useRef, useEffect } from 'react';
import useLocalStorage from "../Tools/localstorage/useLocalStorageStatus.tsx";
import Header from './Header';

const FavList = ({ onClick }) => {
    const [favMap, setFavMap] = useLocalStorage("fav-map", {});
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState("");
    const textareaRef = useRef(null);

    // 自动调整文本域高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [importText, showImport]);

    // 导出功能：复制URL列表到剪贴板 (保持不变)
    const handleExport = () => {
        const baseUrl = `${window.location.origin}/`;
        const textToCopy = Object.keys(favMap)
            .map(key => baseUrl + key)
            .join('\n');
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                alert('已复制到剪贴板');
            })
            .catch(err => {
                console.error('复制失败: ', err);
            });
    };

    // 导入功能：处理粘贴的文本并添加到收藏 (支持任意域名)
    const handleImport = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n').filter(line => line.trim());
        // 复制一份旧数据
        const newFavMap = { ...favMap };
        
        let cnt = 0;

        lines.forEach(line => {
            const cleanLine = line.trim();
            // 1. 去除行尾可能存在的斜杠，防止 .pop() 取到空字符串
            // 2. 按 '/' 分割
            // 3. 取最后一部分作为 key (username)
            const parts = cleanLine.replace(/\/+$/, '').split('/');
            const key = parts.pop();

            // 简单的校验：确保 key 存在且不是 http/https (防止只输入了域名没有username)
            if (key && key !== 'http:' && key !== 'https:') {
                // 如果为了保证导入的顺序也是“新入在前”，
                // 实际上 JS Object 并不严格保证顺序，但通常追加的 Key 会在最后。
                // 渲染时 reverse 即可。
                newFavMap[key] = true;
                cnt++;
            }
        });

        setFavMap(newFavMap);
        setImportText("");
        setShowImport(false);
        alert(`成功导入 ${cnt} 个收藏`);
    };

    return (
        <div className="space-y-4 w-full">
            
            {/* 收藏列表 - 增加 reverse() 以显示最新的在前面 */}
            <div className="space-y-2">
                {Object.keys(favMap).reverse().map(username => (
                    <Header key={username} username={username} onClick={onClick} />
                ))}
            </div>

            {/* 导出导入按钮组 */}
            <div className="flex w-full space-x-2">
                <button 
                    onClick={handleExport}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                    导出收藏
                </button>
                <button 
                    onClick={() => setShowImport(!showImport)}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                    {showImport ? '取消导入' : '导入收藏'}
                </button>
            </div>

            {/* 导入输入区域 */}
            {showImport && (
                <div className="space-y-3">
                    <textarea
                        ref={textareaRef}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={`每行一个URL，例如：https://${window.location.host}/username`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        style={{ minHeight: '80px' }}
                    />
                    <button 
                        onClick={handleImport}
                        disabled={!importText.trim()}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        确认导入
                    </button>
                </div>
            )}

        </div>
    );
};

export default FavList;