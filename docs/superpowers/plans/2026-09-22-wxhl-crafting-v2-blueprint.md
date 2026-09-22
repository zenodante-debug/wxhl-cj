# 工坊 app v2（图纸系统）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给工坊加上图纸系统：AI 定制图纸（结构化+硬钳制）→ 背包物品 → 上传学习为私有配方（同名禁止）/ 补全残缺词条 / 金紫品质制作，配方页改为折叠双列表。

**Architecture:** 沿用 v1 的纯函数核心 + store + View 三层。新增 `effectRules.ts`（世界书效果强度限制表 + 钳制/违禁检测）与 `blueprint.ts`（图纸数据结构、背包读写、AI 生成/补全提示词与校验）。金/紫制作走 v1 已有 `craft.ts` 流程，仅扩展绘制与校验分支。

**Tech Stack:** TypeScript / Vue 3 (script setup) / pinia / zod 4 / vitest / lodash(`_` 全局) / `generateRaw`（经 `store.ts` 的 `aiGenerate`）

**Spec:** `docs/superpowers/specs/2026-09-21-wxhl-crafting-workshop-design.md`（§7 图纸系统、§9 数值生成、§12 v2 行）

## Global Constraints

- **auto-import 约定**：`vue`/`pinia`/`z`/`klona` 无需 import；`_`/`$`/`toastr`/`Mvu`/`getVariables`/`replaceVariables`/`getCurrentMessageId`/`generateRaw` 为运行时全局（vitest 由 `src/wxhl-003/__tests__/setup.ts` 注入 `_`）。测试文件只 import `vitest` 与被测模块。
- **测试命令** `pnpm test`；构建 `pnpm build`（必须零 error）。
- **主卡 schema 零改动**：图纸=背包常规物品（catchall 字段承载），已上传配方存小手机聊天变量 `wxhl003_crafting.配方库`（与既有 `材料档案` 同级）。
- **世界书硬约束**：效果条目上限 2 条；常驻类数值不得超《装备效果强度限制》表；触发/消耗类上限为常驻的 1.5~2 倍且必须写明触发条件与消耗；违禁项（无条件即死、永久无敌、无限资源/锁血、无条件必中核心弱点、无代价强效果）一律拒绝；**银色品质不可经任何途径制作或生成**。
- **Mvu 写入模式**：照 `market/store.ts`（楼层探测 → `_.set` → `replaceMvuData` → 回读校验）。
- **AI 调用**：统一走 `store.ts` 的 `aiGenerate(cfg, prompt, jsonSchema)` + `getActiveCfg(useForumStore().settings)`；用结构化 `json_schema`，失败重试由 `aiGenerate` 内部承担；未见 cfg 或抛错 → 提示去「终端设置」配置，fail-closed。
- 中文键名与既有代码一字不差；装备 `类型` 字段必须恰好是 `武器`/`防具`/`饰品`。

---

### Task 1: effectRules.ts —— 效果强度限制表与钳制

**Files:**
- Create: `src/wxhl-003/crafting/effectRules.ts`
- Test: `src/wxhl-003/crafting/__tests__/effectRules.test.ts`

**Interfaces:**
- Consumes: Task v1 的 `./equipTables`（`Quality` 类型）
- Produces:
  - `type EffectKind = '常驻' | '触发' | '消耗'`
  - `interface EffectEntry { 类型: EffectKind; 描述: string; 命中闪避?: number; 伤害百分比?: number; 属性加成?: number; 触发条件?: string; 消耗?: string }`
  - `EFFECT_CAP: readonly EffectCapRow[]`（阶位 1..5 的 `{ 命中闪避: [min,max]; 伤害百分比: [min,max]; 属性加成: number }`）
  - `descaleCap(阶位: number, 类型: EffectKind): { 命中闪避: number; 伤害百分比: number; 属性加成: number }`（触发/消耗 = 常驻 ×2，上限取整）
  - `clampEffect(entry: EffectEntry, 阶位: number): { entry: EffectEntry; clamped: string[] }`
  - `FORBIDDEN_PATTERNS: readonly { 名: string; test: RegExp }[]`
  - `checkEffects(效果: EffectEntry[], 阶位: number): { ok: boolean; reasons: string[]; 效果: EffectEntry[]; clamped: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/effectRules.test.ts
import { describe, expect, it } from 'vitest';
import { checkEffects, clampEffect, descaleCap, type EffectEntry } from '../effectRules';

describe('descaleCap · 常驻/触发/消耗上限', () => {
  it('一阶常驻 = 表值；触发/消耗 = 2 倍', () => {
    expect(descaleCap(1, '常驻')).toEqual({ 命中闪避: 6, 伤害百分比: 13, 属性加成: 1 });
    expect(descaleCap(1, '触发')).toEqual({ 命中闪避: 12, 伤害百分比: 26, 属性加成: 2 });
  });
  it('三阶常驻 = 13/27/3', () => {
    expect(descaleCap(3, '常驻')).toEqual({ 命中闪避: 13, 伤害百分比: 27, 属性加成: 3 });
  });
  it('五阶触发 = 40/80/12', () => {
    expect(descaleCap(5, '触发')).toEqual({ 命中闪避: 40, 伤害百分比: 80, 属性加成: 12 });
  });
});

describe('clampEffect · 超限钳回', () => {
  it('三阶常驻伤害 40% → 钳到 27%，并记录', () => {
    const e: EffectEntry = { 类型: '常驻', 描述: '锋锐', 伤害百分比: 40 };
    const r = clampEffect(e, 3);
    expect(r.entry.伤害百分比).toBe(27);
    expect(r.clamped.length).toBe(1);
  });
  it('触发类缺触发条件 → 降级为常驻并按常驻上限钳', () => {
    const e: EffectEntry = { 类型: '触发', 描述: '血怒', 伤害百分比: 50 };
    const r = clampEffect(e, 3);
    expect(r.entry.类型).toBe('常驻');
    expect(r.entry.伤害百分比).toBe(27);
    expect(r.clamped.some(s => s.includes('触发条件'))).toBe(true);
  });
  it('触发类写明条件则按 2 倍上限', () => {
    const e: EffectEntry = { 类型: '触发', 描述: '血怒', 伤害百分比: 50, 触发条件: '生命低于30%', 消耗: '每场2次' };
    expect(clampEffect(e, 3).entry.伤害百分比).toBe(50);
  });
  it('未填数值字段不受影响', () => {
    const e: EffectEntry = { 类型: '常驻', 描述: '纯风味' };
    expect(clampEffect(e, 1).clamped).toEqual([]);
  });
});

describe('checkEffects · 违禁与条数', () => {
  it('超过 2 条直接拒', () => {
    const 效果: EffectEntry[] = [
      { 类型: '常驻', 描述: 'a' }, { 类型: '常驻', 描述: 'b' }, { 类型: '常驻', 描述: 'c' },
    ];
    expect(checkEffects(效果, 1).ok).toBe(false);
  });
  it('无条件即死 / 永久无敌 被拒', () => {
    expect(checkEffects([{ 类型: '常驻', 描述: '无条件即死' }], 3).ok).toBe(false);
    expect(checkEffects([{ 类型: '常驻', 描述: '获得永久无敌' }], 3).ok).toBe(false);
  });
  it('含条件与消耗的即死类通过', () => {
    const e: EffectEntry = { 类型: '消耗', 描述: '斩杀：目标生命低于15%时即死', 触发条件: '目标生命低于15%', 消耗: '每场1次' };
    expect(checkEffects([e], 4).ok).toBe(true);
  });
  it('合法效果返回钳制后的列表', () => {
    const r = checkEffects([{ 类型: '常驻', 描述: '锋锐', 伤害百分比: 99 }], 1);
    expect(r.ok).toBe(true);
    expect(r.效果[0].伤害百分比).toBe(13);
    expect(r.clamped.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/effectRules.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/effectRules.ts
// ================================================================
// 世界书《装备效果强度限制》移植：常驻数值基准 + 触发/消耗倍率 + 违禁项
// 设计填补（世界书未列明，可调常量）：
//   - 触发/消耗类统一取常驻上限的 2 倍（世界书原文为 1.5~2 倍区间）
//   - 缺触发条件或缺消耗的触发/消耗类 → 降级为常驻并按常驻上限钳制
// ================================================================

export type EffectKind = '常驻' | '触发' | '消耗';

export interface EffectEntry {
  类型: EffectKind;
  描述: string;
  命中闪避?: number;
  伤害百分比?: number;
  属性加成?: number;
  触发条件?: string;
  消耗?: string;
}

export interface EffectCapRow {
  命中闪避: readonly [number, number];
  伤害百分比: readonly [number, number];
  属性加成: number;
}

/** 下标 = 阶位（0 不用）：世界书《装备效果强度限制》常驻类数值基准 */
export const EFFECT_CAP: readonly EffectCapRow[] = [
  { 命中闪避: [0, 0], 伤害百分比: [0, 0], 属性加成: 0 },
  { 命中闪避: [3, 6], 伤害百分比: [7, 13], 属性加成: 1 },
  { 命中闪避: [5, 10], 伤害百分比: [10, 20], 属性加成: 2 },
  { 命中闪避: [7, 13], 伤害百分比: [13, 27], 属性加成: 3 },
  { 命中闪避: [8, 17], 伤害百分比: [17, 33], 属性加成: 4 },
  { 命中闪避: [10, 20], 伤害百分比: [20, 40], 属性加成: 6 },
];

const TRIGGER_MULT = 2; // 触发/消耗类上限倍率（设计填补）

/** 该阶位该类型的效果数值上限（取区间最大值，再乘类型倍率） */
export function descaleCap(阶位: number, 类型: EffectKind): { 命中闪避: number; 伤害百分比: number; 属性加成: number } {
  const row = EFFECT_CAP[阶位];
  if (!row) throw new Error(`未知阶位：${阶位}`);
  const m = 类型 === '常驻' ? 1 : TRIGGER_MULT;
  return {
    命中闪避: row.命中闪避[1] * m,
    伤害百分比: row.伤害百分比[1] * m,
    属性加成: row.属性加成 * m,
  };
}

/** 单条效果钳制：超上限回钳；触发/消耗类缺条件或缺消耗 → 降级为常驻 */
export function clampEffect(entry: EffectEntry, 阶位: number): { entry: EffectEntry; clamped: string[] } {
  const clamped: string[] = [];
  let e: EffectEntry = { ...entry };

  if ((e.类型 === '触发' || e.类型 === '消耗') && (!e.触发条件 || !e.消耗)) {
    clamped.push(`「${e.描述}」缺少${!e.触发条件 ? '触发条件' : '消耗'}，已降级为常驻类`);
    e.类型 = '常驻';
  }

  const cap = descaleCap(阶位, e.类型);
  const 钳 = (字段: '命中闪避' | '伤害百分比' | '属性加成') => {
    const v = e[字段];
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    if (v > cap[字段]) {
      clamped.push(`「${e.描述}」${字段} ${v} 超出${阶位}阶${e.类型}类上限，已钳至 ${cap[字段]}`);
      e[字段] = cap[字段];
    }
  };
  钳('命中闪避');
  钳('伤害百分比');
  钳('属性加成');
  return { entry: e, clamped };
}

/** 违禁项：命中即整体拒绝（不钳制） */
export const FORBIDDEN_PATTERNS: readonly { 名: string; test: RegExp }[] = [
  { 名: '无条件即死', test: /无条件.*(即死|秒杀)|即死(?!.*(条件|生命低于|消耗|每场))/ },
  { 名: '永久无敌', test: /(永久|无限|绝对)无敌|无敌(?!.*(回合|次数|消耗|持续))/ },
  { 名: '无限资源/锁血', test: /无限(资源|弹药|MP|HP)|锁血|血量锁定/ },
  { 名: '无条件必中核心弱点', test: /必中.*(核心|弱点|要害)(?!.*(条件|消耗|每场))/ },
];

/** 校验一组效果：条数 ≤2、无违禁项、逐条钳制；返回钳制后的效果列表 */
export function checkEffects(
  效果: EffectEntry[],
  阶位: number,
): { ok: boolean; reasons: string[]; 效果: EffectEntry[]; clamped: string[] } {
  const reasons: string[] = [];
  if (效果.length > 2) {
    reasons.push(`效果条目 ${效果.length} 条，超出世界书上限 2 条`);
  }
  for (const e of 效果) {
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.test.test(e.描述)) reasons.push(`「${e.描述}」命中违禁项：${p.名}`);
    }
  }
  if (reasons.length > 0) return { ok: false, reasons, 效果, clamped: [] };

  const clamped: string[] = [];
  const out = 效果.map(e => {
    const r = clampEffect(e, 阶位);
    clamped.push(...r.clamped);
    return r.entry;
  });
  return { ok: true, reasons: [], 效果: out, clamped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/effectRules.test.ts`
Expected: PASS（若个别正则断言与实现细节不符，以世界书约束为准调整正则，不放宽违禁判定）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/effectRules.ts src/wxhl-003/crafting/__tests__/effectRules.test.ts
git commit -m "feat(wxhl): 工坊效果强度规则——世界书上限表/钳制/违禁项检测"
```

---

### Task 2: recipes.ts 扩展 —— 配方库字段、图纸配方、来源枚举

**Files:**
- Modify: `src/wxhl-003/crafting/recipes.ts`
- Test: `src/wxhl-003/crafting/__tests__/recipes.test.ts`（追加）

**Interfaces:**
- Consumes: Task 1 的 `EffectEntry`（`./effectRules`）
- Produces:
  - `配方Schema` 新增字段：`效果: z.array(EffectEntrySchema).prefault([])`（`EffectEntrySchema` 为 zod 版）、`装备基础: z.string().prefault('')`（武器=WEAPON_TABLE 键；防具=光谱）、`成品名: z.string().prefault('')`（图纸指定成品名，空则用"核心材料名+类型词"规则）
  - `配方Schema` 的 `来源` 枚举加入 `'图纸'`（已有）——确认 v1 已含，无改动
  - `type 配方库 = Record<string, 配方>`（键=配方名）
  - `BlueprintDataSchema`（图纸物品内的数据）：`z.object({ 配方: 配方Schema, 制作者: z.string().prefault(''), 补全: z.boolean().prefault(false), 版本: z.coerce.number().prefault(1) })`
  - `type 图纸数据 = z.infer<typeof BlueprintDataSchema>`
  - `BLUEPRINT_PREFIX = '图纸·'`、`isBlueprintName(name: string): boolean`、`blueprintItemName(配方名: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// 追加到 src/wxhl-003/crafting/__tests__/recipes.test.ts
import { BLUEPRINT_PREFIX, BlueprintDataSchema, blueprintItemName, isBlueprintName, 配方Schema } from '../recipes';

describe('图纸数据与命名', () => {
  it('图纸物品名前缀', () => {
    expect(blueprintItemName('狼王牙刃')).toBe('图纸·狼王牙刃');
    expect(isBlueprintName('图纸·狼王牙刃')).toBe(true);
    expect(isBlueprintName('精铁')).toBe(false);
    expect(BLUEPRINT_PREFIX).toBe('图纸·');
  });
  it('图纸数据承载完整配方并通过校验', () => {
    const data = BlueprintDataSchema.parse({
      配方: {
        名称: '狼王牙刃', 来源: '图纸', 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
        品质: '金色', 阶位: 3, 装备基础: '短剑',
        材料: [{ 类别: '怪物素材', 数量: 1, 核心: true }, { 类别: '金属', 数量: 2, 核心: false }],
        技能要求: { 分类: '高级', 等级: 1 },
        效果: [{ 类型: '触发', 描述: '撕咬：攻击附加流血', 伤害百分比: 10, 触发条件: '命中时', 消耗: '每场3次' }],
      },
      制作者: 'AI',
    });
    expect(data.配方.品质).toBe('金色');
    expect(data.配方.效果[0].类型).toBe('触发');
    expect(data.补全).toBe(false);
    expect(data.版本).toBe(1);
  });
  it('金色配方可含效果，白色配方效果为空', () => {
    expect(配方Schema.parse({ ...TEMPLATE_RECIPES[0] }).效果).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/recipes.test.ts`
Expected: FAIL（`BlueprintDataSchema` 未导出）

- [ ] **Step 3: Write implementation**

在 `recipes.ts` 中：

```ts
import { type EffectEntry } from './effectRules';

/** 效果条目 zod 版（与 effectRules.EffectEntry 同构） */
export const EffectEntrySchema = z.object({
  类型: z.enum(['常驻', '触发', '消耗']).prefault('常驻'),
  描述: z.string().prefault(''),
  命中闪避: z.coerce.number().optional(),
  伤害百分比: z.coerce.number().optional(),
  属性加成: z.coerce.number().optional(),
  触发条件: z.string().optional(),
  消耗: z.string().optional(),
});
```

`配方Schema` 内追加两个字段：

```ts
  装备基础: z.string().prefault(''), // 武器=WEAPON_TABLE 键；防具=光谱；消耗品=''
  成品名: z.string().prefault(''),   // 图纸指定成品名；空则用「核心材料名+类型词」
  效果: z.array(EffectEntrySchema).prefault([]), // 金/紫图纸配方的特效（白/蓝为空）
```

文件末尾追加：

```ts
export const BLUEPRINT_PREFIX = '图纸·';

export function isBlueprintName(name: string): boolean {
  return name.startsWith(BLUEPRINT_PREFIX);
}

export function blueprintItemName(配方名: string): string {
  return BLUEPRINT_PREFIX + 配方名;
}

/** 图纸物品内承载的数据（存背包 catchall 字段 + 小手机本地备份） */
export const BlueprintDataSchema = z.object({
  配方: 配方Schema,
  制作者: z.string().prefault(''),
  补全: z.boolean().prefault(false), // 是否经 AI 补全过
  版本: z.coerce.number().prefault(1),
});
export type 图纸数据 = z.infer<typeof BlueprintDataSchema>;

/** 已上传配方库的键 = 配方名 */
export type 配方库 = Record<string, 配方>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/recipes.test.ts`
Expected: PASS（含既有 8 例）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/recipes.ts src/wxhl-003/crafting/__tests__/recipes.test.ts
git commit -m "feat(wxhl): 工坊配方 schema 扩展——装备基础/成品名/效果条目+图纸数据与命名"
```

---

### Task 3: blueprint.ts —— 图纸背包读写、定价、上传/补全纯逻辑

**Files:**
- Create: `src/wxhl-003/crafting/blueprint.ts`
- Test: `src/wxhl-003/crafting/__tests__/blueprint.test.ts`

**Interfaces:**
- Consumes: Task 1 `checkEffects`、Task 2 `BlueprintDataSchema`/`图纸数据`/`配方`/`blueprintItemName`/`isBlueprintName`；v1 `../market/priceTable` 的 `BASE` 语义（本文件自带图纸价表）；`../market/settle` 的 `Bag`/`bagAdd`/`bagRemove`
- Produces:
  - `blueprintPrice(成品类型: '装备'|'消耗品', 子类: '武器'|'防具'|'饰品'|'', 阶位: number, 品质: Quality, 道具一阶单价?: number): number`
  - `collectBlueprints(bag: Bag): { 物品名: string; 数据: 图纸数据 }[]`（扫描背包里带合法图纸数据的物品）
  - `readBlueprint(bag: Bag, 物品名: string): 图纸数据 | null`
  - `writeBlueprint(bag: Bag, 物品名: string, 数据: 图纸数据): Bag`（回写背包物品的 `图纸数据` 字段，保留数量与描述）
  - `uploadBlueprint(bag: Bag, 物品名: string, 配方库: 配方库): { bag: Bag; 配方库: 配方库 } | { error: string }`
  - `mergeBlueprintData(现有: unknown, 补全结果: Partial<图纸数据>): 图纸数据`

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/blueprint.test.ts
import { describe, expect, it } from 'vitest';
import type { Bag } from '../../market/settle';
import { blueprintPrice, collectBlueprints, readBlueprint, uploadBlueprint, writeBlueprint } from '../blueprint';
import { blueprintItemName, TEMPLATE_RECIPES } from '../recipes';

const 金配方 = {
  名称: '狼王牙刃', 来源: '图纸' as const, 行业: '锻造' as const, 成品类型: '装备' as const,
  装备子类: '武器' as const, 品质: '金色' as const, 阶位: 3, 装备基础: '短剑',
  材料: [{ 类别: '怪物素材' as const, 数量: 1, 核心: true }],
  技能要求: { 分类: '高级' as const, 等级: 1 }, 批量上限: 1, 成品名: '', 效果: [],
};
const 图纸物品 = blueprintItemName('狼王牙刃');

function bagWith蓝图的(): Bag {
  return {
    [图纸物品]: { 名称: 图纸物品, 描述: '狼王牙刃的制作图纸', 数量: 1, 图纸数据: { 配方: 金配方, 制作者: 'AI', 补全: false, 版本: 1 } },
    精铁: { 名称: '精铁', 描述: '', 数量: 5 },
  };
}

describe('blueprintPrice · 图纸定价（成品一阶中值×2×阶位系数）', () => {
  it('金三阶武器 = 10800', () => {
    expect(blueprintPrice('装备', '武器', 3, '金色')).toBe(10800);
  });
  it('金三阶防具 = 7650；金三阶饰品 = 9000', () => {
    expect(blueprintPrice('装备', '防具', 3, '金色')).toBe(7650);
    expect(blueprintPrice('装备', '饰品', 3, '金色')).toBe(9000);
  });
  it('紫三阶武器 = 40500', () => {
    expect(blueprintPrice('装备', '武器', 3, '紫色')).toBe(40500);
  });
  it('金一阶武器 = 1200（对照 spec 表）', () => {
    expect(blueprintPrice('装备', '武器', 1, '金色')).toBe(1200);
  });
  it('道具图纸 = 一阶单价×20×阶位系数', () => {
    expect(blueprintPrice('消耗品', '', 3, '金色', 40)).toBe(7200);
  });
});

describe('图纸背包读写', () => {
  it('collectBlueprints 只挑出带合法图纸数据的物品', () => {
    const list = collectBlueprints(bagWith蓝图的());
    expect(list.length).toBe(1);
    expect(list[0].物品名).toBe(图纸物品);
    expect(list[0].数据.配方.品质).toBe('金色');
  });
  it('readBlueprint 可读、非图纸返回 null', () => {
    expect(readBlueprint(bagWith蓝图的(), 图纸物品)?.配方.名称).toBe('狼王牙刃');
    expect(readBlueprint(bagWith蓝图的(), '精铁')).toBeNull();
  });
  it('writeBlueprint 回写数据且不动数量', () => {
    const bag = bagWith蓝图的();
    const next = writeBlueprint(bag, 图纸物品, { ...readBlueprint(bag, 图纸物品)!, 补全: true });
    expect(next[图纸物品].数量).toBe(1);
    expect((next[图纸物品] as any).图纸数据.补全).toBe(true);
  });
});

describe('uploadBlueprint · 上传学习', () => {
  it('成功：扣图纸物品、配方入库', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, {});
    expect('bag' in r).toBe(true);
    if (!('bag' in r)) return;
    expect(r.bag[图纸物品]).toBeUndefined();
    expect(r.bag.精铁.数量).toBe(5);
    expect(r.配方库['狼王牙刃'].品质).toBe('金色');
  });
  it('同名已掌握 → 拒绝', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, { 狼王牙刃: 金配方 });
    expect('error' in r && r.error).toContain('已掌握');
  });
  it('物品不存在 → 拒绝', () => {
    const r = uploadBlueprint({}, 图纸物品, {});
    expect('error' in r).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/blueprint.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/blueprint.ts
// ================================================================
// 图纸：背包物品形态的读写、定价、上传学习（纯函数，零酒馆依赖）
// 定价（spec §7.1）：装备=成品一阶中值×2×阶位系数；道具=一阶单价×20×阶位系数
// ================================================================
import { bagRemove, type Bag } from '../market/settle';
import { Q_ORDER, TIER_COEF, type Quality } from './equipTables';
import { BlueprintDataSchema, 配方Schema, type 图纸数据, type 配方, type 配方库 } from './recipes';

/** 一阶成品价格区间中值（与 market/priceTable.ts 的 BASE 同源；改动须两边同步） */
const EQUIP_MID: Record<'武器' | '防具' | '饰品', Record<Quality, number>> = {
  武器: { 白色: 45, 蓝色: 150, 金色: 600, 紫色: 2250 },
  防具: { 白色: 28, 蓝色: 100, 金色: 425, 紫色: 1500 },
  饰品: { 白色: 30, 蓝色: 105, 金色: 500, 紫色: 1850 },
};
/** 图纸相对成品的倍率：装备=生产资料（做 2~3 件回本），道具=走量（做 20 份回本） */
const EQUIP_MULT = 2;
const GOODS_MULT = 20;

export function blueprintPrice(
  成品类型: '装备' | '消耗品',
  子类: '武器' | '防具' | '饰品' | '',
  阶位: number,
  品质: Quality,
  道具一阶单价?: number,
): number {
  const coef = TIER_COEF[阶位];
  if (coef === undefined) throw new Error(`未知阶位：${阶位}`);
  if (成品类型 === '消耗品') {
    if (!道具一阶单价) throw new Error('道具图纸定价需要一阶单价');
    return 道具一阶单价 * GOODS_MULT * coef;
  }
  if (!子类) throw new Error('装备图纸定价需要子类');
  return EQUIP_MID[子类][品质] * EQUIP_MULT * coef;
}

/** 扫描背包，挑出带合法图纸数据的物品 */
export function collectBlueprints(bag: Bag): { 物品名: string; 数据: 图纸数据 }[] {
  const out: { 物品名: string; 数据: 图纸数据 }[] = [];
  for (const [name, item] of Object.entries(bag)) {
    const raw = (item as any)?.图纸数据;
    if (!raw) continue;
    const parsed = BlueprintDataSchema.safeParse(raw);
    if (parsed.success) out.push({ 物品名: name, 数据: parsed.data });
  }
  return out;
}

export function readBlueprint(bag: Bag, 物品名: string): 图纸数据 | null {
  const raw = (bag[物品名] as any)?.图纸数据;
  if (!raw) return null;
  const parsed = BlueprintDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** 回写背包物品的图纸数据（保留数量/描述/名称） */
export function writeBlueprint(bag: Bag, 物品名: string, 数据: 图纸数据): Bag {
  const cur = bag[物品名];
  if (!cur) return bag;
  return { ...bag, [物品名]: { ...cur, 图纸数据: 数据 } };
}

/** 上传学习：扣掉背包里的图纸物品，配方登记进配方库；同名已掌握则拒绝 */
export function uploadBlueprint(
  bag: Bag,
  物品名: string,
  配方库: 配方库,
): { bag: Bag; 配方库: 配方库 } | { error: string } {
  const 数据 = readBlueprint(bag, 物品名);
  if (!数据) return { error: `「${物品名}」不是有效图纸` };
  const 名称 = 数据.配方.名称;
  if (配方库[名称]) return { error: `已掌握配方「${名称}」，不能重复上传` };
  let nextBag: Bag;
  try {
    nextBag = bagRemove(bag, 物品名, 1);
  } catch (e: any) {
    return { error: e?.message ?? '图纸数量不足' };
  }
  return { bag: nextBag, 配方库: { ...配方库, [名称]: 数据.配方 } };
}

/** 补全：只填缺失/非法的字段，不覆盖已有有效内容 */
export function mergeBlueprintData(现有: unknown, 补全结果: Partial<图纸数据>): 图纸数据 {
  const base = BlueprintDataSchema.safeParse(现有);
  const merged = {
    ...(base.success ? base.data : {}),
    ...补全结果,
    配方: { ...(base.success ? base.data.配方 : {}), ...(补全结果.配方 ?? {}) },
    补全: true,
  };
  return BlueprintDataSchema.parse(merged);
}

export { 配方Schema, Q_ORDER };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/blueprint.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/blueprint.ts src/wxhl-003/crafting/__tests__/blueprint.test.ts
git commit -m "feat(wxhl): 图纸模块——定价/背包读写/上传学习/数据合并（纯函数）"
```

---

### Task 4: blueprintAI.ts —— AI 定制与补全（提示词 + 结构化校验）

**Files:**
- Create: `src/wxhl-003/crafting/blueprintAI.ts`
- Test: `src/wxhl-003/crafting/__tests__/blueprintAI.test.ts`

**Interfaces:**
- Consumes: Task 1 `checkEffects`/`EffectEntry`、Task 2 `BlueprintDataSchema`/`图纸数据`/`配方`、v1 `./recipes` 的 `材料类别`/`行业列表`；`../store` 的 `aiGenerate`/`extractJSON`/`getActiveCfg`/`useForumStore`
- Produces:
  - `DESIGN_SCHEMA`（json_schema 常量）、`COMPLETE_SCHEMA`
  - `buildDesignPrompt(目标: DesignTarget): string`
  - `buildCompletePrompt(现有: 图纸数据, 阶位: number): string`
  - `interface DesignTarget { 名称: string; 成品类型: '装备'|'消耗品'; 子类: string; 品质: '金色'|'紫色'; 阶位: number; 核心材料: string; 行业: string }`
  - `sanitizeDesign(raw: unknown, 目标: DesignTarget): { ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }`（纯函数，可测：跑 zod → `checkEffects` → 补默认）
  - `async generateBlueprint(目标: DesignTarget): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }>`
  - `async completeBlueprint(现有: 图纸数据, 阶位: number): Promise<...>`（同返回形状）

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/blueprintAI.test.ts
import { describe, expect, it } from 'vitest';
import { sanitizeDesign, type DesignTarget } from '../blueprintAI';

const 目标: DesignTarget = {
  名称: '狼王牙刃', 成品类型: '装备', 子类: '短剑', 品质: '金色', 阶位: 3,
  核心材料: '深渊魔狼王的牙', 行业: '锻造',
};

/** AI 返回的原始 JSON（模拟） */
function rawAI(patch: Record<string, unknown> = {}) {
  return {
    名称: '狼王牙刃', 品质: '金色', 阶位: 3, 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
    装备基础: '短剑', 描述: '以魔狼之牙锻造的利刃',
    材料: [{ 类别: '怪物素材', 数量: 1, 核心: true }, { 类别: '金属', 数量: 2, 核心: false }],
    效果: [{ 类型: '触发', 描述: '撕咬：命中时附加流血', 伤害百分比: 12, 触发条件: '命中时', 消耗: '每场3次' }],
    ...patch,
  };
}

describe('sanitizeDesign · AI 结果硬校验', () => {
  it('合法输入 → 生成完整图纸数据', () => {
    const r = sanitizeDesign(rawAI(), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.名称).toBe('狼王牙刃');
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 1 }); // 金=高级Lv.1
    expect(r.数据.制作者).toBe('AI');
    expect(r.数据.补全).toBe(false);
  });
  it('超限数值被钳回并记录', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '锋锐', 伤害百分比: 99 }] }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.效果[0].伤害百分比).toBe(27);
    expect(r.clamped.length).toBe(1);
  });
  it('违禁效果 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '获得永久无敌' }] }), 目标);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('违禁');
  });
  it('银色品质 → 拒绝（世界书不可制作）', () => {
    const r = sanitizeDesign(rawAI({ 品质: '银色' }), 目标);
    expect(r.ok).toBe(false);
  });
  it('品质/成品类型与目标不符 → 强制回到目标值', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色', 阶位: 5 }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.阶位).toBe(3);
  });
  it('缺材料 → 拒绝', () => {
    const r = sanitizeDesign(rawAI({ 材料: [] }), 目标);
    expect(r.ok).toBe(false);
  });
  it('紫色 = 高级技能 Lv.5', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色' }), { ...目标, 品质: '紫色' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/blueprintAI.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/blueprintAI.ts
// ================================================================
// AI 图纸：定制（从零生成）与补全（补齐残缺图纸）
// 硬校验：AI 只负责创意，数值一律过 effectRules 钳制、违禁项一律拒绝
// AI 调用经 store.ts 的 aiGenerate（复用终端设置里的 API 配置）
// ================================================================
import { checkEffects, type EffectEntry } from './effectRules';
import { BlueprintDataSchema, 配方Schema, type 图纸数据, type 配方 } from './recipes';
import { extractJSON, getActiveCfg, useForumStore, aiGenerate } from '../store';

export interface DesignTarget {
  名称: string;
  成品类型: '装备' | '消耗品';
  子类: string; // 武器=WEAPON_TABLE 键 / 防具=光谱 / 消耗品=''
  品质: '金色' | '紫色';
  阶位: number;
  核心材料: string;
  行业: string;
}

/** AI 输出 schema：结构化，数值字段必须显式给出，便于硬钳制 */
export const DESIGN_SCHEMA = {
  name: 'craft_blueprint',
  value: {
    type: 'object',
    properties: {
      名称: { type: 'string' },
      描述: { type: 'string' },
      材料: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            类别: { type: 'string' },
            数量: { type: 'number' },
            核心: { type: 'boolean' },
          },
          required: ['类别', '数量', '核心'],
        },
      },
      效果: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            类型: { type: 'string', enum: ['常驻', '触发', '消耗'] },
            描述: { type: 'string' },
            命中闪避: { type: 'number' },
            伤害百分比: { type: 'number' },
            属性加成: { type: 'number' },
            触发条件: { type: 'string' },
            消耗: { type: 'string' },
          },
          required: ['类型', '描述'],
        },
      },
    },
    required: ['名称', '描述', '材料', '效果'],
  },
} as const;

export const COMPLETE_SCHEMA = DESIGN_SCHEMA;

/** 效果强度上限表注入提示词（与 effectRules.EFFECT_CAP 同源，此处为可读文本） */
const CAP_TEXT = [
  '一阶：命中/闪避 +3~6%，伤害 +7~13%，属性/防御加成 +1',
  '二阶：命中/闪避 +5~10%，伤害 +10~20%，属性/防御加成 +2',
  '三阶：命中/闪避 +7~13%，伤害 +13~27%，属性/防御加成 +3',
  '四阶：命中/闪避 +8~17%，伤害 +17~33%，属性/防御加成 +4',
  '五阶：命中/闪避 +10~20%，伤害 +20~40%，属性/防御加成 +6',
].join('\n');

const RULES = `【硬性规则｜违反会被系统拒绝】
1. 效果最多 2 条。
2. 常驻类数值不得超过该阶位上限（见下表）；触发类/消耗类最多为其 2 倍，且必须同时写明「触发条件」与「消耗」。
3. 禁止：无条件即死、永久无敌、无限资源/锁血、无条件必中核心弱点、任何无代价强效果。
4. 品质只能是「金色」或「紫色」；银色为副本唯一剧情物品，不可制作。
5. 材料类别只能取：金属、布料皮革、草药、矿石、能量、怪物素材、食材、火药。
【效果数值上限表】
${CAP_TEXT}`;

export function buildDesignPrompt(目标: DesignTarget): string {
  return `你是《无限回廊》的装备设计系统。根据契约者的要求设计一张制作图纸。

【设计目标】
名称：${目标.名称}
成品类型：${目标.成品类型}${目标.子类 ? `（${目标.子类}）` : ''}
品质：${目标.品质}
阶位：${目标.阶位}阶
行业：${目标.行业}
核心材料：${目标.核心材料}

${RULES}

【输出】只输出 JSON，字段：名称、描述（一两句风味文案，贴合核心材料）、材料（数组，每项含 类别/数量/核心；核心材料必须用「${目标.核心材料}」所属类别，数量 1~3；辅料 1~2 项）、效果（数组，0~2 条，每项含 类型/描述，数值型效果必须给出 命中闪避/伤害百分比/属性加成 中的对应字段）。`;
}

export function buildCompletePrompt(现有: 图纸数据, 阶位: number): string {
  return `你是《无限回廊》的装备设计系统。下面是一张残缺的制作图纸，请你补全缺失的部分（已有且合法的内容不要改动）。

【现有图纸】
${JSON.stringify(现有.配方, null, 2)}

${RULES}

【输出】只输出 JSON，字段同现有图纸结构：名称、描述、材料、效果。缺失的字段补上，已有的合法字段保持原样。`;
}

/** 纯函数硬校验：AI 返回的原始对象 → 合法图纸数据（或拒绝理由） */
export function sanitizeDesign(
  raw: unknown,
  目标: DesignTarget,
): { ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] } {
  const o = (raw ?? {}) as Record<string, any>;
  const reasons: string[] = [];

  const 品质 = String(o.品质 ?? 目标.品质);
  if (品质 === '银色') return { ok: false, reasons: ['银色为副本唯一剧情物品，不可制作'] };
  if (o.品质 && o.品质 !== 目标.品质) reasons.push(`品质被强制回到目标值「${目标.品质}」`);

  const 材料 = Array.isArray(o.材料) ? o.材料 : [];
  if (材料.length === 0) return { ok: false, reasons: [...reasons, '图纸缺少材料清单'] };

  const 效果原始: EffectEntry[] = Array.isArray(o.效果) ? o.效果 : [];
  const 效果检查 = checkEffects(效果原始, 目标.阶位);
  if (!效果检查.ok) return { ok: false, reasons: [...reasons, ...效果检查.reasons] };

  const 配方 = 配方Schema.parse({
    名称: String(o.名称 ?? 目标.名称),
    来源: '图纸',
    行业: 目标.行业,
    成品类型: 目标.成品类型,
    装备子类: 目标.成品类型 === '装备' ? (目标.子类 === '短剑' || 目标.子类 === '巨剑' ? '武器' : '防具') : '',
    品质: 目标.品质,
    阶位: 目标.阶位,
    装备基础: 目标.子类,
    材料: 材料.map((m: any) => ({
      类别: String(m.类别 ?? '任意'),
      数量: Math.max(1, Math.round(Number(m.数量 ?? 1))),
      核心: Boolean(m.核心),
    })),
    技能要求: { 分类: '高级', 等级: 目标.品质 === '金色' ? 1 : 5 },
    效果: 效果检查.效果,
    成品名: String(o.名称 ?? 目标.名称),
  });

  const 数据 = BlueprintDataSchema.parse({ 配方, 制作者: 'AI', 补全: false, 版本: 1 });
  return { ok: true, 数据, clamped: 效果检查.clamped };
}

function activeCfg() {
  return getActiveCfg(useForumStore().settings);
}

export async function generateBlueprint(
  目标: DesignTarget,
): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }> {
  const cfg = activeCfg();
  if (!cfg.url || !cfg.apiKey) return { ok: false, reasons: ['未配置 API——请到「终端设置」配置后再定制图纸'] };
  try {
    const raw = await aiGenerate(cfg, buildDesignPrompt(目标), DESIGN_SCHEMA as any);
    return sanitizeDesign(extractJSON(raw), 目标);
  } catch (e: any) {
    return { ok: false, reasons: [e?.message ?? 'AI 调用失败'] };
  }
}

export async function completeBlueprint(
  现有: 图纸数据,
  阶位: number,
): Promise<{ ok: true; 数据: 图纸数据; clamped: string[] } | { ok: false; reasons: string[] }> {
  const cfg = activeCfg();
  if (!cfg.url || !cfg.apiKey) return { ok: false, reasons: ['未配置 API——请到「终端设置」配置后再补全图纸'] };
  const 目标: DesignTarget = {
    名称: 现有.配方.名称,
    成品类型: 现有.配方.成品类型,
    子类: 现有.配方.装备基础,
    品质: (现有.配方.品质 === '紫色' ? '紫色' : '金色'),
    阶位,
    核心材料: 现有.配方.材料.find(m => m.核心)?.类别 ?? '任意',
    行业: 现有.配方.行业,
  };
  try {
    const raw = await aiGenerate(cfg, buildCompletePrompt(现有, 阶位), COMPLETE_SCHEMA as any);
    const r = sanitizeDesign(extractJSON(raw), 目标);
    if (!r.ok) return r;
    return { ok: true, 数据: { ...r.数据, 补全: true }, clamped: r.clamped };
  } catch (e: any) {
    return { ok: false, reasons: [e?.message ?? 'AI 调用失败'] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/blueprintAI.test.ts`
Expected: PASS（`generateBlueprint`/`completeBlueprint` 不测——依赖酒馆全局，由构建与实机验证）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/blueprintAI.ts src/wxhl-003/crafting/__tests__/blueprintAI.test.ts
git commit -m "feat(wxhl): AI 图纸生成与补全——结构化 schema+硬校验纯函数"
```

---

### Task 5: craft.ts 扩展 —— 金紫绘制、效果落装、缺图纸降档

**Files:**
- Modify: `src/wxhl-003/crafting/craft.ts`
- Test: `src/wxhl-003/crafting/__tests__/craft.test.ts`（追加）

**Interfaces:**
- Consumes: Task 2 `配方.效果`/`装备基础`/`成品名`；v1 既有全部
- Produces: `CraftInput` 新增 `图纸持有: boolean`；`validateCraft` 金紫分支改为「需高级技能+职业+图纸（无图纸则可强行开工走降档）」；`buildEquip` 在品质为金/紫时改用 `配方.装备基础` 取武器类型/光谱、写入 `配方.效果` 到装备 `效果` 字段、成品名优先 `配方.成品名`

- [ ] **Step 1: Write the failing test**

```ts
// 追加到 src/wxhl-003/crafting/__tests__/craft.test.ts
import { validateCraft as vc } from '../craft';
import type { 配方 } from '../recipes';

const 金配方: 配方 = {
  名称: '狼王牙刃', 来源: '图纸', 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
  品质: '金色', 阶位: 3, 装备基础: '短剑', 成品名: '狼王牙刃',
  材料: [{ 类别: '金属', 数量: 2, 核心: true }],
  技能要求: { 分类: '高级', 等级: 1 }, 批量上限: 1,
  效果: [{ 类型: '触发', 描述: '撕咬：命中时附加流血', 伤害百分比: 12, 触发条件: '命中时', 消耗: '每场3次' }],
};

function 金输入(图纸持有: boolean, 技能等级 = 1, 职业名 = '锻造师') {
  const i = makeInput({
    配方: 金配方, 阶位: 3, 子类型: '短剑',
    核心材料: { 物品名: '精铁', 数量: 2 }, 辅料: [],
    图纸持有,
    制作者: {
      ...makeInput().制作者,
      姓名: '老狼', 阶位上限: 5, 职业名,
      技能: { 分类: '高级', 阶位: 5, 等级: 技能等级 },
    },
  });
  return i;
}

describe('金紫制作 · 图纸与降档', () => {
  it('图纸在手 + 高级技能 + 职业 → 可制作', () => {
    expect(vc(金输入(true), { 精铁: { 名称: '精铁', 数量: 9 } } as any)).toEqual([]);
  });
  it('无图纸 → 可强行开工（不阻断），但走降档路径', () => {
    const errs = vc(金输入(false), { 精铁: { 名称: '精铁', 数量: 9 } } as any);
    expect(errs).toEqual([]);
  });
  it('技能等级不足（金需 Lv.1，紫需 Lv.5）→ 阻断', () => {
    const 紫输入 = 金输入(true, 3, '锻造师');
    紫输入.配方 = { ...金配方, 品质: '紫色', 技能要求: { 分类: '高级', 等级: 5 } };
    expect(vc(紫输入, { 精铁: { 名称: '精铁', 数量: 9 } } as any)[0]).toContain('Lv.5');
  });
  it('无对应职业 → 阻断', () => {
    expect(vc(金输入(true, 1, '无'), { 精铁: { 名称: '精铁', 数量: 9 } } as any)[0]).toContain('职业');
  });
  it('金配方成品带效果，且成品名用配方指定名', () => {
    const out = executeCraft(金输入(true), 15, () => 0.5);
    const p = out.新增[0] as any;
    expect(p.名称).toBe('狼王牙刃');
    expect(p.品质).toBe('金色');
    expect(p.效果['撕咬：命中时附加流血']).toContain('流血');
  });
  it('缺图纸时成品降一档', () => {
    const out = executeCraft(金输入(false), 15, () => 0.5);
    expect((out.新增[0] as any).品质).toBe('蓝色');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/craft.test.ts`
Expected: FAIL（`图纸持有` 未在 CraftInput 中 / 金紫仍被 v1 拦截）

- [ ] **Step 3: Write implementation**

`craft.ts` 改动点：

1. `CraftInput` 增加 `图纸持有: boolean`。
2. `validateCraft` 删除 v1 的「金/紫一律拦截」，改为：

```ts
  if (input.配方.品质 === '金色' || input.配方.品质 === '紫色') {
    if (!sk) return [`未掌握生活技能「${input.配方.行业}」`];
    if (input.配方.品质 === '金色' && sk.等级 < 1) errs.push('金色图纸需高级技能 Lv.1');
    if (input.配方.品质 === '紫色' && sk.等级 < 5) errs.push('紫色图纸需高级技能 Lv.5');
    if (!input.制作者.职业名 || input.制作者.职业名 === '无') errs.push('金/紫品质需对应生活系职业');
  }
```

3. `executeCraft` 的 `computeDC` 调用前追加缺图纸修正：

```ts
  const 缺图纸 = (input.配方.品质 === '金色' || input.配方.品质 === '紫色') && !input.图纸持有;
  const 修正 = [
    ...(缺图纸 ? [{ 项: '缺图纸', 值: 5 }] : []),
    ...(input.越阶材料 ? [...] : []), // 既有
    ...
  ];
```

4. `buildEquip` 在 `结果` 为成功/精制/杰作且配方为金/紫时：

```ts
  // 缺图纸：强制降一档（世界书「无则强制降档且基础 DC+5」）
  const 基础品质 = 缺图纸 ? downgrade(input.配方.品质) : input.配方.品质;
  const q = 结果 === '杰作' && !input.设施.仅白色 ? nextQuality(基础品质) : 基础品质;
  // 武器类型/光谱改用配方指定
  const 武器 = input.配方.装备基础 || input.子类型;
  // 效果写入
  const 效果 = Object.fromEntries((input.配方.效果 ?? []).map(e => [e.描述, e.描述]));
  // 名称优先配方.成品名
  const 名称 = input.配方.成品名 || `${core}${词}`;
```

新增局部函数 `downgrade(q: Quality): Quality`（金→蓝、紫→金，白/蓝原样）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/craft.test.ts`
Expected: PASS（含 v1 既有 23 例；v1 中「金/紫一律拦截」的测试需同步改为新语义——若该测试存在，改为断言「图纸在手时可制作」）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/craft.ts src/wxhl-003/crafting/__tests__/craft.test.ts
git commit -m "feat(wxhl): 金紫制作打通——图纸校验/缺图纸降档/效果落装"
```

---

### Task 6: store.ts 扩展 —— 配方库持久化与图纸动作

**Files:**
- Modify: `src/wxhl-003/crafting/store.ts`

**Interfaces:**
- Consumes: Task 3 `blueprint.ts` 全部、Task 4 `blueprintAI.ts` 全部、v1 既有
- Produces（Task 7 消费）：
  - state：`配方库: Ref<配方库>`、`背包图纸: ComputedRef<{ 物品名: string; 数据: 图纸数据 }[]>`、`designing: Ref<boolean>`、`completing: Ref<boolean>`
  - `allRecipes` 改为 `computed(() => [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES, ...Object.values(配方库.value)])`
  - `async designBlueprint(目标: DesignTarget): Promise<boolean>`（生成→标价→确认→扣 UP→图纸入包）
  - `async completeBp(物品名: string): Promise<boolean>`
  - `async uploadBp(物品名: string): Promise<boolean>`
  - `deleteRecipe(名称: string): void`

- [ ] **Step 1: Write implementation**

持久化（扩展 v1 的聊天变量读写，**读-并-写保留材料档案**）：

```ts
const CHAT_KEY = 'wxhl003_crafting';

function loadChatState(): { 材料档案: Record<string, 材料档案条目>; 配方库: 配方库 } {
  try {
    const vars = getVariables({ type: 'chat' }) as any;
    const s = vars?.[CHAT_KEY] ?? {};
    return { 材料档案: s.材料档案 ?? {}, 配方库: s.配方库 ?? {} };
  } catch (_) {
    return { 材料档案: {}, 配方库: {} };
  }
}
```

watchEffect 改为同时写两个 key：

```ts
  watchEffect(() => {
    try {
      const vars = (getVariables({ type: 'chat' }) ?? {}) as any;
      replaceVariables(
        { ...vars, [CHAT_KEY]: { ...(vars?.[CHAT_KEY] ?? {}), 材料档案: klona(codex.value), 配方库: klona(配方库.value) } },
        { type: 'chat' },
      );
    } catch (_) {}
  });
```

图纸动作（照 v1 `doCraft` 的「先本地算 → 一次 commit」模式）：

```ts
  async function uploadBp(物品名: string): Promise<boolean> {
    const r = readContractor();
    if (!r) return false;
    const res = uploadBlueprint(bag.value, 物品名, 配方库.value);
    if ('error' in res) {
      lastError.value = res.error;
      toastr.error(res.error);
      return false;
    }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], res.bag as any);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '背包'], res.bag]]);
    配方库.value = res.配方库;
    syncFromMvu();
    toastr.success(`已掌握配方「${Object.keys(res.配方库).slice(-1)[0]}」`);
    return true;
  }
```

`designBlueprint` 流程：`generateBlueprint(目标)` → 失败 toastr+lastError → 成功则 `blueprintPrice(...)` 算价 → `window.confirm` 展示价格与效果摘要 → `spendUP` 校验 → 图纸物品 `bagAdd`（描述=效果摘要，`图纸数据`=数据）→ 一次 commit（背包+UP）→ `syncFromMvu`。

`completeBp` 流程：`readBlueprint` → `completeBlueprint(数据, 阶位)` → 成功则 `writeBlueprint` 回写 → commit → toastr 显示钳制记录。

`deleteRecipe(名称)`：从 `配方库` 删除（watchEffect 自动落盘），`window.confirm` 二次确认。

- [ ] **Step 2: Type-check via build**

Run: `pnpm build`
Expected: 零 error

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-003/crafting/store.ts
git commit -m "feat(wxhl): 工坊 store 扩展——配方库持久化/AI定制/补全/上传/删除"
```

---

### Task 7: CraftingView.vue —— 折叠双列表 + 图纸区

**Files:**
- Modify: `src/wxhl-003/crafting/CraftingView.vue`

**Interfaces:**
- Consumes: Task 6 store 全部导出；v1 既有

- [ ] **Step 1: 配方页改为三个折叠区**

```
▸ 基础配方（N）      ← 默认展开，只读：TEMPLATE + STANDARD
▸ 我的配方（N）      ← 默认展开：已上传配方卡 + 「删除」按钮
▸ 背包图纸（N）      ← 背包里未上传的图纸：每张「补全词条」+「上传学习」（同名已掌握则置灰提示）
```

折叠用 `ref<Record<string, boolean>>` 控制 `v-show`，标题行带 `▾/▸`。

- [ ] **Step 2: 顶部「AI 定制图纸」入口**

表单：名称 / 成品类型（装备|消耗品）/ 子类（装备时：武器类型或防具光谱）/ 品质（金|紫）/ 阶位（1~5）/ 核心材料（文本，默认取背包第一个未分类材料名）/ 行业。
提交 → `store.designBlueprint(目标)`；`store.designing` 时按钮显示「AI 设计中…」并禁用。

- [ ] **Step 3: 制作页图纸提示**

选中的配方若 `来源 === '图纸'`，显示「图纸状态：已掌握」；制作页不再需要选图纸（已上传即视为掌握），`doCraft` 传 `图纸持有: true`。

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: 零 error

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/CraftingView.vue
git commit -m "feat(wxhl): 配方页折叠双列表+图纸区（定制/补全/上传/删除）"
```

---

### Task 8: 全量回归

- [ ] **Step 1:** `pnpm test` → 全绿
- [ ] **Step 2:** `pnpm build` → 零 error
- [ ] **Step 3:** 提交（若有残留改动）

---

## Self-Review 记录

- **Spec coverage**：图纸三层结构（spec §7）→ T2/T3/T4；定价公式（§7.1）→ T3；AI 硬钳制（§7 第 3 步）→ T1/T4；金紫制作（§6.1）→ T5；配方库持久化（§4）→ T6；UI（§11）→ T7。用户新增要求：折叠双列表 → T7；同名禁止上传 → T3 `uploadBlueprint`；补全词条 → T4 `completeBlueprint` + T6/T7；上传后脱离背包不可倒卖 → T3（`bagRemove` 扣物）+ T7（配置项说明）。
- **Placeholder scan**：无 TBD；T5/T6/T7 为增量改动，给出了确切改动点与新签名，未逐字重抄既有文件（既有代码在仓库中，执行者可读）。
- **Type consistency**：`图纸数据`/`配方库`/`EffectEntry`/`DesignTarget` 跨 T1→T2→T3→T4→T6→T7 一致；`CraftInput.图纸持有` 在 T5 定义、T6/T7 传入。
- **已知风险**：T5 需同步修改 v1 中「金/紫一律拦截」的既有测试；T4 的正则违禁检测可能误伤（如"无敌"出现在风味描述里）——已通过要求条件+消耗共存来降低误伤，实机若误伤可放宽正则。
