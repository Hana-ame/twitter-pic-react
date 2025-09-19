import { ENDPOINT } from "./endpoints.ts";

export default async function getMetaData(username: string) {
    return await fetch(`${ENDPOINT}/${username}.json`).then(res => res.json()).then(data => {
        return data;
    });
}