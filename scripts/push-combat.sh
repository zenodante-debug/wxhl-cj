#!/usr/bin/env bash
#
# 把**战斗脚本**同步到 wxhl-combat 仓库（https://github.com/zenodante-debug/wxhl-combat）。
#
#   bash scripts/push-combat.sh                    # 用默认开发分支
#   bash scripts/push-combat.sh 某个分支名          # 指定源分支
#
# 只上传两个目录：src/wxhl-combat/ 和 dist/wxhl-combat/
#   - src/wxhl-combat/  —— 源码（引擎/视图/AI 提示词/测试）
#   - dist/wxhl-combat/ —— 构建产物（酒馆里直接导入的那个 index.js）
#
# 用底层 plumbing 构造提交（不 checkout），所以**不会动当前工作区**。
# 目标仓库的 main 分支是这条历史的唯一去处，每次同步追加一个提交。
set -euo pipefail

SRC_BRANCH="${1:-feat/dungeon-teammates-and-events}"
DST_BRANCH="combat-export"
REMOTE="combat"

git remote get-url "$REMOTE" >/dev/null 2>&1 || \
  git remote add "$REMOTE" https://github.com/zenodante-debug/wxhl-combat.git

src_tree=$(git rev-parse "$SRC_BRANCH^{tree}")

# 用临时索引把源分支的树过滤成「只剩战斗脚本」的树
tmp_index=".git/combat-export-index"
rm -f "$tmp_index"
export GIT_INDEX_FILE="$tmp_index"
git read-tree "$src_tree"
git ls-files -z | grep -zvE '^(src/wxhl-combat/|dist/wxhl-combat/)' \
  | xargs -0 -r git rm -q --cached --ignore-unmatch --
new_tree=$(git write-tree)
unset GIT_INDEX_FILE
rm -f "$tmp_index"

old_commit=$(git rev-parse --verify --quiet "$DST_BRANCH" || true)

# 幂等的判据必须是**远端**，不是本地导出分支 ——
# 曾经踩过：先 update-ref 再 push，push 因网络失败，本地却已前进 →
# 下次再跑时误判成"已是最新"，改动就永远推不上去了。
remote_head=$(git ls-remote "$REMOTE" refs/heads/main 2>/dev/null | cut -f1 || true)
if [ -z "$remote_head" ]; then
  echo "⚠ 连不上远端（$REMOTE）—— 请检查网络/代理后重跑本脚本。" >&2
  exit 1
fi

if [ -n "$old_commit" ] && [ "$(git rev-parse "$old_commit^{tree}")" = "$new_tree" ] && [ "$remote_head" = "$old_commit" ]; then
  echo "已是最新（远端 main 与 $SRC_BRANCH 一致），无需推送。"
  exit 0
fi

msg="${2:-sync(wxhl-combat): 同步战斗脚本 @ $(git rev-parse --short "$SRC_BRANCH")}"
if [ -n "$old_commit" ] && [ "$(git rev-parse "$old_commit^{tree}")" = "$new_tree" ]; then
  # 树没变但远端落后（上次推送失败）→ 直接推已有的提交，不造空提交
  new_commit="$old_commit"
else
  if [ -n "$old_commit" ]; then
    new_commit=$(git commit-tree "$new_tree" -p "$old_commit" -m "$msg")
  else
    new_commit=$(git commit-tree "$new_tree" -m "$msg")
  fi
  git update-ref "refs/heads/$DST_BRANCH" "$new_commit"
fi

git push "$REMOTE" "$DST_BRANCH:main"

echo "已推送：$(git rev-parse --short "$new_commit")  $msg"
