# wxhl-cygf 创意工坊宿主脚本 · 设计文档

日期：2026-10-11
状态：已通过设计评审（§1–§5 用户逐节确认），待 spec 审阅后进入实施计划

## 1. 背景与目标

无限回廊（wxhl）角色卡需要一个「创意工坊」：玩家在云端页面浏览、上传内容包，酒馆里的宿主脚本负责把内容安装进角色卡。

已确认的架构决策（对照两份范例 `酒馆助手脚本-创意工坊.json`、`酒馆助手脚本-伊瑟利亚创意工坊.json`）：

- **A+C 方案**：瘦宿主。宿主脚本只提供桥接原语（范例一的协议思路），安装编排逻辑全在云端页面；挂载技术用范例二路线（`window.parent` 直接监听 postMessage，**不做 script 标签注入**）；因使用独立世界书，**省略 `--/Mod开始/结束` 锚点条目**
- **独立工坊世界书**：名为「无限回廊mod」，绑定为当前角色卡的附加世界书
- **一期只桥接世界书**；酒馆正则留二期
- **Discord 登录**（范例一式，宿主负责弹窗转发）
- 云端前端与 worker 后端不在本仓库，本仓库产出**宿主脚本 + 桥接协议契约 + 包格式契约**

### 内容类型（用户确认）

| 类型 | 说明 | 落地方式 |
|---|---|---|
| `extension` 扩展包 | 副本关卡、自定义事件、机制拓展（桌游式扩展） | 世界书条目 |
| `build` 构筑 | 契约者 build：可挑战 / 扮演 / 入队 / 作开局路线 | 结构化载荷 → 云端渲染成条目 |
| `character` 同人角色 | 同上三种用法 | 构筑载荷 + 外貌/背景 |

「扮演 / 入队 / 挑战」是主卡 AI 读取条目后的事，**宿主脚本和云端都不写 MVU 变量**。

## 2. 项目结构

```
src/wxhl-cygf/
├── index.ts            # 入口：注册「创意工坊」按钮、接线、pagehide 清理
├── panel.ts            # 遮罩+iframe 面板（挂酒馆主页面，ESC/遮罩/✕ 三重关闭）
├── bridge.ts           # postMessage 监听：来源校验 → 动作分发 → 回包
├── actions.ts          # 世界书桥接原语（handshake/getContext/getEntries/upsert…）
├── discord.ts          # Discord 登录弹窗转发
├── pack/               # 包格式契约（不进产物 bundle；供云端仓库引用 + 本仓库测试）
│   ├── manifest.ts     #   外壳 schema（format/id/name/type/version/author/requires）
│   ├── extension.ts    #   扩展包载荷：worldbookEntries 字段定义
│   ├── build.ts        #   构筑载荷：主卡实体Schema 子集
│   └── character.ts    #   同人角色载荷：构筑载荷 + 外貌/性格/背景
├── 变量结构_特殊资源通用版.json   # 主卡 MVU 权威结构（原样复制的只读参考）
└── __tests__/          # vitest
```

注意：webpack 入口发现依赖 `src/**/index.ts`；`pack/` 与 JSON 参考文件不被 `index.ts` 导入就不会进产物。

### 主卡 schema 副本的漂移风险

`变量结构_特殊资源通用版.json` 是从 Downloads 原样复制的**只读参考**（2026-10-11 复制）。主卡更新后需手动重新复制。`pack/build.ts`、`pack/character.ts` 的 zod 字段**以该 JSON 为权威对照手写**，不做自动转换。这是已接受的风险，写在此处提醒。

## 3. 桥接协议

宿主与工坊 iframe 之间用 postMessage 通信，channel 固定为 `wxhl-workshop:worldbook`。

### 3.1 消息信封

请求（云端 → 宿主）：

```jsonc
{
  "channel": "wxhl-workshop:worldbook",
  "kind": "request",
  "id": "任意唯一字符串",
  "action": "handshake | getContext | getEntries | ...",
  "payload": { /* 按 action 定 */ }
}
```

响应（宿主 → 云端，回 `event.origin`）：

```jsonc
{ "channel": "wxhl-workshop:worldbook", "kind": "response", "id": "与请求一致",
  "ok": true,  "payload": { /* 结果 */ } }
// 或
{ "channel": "wxhl-workshop:worldbook", "kind": "response", "id": "与请求一致",
  "ok": false, "error": "人话错误信息" }
```

### 3.2 安全校验

- 只接受 `event.origin === 工坊 origin` 的消息（工坊 URL 见 §4）
- 回包一律发 `event.origin`，**不使用 `*`**（范例一在登录转发处用了 `*`，本项目修正）
- 每个 action 包 try/catch，失败回 `{ok:false, error}`，不让异常漏出监听函数
- 写操作（createEntries / updateEntry / deleteEntries / upsertWorkshopEntries / createWorldbook）走**互斥队列**串行执行（读改写并发会丢条目——范例二的教训）；读操作直接执行

### 3.3 action 一览

| action | payload | 宿主行为 |
|---|---|---|
| `handshake` | 无 | 返回能力清单：各世界书接口可用性、宿主版本号 |
| `getContext` | 无 | 返回 `worldbookNames`、`charWorldbooks`、「无限回廊mod」是否存在；**顺带 ensure：不存在则 `createWorldbook('无限回廊mod')` 并用 `rebindCharWorldbooks('current', {primary, additional: [...additional, '无限回廊mod']})` 挂为角色卡附加世界书** |
| `getEntries` | `{worldbookName}` | `getWorldbook(worldbookName)` |
| `createWorldbook` | `{worldbookName}` | `createWorldbook(worldbookName, [])` |
| `createEntries` | `{worldbookName, entries[]}` | `createWorldbookEntries(worldbookName, entries, {render:'immediate'})` |
| `updateEntry` | `{worldbookName, uid, nextEntry}` | `updateWorldbookWith` 按 uid 原位合并 |
| `deleteEntries` | `{worldbookName, uids[]}` | `deleteWorldbookEntries` 按 uid 集合删除 |
| `upsertWorkshopEntries` | `{worldbookName, sourceMeta:{sourceId,sourceType}, entries[]}` | 见 §3.4 |

### 3.4 upsertWorkshopEntries 语义（核心原语）

1. 读取目标世界书全量条目
2. 删除所有 `extra.wxhlWorkshop.sourceId === payload.sourceMeta.sourceId`（且 `sourceType` 一致，若提供）的旧条目
3. 插入 `payload.entries`（每条由云端构造好完整字段，含 `extra.wxhlWorkshop` 把手）
4. 对剩余所有**带 `extra.wxhlWorkshop` 把手**的条目，按 `position.order` 升序归一化（稳定排序，order 相同按条目名）
5. `replaceWorldbook` 写回，`render: 'immediate'`

无锚点条目：「无限回廊mod」整本归工坊管。若用户在该世界书手动加了无把手的条目，宿主**不动它们**（只管理带把手的）。

## 4. 面板与 Discord 登录

### 4.1 面板

- 脚本库按钮名：`创意工坊`（`appendInexistentScriptButtons` + `eventOn(getButtonEvent(...))`）
- 点击 → 全屏遮罩 + iframe 挂**酒馆主页面**（`window.parent.document.body`）
- 关闭：✕ 按钮 / ESC / 点击遮罩空白，三重保险（范例二验证过的做法）
- 重复打开防抖（150ms 内忽略重复触发）
- 消息监听挂 `window.parent.addEventListener('message')`，不做 script 注入
- `pagehide` 时：移除遮罩 DOM、移除全部监听、删除挂载点

### 4.2 工坊 URL

- 默认值待定（建议 `https://cygf.657868.xyz`，复用现有域名体系）
- 可用脚本变量覆盖： `{type:'script', script_id}` 下的 `wxhl_cygf_workshop_url`（仿范例二的 workerUrl 覆盖）

### 4.3 Discord 登录转发（channel: `wxhl-workshop:auth`）

1. 工坊 iframe 发 `{action:'openDiscordLogin', url}` → 宿主 `window.open(url, 'discord_login', 'width=600,height=800')`；被浏览器拦截则 toastr 提示
2. 授权完成页 postMessage `{action:'discordLoginSuccess', hash}` 到 opener → 宿主转发 `{action:'discordLoginComplete', hash}` 给工坊 iframe（限定工坊 origin）
3. 失败 `{action:'discordLoginError', error, errorDescription}` → toastr 报错 + 关弹窗
4. 宿主持有弹窗引用，重复登录请求先关旧窗

## 5. 包格式契约（玩家上传格式）

权威定义在 `src/wxhl-cygf/pack/`，zod 4 书写，配 vitest。云端仓库照此实现上传校验。

### 5.1 外壳 manifest

```jsonc
{
  "format": "wxhl-mod@1",          // 格式版本，演进用
  "id": "abc123",                  // 云端分配
  "name": "雾中列车",
  "type": "extension | build | character",
  "version": "1.0.0",
  "author": { "discord": "...", "name": "..." },
  "tags": ["副本", "机制拓展"],
  "description": "...",
  "requires": { "cardVersion": ">=3.0" },
}
```

### 5.2 各类型载荷

- **extension**：`worldbookEntries[]`，每条字段对齐酒馆世界书条目（name/keys/enabled/position/content/probability/recursion/effect），云端映射为酒馆条目结构
- **build**：结构化载荷 = 主卡实体Schema 子集（以 `变量结构_特殊资源通用版.json` 为权威）：`头部.天赋/血统/称号`、`属性.基础`、`职业`（名称/稀有度/职业技能/职业特性，转职树可选）、`通用技能`、`装备` 七槽、`背包` 建议
- **character**：build 载荷 + `外貌` / `性格` / `背景` + 建议实体类型（杂兵/精英/BOSS/其他契约者…）

云端把结构化载荷**渲染成世界书条目正文**（人读 + AI 读的排版文本），具体渲染模板属云端仓库职责。

### 5.3 上传引导（云端职责，契约在此记录）

- 分段向导表单：基本信息 → 选类型 → 按类型填字段 → **预览渲染出的条目** → 提交
- 每类型提供示例包 JSON + 《创作指南》（绿灯词防撞、插入位置选择、与主卡机制衔接）
- 提交前 zod 校验，错误用 `z.prettifyError()` 出人话
- Discord 登录后开放上传；上传进**审核队列**，工坊主审核后上架

## 6. 错误处理与测试

- **响亮失败**（用户既定规矩）：世界书接口缺失、写回失败一律 throw + toastr，不做静默兜底
- 日志前缀 `[wxhl创意工坊]`，关键节点 `console.info`
- 顶部函数用 `errorCatched` 包装
- vitest 覆盖：
  - bridge 消息解析、channel/origin/kind 校验、未知 action 拒绝
  - upsert：把手匹配删旧、uid 原位保留、孤儿清理、order 归一化、无把手条目不受波及
  - 互斥队列串行性
  - pack schema：外壳 + 三类载荷的合法/非法样例
- 测试不连真酒馆：世界书接口 mock 掉

## 7. 范围边界

**一期（本 spec）**：宿主脚本全部（按钮/面板/桥接/Discord 转发）、包格式契约、测试。

**二期及以后（明确不做）**：

- 酒馆正则桥接（内容包带正则）
- 云端前端页面与 worker 后端的实现（另行提供；本仓库的协议与包格式文档是它的输入）
- 上传/审核后端
- 构筑的「扮演/入队/挑战」主卡侧落地（主卡世界书提示词职责）

## 8. 已确认的部署前提

- 免费 Cloudflare Workers 足以承载：静态页面托管 + D1 注册表（不用 KV——市场项目已踩过 `list()` 配额坑 error 1101）+ 包文件走 jsdelivr/R2；安装编排在玩家浏览器，不经服务器
- 子域名建议 `cygf.657868.xyz`（复用已激活的 657868.xyz）
