import { ENDPOINT } from "./endpoints.ts";

type ListType = "users";
type SearchMethod = "username" | "nick"

export async function getUserList(after?: string) {
    const response = await fetch(`${ENDPOINT}/?list=users${after ? "&after=" + after : ""}`);
    return response.json();
}
export async function searchUserList(by: SearchMethod, search: string) {
    if (by !== "username" && by !== "nick") return []
    if (search === "") return []

    const response = await fetch(`${ENDPOINT}/?by=${by}&search=${search}`);
    return response.json();
}