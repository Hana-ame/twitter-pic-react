import { ENDPOINT } from "./endpoints.ts";

export default async function getMetaData(username: string, t: string = "") {
    const url = new URL(`${ENDPOINT}/${username}`);
    
    if (t !== "") {
        url.searchParams.append("t", t);
    }

    const res = await fetch(url.toString());
    return await res.json();
}