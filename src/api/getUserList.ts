import { ENDPOINT } from "./endpoints";

type ListType = "users";
type SearchMethod = "username" | "nick"

export async function getUserList(after?: string) {
    // 修复: after 含 # & 空格 时会破坏 URL, 用 encodeURIComponent 编码。
    const response = await fetch(`${ENDPOINT}/?list=users${after ? "&after=" + encodeURIComponent(after) : ""}`);
    return response.json();
}
export async function searchUserList(by: SearchMethod, search: string) {
    if (by !== "username" && by !== "nick") return []
    if (search === "") return []

    // 修复: search 是自由文本 (可含空格 / & / #), 必须编码。
    const response = await fetch(`${ENDPOINT}/?by=${by}&search=${encodeURIComponent(search)}`);
    return response.json();
}