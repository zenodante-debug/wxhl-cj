# 论坛提示词整改（阶段 B）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把论坛 5 个分区共用的那句过期模块词表拆开，按分区注入真正相关的参考；重做 5 个分区的提示词，解决「8 条帖子像同一个人写的」问题；只有副本经历区读副本生成规则。

**Architecture:** 提示词文本留在 `data.ts`（常量），提示词**组装逻辑**抽到新文件 `forumPrompts.ts`（纯函数、零酒馆依赖）—— 这样注入矩阵可以被单测钉住。`store.ts` 只负责读取世界书/影响事件后调用这些纯函数。

**Tech Stack:** TypeScript / zod 4 / vitest

**Spec:** `docs/superpowers/specs/2026-09-19-dungeon-roll-and-forum-prompts-design.md`（B 节）

## Global Constraints

- 工作分支 `feat/wxhl-dungeon-roll-module`（阶段 A 的产出也在这条分支上，**不要合并、不要新建分支**）。
- **只 `git add` 本任务明确涉及的文件，严禁 `git add -A` / `git add .`。** 仓库工作区里有大量无关的未提交改动（`dist/` 下多个产物、`src/views/*.vue`、`webpack.config.ts` 等）。
- 不新增任何依赖。源码里**不要手写** `z`/`ref`/`defineStore`/`klona`/`_`/`$`/`toastr`/`YAML` 的 import。
- 测试文件放 `src/wxhl-003/__tests__/`。
- **`pnpm build` 不做类型检查**（`ts-loader` + `transpileOnly: true`）。类型检查要单独跑 `pnpm exec tsc --noEmit`。
- 仓库 `tsc --noEmit` 有 **11 条既存错误**，其中 `store.ts` 的 `MODULE_SUMMARY ... never read` 那条**会在本阶段被修掉**（我们要删掉那个死常量），其余 10 条**不要动**。
- **不改动阶段 A 的任何文件**：`dice.ts`、`dungeonRules.ts`、`dungeonGen.ts`、`DUNGEON_GENERATION_RULES` 常量体、`useDungeonGenStore`。
- **不改动 `App.vue`**（含状态栏 `◆ 回廊终端 · v2`）。
- 一律半角符号与冒号。文案语言：简体中文。

---

## 设计要点（实现前必读）

### 1. 两层模型：分区定体裁，每帖定人格

**这是本阶段的核心。** 错误做法是给每个分区规定一种腔调（「吐槽区 = 破防骂街」），那会让 8 条帖子像同一个人写的。正确做法：

- **体裁层**（分区决定）：这个版块收什么类型的帖子 —— 吐槽区发情绪、副本经历区讲故事、情报区做分析、构筑区谈配装、交易区买卖。
- **人格层**（每帖决定）：8 条帖子来自 **8 个不同性格的契约者**，阶位、势力、情绪、说话方式都不同。**分区提示词必须显式要求人格多样性并给出人格矩阵**，严禁 8 条一个腔调。

### 2. 引用矩阵（谁读什么）

| 常量 | 吐槽 | 情报 | 副本经历 | 构筑 | 交易 | 影响事件 | 职业规划 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `CORE_WORLD` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `MODULE_TABLES` | ✓ | | ✓ | | | | |
| `DUNGEON_GENERATION_RULES` | | | **✓（只有这里）** | | | | |
| `CAREER_SYSTEM_RULES`（已存在） | | | | ✓ | | | ✓ |
| `BUILD_MECHANICS`（新） | | | | ✓ | | | |
| `TRADE_MECHANICS`（新） | | | | | ✓ | | |

**裁决（已定，不必再问）**：spec B2 里列的 `REWARD_RULES` **不单独抽** —— 奖励规范（§七）本来就在 `DUNGEON_GENERATION_RULES` 里面，而那个常量只有副本经历区与副本生成模块读，已经满足「只有副本经历区读奖励规范」。

### 3. `WORLD_SUMMARY` 删除

已确认全部 8 个引用点（`data.ts` 定义 + `store.ts` 的 8 处）。本阶段**删除该常量**，每处替换为引用矩阵里对应的常量。同时删掉 `store.ts:330` 的死常量 `MODULE_SUMMARY`。

⚠️ **删除动作只发生在 Task 2**。Task 1 是纯新增，不删 `WORLD_SUMMARY` —— 否则中间那个提交编译不过。

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/wxhl-003/data.ts` | **改**：新增 `CORE_WORLD` / `MODULE_TABLES` / `BUILD_MECHANICS` / `TRADE_MECHANICS` / `TIEBA_STYLE` / `PERSONA_MATRIX` / `FORUM_SECTION_PROMPTS`；删除 `WORLD_SUMMARY` |
| `src/wxhl-003/forumPrompts.ts` | **新建**：`buildRefreshPrompt` / `buildThreadDetailPrompt` / `buildRepliesPrompt` 三个纯函数 |
| `src/wxhl-003/store.ts` | **改**：删掉本文件里的 `buildRefreshPrompt` 与 `MODULE_SUMMARY`，改为调用 `forumPrompts.ts`；`generateThreadDetail` / `generateReplies` 改调新函数；影响事件与职业规划的 prompt 改用新常量 |
| `src/wxhl-003/__tests__/forumPrompts.test.ts` | **新建**：钉住注入矩阵 |

---

### Task 1: `data.ts` — 常量拆分与 5 个分区提示词

**Files:**
- Modify: `src/wxhl-003/data.ts`（`WORLD_SUMMARY` 在 631 行附近）

**Interfaces:**
- Consumes: 无
- Produces: 导出常量
  - `CORE_WORLD: string`
  - `MODULE_TABLES: string`
  - `BUILD_MECHANICS: string`
  - `TRADE_MECHANICS: string`
  - `TIEBA_STYLE: string`
  - `PERSONA_MATRIX: string`
  - `FORUM_SECTION_PROMPTS: Record<'complaints'|'intel'|'dungeon'|'build'|'trade', string>`

（**本任务不删 `WORLD_SUMMARY`** —— 删除放在 Task 2。）

- [ ] **Step 1: 新增 `CORE_WORLD`**

放在 `WORLD_SUMMARY` 原位置。内容（回廊机制，全分区共用）：

```ts
/** 回廊核心机制摘要（论坛全分区、影响事件、职业规划共用） */
export const CORE_WORLD = `无限回廊核心机制：
- 契约者: 被回廊从各世界（含地球）征召的人, 靠完成副本任务换取 UP 与 EXP, 死亡即抹杀。
- 等级与阶位: 等级 Lv.1~100, 每 20 级一个阶位 —— 一阶 Lv.1~20 / 二阶 21~40 / 三阶 41~60 / 四阶 61~80 / 五阶 81~100; 超脱者 Lv.101+ 是世界观终极背景板, 不下场。
- 军衔: 列兵 → 少校 → …… 由回廊按功绩授予。
- CR 评价: 回廊对契约者的重视程度, 1.0~10.0。漠视(1~2) / 观察(3~4) / 关注(5~6) / 重视(7~8) / 期待(9~9.9) / 炼狱(10.0) —— CR 越高, 副本里的敌人越强、越针对你。CR 由通关表现（尤其是用职业特性巧妙通关）提升, 纯属性碾压提升幅度低。
- 货币与成长: UP(通用点, 交易与兑换用) / EXP(等级经验) / RP(回廊点数)。
- 职业系统: 同一时间只能持有 1 个职业, 转职在原职业基础上进化; 职业提供专属技能树、属性加成、被动特性、装备适性; 职业独立于契约者等级, 有独立的职业等级与熟练度。品质(白/蓝/金/紫/银)决定转职树分支深度。
- 天赋 / 血统 / 称号: 天赋是天生特质; 血统决定种族底子; 称号由事迹获得, 当前只生效一个。
- 装备与物品: 品质分 白 / 蓝 / 紫 / 金 / 银; 类型分 装备(武器/防具/饰品) / 消耗品 / 特殊道具 / 技能卷轴。装备有阶位与穿戴门槛。
- 九方势力: 特管局 / 恶魔旅团 / 方舟集团 / 瑞辰基金会 / 神圣教会 / 零号局 / OETA / APJC / EJSSA, 另有独立散人。`
```

- [ ] **Step 2: 新增 `MODULE_TABLES`**

内容为**现行 D50 版**的副本词表（注意：不是旧版 D40，力量层级也不是 D4 投骰）：

```ts
/** 副本模块词表（吐槽区与副本经历区参考; 副本生成模块另有一份完整规则） */
export const MODULE_TABLES = `副本模块词表：
- 副本类型(D4): 和平 / 阵营 / 血腥。
- 媒介来源(D6): 实体小说(网文/实体书/轻小说) / 影视作品(电影/美剧/特摄) / 电子游戏(单机/网游/Galgame) / 动漫作品(日漫/国漫/美漫) / 民俗怪谈(都市传说/神话史诗/SCP收容物) / 桌面与规则体系(DND/桌游/卡牌)。
- 题材大类(D6): 奇幻神话 / 玄幻仙侠 / 科幻未来 / 历史演义 / 现代异能 / 现实日常。
- 时代背景(D6): 上古太古 / 古代中世纪 / 近代工业化 / 现代当代 / 近未来赛博 / 遥远未来星际。
- 力量层级: 不受限制。100 级的契约者可能被投进完全无超自然的普通世界, 1 级新人也可能被投进多元宇宙级的高层世界 —— 主线任务与力量层级、世界观背景不相关。
- 核心特色标签(D50): 丧尸生化危机 / 克苏鲁不可名状 / 泰坦巨兽怪兽宇宙 / 废土核战后 / 诡异民俗 / 无限流多元交汇 / 规则怪谈 / 赛博朋克矩阵空间 / 虚拟网游 / 荒诞喜剧 / 吸血鬼黑暗哥特 / 童话反转黑深残 / 梦核阈限空间 / 微缩世界巨物恐惧 / 异常收容SCP / 超级英雄美漫 / 平行宇宙时间断层 / 维多利亚诡案 / 热血王道宿命羁绊 / 机甲钢铁巨兵 / 恋爱喜剧修罗场 / 里番向 / 深渊地狱极恶位面 / 史诗战场绞肉机 / 硬核武斗国术 / 反乌托邦虚假社会 / 物欲都市资本帝国 / 现代战争战术特种 / 全员恶人哥谭风 / 魔法学园派系斗争 / 深海恐惧水下幽闭 / 异星虫灾无尽同化 / 蒸汽朋克工业巨兽 / 神明陨落信仰黄昏 / 极端气候生态灾变 / 特摄宇宙巨大化英雄 / 废土修仙灵气变异 / 蛮荒纪元史前巨兽 / 浮空岛屿破碎大陆 / 极道黑帮地下秩序 / 学园日常青春群像 / 美食经营餐厅物语 / 恋爱喜剧纯爱修罗场 / 偶像艺能娱乐圈生态 / 体育竞技热血部活 / 职场喜剧社畜生态 / 治愈田园慢生活 / 综艺游戏整活现场 / 宅文化兴趣社团 / 温馨家庭邻里日常。
- 副模块(D50): 大逃杀 / 绝境求生 / 天灾降临 / 绝症倒计时 / 狩猎靶标 / 狼人背叛 / 卧底潜伏 / 声望崩塌 / 阵营对抗 / 禁止杀戮 / 密室解谜 / 时间轮回 / 叙述诡计 / 连环凶案 / 因果逆转 / 据点塔防 / 两军对垒 / 斩首行动 / 护送任务 / 资源争夺 / 地牢深潜 / 巨物围猎 / 碎片拼凑 / 怪物图鉴 / 遗迹破译 / 全员禁魔 / 科技锁死 / 属性压制 / 原著附身 / 多方乱战 / 白手起家 / 权欲交易 / 领地建设 / 表里世界 / 移动迷宫 / 寻宝竞速 / 信仰掠夺 / 身份替换 / 筹码赌局 / 剧本演出 / 社团存续 / 目标达成 / 人际修罗场 / 委托代办 / 秘密守护 / 季节活动 / 养成计划 / 日常异变 / 身份体验 / 黄金日常。
- IP 热度(D40): 1-15 较冷门 / 16-25 中等 / 26-35 较热门 / 36-40 世界知名。
- 副本类型决定基调: 和平 = 契约者之间禁 PVP, 但世界环境可能极其血腥惊悚; 阵营 = 契约者被分到对立阵营, 主线互斥; 血腥 = 纯契约者 PVP 博弈, 无阵营约束。`
```

- [ ] **Step 3: 新增 `BUILD_MECHANICS` 与 `TRADE_MECHANICS`**

```ts
/** 属性 / 衍生属性 / 装备槽（构筑区参考） */
export const BUILD_MECHANICS = `属性与装备机制：
- 四维属性: STR(力量) / AGI(敏捷) / CON(体质) / PER(感知)。实际值 = 基础 + 加成 + 自定义加成。
- 衍生属性: HP / MP / 耐力 / 防御 / 闪避值 / 移动距离 / 负重 —— 由四维与装备推导。
- 装备槽: 头部 / 躯干 / 手部 / 下装 / 饰品 / 主武器 / 副武器。每件装备有品质、阶位、穿戴门槛、伤害骰、倍率、主副属性加成、装备防御、装备闪避、负重与效果。
- 职业: 提供主属性加成、副属性加成、职业技能、职业特性、传承技能与转职树(一转→二转→三转→隐藏转职), 每个转职节点至少衍生 2 个分支。
- 构筑的核心矛盾: 属性点有限、负重有限、装备槽有限 —— 同一份 UP 预算投在哪里, 决定了这套构筑能打什么模块、怕什么模块。`
```

```ts
/** 物品品质 / 阶位 / UP 经济 / 背包（交易区参考） */
export const TRADE_MECHANICS = `交易与经济机制：
- 品质: 白 < 蓝 < 紫 < 金 < 银。品质与阶位共同决定物品价值, 高阶低品质与低阶高品质都存在。
- 阶位: 装备有阶位与穿戴门槛, 越阶穿戴会被门槛卡住。
- 物品来源: 副本掉落、任务奖励、成就奖励、击败其他契约者掉落的血腥钥匙开启、回廊兑换。
- 货币: UP 是回廊通用的交易货币, 契约者之间可以互相转账。
- 背包: 每个契约者的持有物以条目形式记录（物品名 + 数量 + 描述; 装备条目额外带完整装备字段）。
- 交易行情: 稀有来源的物品（特定副本限定、已绝版、高阶高品质）溢价明显; 通用消耗品价格稳定。`
```

- [ ] **Step 4: 新增 `TIEBA_STYLE` 与 `PERSONA_MATRIX`**

**这两条是 5 个分区共用的**，抽出来避免重复 5 遍：

```ts
/** 贴吧风格硬性条款（全分区共用） */
export const TIEBA_STYLE = `【贴吧风格 —— 硬性要求】
- 标题形态: 带【】前缀, 或疑问句, 或「如何评价…」「在线等挺急的」「家人们谁懂啊」「理性讨论」这类口语标题。不要写成新闻标题。
- 楼主自称: 楼主 / 萌新 / 老东西 / 兄弟 / 各位大佬 / 兄弟们 —— 按该楼主性格选, 不要每条都用同一个。
- 热评形态: 抖机灵、抬杠、玩梗、前排、顶、+1、复读、阴阳怪气 —— 热评要对标题本身有反应, 不要复述正文。
- 楼层文化: 楼主 / 层主 / 沙发 / 板凳 这类称呼可以有。
- 允许网络口语、缩写与错别字（如「蚌埠住了」「草」「xs」「乐」）, 但**不得出现具体现实平台名或现实品牌**, 保持回廊世界观内自洽。
- **严禁 AI 腔**: 禁止「作为一名契约者, 我认为…」「总而言之」「综上所述」这类书面总结腔, 禁止每条帖子都结构工整、字数相近。`
```

```ts
/** 人格多样性硬性要求（全分区共用）—— 防止 8 条帖子像同一个人写的 */
export const PERSONA_MATRIX = `【人格多样性 —— 硬性要求】
8 条帖子必须来自 8 个不同的契约者, 他们的性格、情绪、说话方式、阶位、所属势力都要有明显差异。
严禁 8 条帖子语气雷同、句式相近、字数相当, 严禁每条都冷静客观。

人格矩阵（每条帖子挑一个不同的人格, 不要重复）:
暴躁老哥 / 阴阳怪气 / 哭诉求救 / 装逼炫技 / 理性数据党 / 萌新小白 / 老油条 / 乐子人 / 沉默寡言 / 话痨 / 杠精 / 冷嘲热讽 / 悲痛欲绝 / 得意洋洋 / 疑神疑鬼

同时要求: 8 条覆盖至少 4 个不同阶位（一阶~五阶）与至少 4 个不同势力（含独立散人）;
昵称要有创意、符合该人格, 不要用「匿名」「路人」这类占位; 同一个人格不要出现两次。`
```

- [ ] **Step 5: 新增 `FORUM_SECTION_PROMPTS`（5 条分区专属提示词）**

```ts
/** 论坛 5 个分区的专属提示词（只管体裁层; 人格层与贴吧风格由 TIEBA_STYLE / PERSONA_MATRIX 提供） */
export const FORUM_SECTION_PROMPTS: Record<'complaints' | 'intel' | 'dungeon' | 'build' | 'trade', string> = {
  complaints: `你在生成无限回廊论坛「契约者吐槽区」的帖子。这是全回廊怨气最重的地方 —— 契约者在这里发泄情绪、骂系统、骂队友、骂副本、骂回廊。
体裁定位: **发的是情绪与观点, 不是故事**。可以抱怨具体遭遇, 但重点是发泄与吐槽, 不要把帖子写成一篇完整的冒险经历（那是副本经历区的事）。
素材方向: 被投进离谱的模块组合（例: 【赛博朋克】+【绝症倒计时】差点嗑药嗑死; 【洪荒神话】+【全员禁魔】被凡人追着砍）、CR 评价不公、队友坑人、势力倾轧、军衔晋升太慢、UP 不够花、职业转职坑、抽到烂副本。
语气: 主观、强烈、短句为主, 可以有脏话打码（如「卧槽」「妈的」）。`,

  intel: `你在生成无限回廊论坛「势力情报分享区」的帖子。这是契约者交换情报、分析局势的地方。
体裁定位: **分析帖** —— 讲数据、讲结论、讲规律。要有具体数字（等级、属性、UP、概率、样本数）, 不要空泛感慨（那是吐槽区的事）。
素材方向: 九方势力的动态与关系变化、CR 难度修正的实测、特定模块组合的应对策略、敌人行为规律、副本类型的收益对比、职业与模块的适配分析。
语气: 相对冷静有条理, 但**不同楼主仍要有不同立场与专业度**（有的严谨、有的半桶水、有的带节奏）。热评以质疑、补充数据、抬杠为主。`,

  dungeon: `你在生成无限回廊论坛「副本经历分享区」的帖子。这是契约者讲述亲身副本经历的地方。
体裁定位: **讲故事** —— 有时间线、有细节、有过程、有余悸。要有具体的副本来源（真实作品名）、模块组合、副本类型、关键战斗或解谜过程、生死关头、最终收获。要有戏剧性: 转折、意外、代价。
与吐槽区的区别: 吐槽区发情绪, 这里**发完整的经历**。
语气: 像亲身经历者在回忆, 可以有后怕、得意、苦笑。热评以追问细节（「然后呢」「那你怎么活下来的」）与分享类似经历为主。`,

  build: `你在生成无限回廊论坛「构筑分享区」的帖子。这是契约者研究配装与流派的地方。
体裁定位: **配装流派帖** —— 必须包含属性分配方案、推荐职业与转职方向、核心装备、适配的模块类型、实战测试数据。数据要具体到数值。
素材方向: 某一流派（如极限闪避流、重装换血流、爆发秒杀流）的完整构筑思路、版本变化后的流派兴衰、冷门职业的开发、特定模块的针对性配装。
语气: **流派之间要互相拆台** —— 楼主吹自己的流派, 热评要有人反驳或指出致命缺陷。不同楼主有不同流派立场。`,

  trade: `你在生成无限回廊论坛「装备道具交易区」的帖子。这是契约者买卖物品的地方。
体裁定位: **买卖帖** —— 约一半出售、一半求购。每帖必须写清物品名称、品质、阶位/穿戴门槛、属性加成或效果、来源副本、开价（UP 币）。
素材方向: 副本限定掉落、绝版物品、高阶高品质装备、技能卷轴、消耗品囤货、血腥钥匙产物。
语气: 卖家急于出手或待价而沽, 买家压价或求购心切。评论要有砍价、竞价、质疑来源（「这玩意儿哪来的」）、插队问价。`,
}
```

- [ ] **Step 6: 本步骤不要删 `WORLD_SUMMARY`**

⚠️ **`WORLD_SUMMARY` 的删除放到 Task B2**。本任务**只做新增**，`WORLD_SUMMARY` 与 `store.ts` 保持原样 —— 这样本任务结束时 `pnpm build` 与 `pnpm test` **都是绿的**，提交是一个可用状态。

（如果在本任务删掉它，`store.ts` 的 8 处引用会立刻编译失败，中间这个提交就是坏的。）

注意：`MODULE_TABLES` 的内容**比 `WORLD_SUMMARY` 新**（D50 + 力量层级改为不受限制），这是有意的订正。

- [ ] **Step 7: 构建与测试确认没打破任何东西**

Run: `pnpm build && pnpm test`
Expected: 构建成功、全量测试仍全绿（本任务只新增常量，不改任何消费者）

- [ ] **Step 8: 提交**

```bash
git add src/wxhl-003/data.ts
git commit -m "feat(wxhl): 新增论坛分区常量(CORE_WORLD/MODULE_TABLES/风格与人格/5 个分区提示词)"
```

---

### Task 2: `forumPrompts.ts` + `store.ts` 接线

**Files:**
- Create: `src/wxhl-003/forumPrompts.ts`
- Modify: `src/wxhl-003/store.ts`
- Test: `src/wxhl-003/__tests__/forumPrompts.test.ts`

**Interfaces:**
- Consumes: Task B1 的 `CORE_WORLD` / `MODULE_TABLES` / `BUILD_MECHANICS` / `TRADE_MECHANICS` / `TIEBA_STYLE` / `PERSONA_MATRIX` / `FORUM_SECTION_PROMPTS` / `DUNGEON_GENERATION_RULES` / `CAREER_SYSTEM_RULES`
- Produces:
  - `type ForumSectionKey = 'complaints' | 'intel' | 'dungeon' | 'build' | 'trade'`
  - `function buildRefreshPrompt(sectionKey: ForumSectionKey, worldbookText: string, influenceContext: string): string`
  - `function buildThreadDetailPrompt(sectionKey: ForumSectionKey, thread: {title:string;preview:string;author:string;replies:number}, worldbookText: string): string`
  - `function buildRepliesPrompt(sectionKey: ForumSectionKey, thread: {title:string}, context: string, worldbookText: string): string`

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/forumPrompts.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildRefreshPrompt, buildRepliesPrompt, buildThreadDetailPrompt } from '../forumPrompts';

const 分区 = ['complaints', 'intel', 'dungeon', 'build', 'trade'] as const;

describe('buildRefreshPrompt 的注入矩阵', () => {
  it('5 个分区都拿到回廊核心机制与贴吧风格与人格要求', () => {
    for (const s of 分区) {
      const p = buildRefreshPrompt(s, '', '');
      expect(p).toContain('无限回廊核心机制');
      expect(p).toContain('贴吧风格');
      expect(p).toContain('人格多样性');
    }
  });

  it('只有吐槽区与副本经历区拿到副本模块词表', () => {
    expect(buildRefreshPrompt('complaints', '', '')).toContain('副本模块词表');
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本模块词表');
    for (const s of ['intel', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('副本模块词表');
    }
  });

  it('只有副本经历区拿到副本生成规则全文与奖励规范', () => {
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本生成');
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本成就奖励梯度');
    for (const s of ['complaints', 'intel', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('副本成就奖励梯度');
    }
  });

  it('只有构筑区拿到职业系统规则与属性装备机制', () => {
    expect(buildRefreshPrompt('build', '', '')).toContain('属性与装备机制');
    for (const s of ['complaints', 'intel', 'dungeon', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('属性与装备机制');
    }
  });

  it('只有交易区拿到交易与经济机制', () => {
    expect(buildRefreshPrompt('trade', '', '')).toContain('交易与经济机制');
    for (const s of ['complaints', 'intel', 'dungeon', 'build'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('交易与经济机制');
    }
  });

  it('注入世界书与影响事件上下文', () => {
    const p = buildRefreshPrompt('trade', '世界书内容ABC', '最近圈内大事XYZ');
    expect(p).toContain('世界书内容ABC');
    expect(p).toContain('最近圈内大事XYZ');
  });

  it('要求返回 threads JSON', () => {
    expect(buildRefreshPrompt('intel', '', '')).toContain('threads');
    expect(buildRefreshPrompt('intel', '', '')).toContain('hotComment');
  });

  it('分区之间的体裁定位互不相同', () => {
    const 定位 = 分区.map(s => buildRefreshPrompt(s, '', ''));
    for (let i = 0; i < 定位.length; i++) {
      for (let j = i + 1; j < 定位.length; j++) {
        expect(定位[i]).not.toBe(定位[j]);
      }
    }
  });
});

describe('buildThreadDetailPrompt', () => {
  it('带上分区体裁与楼主人格要求', () => {
    const p = buildThreadDetailPrompt('trade', { title: '出把破刀', preview: '急出', author: '卖刀的老哥', replies: 12 }, '');
    expect(p).toContain('出把破刀');
    expect(p).toContain('卖刀的老哥');
    expect(p).toContain('交易');
    expect(p).toContain('人格');
  });
});

describe('buildRepliesPrompt', () => {
  it('要求复用帖内已出现的昵称、不扮演楼主', () => {
    const p = buildRepliesPrompt('dungeon', { title: '我在生化危机里活了三天' }, '[#1 楼主]: 事情是这样的', '');
    expect(p).toContain('我在生化危机里活了三天');
    expect(p).toContain('不要扮演楼主');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test src/wxhl-003/__tests__/forumPrompts.test.ts`
Expected: FAIL —— `Failed to resolve import "../forumPrompts"`

- [ ] **Step 3: 实现 `src/wxhl-003/forumPrompts.ts`**

```ts
import {
  BUILD_MECHANICS,
  CAREER_SYSTEM_RULES,
  CORE_WORLD,
  DUNGEON_GENERATION_RULES,
  FORUM_SECTION_PROMPTS,
  MODULE_TABLES,
  PERSONA_MATRIX,
  TIEBA_STYLE,
  TRADE_MECHANICS,
} from './data';

// ================================================================
// 论坛提示词组装（纯函数, 零酒馆依赖, 便于单测）
// 分层: 分区专属体裁(FORUM_SECTION_PROMPTS) + 共用贴吧风格(TIEBA_STYLE)
//       + 共用人格要求(PERSONA_MATRIX) + 该分区的专属参考 + 上下文
// ================================================================

export type ForumSectionKey = 'complaints' | 'intel' | 'dungeon' | 'build' | 'trade';

/** JSON 输出格式说明（全分区一致） */
const OUTPUT_FORMAT =
  '【输出格式】返回一个 JSON 对象, 包含 threads 数组, 每个元素有 ' +
  'title / preview / author / hotComment / hotAuthor / hotLikes 字段。' +
  'title 是帖子标题, preview 是正文开头两三百字, author 是楼主昵称, ' +
  'hotComment 是最热评论, hotAuthor 是热评作者昵称, hotLikes 是热评点赞数(数字)。' +
  '不要输出 markdown 代码块, 不要任何解释文字。';

/** 按分区挑出该分区该读的参考 */
function referencesFor(sectionKey: ForumSectionKey): string {
  switch (sectionKey) {
    case 'complaints':
      return [CORE_WORLD, MODULE_TABLES].join('\n\n');
    case 'intel':
      return CORE_WORLD;
    case 'dungeon':
      return [CORE_WORLD, MODULE_TABLES, DUNGEON_GENERATION_RULES].join('\n\n');
    case 'build':
      return [CORE_WORLD, CAREER_SYSTEM_RULES, BUILD_MECHANICS].join('\n\n');
    case 'trade':
      return [CORE_WORLD, TRADE_MECHANICS].join('\n\n');
  }
}

/** 分区刷新：生成 8 条分区帖子 */
export function buildRefreshPrompt(
  sectionKey: ForumSectionKey,
  worldbookText: string,
  influenceContext: string,
): string {
  const 体裁 = FORUM_SECTION_PROMPTS[sectionKey] ?? '';
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  const 影响 = influenceContext ? '\n' + influenceContext : '';
  return `${体裁}

${PERSONA_MATRIX}

${TIEBA_STYLE}

${OUTPUT_FORMAT}
要求生成 8 条帖子。

【参考设定】
${referencesFor(sectionKey)}
${世界书}${影响}`;
}

/** 帖子详情：把预览扩写成完整帖 + 4~6 条评论 */
export function buildThreadDetailPrompt(
  sectionKey: ForumSectionKey,
  thread: { title: string; preview: string; author: string; replies: number },
  worldbookText: string,
): string {
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你在补全无限回廊论坛「${sectionKey}」分区的一个帖子。

【帖子信息】
标题: ${thread.title}
预览: ${thread.preview}
楼主昵称: ${thread.author}
已有回复数: ${thread.replies}

【体裁要求 —— 必须与所在分区一致】
${FORUM_SECTION_PROMPTS[sectionKey] ?? ''}

【人格要求】
楼主的人格必须与昵称「${thread.author}」给人的印象一致, 全帖保持同一人格与语气, 不要中途变形。

${TIEBA_STYLE}

【任务要求】
1. fullContent: 帖子的完整正文（300~600 字）。要像真人发的帖, 不要工整分段、不要小标题。
2. comments: 4~6 条评论。每条 1~2 条子回复。评论者的昵称与人格要各不相同, 且要有人抬杠、有人玩梗、有人认真回复。评论内容要针对帖子本身, 不要泛泛而谈。
只返回 JSON: { "fullContent": "…", "comments": [ { "author": "…", "content": "…", "replies": [ { "author": "…", "content": "…" } ] } ] }
不要 markdown 代码块, 不要解释文字。${世界书}

【参考设定】
${referencesFor(sectionKey)}`;
}

/** 追加回复：以帖内已出现的其他契约者身份回帖 */
export function buildRepliesPrompt(
  sectionKey: ForumSectionKey,
  thread: { title: string },
  context: string,
  worldbookText: string,
): string {
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `无限回廊论坛「${sectionKey}」分区的帖子「${thread.title}」当前讨论:

${context}

【任务要求】
有契约者刚发表了新回复（上面最后一条）。请以**帖子里已经出现过的其他契约者**的身份,
生成 2~3 条回应。要求:
- **不要扮演楼主**, 也不要扮演刚回复的那位。
- 只使用上面讨论中**已出现的昵称**, 并延续各自原有的人格与语气。
- 回应要针对上面的讨论内容, 可以有抬杠、补充、玩梗、站队。
只返回 JSON: { "replies": [ { "author": "…", "content": "…" } ] }
不要 markdown 代码块, 不要解释文字。${世界书}`;
}
```

（注意 `buildRepliesPrompt` 里「不要扮演楼主」那句是测试断言的目标，务必逐字保留。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/wxhl-003/__tests__/forumPrompts.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 改造 `store.ts`**

**(a) 顶部 import**：把 `WORLD_SUMMARY` 从 `./data` 的 import 里删掉，换成

```ts
import { CORE_WORLD, FORUM_SECTION_PROMPTS, type ForumSectionKey } from './data'
import { buildRefreshPrompt, buildRepliesPrompt, buildThreadDetailPrompt } from './forumPrompts'
```

（注意 `ForumSectionKey` 的类型在 `forumPrompts.ts` 里，不在 `data.ts`。若 `store.ts` 需要它，从 `./forumPrompts` 导入 `type ForumSectionKey`。）

**(b) 删掉本文件里的 `buildRefreshPrompt` 函数**（原 332~355 行）与死常量 `MODULE_SUMMARY`（原 330 行）。

**(c) `refreshSection`** 里改成：

```ts
      const prompt = buildRefreshPrompt(sectionKey as ForumSectionKey, wb, 影响上下文字符串)
```

其中「影响上下文字符串」沿用原来 `buildRefreshPrompt` 里那段按分区过滤 `influenceEvents` 的逻辑 —— **把那段的产出（一个字符串）在 `refreshSection` 里算好再传进去**。原来那段逻辑大致是：

```ts
    let influenceCtx = ''
    if (influenceEvents.value.length > 0) {
      const relevant = influenceEvents.value.filter(e => !e.section || e.section === sectionKey)
      if (relevant.length > 0) {
        influenceCtx = '\n【最近圈内大事】\n' + relevant.map(e => '- ' + e.event + (e.impact ? '（影响力：' + e.impact + '）' : '') + (e.nickname ? '——契约者被称作「' + e.nickname + '」' : '')).join('\n') + '\n请让生成的帖子自然地讨论这些事件，可以有部分帖子围绕这些大事展开。'
      }
    }
```

**(d) `generateThreadDetail`** 改为：

```ts
      const raw = await aiGenerate(cfg, buildThreadDetailPrompt(thread.section as ForumSectionKey, thread, wb), THREAD_DETAIL_SCHEMA)
```

（原来那一长串手写 prompt 串整段删掉；`secNames` 若因此变成未使用，一并删掉。）

**(e) `generateReplies`** 改为：

```ts
      const raw = await aiGenerate(cfg, buildRepliesPrompt(thread.section as ForumSectionKey, thread, context, wb), REPLY_LIST_SCHEMA)
```

**(f) 影响事件 prompt（约 302 行）**：`${wb || WORLD_SUMMARY}` 改成 `${wb || CORE_WORLD}`。

**(g) 职业规划 prompt（约 599 行）**：`${WORLD_SUMMARY}` 改成 `${CORE_WORLD}`（职业规划本来就另有 `${CAREER_SYSTEM_RULES}`，两者都要保留）。

**(h) 删除 `WORLD_SUMMARY`**：确认 `store.ts` 里已无引用后，删掉 `data.ts` 的 `export const WORLD_SUMMARY = '...'` 整行。

自检命令（应无输出）：
```bash
grep -rn "WORLD_SUMMARY" src/wxhl-003/ || echo "已无残留 ✅"
grep -rn "MODULE_SUMMARY" src/wxhl-003/ || echo "已无残留 ✅"
```

- [ ] **Step 6: 构建与范围化类型检查**

Run: `pnpm build && pnpm exec tsc --noEmit 2>&1 | grep "wxhl-003/store.ts"`
Expected: 构建成功；`store.ts` **一条错误都没有**（那条既存的 `MODULE_SUMMARY never read` 应该随死常量一起消失）。全仓错误数应从 11 降到 10。

再跑：`pnpm exec tsc --noEmit 2>&1 | grep -E "wxhl-003/(data|forumPrompts)"` → 应无输出。

- [ ] **Step 7: 全量测试与提交**

Run: `pnpm test`
Expected: 全量通过（阶段 A 的 66 个 + 本任务的 forumPrompts 测试）

```bash
git add src/wxhl-003/forumPrompts.ts src/wxhl-003/store.ts src/wxhl-003/__tests__/forumPrompts.test.ts src/wxhl-003/data.ts
git commit -m "refactor(wxhl): 论坛提示词按分区注入, 提示词组装抽为可测的纯函数"
```

---

## 完成标准

1. `pnpm test` 全绿、`pnpm build` 成功、`tsc` 全仓错误数降到 **10 条**（`store.ts` 归零）
2. 论坛 5 个分区的提示词**体裁互不相同**，且**都**带贴吧风格与人格多样性要求（有单测钉住）
3. `MODULE_TABLES` 只出现在吐槽区与副本经历区；`DUNGEON_GENERATION_RULES` 只出现在副本经历区（有单测钉住）
4. 构筑区、交易区各自拿到自己领域的参考，不再拿到副本标签
5. `WORLD_SUMMARY` 与 `MODULE_SUMMARY` 已删除，无残留引用

## 验证方式

项目无 UI 测试。`forumPrompts.ts` 的注入矩阵由单测覆盖；**提示词的文风质量只能靠用户在酒馆里实际刷 5 个分区目视确认** —— 交付时要给用户一份清单：刷一遍 5 个分区，确认「分区之间体裁不同」且「同一分区内 8 条帖子人格各异」。
