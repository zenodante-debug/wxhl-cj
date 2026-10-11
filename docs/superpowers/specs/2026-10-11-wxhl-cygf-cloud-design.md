# wxhl-cygf 云端工坊 · 设计文档

日期：2026-10-11
状态：已通过设计评审（用户确认三点取舍：TS worker 共享 pack 契约 / 宿主加 deleteWorkshopEntries / 一期不做限流），并按审查意见把**免责声明**与**已装版本对比**收入一期

## 1. 背景与目标

无限回廊「创意工坊」的云端侧。宿主脚本（`src/wxhl-cygf/`，已完成一期）负责按钮、面板、桥接与世界书写入；本文档定义**云端工坊**：工坊浏览页面 + 注册表 API + 匿名上传。

一期范围（用户确认）：**浏览 + 安装 + 上传**。不做：Discord 登录、审核队列（均二期）。

### 已确认的关键决策

- 代码在本仓库 `cloudflare/wxhl-cygf/`（照 `cloudflare/wxhl-market/` 的惯例）
- 工坊页面是**单文件 HTML**（原生 JS + CSS，无构建步骤），由 Worker 直接返回
- 上传**无登录**，归属用**管理密钥**（上传后返回一次，只存 SHA-256 哈希；凭密钥更新/下架）
- 扩展包（副本/事件/机制）上传走**引导表单**；构筑/同人角色一期走**粘贴 JSON**（服务端用共享 zod 契约校验）
- Worker 用 TypeScript，直接 `import` 主仓 `src/wxhl-cygf/pack/` 的 zod 契约——**包格式只有一份真源**（不照 market 的"两边各写一份靠注释同步"惯例）

## 2. 项目结构

```
cloudflare/wxhl-cygf/
├── worker.ts          # 单文件 Worker：静态页 + 注册表 API + 上传/管理
├── workshop.html      # 工坊页面（原生 JS + CSS）
├── wrangler.toml      # D1 绑定 WORKSHOP_DB + 自定义域 cygf.657868.xyz + Text 规则
├── fake-d1.mjs        # 测试用 D1 替身
├── worker.test.js     # vitest（.js——仓库 vitest include 只收 cloudflare/**/*.test.js）
├── smoke.mjs          # 部署后冒烟
└── README.md          # 部署说明
```

### 页面如何进 bundle

`wrangler.toml` 用 Text 规则，`worker.ts` 里 `import WORKSHOP_HTML from './workshop.html'`：

```toml
[[rules]]
type = "Text"
globs = ["**/*.html"]
```

### wrangler.toml

```toml
name = "wxhl-cygf"
main = "worker.ts"
compatibility_date = "2026-10-11"

[[d1_databases]]
binding = "WORKSHOP_DB"
database_name = "wxhl-cygf-db"
database_id = "<wrangler d1 create 后填入>"

routes = [{ pattern = "cygf.657868.xyz", custom_domain = true }]
```

域名 `cygf.657868.xyz` 与宿主脚本默认值一致（`panel.ts` 的 `DEFAULT_WORKSHOP_URL`）。**国内直连 workers.dev 不通，必须自定义域**（market 的既有教训）。

## 3. 与宿主脚本的契约

桥接协议的权威定义见 [2026-10-11-wxhl-cygf-design.md](2026-10-11-wxhl-cygf-design.md) §3。云端侧的职责：

### 3.1 页面 ↔ 宿主的消息流

页面在酒馆 iframe 内，发消息到 `window.parent`：

```jsonc
{ "channel": "wxhl-workshop:worldbook", "kind": "request", "id": "r-随机", "action": "...", "payload": {...} }
```

页面收响应：监听 `window` 的 `message`，按 `channel === 'wxhl-workshop:worldbook' && kind === 'response' && id 匹配` 过滤（**不校验 origin**——酒馆页面的 origin 页面事先不知道，这是两个脚本范例的通行做法）。响应带 30s 超时，超时响亮报错。

### 3.2 安装 / 更新 / 卸载

- **装/更**：`GET /api/packs/:id` 取完整包 → 页面把条目映射成酒馆世界书条目 → `upsertWorkshopEntries({ worldbookName: '无限回廊mod', sourceMeta: { sourceId: pack.id, sourceType: pack.type, version: pack.version, title: pack.name }, entries })`
  - `sourceMeta` 里的 `version` 会随宿主盖章原样落进 `extra.wxhlWorkshop`——**已装版本对比**由此实现（页面 `getEntries` 读已装版本，与列表里的最新版本比对）
- **卸**：调用宿主新原语 `deleteWorkshopEntries({ worldbookName, sourceMeta: { sourceId } })`（互斥队列内整包删除，避免页面自己 getEntries 找 uid 再删的读改写竞争）
- **已装判断**：`getEntries('无限回廊mod')` 按 `extra.wxhlWorkshop.sourceId` 统计
- 宿主与云端一期**同时发布**，云端不做对旧宿主的降级

### 3.3 条目映射（云端页面的职责）

扩展包条目（pack 契约的 `ExtensionEntry`）→ 酒馆 `WorldbookEntry`：

| pack 字段 | 酒馆条目字段 |
|---|---|
| `constant` | `strategy.type`（true→`'constant'`，false→`'selective'`） |
| `keys` / `keysSecondary` | `strategy.keys` / `strategy.keys_secondary`（logic 固定 `'and_any'`，scan_depth `'same_as_global'`） |
| `position` | `position.type`（`'before_char'→before_character_definition`、`'after_char'→after_character_definition`、`'at_depth'→at_depth`），role 固定 `'system'` |
| `depth` / `order` | `position.depth` / `position.order` |
| `content` / `probability` | 同名 |
| `preventRecursion` / `excludeRecursion` | `recursion.prevent_incoming` / `recursion.prevent_outgoing`，`delay_until: null` |
| `sticky` / `cooldown` / `delay` | `effect.sticky` / `effect.cooldown` / `effect.delay` |
| `name` / `enabled` | 同名；uid 不填（酒馆助手写回时分配） |
| — | `extra.wxhlWorkshop` 由宿主盖章 |

构筑/同人角色：云端页面把结构化载荷**渲染成条目正文**（模板函数 `renderBuildEntry(build)` / `renderCharacterEntry(character)`，输出人读+AI读的排版文本），绿灯关键词取 `构筑名`/`角色名`，默认 `after_char` 位置。

### 3.4 本期对宿主脚本的改动（随云端一起发布）

1. `actions.ts` 新增 `deleteWorkshopEntries` 动作：`{ worldbookName, sourceMeta }` → 互斥队列内读全量、删掉 `matchesSource` 的条目、`replaceWorldbook` 写回，返回 `{ removed: number }`；加入 `MUTATING_ACTIONS`
2. `pack/` 四个 schema 文件加显式 `import { z } from 'zod'`（现为构建期自动导入；显式写法与 webpack/vitest 均兼容），使 wrangler 的 esbuild 能直接打包共享契约
3. 重新 `npm run build` + `bash scripts/push-cygf.sh` 推送宿主仓

## 4. 数据模型（D1）

```sql
CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,              -- 8 位 base62 随机
  name TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'extension' | 'build' | 'character'
  version TEXT NOT NULL,            -- x.y.z
  author_name TEXT NOT NULL,
  author_discord TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  pack_json TEXT NOT NULL,          -- 完整包 JSON（≤ 256KB）
  manage_hash TEXT NOT NULL,        -- 管理密钥的 SHA-256 hex
  status TEXT NOT NULL DEFAULT 'published',  -- 二期审核用
  downloads INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_packs_type ON packs(type);
CREATE INDEX IF NOT EXISTS idx_packs_updated ON packs(updated DESC);
```

**不用 KV**（market 踩过 `list()` 每日配额坑，error 1101）。ensureSchema 首次请求自动建表；新增列走 ALTER（market 惯例）。

## 5. API

所有错误返回 `{ error: '人话' }` + 合适的 HTTP 状态码。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 返回工坊页面 HTML（`Content-Type: text/html; charset=utf-8`） |
| GET | `/api/packs?q=&type=&tag=&sort=&limit=&offset=` | 列表（只回元数据，不回 pack_json）：`{ packs: [{id,name,type,version,authorName,tags,description,downloads,entryCount,updated}], total }`；`sort` 只取 `updated`（默认，降序）或 `downloads` |
| GET | `/api/packs/:id` | `{ pack: <完整包 JSON 对象> }`，`downloads` +1 |
| POST | `/api/packs` | body = 完整包 JSON；服务端用共享 zod 契约校验（`z.prettifyError()` 出人话）、覆写 `id`、生成 `manageKey` → 返回 `{ id, manageKey }`（**只此一次**） |
| PUT | `/api/packs/:id` | body = 完整包 JSON + `manageKey`；校验密钥哈希一致才更新，`updated` 刷新 |
| DELETE | `/api/packs/:id` | body `{ manageKey }`；校验通过则下架 |

**管理端点（工坊主万能通道，market 惯例）**：`/api/admin/*` 用 Worker secret `WORKSHOP_ADMIN_KEY` 鉴权（`wrangler secret put` 配置；**没配就一律 403**，fail-closed）。密钥错误与包不存在统一 403，不泄露存在性。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/admin/list` | `{ key }` → 全量元数据列表（审计用） |
| POST | `/api/admin/delete` | `{ key, ids: [] }` → 无视管理密钥强制下架 |
| POST | `/api/admin/reset-key` | `{ key, id }` → 重置管理密钥并返回新密钥（玩家丢密钥时的找回通道；二期接 Discord 前的兜底） |

另有终极兜底：`npx wrangler d1 execute wxhl-cygf-db --command "…"` 直接对库跑 SQL，不受任何密钥约束。

- 搜索：`name / description / author_name` 的 LIKE，加 `type` 过滤、按 `updated` 排序，LIMIT/OFFSET 分页
- 密钥校验：`SHA-256(manageKey)` 与 `manage_hash` 恒时比较
- 不开放 CORS（页面与 API 同源；宿主脚本不直接调 API）

## 6. 工坊页面（workshop.html）

三个视图，深色主题（与酒馆观感一致），原生 JS。

### 6.1 免责声明（一期，范例二做法的复刻）

首次打开先弹免责卡（不依赖云端任何接口，纯 srcdoc 级本地内容）：「内容包均由玩家自行上传、**未经审核**；安装第三方内容可能与角色卡冲突，请自行判断风险。」同意后写 `localStorage.wxhl_cygf_agreement = '1'`，不再弹。二期接审核后改回范例二的口径。

### 6.2 浏览

- 列表：搜索框 + 类型筛选（全部/扩展包/构筑/同人角色）+ 卡片（名称、类型徽章、作者、版本、简介、下载数、更新时间）
- 进页面先做 `getContext` 握手；**收不到响应 → 显示「请从酒馆内的『创意工坊』按钮打开本页面」**（未嵌在酒馆 / 宿主脚本没装）

### 6.3 详情

条目预览 + 安装/更新/卸载按钮 + 已装状态与版本对比（§3.2）。安装中显示进度，结果响亮提示（失败带宿主的 error 人话）。

### 6.4 上传

- 公共字段：名称、类型、版本、作者名、Discord（选填）、标签、简介
- **扩展包**：引导表单，逐条世界书条目（名称 / 正文 / 蓝灯或绿灯 / 绿灯关键词 / 插入位置 / depth / order / 概率 / 递归开关 / sticky·cooldown·delay），实时拼成 pack JSON 预览
- **构筑 / 同人角色**：粘贴 JSON，客户端先做 JSON.parse 与必填字段的轻量校验；**权威校验在服务端**（共享 zod 契约），错误回显人话
- 成功 → 显示 `manageKey`（明确提示只显示一次，请保存）+ 直达详情页

### 6.5 逃逸纪律

页面渲染投稿内容（名称/简介/条目正文）一律 `textContent` 或等价安全 DOM 操作，**禁止 innerHTML 拼接**——投稿是不可信输入。

## 7. 上传与归属

- 管理密钥：32 位随机串，`crypto.randomUUID()` 去掉横线；服务端只存 SHA-256
- 更新/下架凭密钥；丢失即失管（二期接 Discord 登录后可找回/绑定账号）
- 包大小上限：`pack_json` ≤ 256KB；名称 ≤ 100 字符；条目数 ≤ 100
- **一期接受的风险**：无速率限制（匿名可刷）、无审核（恶意内容只能靠密钥持有者自删或工坊主直接删库）。README 与免责声明里明示

## 8. 测试与部署

- `worker.test.js`（vitest + fake-d1.mjs）：列表/搜索/分页、上传成功与各校验失败、管理密钥对/错、更新、删除、下载计数、错误形状
- `smoke.mjs`：部署后对 `cygf.657868.xyz` 跑「GET / → 列表 → 上传 → 详情 → 更新 → 删除」全链路
- 本地：`npx wrangler dev`；部署：`npx wrangler deploy`（先 `npx wrangler d1 create wxhl-cygf-db` 并把 id 填进 wrangler.toml）
- 页面逻辑不直接可单测（无 DOM 环境）；把可测的纯逻辑（条目映射器、渲染模板、校验）抽到 worker.ts 可 import 的模块里，由 vitest 覆盖
- **发布顺序**：宿主脚本改动（§3.4）先构建推送 → 云端部署 → 冒烟

## 9. 边界

**一期（本 spec）**：浏览/搜索/详情/安装/更新/卸载 + 匿名上传（管理密钥）+ 免责声明 + 宿主 deleteWorkshopEntries 原语 + pack 契约显式化。

**二期**：Discord 登录（管理密钥绑定账号、找回）、审核队列（`status` 字段已留）、酒馆正则内容包（等宿主二期）、构筑/角色的引导表单、FTS5 搜索、速率限制、条目可插拔开关原语（toggleWorkshopEntries）。
