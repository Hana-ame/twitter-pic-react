// 26.02.15
// GLM5

import { ENDPOINT } from "./endpoints.ts";

// 获取指定用户的所有 Emoji 计数
// 对应后端: GET /emojis?username=xxx
export function getEmojis(username: string) {
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/emojis?username=${username}`, {
            method: 'GET'
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

export function getRanking() {
    return getEmojis("")
    // 尼玛，后端写挂了，先凑合一个
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/emojis.json.gz`, {
            method: 'GET'
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

// 为指定用户的某个 Emoji 投票 (+1)
// 对应后端: POST /emojis?username=xxx&emoji=xxx
export function voteUpEmoji(username: string, emoji: string) {
    // 使用 URLSearchParams 处理参数可以自动处理特殊字符编码，更安全
    const params = new URLSearchParams({
        username: username,
        emoji: emoji
    });

    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/emojis?${params.toString()}`, {
            method: 'POST'
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}