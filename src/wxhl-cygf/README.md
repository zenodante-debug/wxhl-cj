# wxhl-cygf · 无限回廊创意工坊

无限回廊角色卡的「创意工坊」**宿主脚本**。玩家在酒馆里点「创意工坊」按钮 → 打开云端工坊页面 → 浏览/安装内容包，宿主负责把内容落进角色卡的世界书。

> 本目录是**唯一权威源**。独立仓库 <https://github.com/zenodante-debug/wxhl-cygf> 只做镜像，所有改动都从主模板仓库推过去（见下方「推送」）。

## 推送（对本项目的任何改动都走这里）

```bash
bash scripts/push-cygf.sh                      # 用默认开发分支
bash scripts/push-cygf.sh 某个分支名            # 指定源分支
```

脚本只上传两个目录到 `zenodante-debug/wxhl-cygf` 的 `main`：

- `src/wxhl-cygf/` —— 源码（桥接协议、世界书动作、面板、登录转发、包格式契约、测试）
- `dist/wxhl-cygf/` —— 构建产物（酒馆里直接导入的 `index.js`）

**改动前先 `npm run build`**：脚本推的是 dist 里的产物，忘了构建就会推上去旧包。

## 架构

瘦宿主：安装编排全在云端页面，宿主只提供桥接原语。

| 层 | 职责 |
|---|---|
| 宿主脚本（本目录） | 注册按钮 → 遮罩+iframe 面板 → postMessage 桥 → 世界书写入；Discord 登录弹窗转发 |
| 云端工坊页面（另建仓库） | 浏览/搜索内容包、拼装条目、通过桥下发 `upsertWorkshopEntries`；上传向导与审核 |
| 落地 | 独立世界书 **`无限回廊mod`**，自动挂为角色卡**附加**世界书 |

- **桥接协议**见 `bridge.ts`（channel `wxhl-workshop:worldbook`）与 [`docs/superpowers/specs/2026-10-11-wxhl-cygf-design.md`](../../docs/superpowers/specs/2026-10-11-wxhl-cygf-design.md)（§3 完整消息格式）
- **登录协议** channel `wxhl-workshop:auth`（`discord.ts`）
- **内容包格式契约** 见 `pack/`（zod 4）：`extension`（扩展包）/ `build`（构筑）/ `character`（同人角色）三类载荷，字段对齐 `变量结构_特殊资源通用版.json`（主卡权威结构，只读副本）
- **条目把手** `entry.extra.wxhlWorkshop = { sourceId, sourceType }`：upsert 靠它删旧插新；云端漏打时宿主会按 payload 的 sourceMeta 补盖

## 配置

| 项 | 值 |
|---|---|
| 工坊地址 | 默认 `https://cygf.657868.xyz`，脚本变量 `wxhl_cygf_workshop_url` 可覆盖（仅接受无凭据的 https 地址） |
| 按钮名 | `创意工坊` |
| 世界书名 | `无限回廊mod` |

## 开发

```bash
npx vitest run src/wxhl-cygf/    # 测试（禁 pnpm）
npm run build                    # 构建 → dist/wxhl-cygf/index.js
npx eslint src/wxhl-cygf/
```

## 一期边界

已完成：宿主脚本全部（按钮/面板/桥接/登录转发/热重载守卫）、包格式契约、77 个测试。

**未开工**：云端前端与 worker（建议 `cygf.657868.xyz`，复用 D1 免费额度；**别用 KV**——`list()` 有每日配额，market 项目已踩过）、上传与审核流、二期酒馆正则桥接、构筑/角色的「扮演/入队/挑战」主卡侧落地。

**部署前提**：Discord 的 OAuth 回调页必须部署在工坊**同源**下，否则登录完成消息会被宿主的 origin 校验拒掉。
