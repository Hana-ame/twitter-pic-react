import { ENDPOINT } from "./endpoints.ts";

export default async function createMetaData(
  username: string,
  body: any = null,
  do_not_tag: boolean = true,
  do_not_renew: boolean = false
) {
  // 1. 构建基础 URL
  const url = new URL(`${ENDPOINT}/${username}`);

  // 2. 如果为 true，则添加 searchParams
  if (do_not_tag) {
    url.searchParams.append("do_not_tag", "true");
  }

  // 顺便处理 do_not_renew (如果逻辑一致的话)
  if (do_not_renew) {
    url.searchParams.append("do_not_renew", "true");
  }

  // 3. 发送请求
  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  return;
}
