// 26-10-08: 默认 override 改成固定唯一图片源 https://pbs.moonchan.xyz (原来默认是老的 twimg.l.moonchan.xyz:8443)。
// 本文件目前没有调用方, 保留仅作兼容。
import { FIXED_IMAGE_PROXY } from "./endpoints";

export default function urlOverride(url: string, override: string = FIXED_IMAGE_PROXY) {
    return url.replace("https://pbs.twimg.com", override)
}
