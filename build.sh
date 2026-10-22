#!/bin/bash
# build.sh —— 提交并强推（commit message 必填）
# 用法: ./build.sh "<commit message>"
# 没有 $1 直接报错退出
if [ -z "${1:-}" ]; then
  echo "错误：缺少 commit message。用法: $0 \"<commit message>\"" >&2
  exit 1
fi
git commit -am "$1"
git push -f
