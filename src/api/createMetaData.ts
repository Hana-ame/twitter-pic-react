import { ENDPOINT } from "./endpoints.ts";

export default async function createMetaData(username: string) {
    await fetch(`${ENDPOINT}/?username=${username}`, {
        method: "POST",
    })
    return 
}