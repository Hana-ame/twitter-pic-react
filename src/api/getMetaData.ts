import { ENDPOINT } from "./endpoints.ts";

export default function getMetaData(username: string) {
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/${username}`, {
            headers: {
                // 方法2：设置HTTP头禁止缓存
                // 'Cache-Control': 'no-cache, no-store, must-revalidate',
                // 'Pragma': 'no-cache',
                // 'Expires': '0'
            }
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}
