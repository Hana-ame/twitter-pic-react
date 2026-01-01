import { ENDPOINT } from "./endpoints.ts";

export default function getTags(username: string) {
    return new Promise((resolve, reject) => {
        fetch(`${ENDPOINT}/tags/${username}`, {
            
        }).then(res => res.json()).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}