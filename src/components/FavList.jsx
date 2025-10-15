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

    // 导出功能：复制URL列表到剪贴板
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

    // 导入功能：处理粘贴的文本并添加到收藏
    const handleImport = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n').filter(line => line.trim());
        const newFavMap = { ...favMap };
        
        let cnt = 0;

        lines.forEach(line => {
            // 从URL中提取key（用户名）
            const key = line.replace(`${window.location.origin}/`, '');
            if (key) {
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
            
            {/* 收藏列表 */}
            <div className="space-y-2">
                {Object.keys(favMap).map(username => (
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