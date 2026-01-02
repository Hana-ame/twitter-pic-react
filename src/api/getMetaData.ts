import { ENDPOINT } from "./endpoints.ts";

export default async function getMetaData(username: string, t: string = "") {
  // 1. 根据是否有 t，决定是否添加 .json.gz 后缀
  const path = t ? `${username}.json.gz` : username;

  // 2. 构造基础 URL
  const url = new URL(`${ENDPOINT}/${path}`);

  // 3. 如果有 t，添加查询参数
  if (t !== "") {
    url.searchParams.append("t", t);
  }

  const res = await fetch(url.toString());

  // 注意：如果返回的是 .gz 压缩包，某些环境下 fetch 可能需要处理解压
  // 但通常浏览器/Node 运行时会自动处理 Content-Encoding: gzip
  return await res.json();
}
