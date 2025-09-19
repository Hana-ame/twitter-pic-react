import { ENDPOINT } from "./endpoints.ts";

export default function getMetaData(username: string) {
    fetch(`${ENDPOINT}/?username=${username}`, {
        method: "POST",
    }).then(res => res.text()).then(data => {
        return { data };
    }).catch(err => {
        console.error(err);
        return { error: err };
    });
}