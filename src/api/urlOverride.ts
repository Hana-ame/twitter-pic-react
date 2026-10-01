// 26-09-11: 默认 override 改成固定图片源 (原来是老的 twimg.moonchan.xyz 入口)。
// 本文件目前没有调用方, 保留仅作兼容。
export default function urlOverride(url: string, override: string = "twimg.l.moonchan.xyz:8443") {
    return url.replace("https://pbs.twimg.com", override)
}