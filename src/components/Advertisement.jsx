import React, { useState, useEffect, useRef, useCallback } from 'react';

// 使用 Tailwind CSS 的广告组件
const Advertisement_ = () => {
    // 请将此处替换为您的实际图片URL
    const adImageUrl = "https://upload.moonchan.xyz/api/01LLWEUU4DPSZ6JHOO6FDJOOHRSSQOKOZI/%E5%B9%BF%E5%91%8A.jpg";

    return (
        <a href="https://ex.nmbyd3.top" rel="noreferrer" target="_blank">
            <div className="w-full h-16 bg-gray-100 flex items-center justify-center overflow-hidden mb-2 mt-0">
                <img
                    src={adImageUrl}
                    alt="广告"
                    className="max-w-full max-h-full object-contain" // 关键    ：保证图片完整显示
                    onError={(e) => {
                        // 图片加载失败时的处理：隐藏图片，显示容器背景色
                        e.target.style.display = 'none';
                    }}
                />
            </div>
        </a>
    );
};

const fetchAdData = async () => {
    try {
        const response = await fetch('/ads.json', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // 可选的缓存控制
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error(`广告数据请求失败: ${response.status}`);
        }

        const adData = await response.json();

        // 验证数据格式
        if (!Array.isArray(adData)) {
            throw new Error('广告数据格式错误：期望数组');
        }

        // 验证每个广告对象的结构
        const isValid = adData.every(ad => ad.a && ad.p);
        if (!isValid) {
            throw new Error('广告数据格式错误：缺少必要字段');
        }

        return adData;

    } catch (error) {
        console.error('获取广告数据失败:', error);

        // 返回备用数据确保功能正常
        return [
            {
                a: "https://ex.nmbyd3.top/",
                p: "https://upload.moonchan.xyz/api/01LLWEUU4DPSZ6JHOO6FDJOOHRSSQOKOZI/广告ex.jpg"
            },
            {
                a: "https://nmbyd3.top/?bid=23",
                p: "https://upload.moonchan.xyz/api/01LLWEUU2W7LXKP3LDYZCJLKOV7W6A6YF3/广告nmbyd.jpg"
            }
        ];
    }
};


const Advertisement = () => {
    const [adCount, setAdCount] = useState(1);
    const [randomAds, setRandomAds] = useState([]);
    const [adImageUrls, setAdImageUrls] = useState([]);
    const containerRef = useRef(null);

    // Fisher-Yates洗牌算法，高效随机抽取广告[6,7](@ref)
    const getRandomAds = useCallback((count) => {
        if (count >= adImageUrls.length) {
            return [...adImageUrls];
        }

        const shuffled = [...adImageUrls];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }, [adImageUrls]);

    // 处理广告数量更新的回调函数
    const updateAdCount = useCallback(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.offsetWidth;
        let newCount;
        // 每个广告大约320px宽，最少1个
        newCount = Math.max(1, Math.floor(width / 320));

        if (newCount !== adCount) {
            setAdCount(newCount);
            setRandomAds(getRandomAds(newCount));
        }
    }, [adCount, getRandomAds]);


    // 组件挂载时获取广告数据
    useEffect(() => {
        const loadAdData = async () => {
            const data = await fetchAdData();
            setAdImageUrls(data);

            // 根据容器宽度设置广告数量
            updateAdCount();

            console.log("广告加载完成");
        };

        loadAdData();
    }, []);


    // 使用ResizeObserver监听父元素尺寸变化
    useEffect(() => {
        if (!containerRef.current) return;

        updateAdCount();

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0) return;
            updateAdCount();
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [updateAdCount]);

    // 初始随机广告抽取
    useEffect(() => {
        setRandomAds(getRandomAds(adCount));
    }, [adCount, getRandomAds]);

    return (
        <div ref={containerRef} className="w-full">
            <div className="flex flex-wrap justify-center">
                {randomAds.map((obj, index) => (
                    <a
                        key={index}
                        href={obj.a}
                        rel="noreferrer"
                        target="_blank"
                        className="flex-1 min-w-0"
                    >
                        <div className="h-16 bg-gray-100 flex items-center justify-center overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src={obj.p}
                                alt={obj.a + "#"}
                                className="max-w-full max-h-full object-contain"
                            // onError={(e) => {
                            //     e.target.style.display = 'none';
                            //     e.target.parentNode.style.backgroundColor = '#f3f4f6';
                            // }}
                            />
                        </div>
                    </a>
                ))}
            </div>

            {/* 调试信息 - 实际部署时可以移除 */}
            <div className="mt-2 text-xs text-gray-500 text-center invisible">
                当前宽度: {containerRef.current?.offsetWidth || 0}px,
                显示广告数: {adCount},
                总广告库: {adImageUrls.length}个
            </div>
        </div>
    );
};

export default Advertisement;