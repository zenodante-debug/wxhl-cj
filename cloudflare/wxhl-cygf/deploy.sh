#!/usr/bin/env bash
#
# 一键部署 wxhl 创意工坊 Worker（路线 A：wrangler）
#
#   bash cloudflare/wxhl-cygf/deploy.sh
#
# 依次做：检查登录 → 建 D1 并把 database_id 写回 wrangler.toml → 设管理密钥 → 部署 → 冒烟。
# 可重复运行：已建的库不会重建，已填的 id 不会覆盖。
#
# 需要你介入的只有两处：
#   1) 若检测到未登录 → 脚本会让你先跑 `wrangler login`（弹浏览器点授权）
#   2) 管理密钥：脚本会静默提示你输入（也可用环境变量 WORKSHOP_ADMIN_KEY 预先给定）
#
# 注意：本脚本必须在**你自己的终端**里跑（Git Bash / VSCode 终端切 Git Bash）。
set -euo pipefail

cd "$(dirname "$0")"   # 让 wrangler 读到同目录的 wrangler.toml

DB_NAME="wxhl-cygf-db"
TOML="wrangler.toml"

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ———— 0. 找到 wrangler ————
if command -v wrangler >/dev/null 2>&1; then
  WRANGLER=(wrangler)
else
  warn "没找到全局 wrangler，改用 npx（首次会下载，需要能访问 npm）"
  WRANGLER=(npx --yes wrangler@latest)
fi
say "wrangler 版本"; "${WRANGLER[@]}" --version

# ———— 1. 登录检查 ————
say "检查 Cloudflare 登录状态"
if ! "${WRANGLER[@]}" whoami >/dev/null 2>&1; then
  die "未登录。请先在本终端运行：  ${WRANGLER[*]} login
    它会打开浏览器要你点一次授权，完成后重跑本脚本。"
fi
"${WRANGLER[@]}" whoami || true
ok "已登录"

# ———— 2. D1 数据库 ————
current_id="$(grep -E '^\s*database_id' "$TOML" | head -1 | sed -E 's/.*"([^"]*)".*/\1/' || true)"
if [ -n "$current_id" ] && [ "$current_id" != "PENDING_CREATE" ]; then
  ok "wrangler.toml 已填 database_id：$current_id（跳过建库）"
else
  say "创建 D1 数据库：$DB_NAME"
  create_out="$("${WRANGLER[@]}" d1 create "$DB_NAME" 2>&1 || true)"
  echo "$create_out"
  new_id="$(printf '%s' "$create_out" | grep -oE 'database_id\s*=\s*"[^"]+"' | head -1 | sed -E 's/.*"([^"]*)".*/\1/' || true)"
  if [ -z "$new_id" ]; then
    # 可能是"已存在"，从账号里按名字查出 uuid
    warn "没从创建输出里解析到 database_id，尝试在账号里查找同名库…"
    new_id="$("${WRANGLER[@]}" d1 list 2>/dev/null \
      | grep -F "$DB_NAME" \
      | grep -oE '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' \
      | head -1 || true)"
  fi
  [ -n "$new_id" ] || die "拿不到 database_id。请手动跑 \`${WRANGLER[*]} d1 create $DB_NAME\`，把输出里的 database_id 填进 $TOML 后再重跑。"
  # 写回（Windows/GitBash 下 sed -i 可用；先备份）
  cp "$TOML" "$TOML.bak"
  sed -i -E "s|(^\s*database_id\s*=\s*\").*(\".*)$|\1${new_id}\2|" "$TOML"
  if grep -q "$new_id" "$TOML"; then
    ok "已把 database_id 写回 $TOML：$new_id"
    rm -f "$TOML.bak"
  else
    mv "$TOML.bak" "$TOML"
    die "写回 $TOML 失败，已还原。请手动把 database_id 改成：$new_id"
  fi
fi

# ———— 3. 管理密钥（工坊主万能密钥） ————
say "设置管理密钥 WORKSHOP_ADMIN_KEY"
if [ -n "${WORKSHOP_ADMIN_KEY:-}" ]; then
  key="$WORKSHOP_ADMIN_KEY"
  ok "使用环境变量里的 WORKSHOP_ADMIN_KEY"
else
  printf '请输入你想用的管理密钥（输入时不显示，随便一串，但请自己记牢）：'
  read -rs key; echo
  [ -n "$key" ] || die "管理密钥不能为空。"
  printf '再输一遍确认：'
  read -rs key2; echo
  [ "$key" = "$key2" ] || die "两次输入不一致。"
fi
printf '%s' "$key" | "${WRANGLER[@]}" secret put WORKSHOP_ADMIN_KEY >/dev/null
ok "管理密钥已设置（凭它可删任何包 / 帮玩家重置管理密钥；丢了要在 Cloudflare 后台或重跑本步改）"

# ———— 4. 部署 ————
say "部署 Worker"
"${WRANGLER[@]}" deploy
ok "部署完成"

# ———— 5. 冒烟 ————
say "冒烟测试（cygf.657868.xyz）"
if node ./smoke.mjs; then
  ok "冒烟全绿"
else
  warn "冒烟有失败项——把上面的输出发给 Claude 看"
  exit 1
fi

say "全部完成"
cat <<'EOF'
接下来：
  1) 打开 https://cygf.657868.xyz 看工坊页面能不能出来（会先弹免责声明）
  2) 确认酒馆脚本库里「创意工坊」宿主脚本已生效（否则页面顶部会提示"未检测到宿主脚本"）
  3) 想再改云端代码 → 重跑本脚本即可（已建的库与已填的 id 会跳过）
EOF
