import { ENDPOINT } from "./endpoints.ts";

export default async function createMetaData(username: string, body: any = null) {
    await fetch(`${ENDPOINT}/?username=${username}`, {
        method: "POST",
        body: body,
    })
    return 
}