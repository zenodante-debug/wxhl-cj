# 敌人生成（副本角色）④ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让「副本生成」卡片上的「敌人生成」按钮真正可用 —— 按副本基准等级生成 **1 杂兵 + 1 精英 + 1 BOSS**，用户**勾选要写入哪几个**，确认后写进 `契约者.副本角色`。

**Architecture:** 沿用副本生成的三段式：`dungeonGen.ts` 造 prompt（纯函数）→ AI 回 JSON → `dungeonRules.ts` 用 zod 校验并映射成变量 → `store.ts` 写 MVU。规则原文（`<副本角色生成规则>` / `<敌人模版设计>` / `<boss案例>` / 各系统模块）**全部走世界书读取**，不内联成常量。

**Spec:** 无独立 spec。规则由用户 2026-09-19 提供，设计由本计划确定。

**前置：** `docs/superpowers/plans/2026-09-19-settings-worldbook-and-api-profiles.md`（① 世界书条目级勾选）**已完成** —— `a617b36` / `f1f9ec7` / `93ffcdd`。

## 已确认的决定

1. **只生成 3 个**：1 杂兵 + 1 精英 + 1 BOSS，作为主线的固定阶段。
2. **用户勾选写入哪几个** —— 默认全勾，取消不要的，点确认才写。
3. 规则**走世界书读取**（用户已在设置里勾选），**不内联**。
4. `隐藏BOSS` 与 `固有角色` **本模块不生成**（规则原文也说它们不参与主线难度计算、由隐藏任务/主动探索触发）。

## Global Constraints

- 工作分支 `feat/wxhl-dungeon-roll-module`。**只 `git add` 本任务明确涉及的文件，严禁 `git add -A`。**
- 不新增依赖。不得手写 `z`/`ref`/`defineStore`/`klona`/`_`/`$`/`toastr`/`YAML` 的 import。
- 测试文件放 `src/wxhl-003/__tests__/`。
- **`pnpm build` 不做类型检查**；**`.vue` 更是完全不检查** —— 涉及 `App.vue` 的任务必须逐行自查。
- 仓库 `tsc --noEmit` 现有 **10 条**既存错误，不要新增。
- **不要改**阶段 A/B 与设置整改的既有产物：`dice.ts`、`forumPrompts.ts`、`data.ts` 的既有常量、`App.vue` 里非本模块的部分（含状态栏 `◆ 回廊终端 · v2`）。
- 一律半角符号与冒号。

---

## 铁律：AI 写入白名单（用户规则原文，实现时逐条对齐）

**必须写**：`外貌`、`类型`、`构筑`、`好感度`、`头部`（等级/阶位/天赋/血统/称号）、`属性.基础`（四维）、`属性.自定义加成`（默认 0）、衍生属性的 **7 个「额外加成」字段**（默认 0）、`职业`（仅 BOSS）、`通用技能`、`装备`、`状态.特殊状态`、`背包`。

**严禁写**（全部由用户卡里的前端脚本代算）：
- `属性.加成` / `属性.实际` / `属性.属性修正值`
- 衍生属性的 `HP_最大` / `MP_最大` / `耐力_最大` / `防御` / `闪避值` / `移动距离` / `负重_上限`
- 所有 `*_当前`（HP/MP/耐力）—— 新实体首次 insert 时前端自动令当前值=最大值

**装备字段完整铁律**：`装备防御` 与 `装备闪避` 必须由 AI 按规则里的公式**算好绝对值**后写入（前端只做 Σ 累加，漏写就加不上）；武器槽与饰品槽写 0；负系数的重装/极重防具可写负数。其余装备字段（名称/类型/品质/阶位/伤害骰/倍率/主副属性加成/效果/描述/负重）也必须完整，`效果` 必须是键值对对象。

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/wxhl-003/enemyRules.ts` | **新建**：敌人生成的 **zod schema** + **变量映射** + **`<enemy>` 面板拼装**（纯函数，可单测） |
| `src/wxhl-003/dungeonGen.ts` | **改**：把 Stage A 的 `buildEnemyPrompt` 桩换成真实现 |
| `src/wxhl-003/store.ts` | **改**：`useDungeonGenStore` 加 `generateEnemies()` / `writeEnemies(ids)`；把 `mapEnemiesToVariables` 桩换成真实现 |
| `src/wxhl-003/App.vue` | **改**：「敌人生成」按钮启用 + 生成后的勾选 UI |
| `src/wxhl-003/__tests__/enemyRules.test.ts` | **新建** |

---

### Task 1: `enemyRules.ts` — 校验 schema、变量映射、面板拼装

**Files:**
- Create: `src/wxhl-003/enemyRules.ts`
- Test: `src/wxhl-003/__tests__/enemyRules.test.ts`

**Interfaces:**
- Consumes: 无（纯函数，只依赖 zod 全局 `z`）
- Produces:
  - `type EnemyKind = '杂兵' | '精英' | 'BOSS'`
  - `const ENEMY_KINDS: readonly EnemyKind[]`
  - `const EnemyGenResultSchema`（zod）
  - `type EnemyGenResult = z.output<typeof EnemyGenResultSchema>`
  - `function mapEnemyToVariables(e: EnemyGenResult['敌人'][number]): Record<string, unknown>` —— 返回**单个副本角色的实体对象**（键名对齐用户 schema 的 `实体Schema`）
  - `function assembleEnemyPanel(e: EnemyGenResult['敌人'][number]): string` —— 拼 `<enemy>…</enemy>` 面板文本

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/enemyRules.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { ENEMY_KINDS, EnemyGenResultSchema, assembleEnemyPanel, mapEnemyToVariables } from '../enemyRules';

const 一只杂兵 = {
  名称: '腐化游民',
  类型: '杂兵',
  外貌: '皮肤灰败、指节外翻的人形',
  构筑: '无脑冲锋, 靠数量压制',
  等级: 6,
  阶位: '一阶',
  天赋: { 名称: '腐臭血肉', 品质: '白色', 属性加成: 'CON+1', 效果: { 腐臭: '被近战命中时使对方中毒1回合' } },
  血统: { 名称: '感染者', 品质: '白色', 属性加成: '无', 效果: { 病源: '免疫同类毒素' } },
  称号: { 名称: '无', 效果: {} },
  属性基础: { STR: 12, AGI: 8, CON: 14, PER: 8 },
  衍生额外加成: { HP额外加成: 0, MP额外加成: 0, 耐力额外加成: 0, 防御额外加成: 0, 闪避额外加成: 0, 移动距离额外加成: 0, 负重额外加成: 0 },
  通用技能: {
    撕咬: { 分类: '基础', 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 消耗: '无', 冷却: '无', 射程: '近战', 目标: '单体', 阶位: '一阶', 属性要求: '无', 等级: 1, 效果: { 撕咬: '造成STR修正×0.3的物理伤害' } },
  },
  装备: {
    头部: { 名称: '无', 类型: '无', 品质: '无', 阶位: '无', 穿戴门槛: '无', 强化等级: 0, 伤害骰: '无', 倍率: 0, 主属性: '无', 副属性: '无', 主属性加成: 0, 副属性加成: 0, 装备防御: 0, 装备闪避: 0, 负重: 0, 效果: {}, 描述: '无', 数量: 1 },
  },
  特殊状态: {},
  背包: {},
};

const 结果 = { 敌人: [{ ...一只杂兵 }, { ...一只杂兵, 名称: '精英甲', 类型: '精英' as const, 等级: 9 }, { ...一只杂兵, 名称: 'BOSS甲', 类型: 'BOSS' as const, 等级: 11, 职业: { 名称: '腐潮领主', 稀有度: '金色' } }] };

describe('EnemyGenResultSchema', () => {
  it('接受合法结果', () => {
    expect(() => EnemyGenResultSchema.parse(结果)).not.toThrow();
  });
  it('数组长度必须恰好是 3', () => {
    expect(() => EnemyGenResultSchema.parse({ 敌人: 结果.敌人.slice(0, 2) })).toThrow();
  });
  it('拒绝不在枚举里的类型', () => {
    expect(() => EnemyGenResultSchema.parse({ 敌人: [{ ...一只杂兵, 类型: '隐藏BOSS' }, 结果.敌人[1], 结果.敌人[2]] })).toThrow();
  });
});

describe('mapEnemyToVariables', () => {
  const v: any = mapEnemyToVariables(结果.敌人[0] as any);

  it('顶层键与实体 schema 对齐', () => {
    for (const k of ['外貌', '类型', '构筑', '好感度', '头部', '属性', '衍生属性', '职业', '通用技能', '装备', '状态', '背包']) {
      expect(v).toHaveProperty(k);
    }
  });

  it('头部带等级/阶位/天赋/血统/称号', () => {
    expect(v.头部.等级).toBe(6);
    expect(v.头部.阶位).toBe('一阶');
    expect(v.头部.天赋.名称).toBe('腐臭血肉');
    expect(v.头部.称号.当前称号.名称).toBe('无');
  });

  it('属性只写 基础 与 自定义加成, 不写 加成/实际/属性修正值', () => {
    expect(v.属性.基础).toEqual({ STR: 12, AGI: 8, CON: 14, PER: 8 });
    expect(v.属性.自定义加成).toEqual({ STR: 0, AGI: 0, CON: 0, PER: 0 });
    expect(v.属性).not.toHaveProperty('加成');
    expect(v.属性).not.toHaveProperty('实际');
    expect(v.属性).not.toHaveProperty('属性修正值');
  });

  it('衍生属性只写 7 个额外加成, 不写任何最大值/当前值', () => {
    const keys = Object.keys(v.衍生属性);
    expect(keys.sort()).toEqual(['HP额外加成', 'MP额外加成', '体力额外加成', '耐力额外加成', '移动距离额外加成', '负重额外加成', '防御额外加成', '闪避额外加成'].filter(k => keys.includes(k)).sort());
    for (const bad of ['HP_最大', 'MP_最大', '耐力_最大', '防御', '闪避值', '移动距离', '负重_上限', 'HP_当前', 'MP_当前', '耐力_当前']) {
      expect(v.衍生属性).not.toHaveProperty(bad);
    }
  });

  it('状态只写 特殊状态', () => {
    expect(v.状态).toEqual({ 特殊状态: {} });
  });
});

describe('assembleEnemyPanel', () => {
  const p = assembleEnemyPanel(结果.敌人[0] as any);
  it('以 <enemy> 包裹并闭合', () => {
    expect(p.startsWith('<enemy>')).toBe(true);
    expect(p.trimEnd().endsWith('</enemy>')).toBe(true);
  });
  it('含全部必需行', () => {
    for (const tag of ['[名称|', '[类型|', '[外观|', '[生命|', '[威胁|', '[属性|', '[防御|', '[底牌|', '[装备|', '[技能|']) {
      expect(p).toContain(tag);
    }
  });
  it('杂兵不输出 [职业] 行', () => {
    expect(p).not.toContain('[职业|');
  });
  it('BOSS 输出 [职业] 行', () => {
    expect(assembleEnemyPanel(结果.敌人[2] as any)).toContain('[职业|');
  });
  it('装备行按七槽顺序, 未装备的槽写「无」', () => {
    const 装 = p.split('\n').find(l => l.startsWith('[装备|'))!;
    const 序 = ['【头部】', '【躯干】', '【手部】', '【下装】', '【饰品】', '【主武器】', '【副武器】'];
    let last = -1;
    for (const s of 序) { const i = 装.indexOf(s); expect(i).toBeGreaterThan(last); last = i; }
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test src/wxhl-003/__tests__/enemyRules.test.ts`
Expected: FAIL —— `Failed to resolve import "../enemyRules"`

- [ ] **Step 3: 实现 `src/wxhl-003/enemyRules.ts`**

要点（照此实现，细节可自行整理）：
- `ENEMY_KINDS = ['杂兵', '精英', 'BOSS'] as const`
- `EnemyGenResultSchema`：`{ 敌人: z.array(敌人Schema).length(3) }`；`敌人Schema` 的 `类型` 用 `z.enum(ENEMY_KINDS)`；`等级` 用 `z.coerce.number().int().min(1).max(999)`；`属性基础` 四维用 `z.coerce.number().min(0)`；`衍生额外加成` 七个字段全 `z.coerce.number().prefault(0)`；`装备` 用 `z.record(z.string(), z.any()).prefault({})`（装备槽位多、结构深，**本模块只做透传与字段白名单，不做逐字段校验**）；`职业` 可选（杂兵/精英不填）
- **`mapEnemyToVariables` 只挑白名单字段**组装实体（见上文「铁律」），**绝不**把 AI 多给的字段透传进去 —— 这是防止 AI 越权写 `属性.实际` 之类字段的关键：
  ```ts
  export function mapEnemyToVariables(e: any): Record<string, unknown> {
    return {
      外貌: e.外貌 ?? '',
      类型: e.类型,
      构筑: e.构筑 ?? '无',
      好感度: 0,
      头部: { 等级: e.等级, 阶位: e.阶位, EXP_当前: 0, EXP_升级所需: 0, 属性软上限: 0, 军衔: '列兵', RP_当前: 0, RP_下一级: 0, 天赋: e.天赋, 血统: e.血统, 称号: { 当前称号: e.称号 ?? { 名称: '无', 效果: {} }, '备用称号（只记录不生效）': { 名称: '无', 效果: {} } } },
      属性: { 基础: e.属性基础, 加成: { STR: 0, AGI: 0, CON: 0, PER: 0 }, 自定义加成: e.属性自定义加成 ?? { STR: 0, AGI: 0, CON: 0, PER: 0 }, 实际: e.属性基础, 属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 0 }, 未分配属性点: 0 },
      衍生属性: { ...e.衍生额外加成 },
      职业: e.职业 ?? undefined,
      通用技能: e.通用技能 ?? {},
      装备: e.装备 ?? {},
      状态: { 特殊状态: e.特殊状态 ?? {}, 生命状态: '健康' },
      背包: e.背包 ?? {},
    };
  }
  ```
  ⚠️ **注意**：用户规则说「严禁写入 `属性.加成` / `属性.实际` / `属性.属性修正值`」。上面为了满足 zod schema 的默认结构给了 0 值 —— **这是错的**。正确做法是**这些键不要出现在写入对象里**（MVU 的 schema 会用 `prefault` 补 0）。**请按「只写白名单里的键」实现**，上面的代码仅示意结构，**不要照抄那些被禁的键**。测试里的断言就是按「不含这些键」写的。
- `assembleEnemyPanel(e)`：按用户规则第七步的格式逐行拼；`[职业|` 行仅 `类型 === 'BOSS'` 时输出；`[装备|` 行按七槽顺序、缺的槽写「无」；`[生命|` 写 `1/1` 占位（真实数值由前端代算，模块不知道）**并在报告里说明这个取舍**。

- [ ] **Step 4: 运行确认通过** → `pnpm test src/wxhl-003/__tests__/enemyRules.test.ts`

- [ ] **Step 5: 构建 / 全量测试 / tsc** → `pnpm build` 成功；`pnpm test` 全绿（82 + 新增）；`tsc` 仍 10 条

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/enemyRules.ts src/wxhl-003/__tests__/enemyRules.test.ts
git commit -m "feat(wxhl): 新增副本角色的校验 schema、变量映射与面板拼装"
```

---

### Task 2: `dungeonGen.ts` — 敌人生成 prompt

**Files:**
- Modify: `src/wxhl-003/dungeonGen.ts`

**Interfaces:**
- Consumes: `EnemyGenResultSchema`（Task 1）；既有的 `BuildRoll` / `PlayerBrief`
- Produces: `function buildEnemyPrompt(build: BuildRoll, playerText: string, worldbookText: string, 基准等级: number): string`

- [ ] **Step 1: 把 Stage A 的桩换成真实现**

现在 `buildEnemyPrompt()` 是**恒抛**的桩。改成真函数（`mapEnemiesToVariables` 的桩**保持抛错**，它由 store 直接调 Task 1 的 `mapEnemyToVariables`）。

prompt 需包含：
1. **【任务】**：为本次副本生成 **3 个副本角色**，类型分别是 `杂兵` / `精英` / `BOSS`，作为主线的固定阶段。
2. **【等级】**：三者等级 = `基准等级 × 类型系数`（杂兵 0.6 / 精英 0.9 / BOSS 1.2），四舍五入取整，一律写入 `等级` 字段；`阶位` 由等级落入区间（一阶 1~20 / 二阶 21~40 / 三阶 41~60 / 四阶 61~80 / 五阶 81~100）。**`基准等级` 由系统给定（见下），你不要改。**
3. **【规则来源】**：明确告诉 AI **严格按世界书中的 `<副本角色生成规则>` / `<敌人模版设计>` / `<boss案例>` 及其引用的各系统模块执行**（世界书内容会拼在本 prompt 里）。
4. **【写入白名单铁律】**：照抄上文「铁律」那一节 —— 必须写哪些、严禁写哪些（尤其**严禁写任何 `*_当前`、`*_最大`、`防御`、`闪避值`、`属性.实际`** —— 全部由前端脚本代算）。
5. **【装备防闪公式】**：照抄用户规则里「装备防闪绝对值公式」那一节（含防具类型系数表与阶位系数表），要求 AI **算好绝对值**再写。
6. **【输出格式】**：只回 JSON，结构为 `{ "敌人": [ { 名称, 类型, 外貌, 构筑, 等级, 阶位, 天赋, 血统, 称号, 属性基础{STR,AGI,CON,PER}, 衍生额外加成{…7个}, 通用技能, 装备, 特殊状态, 背包, 职业? } ] }`，数组长度**恰好 3**，顺序为 杂兵→精英→BOSS。
7. **【玩家数据】** 与 **【世界观/规则参考】**（世界书原文）拼在末尾。

- [ ] **Step 2: 更新 `dungeonGen.test.ts`**

Stage A 里有一条断言 `buildEnemyPrompt` **恒抛**的用例（`expect(() => buildEnemyPrompt()).toThrow(/待实现/)`）。**该用例现在必然失败，要删掉或改写成「返回的 prompt 含关键要素」**。同时 `mapEnemiesToVariables` 的恒抛用例**保留**。

新增断言（子串要与源码逐字一致，**注意别跨 `**` 加粗标记** —— 本项目已踩过三次）：
```ts
it('敌人 prompt 含三类型、基准等级与写入白名单', () => {
  const p = buildEnemyPrompt(build, '契约者: 刘林', '世界书内容', 11);
  expect(p).toContain('杂兵');
  expect(p).toContain('精英');
  expect(p).toContain('BOSS');
  expect(p).toContain('Lv.11');
  expect(p).toContain('严禁写入');
});
```

- [ ] **Step 3: 构建 / 全量测试 / tsc** → 同上

- [ ] **Step 4: 提交**

```bash
git add src/wxhl-003/dungeonGen.ts src/wxhl-003/__tests__/dungeonGen.test.ts
git commit -m "feat(wxhl): 实现敌人生成 prompt"
```

---

### Task 3: `store.ts` + `App.vue` — 生成、勾选、写入

**Files:**
- Modify: `src/wxhl-003/store.ts`（`useDungeonGenStore`）
- Modify: `src/wxhl-003/App.vue`（卡片上的按钮与勾选 UI）

**Interfaces:**
- Consumes: Task 1 的 `EnemyGenResultSchema` / `mapEnemyToVariables` / `assembleEnemyPanel`；Task 2 的 `buildEnemyPrompt`
- Produces: store 新增 `enemies`（`Ref<EnemyGenResult['敌人'] | null>`）、`generatingEnemies`、`generateEnemies()`、`writeEnemies(选中的索引: number[])`

- [ ] **Step 1: store — `generateEnemies()`**

参照既有的 `generate()` 写：
- 取 `current.value`（当前展示的副本条目），**要求它已有 `result`**（否则 `lastError = '请先生成副本'`）
- `基准等级` 取自 `mapToVariables` 写进 `当前副本元数据.基准等级` 的那个值 —— store 里已有 `player.等级`，直接用
- `buildEnemyPrompt(entry.build, playerText, wb, player.等级)` → `aiGenerate(cfg, prompt, {name:'enemy_generation', value: z.toJSONSchema(EnemyGenResultSchema, {io:'input'})})` → `EnemyGenResultSchema.parse(extractJSON(raw))`
- 结果存进 `enemies` ref（**先不写变量**）
- 同时算好每个敌人的 `<enemy>` 面板文本存起来（用 `assembleEnemyPanel`）

- [ ] **Step 2: store — `writeEnemies(选中索引)`**

- `await waitGlobalInitialized('Mvu')` → 楼层探测（复用现有模式）→ `Mvu.getMvuData`
- 对每个选中的敌人：`_.set(mvu, ['stat_data','契约者','副本角色', 名称], mapEnemyToVariables(e))`
  ⚠️ **数组路径**（名字可能含「.」），与竞技场写 `当前敌人` 一致
- `await Mvu.replaceMvuData(...)`
- **回读校验**（与 `writeToSave` 同一套路）：逐个检查 `_.get(after, ['stat_data','契约者','副本角色', 名称])` 是否为 `undefined`，是则抛错 → 由 catch 接住 → `toastr.error` + 返回 false
- 成功后 `toastr.success('已写入 N 个副本角色')`

- [ ] **Step 3: `App.vue` — 按钮与勾选 UI**

- 把现在**禁用/toastr 占位**的「敌人生成」按钮改成真按钮：`:disabled="dungeonGenStore.generatingEnemies"`，`@click="onGenerateEnemies"`
- 生成后，在卡片里展开一块「副本角色」区域：三个复选框（默认全勾）+ 每个敌人的名称/类型/等级 + 一个「写入选中的」按钮
- **加一行提示**（用户要求）：`📌 敌人生成依赖世界书条目，请到「终端设置 → 世界书」勾选 <副本角色生成规则> / <敌人模版设计> / <boss案例> 及各类系统模块`
- **务必逐行自查**（`.vue` 无类型检查）：新增标识符全部有定义、标签开闭配对、没动非本模块部分

- [ ] **Step 4: 构建 / 全量测试 / tsc / 自查清单** → 同前

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/store.ts src/wxhl-003/App.vue
git commit -m "feat(wxhl): 敌人生成支持勾选写入副本角色"
```

---

## 完成标准

1. `pnpm test` 全绿、`pnpm build` 成功、`tsc` 仍 **10 条**既存错误
2. 「敌人生成」按钮可用；生成 3 个（杂兵/精英/BOSS）
3. 勾选后写入 `契约者.副本角色.角色名`，**且只写白名单字段** —— 存档里**不该出现** `属性.实际`/`属性.加成`/`属性.属性修正值`/任何 `*_当前`/`*_最大`/`防御`/`闪避值`
4. 写入后有回读校验（键名漂移会显式报错，不静默）
5. `<enemy>` 面板文本已生成（供用户参考/复制）

## 验证方式

`enemyRules.ts` 的 schema / 映射 / 面板由单测覆盖。**AI 实际生成质量与写入后的存档正确性只能靠用户在酒馆里验收** —— 交付时给清单：生成 → 看 3 个是否合理 → 勾选写入 → 读存档确认「没写被禁字段」→ 看状态栏/前端脚本能否正常代算。

## 已知取舍（交付时要向用户说明）

- **`[生命|` 行写占位值**：真实 HP 由用户卡里的前端脚本代算，模块不知道，所以面板里的生命值只能是占位。用户若要求准确，需要让模块也实现那套公式（与「前端代算」的设计冲突，需用户定夺）。
- **不生成隐藏BOSS与固有角色**：按用户规则，它们不参与主线难度计算、由隐藏任务/主动探索触发。
