import { ENDPOINT } from "./endpoints.ts";

// 25-08-14: 支持 AbortSignal。
// 坑: 快速切换 profile 时旧请求若不取消, 会一直占用浏览器对该 host 的连接池,
// 导致新 profile 的请求排队(HTTP/1.1 每 host 并发有限), 界面表现为卡顿。
export default function getTags(username: string, signal?: AbortSignal) {
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/tags/${username}`, {
            signal,
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}