# wxhl-cygf · 创意工坊 Worker 部署说明

无限回廊创意工坊的云端后端。单文件 Worker（`worker.ts`）+ 一个 **D1 数据库**，顺带托管工坊页面（`workshop.html`）与页面逻辑层（`page-lib.js`）。

> 宿主脚本（酒馆里点「创意工坊」那个）在 `src/wxhl-cygf/`，权威源在主模板仓；本目录只负责云端。

## 数据表（Worker 首次收到请求时自动建表）

```sql
packs(id PK, name, type, version, author_name, author_discord, tags_json, description,
      pack_json, manage_hash, status, downloads, entry_count, created, updated)
```

- `id` 由**服务端生成**（8 位 `[0-9a-zA-Z]`），上传体里的 `id` 一律被覆写
- `pack_json` = 整个内容包原文（符合包格式契约）；`entry_count` 单列冗余，列表页直接回条目数、不必逐行解析 `pack_json`
- `manage_hash` = 玩家管理密钥的 **SHA-256**（明文密钥只在发布时回一次，服务器不留明文）
- `type`（`extension`/`build`/`character`）与 `tags_json` 是列表筛选列
- 加列走 `ensureSchema` 里的显式 ALTER（`CREATE TABLE IF NOT EXISTS` 不会改老表结构，market 惯例）

## 接口

### 静态资源

| 方法/路径 | 说明 |
|---|---|
| GET `/` | 工坊页面 HTML（`workshop.html` 经 wrangler Text 规则内联） |
| GET `/page-lib.js` | 页面逻辑层（`page-lib.js` 内联，浏览器 import） |

### 内容包

| 方法/路径 | 说明 |
|---|---|
| GET `/api/packs` | 浏览：`{ packs: 元数据[], total }`。可选 `?q=`（在名称/描述/作者里子串搜索）、`?type=extension\|build\|character`、`?tag=`、`?sort=updated\|downloads`、`?limit=1..50`（默认 20）、`?offset=` |
| GET `/api/packs/:id` | 详情 `{ pack }`（`id` 为 8 位 `[0-9a-zA-Z]`），并累加下载数。不存在或已下架 → 404 |
| POST `/api/packs` | 上传（正文即内容包 JSON）→ `{ id, manageKey }`，201。`id` 服务端生成；撞车自动重试一次 |
| PUT `/api/packs/:id` | 更新 `{ manageKey, pack }`。密钥不对或包不存在 → 403（两者同口径，不泄露存在性） |
| DELETE `/api/packs/:id` | 下架 `{ manageKey }` |

### 管理端点（`/api/admin/*`）

只接受 POST；`WORKSHOP_ADMIN_KEY` 没配或 `key` 不符 → **一律 403**（fail-closed）。

| 方法/路径 | 说明 |
|---|---|
| POST `/api/admin/list` | `{ key }` → `{ total, rows }`，已发布包（上限 200 条，无分页） |
| POST `/api/admin/delete` | `{ key, ids: [] }` → `{ ok, deleted }`，无视玩家密钥定向删 |
| POST `/api/admin/reset-key` | `{ key, id }` → `{ ok, id, manageKey }`，玩家丢密钥时找回（新密钥回一次） |

### 服务端校验与上限

| 项 | 规则 |
|---|---|
| 包体 | ≤ **256KB**（超 → 413） |
| 名称 | ≤ **100** 字符 |
| 扩展包条目数 | ≤ **100** 条 |
| 包格式 | 由 `ContentPack`（zod，见下方「与宿主仓的同步约定」）校验，不符 → 422 |
| 状态 | 上传即 `published`，**没有审核队列**；状态列已留好，二期用 |

## 部署

### 方式一：Cloudflare 后台粘贴单文件（**2026-10-11 实际采用**，无需终端）

参考 `wxhl-market` 的既有做法：它的 `worker.js` 是手写单文件，所以能直接在网页后台粘贴。
工坊是 TS 多文件工程，先用 build-bundle 打成单文件再粘：

```bash
node cloudflare/wxhl-cygf/build-bundle.mjs   # 产出 worker.bundle.js（约 430KB，已随仓库提交）
```

然后：Workers & Pages → Create application → **Create Worker**（名字必须 `wxhl-cygf`）→ Deploy →
**Edit code** → 全选 → 粘贴 `worker.bundle.js` 的内容 → Deploy。

之后（可用 Wrangler 也可用 Cloudflare 后台 / API 完成）：
- **D1 绑定**：Settings → Bindings → D1 database，变量名 `WORKSHOP_DB` → 选 `wxhl-cygf-db`
- **管理密钥**：Settings → Variables → 添加**加密**变量 `WORKSHOP_ADMIN_KEY`；本地留存见 `.wxhl-cygf-admin-key.txt`（已在 .gitignore）
- **自定义域**：Settings → Domains & Routes → 添加 `cygf.657868.xyz`（国内直连 workers.dev 不通，必须绑域名）
- 冒烟：`node cloudflare/wxhl-cygf/smoke.mjs`

### 方式二：Wrangler（脚本自动化）

**Windows 双击运行**——在资源管理器里打开 `cloudflare/wxhl-cygf/`，**双击 `deploy.bat`**。
它跟终端版做的是同一件事（检查登录 → 建 D1 并把 `database_id` 写回 `wrangler.toml` → 设管理密钥 → `deploy` → 跑冒烟），
中途只需你：① 弹浏览器时点授权（未登录才会弹）② 把建库输出里的 `database_id` 整个粘进提示框 ③ 输入管理密钥。
可重复运行（已建的库不重建、已填的 id 不覆盖）。

**终端（Git Bash）**：

```bash
bash cloudflare/wxhl-cygf/deploy.sh
```

**手动等价步骤**：

```bash
npm install -g wrangler            # 或 npx wrangler
wrangler login                     # ← 需要浏览器授权，交给用户操作
wrangler d1 create wxhl-cygf-db
# 把输出的 database_id 填进 wrangler.toml 的 [[d1_databases]].database_id
wrangler secret put WORKSHOP_ADMIN_KEY   # 工坊主管理密钥（可留空，但那样 /api/admin/* 全 403）
wrangler deploy                    # 在 cloudflare/wxhl-cygf/ 目录下执行
node cloudflare/wxhl-cygf/smoke.mjs      # 部署后冒烟，全绿才算上线成功
```

> **发布顺序**：宿主脚本（`src/wxhl-cygf/`，含 `deleteWorkshopEntries` 原语）必须先进入酒馆脚本库生效，
> 否则玩家在工坊里点"卸载"会报 `未知桥接动作`。

> **同步约定**：`wrangler.toml` 的 Text 规则必须同时覆盖 `**/*.html` 与 `**/page-lib.js`。
> 少写 `page-lib.js` 那个 glob，`import PAGE_LIB from './page-lib.js'` 会被当普通 JS 模块、
> 打包出的 `/page-lib.js` 变成字符串 `"undefined"`，线上页面直接崩——而单测把这两个 import
> mock 掉了抓不到，只有部署后才暴露。

## 管理密钥机制

- **玩家管理密钥**：上传时服务端生成、回给上传者，用 `manage_hash`（SHA-256）存库；玩家改/删自己的包要带它。丢了只能找工坊主重置。
- **工坊主 `WORKSHOP_ADMIN_KEY`**：Worker secret，仅供 `/api/admin/*` 用。**没配就一律 403**（不会因环境变量缺失而放行）。密钥只存在 Worker 里，页面 bundle 拿不到。
- **终极兜底**：管理端点没覆盖的操作直接改库：

```bash
wrangler d1 execute wxhl-cygf-db --remote --command "SELECT id, name, author_name, updated FROM packs ORDER BY updated DESC LIMIT 20"
```

## 自定义域名

`657868.xyz` 已在 Cloudflare 账号内，`wrangler.toml` 的 routes 会自动绑定
`cygf.657868.xyz`（国内直连 workers.dev 不通，必须绑域名）。宿主脚本默认打这个地址，
可用脚本变量 `wxhl_cygf_workshop_url` 覆盖。

## 与宿主仓的同步约定

- **内容包格式契约**是**单一真源**，在 `src/wxhl-cygf/pack/`（zod 4）。`worker.ts` 直接
  `import { ContentPack } from '../../src/wxhl-cygf/pack'`——**不要在本目录另写一份**，格式改动只改宿主仓、云端跟着重新部署即可。
- **桥协议常量**两边一致：`page-lib.js` 的 `BRIDGE_CHANNEL`（`wxhl-workshop:worldbook`）对应
  `src/wxhl-cygf/bridge.ts` 的 `BRIDGE_CHANNEL`；`WORKSHOP_WORLDBOOK`（`无限回廊mod`）对应
  `src/wxhl-cygf/actions.ts` 的 `WORKSHOP_WORLDBOOK_NAME`——**改协议两边同步**。
- 页面逻辑层 `page-lib.js` 是纯 JS ES module，浏览器直接 import、vitest 直接测，与 `workshop.html` 分离。

## 本地验证（不需要网络）

```bash
npx vitest run cloudflare/wxhl-cygf/ src/wxhl-cygf/
```

`worker.test.js` / `db.test.js` 用 `fake-d1.mjs` 替身跑 D1，`page-lib.test.js` 测逻辑层。
线上冒烟见上方部署步骤里的 `node smoke.mjs`。

## 一期边界

已完成：数据层 + 接口层（浏览/搜索/详情/上传/更新/下架）+ 管理端点 + 页面 + 本部署配置与冒烟。

**未开工**：Discord 登录绑定（先用「玩家自带管理密钥」的信义模型）、上传审核队列、限流、
二期酒馆正则桥接与构筑/角色的主卡侧落地。

## 五类内容（包格式 `wxhl-mod@2`）

页面顶部一排并列分类，与 `spec` §2 一一对应：

| type | 显示名 | 内容形态 | 落地 |
|---|---|---|---|
| `dungeon` | 副本 | 结构化字段（副本名/类型/基准等级/时间限制/背景/地图/敌人/主线·支线·世界事件·隐藏任务·成就/**GM 指导**）+ 可选额外条目 | 1 条绿灯条目（关键词=副本名）+ 额外条目 |
| `event` | 事件 | 世界书条目集合 + 可选自带 EJS 控制器 | 条目**原名**写入（控制器按名 `getwi('事件_…')` 取用）；与主卡控制器**并行**（副本生成的条目池已含附加世界书） |
| `mechanism` | 机制拓展 | 世界书条目集合（= 一期扩展包） | 逐条写入，名字加 `[回廊mod][机制拓展]<包名>·` 前缀 |
| `build` | 构筑 | 结构化：构筑名/定位/**属性分配方向（只给主副，不给数值）**/天赋/血统/称号/职业（特性·技能·传承技能·转职树）/通用技能/主要装备/背包建议 | 1 条绿灯条目（关键词=构筑名） |
| `persona` | 人设 | 角色名/性格/爱好/厌恶/背景故事 + 可选构筑方向或完整构筑 | 1 条绿灯条目（关键词=角色名） |

**卡片四要素**：`cover`（封面/头像 URL，留空或裂图 → 主题占位图）、`name`、`description`、`author.name`。
`cover` 只接受空串或干净的 `http(s)://` 链接（不含空白/引号/尖括号）。

事件命名规范：条目 `事件_<包名>_<事件名>`、控制器 `EJS/<包名>控制器`（`event` 包的条目名必须以此开头，否则整包拒绝）。
