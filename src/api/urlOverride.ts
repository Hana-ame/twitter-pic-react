export default function urlOverride(url: string, override: string = "twimg.moonchan.xyz") {
    return url.replace("https://pbs.twimg.com", override)
}