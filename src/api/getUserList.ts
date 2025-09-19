import { ENDPOINT } from "./endpoints.ts";

type ListType = "users";

export default async function getList(list: ListType) {
    const response = await fetch(`${ENDPOINT}/?list=${list}`);
    return response.json();
}