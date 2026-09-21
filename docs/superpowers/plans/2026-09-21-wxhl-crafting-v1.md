# 工坊 app v1（制作台核心）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在小手机（wxhl-003）新增「工坊」app：配方库 + 材料档案 + DC 检定五档制作 + 成品写入 MVU 背包，白/蓝品质，零 AI 调用。

**Architecture:** 纯函数核心（equipTables/recipes/craft 三模块，vitest 全覆盖）+ pinia store（聊天变量持久化材料档案，MVU 照 market 的 writeToSave 模式写入）+ Vue 组件挂手机桌面新图标。主卡 MVU schema 零改动。

**Tech Stack:** TypeScript / Vue 3 (script setup) / pinia / zod 4 / vitest / lodash(`_` 全局)

**Spec:** `docs/superpowers/specs/2026-09-21-wxhl-crafting-workshop-design.md`（v1 范围见 spec §12）

## Global Constraints

- **auto-import 约定**：源码中 `vue`/`pinia`/`z`(zod)/`klona` 无需 import（webpack + vitest 均已配置 unpluginAutoImport）；`_`/`$`/`toastr`/`Mvu`/`getVariables`/`replaceVariables`/`getCurrentMessageId` 为运行时全局（vitest 由 `src/wxhl-003/__tests__/setup.ts` 注入 `_`）。测试文件只 import `vitest` 和被测模块。
- **测试命令**：`pnpm test`（vitest run）；构建命令：`pnpm build`（webpack production，必须零 error）。
- **MVU 写入模式**（照 `src/wxhl-003/market/store.ts`）：楼层探测 → `_.set` → `Mvu.replaceMvuData` → 回读校验，回读不上仅 `toastr.warning`。
- **背包操作**：复用 `src/wxhl-003/market/settle.ts` 的 `bagAdd`/`bagRemove`（数量不足抛错、扣光删条目），物品快照类型用 `src/wxhl-003/market/priceTable.ts` 的 `MarketItemSnapshot`。
- **世界书公式逐字移植**，设计填补处必须注释标明（世界书未列的档位：防具蓝色/中装取相邻档平均向下取整、副属性门槛=主门槛/2 向下取整、消耗品固定值/阶位倍率等）。
- **v1 边界**：仅白/蓝品质；金/紫一律由 `validateCraft` 拦截提示"图纸系统 v2 开放"；不调 `generate`；成品装备 `效果` 恒为空 record；银色不可出现在任何配方。
- 成品装备 `类型` 字段必须恰好是 `武器`/`防具`/`饰品` 之一（市场 `isEquip` 依赖此三值）。
- 中文键名与 spec §4 变量读写清单一字不差。

---

### Task 1: equipTables.ts —— 装备数值表移植

**Files:**
- Create: `src/wxhl-003/crafting/equipTables.ts`
- Test: `src/wxhl-003/crafting/__tests__/equipTables.test.ts`

**Interfaces:**
- Consumes: 无
- Produces（后续任务依赖的确切签名）:
  - `type Quality = '白色' | '蓝色' | '金色' | '紫色'`、`type Attr = 'STR'|'AGI'|'CON'|'PER'`、`type ArmorSpectrum = '极轻'|'轻装'|'中装'|'重装'|'极重'`
  - `Q_ORDER: readonly Quality[]`、`TIER_NAMES: readonly string[]`、`TIER_COEF / TIER_DEF_MULT / TIER_WEIGHT_MULT: readonly number[]`（下标=阶位，0 不用）
  - `nextQuality(q: Quality): Quality`（紫→紫）
  - `upgradeDice(face: number, steps: number): number`
  - `WEAPON_TABLE: Record<string, readonly WeaponRow[]>`（键=武器类型名）
  - `weaponStats(武器: string, 阶位: number, 品质: Quality): { 伤害骰: string; 倍率: number; 负重: number }`
  - `armorStats(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): { 装备防御: number; 装备闪避: number; 负重: number }`
  - `attrBonus(kind: '武器'|'躯干'|'饰品', 阶位: number, 品质: Quality): { 主: number; 副: number }`
  - `wearThreshold(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): string`
  - `ARMOR_NAME: Record<ArmorSpectrum, string>`（防具命名后缀）

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/equipTables.test.ts
import { describe, expect, it } from 'vitest';
import { armorStats, attrBonus, nextQuality, upgradeDice, weaponStats, wearThreshold } from '../equipTables';

describe('upgradeDice · 骰面升级路径', () => {
  it('沿路径推进并在 d40 封顶', () => {
    expect(upgradeDice(6, 2)).toBe(10);
    expect(upgradeDice(6, 1)).toBe(8);
    expect(upgradeDice(40, 3)).toBe(40);
    expect(upgradeDice(20, 2)).toBe(40);
  });
  it('非法骰面抛错', () => {
    expect(() => upgradeDice(7, 1)).toThrow();
  });
});

describe('weaponStats · 世界书示例锚点', () => {
  it('金色三阶短剑 = 6d10/0.75/2.7kg（世界书原文示例）', () => {
    expect(weaponStats('短剑', 3, '金色')).toEqual({ 伤害骰: '6d10', 倍率: 0.75, 负重: 2.7 });
  });
  it('蓝色五阶重型狙击 = 14d10/0.5/24.0kg（世界书原文示例）', () => {
    expect(weaponStats('重型狙击', 5, '蓝色')).toEqual({ 伤害骰: '14d10', 倍率: 0.5, 负重: 24 });
  });
  it('白色一阶巨剑 = 3d12/1.5/6kg（品质不升骰）', () => {
    expect(weaponStats('巨剑', 1, '白色')).toEqual({ 伤害骰: '3d12', 倍率: 1.5, 负重: 6 });
  });
  it('未知武器抛错', () => {
    expect(() => weaponStats('圣剑', 1, '白色')).toThrow();
  });
});

describe('armorStats · 防闪基准 × 阶位倍率(1/2/4/7/11)', () => {
  it('轻装一阶金：防3闪3 负重2', () => {
    expect(armorStats('轻装', 1, '金色')).toEqual({ 装备防御: 3, 装备闪避: 3, 负重: 2 });
  });
  it('轻装三阶金：×4 → 防12闪12 负重3.6', () => {
    expect(armorStats('轻装', 3, '金色')).toEqual({ 装备防御: 12, 装备闪避: 12, 负重: 3.6 });
  });
  it('中装一阶紫：相邻档平均填补 → 防8闪0', () => {
    expect(armorStats('中装', 1, '紫色')).toEqual({ 装备防御: 8, 装备闪避: 0, 负重: 4 });
  });
});

describe('attrBonus · 主属性加成基准（副=主×0.5 向下取整）', () => {
  it('武器三阶紫：主8副4', () => {
    expect(attrBonus('武器', 3, '紫色')).toEqual({ 主: 8, 副: 4 });
  });
  it('躯干一阶金：主1副0', () => {
    expect(attrBonus('躯干', 1, '金色')).toEqual({ 主: 1, 副: 0 });
  });
  it('饰品五阶蓝：主5副2', () => {
    expect(attrBonus('饰品', 5, '蓝色')).toEqual({ 主: 5, 副: 2 });
  });
});

describe('wearThreshold · 穿戴门槛', () => {
  it('轻装一阶蓝：主≥7 副≥3', () => {
    expect(wearThreshold('轻装', 1, '蓝色')).toBe('主属性≥7，副属性≥3');
  });
  it('重装三阶金：(12+40)=52 / 26', () => {
    expect(wearThreshold('重装', 3, '金色')).toBe('主属性≥52，副属性≥26');
  });
  it('极轻按轻装档、极重按重装档', () => {
    expect(wearThreshold('极轻', 1, '白色')).toBe('主属性≥5，副属性≥2');
    expect(wearThreshold('极重', 1, '白色')).toBe('主属性≥8，副属性≥4');
  });
});

describe('nextQuality', () => {
  it('递进且紫封顶', () => {
    expect(nextQuality('白色')).toBe('蓝色');
    expect(nextQuality('紫色')).toBe('紫色');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/equipTables.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/equipTables.ts
// ================================================================
// 世界书《装备与消耗品系统》数值表移植（工坊专用）
// 设计填补（世界书未列明，均为可调常量）：
//   - 防具「蓝色」与「中装」基准 = 相邻两档平均，向下取整
//   - 副属性穿戴门槛 = 主门槛/2 向下取整
//   - 防具负重基准 ARMOR_WEIGHT_BASE（世界书只给了阶位负重倍率）
// ================================================================

export type Quality = '白色' | '蓝色' | '金色' | '紫色';
export type Attr = 'STR' | 'AGI' | 'CON' | 'PER';
export type ArmorSpectrum = '极轻' | '轻装' | '中装' | '重装' | '极重';

export const Q_ORDER: readonly Quality[] = ['白色', '蓝色', '金色', '紫色'];
export const TIER_NAMES = ['一阶', '二阶', '三阶', '四阶', '五阶'] as const;
/** 阶位系数 x²（经济/消耗品通用） */
export const TIER_COEF = [0, 1, 4, 9, 16, 25] as const;
/** 防具防闪阶位倍率（世界书：1、2、4、7、11） */
export const TIER_DEF_MULT = [0, 1, 2, 4, 7, 11] as const;
/** 阶位负重倍率（世界书：×1.0/1.4/1.8/2.2/3.0） */
export const TIER_WEIGHT_MULT = [0, 1, 1.4, 1.8, 2.2, 3.0] as const;

export function nextQuality(q: Quality): Quality {
  return Q_ORDER[Math.min(Q_ORDER.indexOf(q) + 1, Q_ORDER.length - 1)];
}

const DICE_PATH = [4, 6, 8, 10, 12, 20, 40] as const;
export function upgradeDice(face: number, steps: number): number {
  const i = DICE_PATH.indexOf(face as (typeof DICE_PATH)[number]);
  if (i === -1) throw new Error(`非法骰面 d${face}`);
  return DICE_PATH[Math.min(i + steps, DICE_PATH.length - 1)];
}
const QUALITY_DICE_UP: Record<Quality, number> = { 白色: 0, 蓝色: 1, 金色: 2, 紫色: 3 };

// ---- 武器：白色全阶位速查表 [骰数, 骰面, 倍率, 负重kg]，下标=阶位（0 不用）----
type WeaponRow = readonly [number, number, number, number];
const Z: WeaponRow = [0, 0, 0, 0];
export const WEAPON_TABLE: Record<string, readonly WeaponRow[]> = {
  徒手:     [Z, [1, 4, 0.5, 0],     [3, 4, 0.5, 0],     [5, 4, 0.5, 0],     [7, 4, 0.5, 0],     [11, 4, 0.5, 0]],
  匕首短棍: [Z, [1, 6, 0.5, 0.5],   [3, 6, 0.5, 0.7],   [5, 6, 0.5, 0.9],   [7, 6, 0.5, 1.1],   [11, 6, 0.5, 1.5]],
  短剑:     [Z, [2, 6, 0.75, 1.5],  [4, 6, 0.75, 2.1],  [6, 6, 0.75, 2.7],  [8, 6, 0.75, 3.3],  [12, 6, 0.75, 4.5]],
  长剑战斧: [Z, [2, 8, 1.0, 3],     [4, 8, 1.0, 4.2],   [6, 8, 1.0, 5.4],   [8, 8, 1.0, 6.6],   [12, 8, 1.0, 9.0]],
  巨剑:     [Z, [3, 12, 1.5, 6],    [5, 12, 1.5, 8.4],  [7, 12, 1.5, 10.8], [9, 12, 1.5, 13.2], [13, 12, 1.5, 18.0]],
  突击步枪: [Z, [3, 6, 0.5, 4],     [5, 6, 0.5, 5.6],   [7, 6, 0.5, 7.2],   [9, 6, 0.5, 8.8],   [13, 6, 0.5, 12.0]],
  重型狙击: [Z, [4, 8, 0.5, 8],     [6, 8, 0.5, 11.2],  [8, 8, 0.5, 14.4],  [10, 8, 0.5, 17.6], [14, 8, 0.5, 24.0]],
  魔杖:     [Z, [1, 8, 0.75, 0.5],  [3, 8, 0.75, 0.7],  [5, 8, 0.75, 0.9],  [7, 8, 0.75, 1.1],  [11, 8, 0.75, 1.5]],
  法杖:     [Z, [2, 8, 1.0, 2],     [4, 8, 1.0, 2.8],   [6, 8, 1.0, 3.6],   [8, 8, 1.0, 4.4],   [12, 8, 1.0, 6.0]],
};

export interface WeaponStats {
  伤害骰: string;
  倍率: number;
  负重: number;
}
export function weaponStats(武器: string, 阶位: number, 品质: Quality): WeaponStats {
  const row = WEAPON_TABLE[武器]?.[阶位] as WeaponRow | undefined;
  if (!row) throw new Error(`未知武器或阶位：${武器} ${阶位}阶`);
  const [count, face, 倍率, 负重] = row;
  return { 伤害骰: `${count}d${upgradeDice(face, QUALITY_DICE_UP[品质])}`, 倍率, 负重 };
}

// ---- 防具：一阶基准 [防御, 闪避]；蓝/中装为相邻档平均向下取整（设计填补）----
const ARMOR_BASE: Record<ArmorSpectrum, Record<Quality, readonly [number, number]>> = {
  极轻: { 白色: [-1, 3], 蓝色: [-2, 4], 金色: [-2, 6], 紫色: [-3, 9] },
  轻装: { 白色: [1, 2],  蓝色: [2, 2],  金色: [3, 3],  紫色: [5, 4] },
  中装: { 白色: [2, 0],  蓝色: [4, 0],  金色: [5, 0],  紫色: [8, 0] },
  重装: { 白色: [4, -1], 蓝色: [6, -2], 金色: [8, -2], 紫色: [12, -3] },
  极重: { 白色: [5, -2], 蓝色: [7, -3], 金色: [10, -3], 紫色: [15, -4] },
};
/** 防具负重基准（设计填补：世界书未给防具基础负重） */
const ARMOR_WEIGHT_BASE: Record<ArmorSpectrum, number> = { 极轻: 1, 轻装: 2, 中装: 4, 重装: 6, 极重: 9 };

export interface ArmorStats {
  装备防御: number;
  装备闪避: number;
  负重: number;
}
export function armorStats(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): ArmorStats {
  const base = ARMOR_BASE[光谱][品质];
  const mult = TIER_DEF_MULT[阶位];
  const wmult = TIER_WEIGHT_MULT[阶位];
  if (base === undefined || mult === undefined || wmult === undefined) {
    throw new Error(`未知防具参数：${光谱} ${阶位}阶`);
  }
  return {
    装备防御: base[0] * mult,
    装备闪避: base[1] * mult,
    负重: Math.round(ARMOR_WEIGHT_BASE[光谱] * wmult * 10) / 10,
  };
}

// ---- 主属性加成基准 [白,蓝,金,紫]，下标=阶位；副=主×0.5 向下取整 ----
const ATTR_BONUS: Record<'武器' | '躯干' | '饰品', readonly (readonly [number, number, number, number])[]> = {
  武器: [[0, 0, 0, 0], [1, 1, 2, 3], [1, 2, 3, 5], [2, 4, 5, 8], [4, 6, 9, 13], [6, 9, 12, 18]],
  躯干: [[0, 0, 0, 0], [0, 0, 1, 2], [1, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 7], [3, 5, 6, 10]],
  饰品: [[0, 0, 0, 0], [0, 0, 1, 1], [1, 1, 2, 3], [1, 2, 3, 5], [2, 3, 5, 8], [3, 5, 7, 11]],
};
export function attrBonus(kind: '武器' | '躯干' | '饰品', 阶位: number, 品质: Quality): { 主: number; 副: number } {
  const row = ATTR_BONUS[kind][阶位];
  if (!row) throw new Error(`未知加成参数：${kind} ${阶位}阶`);
  const 主 = row[Q_ORDER.indexOf(品质)];
  return { 主, 副: Math.floor(主 * 0.5) };
}

// ---- 穿戴门槛：一阶基准 + 跨阶递增(+20/阶)；蓝/副属性为填补 ----
const THRESHOLD_BASE: Record<'轻装' | '中装' | '重装', Record<Quality, number>> = {
  轻装: { 白色: 5, 蓝色: 7, 金色: 9, 紫色: 12 },
  中装: { 白色: 6, 蓝色: 8, 金色: 10, 紫色: 14 },
  重装: { 白色: 8, 蓝色: 10, 金色: 12, 紫色: 16 },
};
const TIER_THRESHOLD_ADD = [0, 0, 20, 40, 60, 80] as const;
export function wearThreshold(光谱: ArmorSpectrum, 阶位: number, 品质: Quality): string {
  const 档 = 光谱 === '极轻' || 光谱 === '轻装' ? '轻装' : 光谱 === '中装' ? '中装' : '重装';
  const v = THRESHOLD_BASE[档][品质] + TIER_THRESHOLD_ADD[阶位];
  return `主属性≥${v}，副属性≥${Math.floor(v / 2)}`;
}

/** 防具命名后缀（核心材料名 + 此词 = 成品名） */
export const ARMOR_NAME: Record<ArmorSpectrum, string> = {
  极轻: '薄甲',
  轻装: '轻甲',
  中装: '锁甲',
  重装: '重甲',
  极重: '堡垒甲',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/equipTables.test.ts`
Expected: PASS（全部 15 例）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/equipTables.ts src/wxhl-003/crafting/__tests__/equipTables.test.ts
git commit -m "feat(wxhl): 工坊装备数值表移植——武器骰表/防闪/加成/门槛（世界书锚点测试）"
```

---

### Task 2: recipes.ts —— 配方 schema、材料分类词典、内置配方

**Files:**
- Create: `src/wxhl-003/crafting/recipes.ts`
- Test: `src/wxhl-003/crafting/__tests__/recipes.test.ts`

**Interfaces:**
- Consumes: `Quality`, `Attr`（来自 Task 1 `./equipTables`）
- Produces:
  - `材料类别`（const 数组）、`type MaterialCategory`、`type 行业`
  - `材料需求Schema`、`配方Schema`、`type 配方 = z.infer<typeof 配方Schema>`
  - `interface 材料档案条目 { 类别: MaterialCategory | '未分类'; 品质: Quality; 阶位: number }`
  - `启发式归类(物品名: string): MaterialCategory | '未分类'`
  - `INDUSTRY_ATTR: Record<行业, readonly Attr[]>`（烹饪为 `['CON','PER']`，制作时取高）
  - `TEMPLATE_RECIPES: 配方[]`（6 个：锻造武器/锻造重甲/裁缝轻甲 × 白蓝；阶位字段=1 仅为默认，制作时由玩家选）
  - `STANDARD_GOODS_RECIPES: 配方[]`（14 个标准道具）
  - `GOODS_BASE: Record<string, { 类别: '恢复HP'|'恢复MP'|'状态'|'弹药'|'餐食'|'爆炸物'|'陷阱'; 固定值: number; 关联属性: 'PER'|'CON' }>`（固定值为设计填补）

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/recipes.test.ts
import { describe, expect, it } from 'vitest';
import { 启发式归类, 配方Schema, STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES } from '../recipes';

describe('启发式归类 · 材料分类词典', () => {
  it('怪物素材/草药/金属/火药', () => {
    expect(启发式归类('深渊魔狼王的牙')).toBe('怪物素材');
    expect(启发式归类('月光草')).toBe('草药');
    expect(启发式归类('精铁')).toBe('金属');
    expect(启发式归类('振金')).toBe('金属');
    expect(启发式归类('秘制火药')).toBe('火药');
  });
  it('无法归类返回未分类', () => {
    expect(启发式归类('？？？')).toBe('未分类');
  });
});

describe('内置配方合法性', () => {
  it('模板配方全部通过配方Schema', () => {
    for (const r of TEMPLATE_RECIPES) expect(() => 配方Schema.parse(r)).not.toThrow();
  });
  it('标准道具配方全部通过配方Schema', () => {
    for (const r of STANDARD_GOODS_RECIPES) expect(() => 配方Schema.parse(r)).not.toThrow();
  });
  it('行业覆盖：模板管锻造/裁缝，标准管炼金/工程/烹饪', () => {
    expect(new Set(TEMPLATE_RECIPES.map(r => r.行业))).toEqual(new Set(['锻造', '裁缝']));
    expect(new Set(STANDARD_GOODS_RECIPES.map(r => r.行业))).toEqual(new Set(['炼金', '工程', '烹饪']));
  });
  it('v1 只有白/蓝品质，且无银色', () => {
    for (const r of [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]) {
      expect(['白色', '蓝色']).toContain(r.品质);
    }
  });
  it('蓝色配方要求基础技能 Lv.3，白色 Lv.1', () => {
    for (const r of [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]) {
      expect(r.技能要求.分类).toBe('基础');
      expect(r.技能要求.等级).toBe(r.品质 === '白色' ? 1 : 3);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/recipes.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/recipes.ts
// ================================================================
// 配方 zod schema + 材料分类词典 + 内置配方（模板/标准）
// 设计填补：GOODS_BASE 固定值、启发式词典内容均为可调初值
// ================================================================
import type { Attr, Quality } from './equipTables';

export const 材料类别 = ['金属', '布料皮革', '草药', '矿石', '能量', '怪物素材', '食材', '火药', '任意'] as const;
export type MaterialCategory = (typeof 材料类别)[number];
export const 行业列表 = ['锻造', '裁缝', '炼金', '工程', '烹饪'] as const;
export type 行业 = (typeof 行业列表)[number];

export const 材料需求Schema = z.object({
  类别: z.enum(材料类别),
  数量: z.coerce.number(),
  核心: z.boolean().prefault(false),
});

export const 配方Schema = z.object({
  名称: z.string(),
  来源: z.enum(['模板', '标准', '图纸', '自定义']),
  行业: z.enum(行业列表),
  成品类型: z.enum(['装备', '消耗品']),
  装备子类: z.enum(['武器', '防具', '饰品']).or(z.literal('')).prefault(''),
  品质: z.enum(['白色', '蓝色', '金色', '紫色']),
  阶位: z.coerce.number().prefault(1), // 模板配方仅为默认值，制作时由玩家选择
  材料: z.array(材料需求Schema),
  技能要求: z.object({
    分类: z.enum(['基础', '高级']),
    等级: z.coerce.number(),
  }),
  批量上限: z.coerce.number().prefault(1),
});
export type 配方 = z.infer<typeof 配方Schema>;

/** 材料档案：物品名 → 归类（存小手机聊天变量，玩家可手动修正） */
export interface 材料档案条目 {
  类别: MaterialCategory | '未分类';
  品质: Quality;
  阶位: number;
}

// ---- 启发式词典（可调；命中即归，按数组顺序先匹配火药防"药"字误伤）----
const CATEGORY_KEYWORDS: readonly (readonly [MaterialCategory, readonly string[]])[] = [
  ['火药', ['火药', '炸药', '硝', '硫磺', '引线']],
  ['金属', ['铁', '钢', '铜', '银', '金', '铝', '钛', '合金', '振金', '秘银', '精金', '金属']],
  ['怪物素材', ['牙', '鳞', '骨', '角', '爪', '血', '眼', '筋', '尾巴', '甲壳', '毒囊', '内丹', '魔核']],
  ['草药', ['草', '花', '藤', '根', '叶', '药草', '灵草', '苔', '蘑菇', '菌']],
  ['矿石', ['矿', '晶', '宝石', '钻', '翡翠', '玛瑙', '水晶']],
  ['能量', ['能量', '电池', '核心', '魔力', '结晶', '燃料', '瓦斯']],
  ['食材', ['肉', '米', '面', '鱼', '蛋', '菜', '果', '粮', '调料', '香料']],
  ['布料皮革', ['布', '皮', '革', '丝绸', '绒', '纤维', '织物']],
];

export function 启发式归类(物品名: string): MaterialCategory | '未分类' {
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (words.some(w => 物品名.includes(w))) return cat;
  }
  return '未分类';
}

/** 行业 → 检定用基础属性（数组形式，烹饪 CON/PER 取高——世界书原文未指定取法，设计决定） */
export const INDUSTRY_ATTR: Record<行业, readonly Attr[]> = {
  锻造: ['STR'],
  裁缝: ['AGI'],
  炼金: ['PER'],
  工程: ['PER'],
  烹饪: ['CON', 'PER'],
};

// ---- 内置模板配方（装备；阶位制作时可选，子类型制作时可选）----
export const TEMPLATE_RECIPES: 配方[] = (['白色', '蓝色'] as const).flatMap(品质 => {
  const 技能要求 = { 分类: '基础' as const, 等级: 品质 === '白色' ? 1 : 3 };
  return [
    配方Schema.parse({
      名称: `锻造·武器（${品质}）`, 来源: '模板', 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
      品质, 材料: [{ 类别: '金属', 数量: 2, 核心: true }, { 类别: '任意', 数量: 3, 核心: false }], 技能要求,
    }),
    配方Schema.parse({
      名称: `锻造·重甲（${品质}）`, 来源: '模板', 行业: '锻造', 成品类型: '装备', 装备子类: '防具',
      品质, 材料: [{ 类别: '金属', 数量: 3, 核心: true }, { 类别: '布料皮革', 数量: 1, 核心: false }], 技能要求,
    }),
    配方Schema.parse({
      名称: `裁缝·轻甲（${品质}）`, 来源: '模板', 行业: '裁缝', 成品类型: '装备', 装备子类: '防具',
      品质, 材料: [{ 类别: '布料皮革', 数量: 2, 核心: true }, { 类别: '任意', 数量: 2, 核心: false }], 技能要求,
    }),
  ];
});

// ---- 内置标准道具配方（消耗品；照抄世界书物价表商品）----
const goods = (
  名称: string, 行业: 行业, 品质: '白色' | '蓝色',
  材料: { 类别: MaterialCategory; 数量: number; 核心?: boolean }[],
  批量上限: number,
): 配方 =>
  配方Schema.parse({
    名称, 来源: '标准', 行业, 成品类型: '消耗品', 品质,
    材料, 技能要求: { 分类: '基础', 等级: 品质 === '白色' ? 1 : 3 }, 批量上限,
  });

export const STANDARD_GOODS_RECIPES: 配方[] = [
  goods('基础治疗药剂', '炼金', '白色', [{ 类别: '草药', 数量: 2, 核心: true }], 5),
  goods('强效治疗药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 3, 核心: true }], 5),
  goods('基础精神药剂', '炼金', '白色', [{ 类别: '草药', 数量: 2, 核心: true }], 5),
  goods('强效精神药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 3, 核心: true }], 5),
  goods('净化药剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 2, 核心: true }, { 类别: '矿石', 数量: 1 }], 5),
  goods('万能解毒剂', '炼金', '蓝色', [{ 类别: '草药', 数量: 2, 核心: true }, { 类别: '怪物素材', 数量: 1 }], 5),
  goods('普通弹药20发', '工程', '白色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '火药', 数量: 1 }], 5),
  goods('穿甲弹药20发', '工程', '蓝色', [{ 类别: '金属', 数量: 2, 核心: true }, { 类别: '火药', 数量: 1 }], 5),
  goods('元素弹药20发', '工程', '蓝色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '能量', 数量: 1 }, { 类别: '火药', 数量: 1 }], 5),
  goods('战时干粮', '烹饪', '白色', [{ 类别: '食材', 数量: 2, 核心: true }], 3),
  goods('增益餐食', '烹饪', '蓝色', [{ 类别: '食材', 数量: 3, 核心: true }], 3),
  goods('制式爆炸物', '工程', '白色', [{ 类别: '火药', 数量: 2, 核心: true }, { 类别: '金属', 数量: 1 }], 3),
  goods('烈性爆炸物', '工程', '蓝色', [{ 类别: '火药', 数量: 3, 核心: true }, { 类别: '能量', 数量: 1 }], 3),
  goods('绊线陷阱', '工程', '白色', [{ 类别: '金属', 数量: 1, 核心: true }, { 类别: '布料皮革', 数量: 1 }], 3),
];

// ---- 消耗品数值基准（设计填补：世界书只给公式框架，固定值为可调初值）----
export const GOODS_BASE: Record<string, {
  类别: '恢复HP' | '恢复MP' | '状态' | '弹药' | '餐食' | '爆炸物' | '陷阱';
  固定值: number;
  关联属性: 'PER' | 'CON';
}> = {
  基础治疗药剂: { 类别: '恢复HP', 固定值: 20, 关联属性: 'PER' },
  强效治疗药剂: { 类别: '恢复HP', 固定值: 50, 关联属性: 'PER' },
  基础精神药剂: { 类别: '恢复MP', 固定值: 25, 关联属性: 'PER' },
  强效精神药剂: { 类别: '恢复MP', 固定值: 55, 关联属性: 'PER' },
  净化药剂: { 类别: '状态', 固定值: 0, 关联属性: 'PER' },
  万能解毒剂: { 类别: '状态', 固定值: 0, 关联属性: 'PER' },
  普通弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  穿甲弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  元素弹药20发: { 类别: '弹药', 固定值: 0, 关联属性: 'PER' },
  战时干粮: { 类别: '餐食', 固定值: 0, 关联属性: 'CON' },
  增益餐食: { 类别: '餐食', 固定值: 0, 关联属性: 'CON' },
  制式爆炸物: { 类别: '爆炸物', 固定值: 0, 关联属性: 'PER' },
  烈性爆炸物: { 类别: '爆炸物', 固定值: 0, 关联属性: 'PER' },
  绊线陷阱: { 类别: '陷阱', 固定值: 0, 关联属性: 'PER' },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/recipes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/recipes.ts src/wxhl-003/crafting/__tests__/recipes.test.ts
git commit -m "feat(wxhl): 工坊配方 schema+材料分类词典+内置配方（模板6+标准道具14）"
```

---

### Task 3: craft.ts —— DC 计算、五档判定、制作执行

**Files:**
- Create: `src/wxhl-003/crafting/craft.ts`
- Test: `src/wxhl-003/crafting/__tests__/craft.test.ts`

**Interfaces:**
- Consumes: Task 1（`equipTables` 全部表与类型）、Task 2（`配方`/`材料档案条目`/`INDUSTRY_ATTR`/`GOODS_BASE`/`MaterialCategory`）、`../market/priceTable` 的 `MarketItemSnapshot`、`../market/settle` 的 `Bag`
- Produces:
  - `type CraftResult = '大失败'|'失败'|'成功'|'精制'|'杰作'`
  - `interface DCBreakdown { 基础: number; 修正: { 项: string; 值: number }[]; 最终: number }`
  - `computeDC(品质: Quality, 阶位: number, 修正: { 项: string; 值: number }[]): DCBreakdown`
  - `judgeRoll(d20: number, 检定值: number, dc: number): CraftResult`（自然 1/20 优先于总值）
  - `fluctuate(基准: number, rand: () => number): number`（正数在 [round(0.8×基准), 基准] 取整；≤0 原样返回）
  - `autoPick(bag: Bag, codex: Record<string, 材料档案条目>, 类别: MaterialCategory, 需要: number, exclude: string[]): { 物品名: string; 数量: number }[] | null`
  - `interface CraftInput`（见代码）、`interface CraftOutcome { 结果; d20; 检定值; DC; 扣减; 新增; HP伤害; 摘要 }`
  - `validateCraft(input: CraftInput, bag: Bag): string[]`（返回失败原因列表，空=可制作）
  - `executeCraft(input: CraftInput, d20: number, rand: () => number): CraftOutcome`

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/__tests__/craft.test.ts
import { describe, expect, it } from 'vitest';
import type { Bag } from '../../market/settle';
import type { 配方 } from '../recipes';
import { STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES } from '../recipes';
import { autoPick, computeDC, executeCraft, fluctuate, judgeRoll, validateCraft, type CraftInput } from '../craft';

const 锻造武器白 = TEMPLATE_RECIPES.find(r => r.名称 === '锻造·武器（白色）')!;
const 锻造武器蓝 = TEMPLATE_RECIPES.find(r => r.名称 === '锻造·武器（蓝色）')!;
const 治疗药剂 = STANDARD_GOODS_RECIPES.find(r => r.名称 === '基础治疗药剂')!;

function makeInput(patch: Partial<CraftInput> = {}): CraftInput {
  return {
    配方: 锻造武器白,
    阶位: 1,
    子类型: '短剑',
    副属性: 'AGI',
    数量: 1,
    核心材料: { 物品名: '精铁', 数量: 2 },
    辅料: [{ 物品名: '兽骨', 数量: 3 }],
    缺图纸: false,
    越阶材料: false,
    劣质材料: false,
    设施: { 修正: 0, 仅白色: false, 标签: '回廊主城设施' },
    制作者: {
      姓名: '老狼',
      阶位上限: 3,
      基础属性: { STR: 8, AGI: 6, CON: 6, PER: 7 },
      属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 },
      技能: { 分类: '基础', 阶位: 3, 等级: 3 },
      职业名: '无',
    },
    ...patch,
  };
}

const bag: Bag = {
  精铁: { 名称: '精铁', 描述: '好铁', 数量: 5 },
  兽骨: { 名称: '兽骨', 描述: '', 数量: 3 },
  月光草: { 名称: '月光草', 描述: '', 数量: 9 },
};

describe('computeDC · 世界书公式', () => {
  it('白一阶无修正 = 10', () => {
    expect(computeDC('白色', 1, []).最终).toBe(10);
  });
  it('金三阶 = floor(20×(1+2/1.4)) = 48', () => {
    expect(computeDC('金色', 3, []).最终).toBe(48);
  });
  it('蓝二阶缺图纸+5 = floor(20×(1+1/1.4)) = 34', () => {
    expect(computeDC('蓝色', 2, [{ 项: '缺图纸', 值: 5 }]).最终).toBe(34);
  });
});

describe('judgeRoll · 五档判定', () => {
  it('自然1恒大失败，自然20恒杰作（优先于总值）', () => {
    expect(judgeRoll(1, 99, 10)).toBe('大失败');
    expect(judgeRoll(20, 5, 30)).toBe('杰作');
  });
  it('总值分档：<DC 失败 / DC~DC+5 成功 / DC+5~DC+10 精制', () => {
    expect(judgeRoll(5, 9, 10)).toBe('失败');
    expect(judgeRoll(5, 10, 10)).toBe('成功');
    expect(judgeRoll(5, 14, 10)).toBe('成功');
    expect(judgeRoll(5, 15, 10)).toBe('精制');
  });
});

describe('fluctuate · 成功档波动', () => {
  it('基准10在[8,10]内', () => {
    for (let i = 0; i < 100; i++) {
      const v = fluctuate(10, Math.random);
      expect(v).toBeGreaterThanOrEqual(8);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
  it('基准1不会因取整恒为0', () => {
    expect(fluctuate(1, () => 0.5)).toBe(1);
  });
  it('非正基准原样返回', () => {
    expect(fluctuate(0, Math.random)).toBe(0);
    expect(fluctuate(-3, Math.random)).toBe(-3);
  });
});

describe('autoPick · 辅料自动拣选', () => {
  const codex = { 精铁: { 类别: '金属' as const, 品质: '白色' as const, 阶位: 1 } };
  it('按类别拣选并排除核心', () => {
    const picks = autoPick(bag, codex, '金属', 4, ['兽骨']);
    expect(picks).toEqual([{ 物品名: '精铁', 数量: 4 }]);
  });
  it('任意类别拣一切；数量不足返回 null', () => {
    expect(autoPick(bag, codex, '任意', 3, ['精铁'])?.length).toBeGreaterThan(0);
    expect(autoPick(bag, codex, '金属', 99, [])).toBeNull();
  });
});

describe('validateCraft · 前置校验', () => {
  it('金/紫配方拦截（v2 开放）', () => {
    const 金配方 = { ...锻造武器白, 品质: '金色' as const, 名称: '锻造·武器（金色）' };
    expect(validateCraft(makeInput({ 配方: 金配方 }), bag)[0]).toContain('v2');
  });
  it('阶位超过契约者/技能上限', () => {
    expect(validateCraft(makeInput({ 阶位: 4 }), bag)[0]).toContain('阶位');
    expect(validateCraft(makeInput({ 阶位: 4, 制作者: { ...makeInput().制作者, 阶位上限: 5 } }), bag)[0]).toContain('技能阶位');
  });
  it('未掌握生活技能', () => {
    const no = makeInput();
    no.制作者.技能 = undefined;
    expect(validateCraft(no, bag)[0]).toContain('锻造');
  });
  it('技能等级不足做蓝色', () => {
    const input = makeInput({ 配方: 锻造武器蓝 });
    input.制作者.技能 = { 分类: '基础', 阶位: 3, 等级: 1 };
    expect(validateCraft(input, bag)[0]).toContain('Lv');
  });
  it('野外仅可做白色', () => {
    const input = makeInput({ 配方: 锻造武器蓝, 设施: { 修正: 3, 仅白色: true, 标签: '野外简陋环境' } });
    expect(validateCraft(input, bag)[0]).toContain('白色');
  });
  it('材料不足', () => {
    expect(validateCraft(makeInput({ 核心材料: { 物品名: '精铁', 数量: 99 } }), bag)[0]).toContain('精铁');
  });
  it('一切就绪返回空', () => {
    expect(validateCraft(makeInput(), bag)).toEqual([]);
  });
});

describe('executeCraft · 制作执行', () => {
  it('成功：扣全部材料，产出精铁短剑（波动数值）', () => {
    const out = executeCraft(makeInput(), 3, () => 0.5); // 3+8+3=14，DC10 ≤ 14 < 15
    expect(out.结果).toBe('成功');
    expect(out.检定值).toBe(3 + 8 + 3);
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '兽骨', 数量: 3 },
    ]);
    const p = out.新增[0] as any;
    expect(p.名称).toBe('精铁短剑');
    expect(p.类型).toBe('武器');
    expect(p.伤害骰).toBe('2d6');
    expect(p.主属性).toBe('STR');
    expect(p.副属性).toBe('AGI');
    expect(out.HP伤害).toBe(0);
  });
  it('精制：数值取满值', () => {
    const out = executeCraft(makeInput(), 15, () => 0.5); // 15+8+3=26 ≥ DC+5
    expect(out.结果).toBe('精制');
    expect((out.新增[0] as any).主属性加成).toBe(1);
  });
  it('杰作：品质升档（白→蓝，骰面 d6→d8），署名刻印', () => {
    const out = executeCraft(makeInput(), 20, () => 0.5);
    expect(out.结果).toBe('杰作');
    const p = out.新增[0] as any;
    expect(p.品质).toBe('蓝色');
    expect(p.伤害骰).toBe('2d8');
    expect(p.描述).toContain('老狼');
  });
  it('失败：核心损毁50%（向上取整），辅料保留，产出灰色废料', () => {
    const out = executeCraft(makeInput({ 配方: 锻造武器蓝 }), 2, () => 0.5); // 2+8+3=13 < DC15
    expect(out.结果).toBe('失败');
    expect(out.扣减).toEqual([{ 物品名: '精铁', 数量: 1 }]);
    expect((out.新增[0] as any).名称).toBe('灰色废料');
  });
  it('大失败：材料全毁，HP伤害=阶位×10', () => {
    const out = executeCraft(makeInput(), 1, () => 0.5);
    expect(out.结果).toBe('大失败');
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '兽骨', 数量: 3 },
    ]);
    expect(out.新增).toEqual([]);
    expect(out.HP伤害).toBe(10);
  });
  it('消耗品批量×3：成品数量3、带自制标记，恢复量=固定值×阶位+修正×阶位系数', () => {
    const input = makeInput({
      配方: 治疗药剂,
      子类型: '',
      数量: 3,
      核心材料: { 物品名: '月光草', 数量: 6 },
      辅料: [],
    });
    const out = executeCraft(input, 12, () => 0.99); // 12+7+3=22 精制
    expect(out.结果).toBe('精制');
    const p = out.新增[0] as any;
    expect(p.名称).toBe('基础治疗药剂');
    expect(p.数量).toBe(3);
    expect(p.自制).toBe(true);
    expect(p.描述).toContain('22'); // 20×1 + 2×1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/craft.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/craft.ts
// ================================================================
// 制作核心：DC 计算 / 五档判定 / 成功档波动 / 材料消耗 / 成品生成（纯函数）
// ================================================================
import type { Bag } from '../market/settle';
import type { MarketItemSnapshot } from '../market/priceTable';
import {
  ARMOR_NAME, TIER_COEF, TIER_NAMES, armorStats, attrBonus, nextQuality,
  weaponStats, wearThreshold, type ArmorSpectrum, type Attr, type Quality,
} from './equipTables';
import { GOODS_BASE, INDUSTRY_ATTR, type MaterialCategory, type 材料档案条目, type 配方 } from './recipes';

export type CraftResult = '大失败' | '失败' | '成功' | '精制' | '杰作';

export interface DCBreakdown {
  基础: number;
  修正: { 项: string; 值: number }[];
  最终: number;
}

export function computeDC(品质: Quality, 阶位: number, 修正: { 项: string; 值: number }[]): DCBreakdown {
  const 基础 = ({ 白色: 10, 蓝色: 15, 金色: 20, 紫色: 25 } as Record<Quality, number>)[品质];
  const sum = 修正.reduce((s, m) => s + m.值, 0);
  return { 基础, 修正, 最终: Math.floor((基础 + sum) * (1 + (阶位 - 1) / 1.4)) };
}

export function judgeRoll(d20: number, 检定值: number, dc: number): CraftResult {
  if (d20 === 1) return '大失败';
  if (d20 === 20) return '杰作';
  if (检定值 < dc) return '失败';
  if (检定值 < dc + 5) return '成功';
  return '精制';
}

/** 成功档波动：正数在 [round(0.8×基准), 基准] 内取整；非正数原样返回 */
export function fluctuate(基准: number, rand: () => number): number {
  if (基准 <= 0) return 基准;
  return Math.round(基准 * (0.8 + rand() * 0.2));
}

/** 按类别从背包拣材料（排除指定物品），不足返回 null */
export function autoPick(
  bag: Bag,
  codex: Record<string, 材料档案条目>,
  类别: MaterialCategory,
  需要: number,
  exclude: string[],
): { 物品名: string; 数量: number }[] | null {
  const picks: { 物品名: string; 数量: number }[] = [];
  let left = 需要;
  for (const [name, item] of Object.entries(bag)) {
    if (left <= 0) break;
    if (exclude.includes(name)) continue;
    if (类别 !== '任意' && codex[name]?.类别 !== 类别) continue;
    const take = Math.min(Number(item.数量), left);
    if (take > 0) {
      picks.push({ 物品名: name, 数量: take });
      left -= take;
    }
  }
  return left > 0 ? null : picks;
}

export interface CraftInput {
  配方: 配方;
  阶位: number; // 1~5，制作时选定
  子类型: string; // 武器: WEAPON_TABLE 键；防具: ArmorSpectrum；消耗品: ''
  副属性: Attr;
  数量: number; // 批量（≤ 配方.批量上限）
  核心材料: { 物品名: string; 数量: number };
  辅料: { 物品名: string; 数量: number }[];
  缺图纸: boolean;
  越阶材料: boolean;
  劣质材料: boolean;
  设施: { 修正: number; 仅白色: boolean; 标签: string };
  制作者: {
    姓名: string;
    阶位上限: number;
    基础属性: Record<Attr, number>;
    属性修正值: Record<Attr, number>;
    技能?: { 分类: string; 阶位: number; 等级: number };
    职业名: string;
  };
}

export interface CraftOutcome {
  结果: CraftResult;
  d20: number;
  检定值: number;
  DC: DCBreakdown;
  扣减: { 物品名: string; 数量: number }[];
  新增: (MarketItemSnapshot & { 数量: number })[];
  HP伤害: number;
  摘要: string[];
}

export function validateCraft(input: CraftInput, bag: Bag): string[] {
  const errs: string[] = [];
  if (input.配方.品质 === '金色' || input.配方.品质 === '紫色') {
    errs.push('金色/紫色配方需要图纸系统，v2 开放');
    return errs;
  }
  if (input.阶位 > input.制作者.阶位上限) errs.push(`成品阶位超过契约者阶位上限（${input.制作者.阶位上限}）`);
  const sk = input.制作者.技能;
  if (!sk) {
    errs.push(`未掌握生活技能「${input.配方.行业}」`);
    return errs;
  }
  if (input.阶位 > sk.阶位) errs.push(`生活技能阶位不足（技能${sk.阶位}阶 < 成品${input.阶位}阶）`);
  const 需要等级 = input.配方.技能要求.等级;
  if (sk.等级 < 需要等级) errs.push(`技能等级不足：需要 Lv.${需要等级}，当前 Lv.${sk.等级}`);
  if (input.设施.仅白色 && input.配方.品质 !== '白色') errs.push('野外简陋环境仅可制作白色品质');
  if (input.数量 > input.配方.批量上限) errs.push(`批量超过上限（${input.配方.批量上限}）`);
  const 全部投入 = [input.核心材料, ...input.辅料];
  for (const m of 全部投入) {
    const have = Number(bag[m.物品名]?.数量 ?? 0);
    if (have < m.数量) errs.push(`「${m.物品名}」数量不足：现有 ${have}，需要 ${m.数量}`);
  }
  return errs;
}

/** 装备成品生成 */
function buildEquip(input: CraftInput, 结果: CraftResult, rand: () => number): MarketItemSnapshot & { 数量: number } {
  const q = 结果 === '杰作' ? nextQuality(input.配方.品质) : input.配方.品质;
  const full = 结果 === '精制' || 结果 === '杰作';
  const roll = (b: number) => (full ? b : fluctuate(b, rand));
  const tier = input.阶位;
  const core = input.核心材料.物品名;
  const 主属性 = INDUSTRY_ATTR[input.配方.行业][0];
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手制造，永久刻印。` : '';

  if (input.配方.装备子类 === '武器') {
    const w = weaponStats(input.子类型, tier, q);
    const b = attrBonus('武器', tier, q);
    return {
      名称: `${core}${input.子类型}`, 类型: '武器', 品质: q, 阶位: TIER_NAMES[tier - 1],
      穿戴门槛: '无', 强化等级: 0, 伤害骰: w.伤害骰, 倍率: w.倍率,
      主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
      装备防御: 0, 装备闪避: 0, 负重: w.负重, 效果: {},
      描述: `手工制作的${q}${input.子类型}，以${core}为核心材料打造。${署名}`, 数量: 1,
    };
  }
  // 防具
  const 光谱 = input.子类型 as ArmorSpectrum;
  const a = armorStats(光谱, tier, q);
  const b = attrBonus('躯干', tier, q);
  return {
    名称: `${core}${ARMOR_NAME[光谱]}`, 类型: '防具', 品质: q, 阶位: TIER_NAMES[tier - 1],
    穿戴门槛: wearThreshold(光谱, tier, q), 强化等级: 0, 伤害骰: '无', 倍率: 0,
    主属性, 副属性: input.副属性, 主属性加成: roll(b.主), 副属性加成: roll(b.副),
    装备防御: roll(a.装备防御), 装备闪避: roll(a.装备闪避), 负重: a.负重, 效果: {},
    描述: `手工制作的${q}${ARMOR_NAME[光谱]}，以${core}为核心材料打造。${署名}`, 数量: 1,
  };
}

/** 消耗品成品生成（恢复量=固定值×阶位+属性修正×阶位系数；固定值/倍率均为设计填补） */
function buildGoods(input: CraftInput, 结果: CraftResult, rand: () => number): MarketItemSnapshot & { 数量: number } {
  const base = GOODS_BASE[input.配方.名称];
  const tier = input.阶位;
  const q = input.配方.品质;
  const 署名 = 结果 === '杰作' ? `\n署名：由${input.制作者.姓名}亲手调制，永久刻印。` : '';
  let 效果描述 = '';
  if (base && (base.类别 === '恢复HP' || base.类别 === '恢复MP')) {
    const full = 结果 === '精制' || 结果 === '杰作';
    const 固定 = (full ? base.固定值 : fluctuate(base.固定值, rand)) * (结果 === '杰作' ? 1.5 : 1);
    const 恢复量 = Math.round(固定 * tier + input.制作者.属性修正值[base.关联属性] * TIER_COEF[tier]);
    效果描述 = `${base.类别 === '恢复HP' ? '恢复HP' : '恢复MP'} ${恢复量}点。`;
  } else if (base && base.类别 === '爆炸物') {
    const 骰数 = (q === '白色' ? 2 : 4) * tier; // 世界书一阶白2d6/蓝4d6，高阶骰数×阶位（设计填补）
    const 加值 = input.制作者.属性修正值[base.关联属性] * TIER_COEF[tier];
    效果描述 = `爆炸伤害 ${骰数}d6+${加值}。`;
  } else if (base) {
    效果描述 = `${base.类别}用品。`;
  }
  return {
    名称: input.配方.名称, 类型: '消耗品', 品质: q, 阶位: TIER_NAMES[tier - 1],
    自制: true, 毒性值: tier,
    描述: `${效果描述}（自制品：同类连用效果减半，含毒性需医疗中心净化）${署名}`,
    数量: input.数量,
  };
}

export function executeCraft(input: CraftInput, d20: number, rand: () => number): CraftOutcome {
  const 修正 = [
    ...(input.缺图纸 ? [{ 项: '缺图纸', 值: 5 }] : []),
    ...(input.越阶材料 ? [{ 项: '越阶高级材料代替', 值: -2 }] : []),
    ...(input.劣质材料 ? [{ 项: '劣质材料替代', 值: 3 }] : []),
    ...(input.设施.修正 !== 0 ? [{ 项: input.设施.标签, 值: input.设施.修正 }] : []),
  ];
  const DC = computeDC(input.配方.品质, input.阶位, 修正);
  const attr值 = Math.max(...INDUSTRY_ATTR[input.配方.行业].map(a => input.制作者.基础属性[a]));
  const 技能等级 = input.制作者.技能?.等级 ?? 0;
  const 检定值 = d20 + attr值 + 技能等级;
  const 结果 = judgeRoll(d20, 检定值, DC.最终);

  const 全部投入 = [input.核心材料, ...input.辅料];
  let 扣减: CraftOutcome['扣减'] = [];
  let 新增: CraftOutcome['新增'] = [];
  let HP伤害 = 0;

  if (结果 === '大失败') {
    扣减 = 全部投入.map(m => ({ ...m }));
    HP伤害 = input.阶位 * 10;
  } else if (结果 === '失败') {
    扣减 = [{ 物品名: input.核心材料.物品名, 数量: Math.ceil(input.核心材料.数量 / 2) }];
    新增 = [{ 名称: '灰色废料', 描述: '制作失败留下的残渣，毫无价值。', 数量: input.数量 }];
  } else {
    扣减 = 全部投入.map(m => ({ ...m }));
    const product = input.配方.成品类型 === '装备' ? buildEquip(input, 结果, rand) : buildGoods(input, 结果, rand);
    新增 = [product];
  }

  return {
    结果, d20, 检定值, DC, 扣减, 新增, HP伤害,
    摘要: [
      `D20=${d20} + 基础属性${attr值} + 技能Lv.${技能等级} = ${检定值} vs DC${DC.最终}`,
      `结果：${结果}`,
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/wxhl-003/crafting/__tests__/craft.test.ts`
Expected: PASS（若断言与实现小数点细节不符，以世界书锚点为准修实现，不改测试意图）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/craft.ts src/wxhl-003/crafting/__tests__/craft.test.ts
git commit -m "feat(wxhl): 工坊制作核心——DC公式/五档判定/材料消耗/成品生成（纯函数）"
```

---

### Task 4: store.ts —— pinia 集成（MVU 读写 + 材料档案持久化）

**Files:**
- Create: `src/wxhl-003/crafting/store.ts`

**Interfaces:**
- Consumes: Task 2/3 全部；`../dice` 的 `rollDie(faces: number): number` 与 `归一位阶(阶位: unknown): number | undefined`；`../market/settle` 的 `bagAdd/bagRemove/Bag`
- Produces: `useCraftingStore`（供 Task 5 使用）：
  - state: `codex: Ref<Record<string, 材料档案条目>>`、`playerName/playerTier/playerUP: Ref<string|number>`、`bag: Ref<Bag>`、`lastOutcome: Ref<CraftOutcome | null>`、`lastError: Ref<string>`
  - `allRecipes: ComputedRef<配方[]>`（模板+标准）
  - `syncFromMvu(): boolean`、`facilityInfo(): { 修正: number; 仅白色: boolean; 标签: string }`
  - `matchMaterials(类别: MaterialCategory): string[]`、`setCodex(name: string, patch: Partial<材料档案条目>): void`
  - `doCraft(args: { 配方: 配方; 阶位: number; 子类型: string; 副属性: Attr; 数量: number; 核心材料名: string; 越阶材料: boolean; 劣质材料: boolean }): Promise<CraftOutcome | null>`

- [ ] **Step 1: Write implementation**

```ts
// src/wxhl-003/crafting/store.ts
// ================================================================
// 工坊 store：MVU 读写严格照 market/store.ts writeToSave 模式
// （楼层探测 → _.set → replaceMvuData → 回读校验）
// 材料档案持久化到小手机聊天变量（键 wxhl003_crafting），主卡 schema 零改动
// ================================================================
import { rollDie, 归一位阶 } from '../dice';
import type { MarketItemSnapshot } from '../market/priceTable';
import { bagAdd, bagRemove, type Bag } from '../market/settle';
import {
  autoPick, executeCraft, validateCraft, type CraftInput, type CraftOutcome,
} from './craft';
import {
  STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES,
  type MaterialCategory, type 材料档案条目, type 配方,
} from './recipes';
import type { Attr } from './equipTables';
import { 启发式归类 } from './recipes';

const CHAT_KEY = 'wxhl003_crafting';

function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) {
    return null;
  }
}

async function commit(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
  await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  const after = Mvu.getMvuData({ type: 'message', message_id: mid });
  for (const [path, expectVal] of checks) {
    const got = _.get(after, path);
    if (expectVal === undefined ? got !== undefined : !_.isEqual(got, expectVal)) {
      toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
    }
  }
}

function loadCodex(): Record<string, 材料档案条目> {
  try {
    const vars = getVariables({ type: 'chat' }) as any;
    return vars?.[CHAT_KEY]?.材料档案 ?? {};
  } catch (_) {
    return {};
  }
}

export const useCraftingStore = defineStore('wxhl003-crafting', () => {
  const codex = ref<Record<string, 材料档案条目>>(loadCodex());
  const playerName = ref('无名契约者');
  const playerTier = ref('一阶');
  const playerUP = ref(0);
  const bag = ref<Bag>({});
  const lastOutcome = ref<CraftOutcome | null>(null);
  const lastError = ref('');

  const allRecipes = computed<配方[]>(() => [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]);

  // 材料档案变更 → 读-并-写聊天变量（不覆盖其他 key）
  watchEffect(() => {
    try {
      const vars = (getVariables({ type: 'chat' }) ?? {}) as any;
      replaceVariables({ ...vars, [CHAT_KEY]: { 材料档案: klona(codex.value) } }, { type: 'chat' });
    } catch (_) {}
  });

  function syncFromMvu(): boolean {
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量（契约者不存在）';
      return false;
    }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    playerTier.value = String(r.c.头部?.阶位 ?? '一阶');
    playerUP.value = Number(r.c.经济?.UP ?? 0);
    bag.value = (r.c.背包 ?? {}) as Bag;
    lastError.value = '';
    return true;
  }

  /** 设施判定：回廊主城/店铺工作台 vs 野外简陋 */
  function facilityInfo(): { 修正: number; 仅白色: boolean; 标签: string } {
    const r = readContractor();
    const world = String(r?.c?.当前世界 ?? '');
    if (world === '回廊') {
      const list = Object.values(r?.c?.个人产业?.当前店铺?.设施清单 ?? {}).join(' ');
      if (list.includes('顶级全套工坊')) return { 修正: -3, 仅白色: false, 标签: '店铺·顶级全套工坊' };
      if (list.includes('中级工作台')) return { 修正: -1, 仅白色: false, 标签: '店铺·中级工作台' };
      return { 修正: 0, 仅白色: false, 标签: '回廊主城设施' };
    }
    return { 修正: 3, 仅白色: true, 标签: '野外简陋环境' };
  }

  /** 材料档案：未归档物品按启发式自动归档 */
  function codexOf(name: string): 材料档案条目 {
    if (!codex.value[name]) {
      codex.value[name] = { 类别: 启发式归类(name), 品质: '白色', 阶位: 1 };
    }
    return codex.value[name];
  }

  function matchMaterials(类别: MaterialCategory): string[] {
    return Object.keys(bag.value).filter(n => 类别 === '任意' || codexOf(n).类别 === 类别);
  }

  function setCodex(name: string, patch: Partial<材料档案条目>): void {
    codex.value[name] = { ...codexOf(name), ...patch };
  }

  async function doCraft(args: {
    配方: 配方;
    阶位: number;
    子类型: string;
    副属性: Attr;
    数量: number;
    核心材料名: string;
    越阶材料: boolean;
    劣质材料: boolean;
  }): Promise<CraftOutcome | null> {
    if (!syncFromMvu()) return null;
    const r = readContractor();
    if (!r) return null;
    const c = r.c;

    const sk = c.通用技能?.[args.配方.行业];
    const 制作者: CraftInput['制作者'] = {
      姓名: playerName.value,
      阶位上限: 归一位阶(playerTier.value) ?? 1,
      基础属性: {
        STR: Number(c.属性?.基础?.STR ?? 5), AGI: Number(c.属性?.基础?.AGI ?? 5),
        CON: Number(c.属性?.基础?.CON ?? 5), PER: Number(c.属性?.基础?.PER ?? 5),
      },
      属性修正值: {
        STR: Number(c.属性?.属性修正值?.STR ?? 0), AGI: Number(c.属性?.属性修正值?.AGI ?? 0),
        CON: Number(c.属性?.属性修正值?.CON ?? 0), PER: Number(c.属性?.属性修正值?.PER ?? 0),
      },
      技能: sk
        ? { 分类: String(sk.分类 ?? '基础'), 阶位: 归一位阶(sk.阶位) ?? 1, 等级: Number(sk.等级 ?? 1) }
        : undefined,
      职业名: String(c.职业?.名称 ?? '无'),
    };

    // 核心材料 = 玩家选定；辅料 = autoPick 自动拣选（排除核心物品）
    const 核心需求 = args.配方.材料.find(m => m.核心);
    const 核心材料 = { 物品名: args.核心材料名, 数量: (核心需求?.数量 ?? 1) * args.数量 };
    const 辅料: { 物品名: string; 数量: number }[] = [];
    for (const req of args.配方.材料.filter(m => !m.核心)) {
      const picks = autoPick(bag.value, codex.value, req.类别, req.数量 * args.数量, [args.核心材料名]);
      if (!picks) {
        toastr.error(`辅料不足：需要 ${req.类别}×${req.数量 * args.数量}`);
        return null;
      }
      辅料.push(...picks);
    }

    const input: CraftInput = {
      配方: args.配方, 阶位: args.阶位, 子类型: args.子类型, 副属性: args.副属性,
      数量: args.数量, 核心材料, 辅料,
      缺图纸: false, 越阶材料: args.越阶材料, 劣质材料: args.劣质材料,
      设施: facilityInfo(), 制作者,
    };

    const errs = validateCraft(input, bag.value);
    if (errs.length > 0) {
      toastr.error(errs[0]);
      lastError.value = errs[0];
      return null;
    }

    const d20 = rollDie(20);
    const outcome = executeCraft(input, d20, Math.random);

    // 应用背包变动 + 炸炉扣血，一次性落档
    let newBag = klona(bag.value) as Bag;
    try {
      for (const d of outcome.扣减) newBag = bagRemove(newBag, d.物品名, d.数量);
      for (const it of outcome.新增) newBag = bagAdd(newBag, it as MarketItemSnapshot, Number(it.数量 ?? 1));
    } catch (e: any) {
      toastr.error('背包结算失败: ' + (e?.message ?? e));
      return null;
    }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], newBag);
    if (outcome.HP伤害 > 0) {
      const hp = Number(_.get(r.mvu, ['stat_data', '契约者', '衍生属性', 'HP_当前']) ?? 0);
      _.set(r.mvu, ['stat_data', '契约者', '衍生属性', 'HP_当前'], Math.max(0, hp - outcome.HP伤害));
    }
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '背包'], newBag]]);

    lastOutcome.value = outcome;
    syncFromMvu();
    if (outcome.结果 === '大失败') toastr.error(`炸炉！材料全毁，受到 ${outcome.HP伤害} 点伤害`);
    else if (outcome.结果 === '失败') toastr.warning('制作失败，核心材料损毁一半');
    else toastr.success(`制作${outcome.结果}！`);
    return outcome;
  }

  return {
    codex, playerName, playerTier, playerUP, bag, lastOutcome, lastError,
    allRecipes, syncFromMvu, facilityInfo, matchMaterials, setCodex, doCraft,
  };
});
```

- [ ] **Step 2: Type-check via build**

Run: `pnpm build`
Expected: webpack 零 error（crafting/store.ts 编译通过；dist 产物生成）

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-003/crafting/store.ts
git commit -m "feat(wxhl): 工坊 store——MVU读写+材料档案聊天变量持久化+制作动作"
```

---

### Task 5: CraftingView.vue + App.vue 桌面接线

**Files:**
- Create: `src/wxhl-003/crafting/CraftingView.vue`
- Modify: `src/wxhl-003/App.vue`（6 处锚点，见 Step 2）

**Interfaces:**
- Consumes: Task 4 的 `useCraftingStore` 全部导出；Task 1 的 `WEAPON_TABLE`/`ArmorSpectrum`（子类型选项）；Task 3 的 `computeDC`（DC 预览）
- Produces: `CraftingView.vue`（emit `close`）；App.vue 新增 `'crafting'` view

- [ ] **Step 1: Write CraftingView.vue**

```vue
// src/wxhl-003/crafting/CraftingView.vue
<template>
  <div class="crf-page">
    <div class="crf-header">
      <button class="hdr-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <span class="hdr-title">工坊</span>
      <span class="hdr-up">{{ store.playerUP }} UP</span>
      <button class="hdr-btn" @click="store.syncFromMvu()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
      </button>
    </div>

    <div class="crf-tabs">
      <button v-for="t in TABS" :key="t.key" class="crf-tab" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <div v-if="store.lastError" class="crf-error">{{ store.lastError }}</div>

    <!-- ============ 配方 ============ -->
    <div v-if="tab === 'recipes'" class="crf-body">
      <div v-for="r in store.allRecipes" :key="r.名称" class="crf-card" @click="pickRecipe(r)">
        <div class="cc-head">
          <span class="cc-name" :class="r.品质 === '蓝色' ? 'q-blue' : 'q-white'">{{ r.名称 }}</span>
          <span class="cc-tag">{{ r.行业 }}</span>
        </div>
        <div class="cc-line">材料：{{ r.材料.map(m => `${m.类别}×${m.数量}${m.核心 ? '(核心)' : ''}`).join(' + ') }}</div>
        <div class="cc-line">要求：{{ r.技能要求.分类 }}技能 Lv.{{ r.技能要求.等级 }}<template v-if="r.批量上限 > 1"> · 可批量×{{ r.批量上限 }}</template></div>
      </div>
    </div>

    <!-- ============ 制作 ============ -->
    <div v-if="tab === 'craft'" class="crf-body">
      <div v-if="!form.配方" class="crf-empty">先去「配方」页选一个配方</div>
      <template v-else>
        <div class="crf-card">
          <div class="cc-head"><span class="cc-name">{{ form.配方.名称 }}</span><span class="cc-tag">{{ 设施标签 }}</span></div>
          <div class="cc-line">成品类型：{{ form.配方.成品类型 }}{{ form.配方.装备子类 ? ' · ' + form.配方.装备子类 : '' }}</div>
        </div>

        <div class="crf-form">
          <label v-if="form.配方.来源 === '模板'">阶位
            <select v-model.number="form.阶位">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '武器'">武器类型
            <select v-model="form.子类型">
              <option v-for="w in weaponTypes" :key="w" :value="w">{{ w }}</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '防具'">防具类型
            <select v-model="form.子类型">
              <option v-for="s in armorTypes" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>
          <label v-if="form.配方.成品类型 === '装备'">副属性
            <select v-model="form.副属性">
              <option v-for="a in ATTRS" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
          <label v-if="form.配方.批量上限 > 1">数量
            <input v-model.number="form.数量" type="number" min="1" :max="form.配方.批量上限" />
          </label>
          <label>核心材料（{{ 核心类别 }}）
            <select v-model="form.核心材料名">
              <option v-for="n in coreCandidates" :key="n" :value="n">{{ n }}（×{{ store.bag[n]?.数量 }}）</option>
            </select>
          </label>
          <label class="crf-check"><input v-model="form.越阶材料" type="checkbox" /> 越阶高级材料代替（DC-2）</label>
          <label class="crf-check"><input v-model="form.劣质材料" type="checkbox" /> 劣质材料替代（DC+3）</label>
        </div>

        <div class="crf-dc">DC 预览：{{ dcPreview }}（D20+基础属性+技能Lv ≥ DC）</div>
        <button class="crf-go" :disabled="!form.核心材料名" @click="go">开工</button>

        <div v-if="store.lastOutcome" class="crf-result" :class="'r-' + store.lastOutcome.结果">
          <div class="cr-title">制作{{ store.lastOutcome.结果 }}</div>
          <div v-for="(s, i) in store.lastOutcome.摘要" :key="i" class="cc-line">{{ s }}</div>
          <div v-for="p in store.lastOutcome.新增" :key="p.名称" class="crf-card">
            <div class="cc-head"><span class="cc-name">{{ p.名称 }}</span><span class="cc-tag">×{{ p.数量 }}</span></div>
            <div class="cc-line">{{ p.描述 }}</div>
          </div>
          <div v-if="store.lastOutcome.HP伤害 > 0" class="crf-error">炸炉伤害：-{{ store.lastOutcome.HP伤害 }} HP</div>
        </div>
      </template>
    </div>

    <!-- ============ 材料 ============ -->
    <div v-if="tab === 'materials'" class="crf-body">
      <div class="cc-line crf-hint">自动归类有误？在这里修正，会记住到本聊天。</div>
      <div v-for="(item, name) in store.bag" :key="name" class="crf-card">
        <div class="cc-head"><span class="cc-name">{{ name }}</span><span class="cc-tag">×{{ item.数量 }}</span></div>
        <div class="cc-line">
          类别：
          <select :value="store.codex[name]?.类别 ?? '未分类'" @change="store.setCodex(String(name), { 类别: ($event.target as HTMLSelectElement).value as any })">
            <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { computeDC } from './craft';
import { WEAPON_TABLE, type ArmorSpectrum, type Attr } from './equipTables';
import { 材料类别, type 配方 } from './recipes';
import { useCraftingStore } from './store';

const emit = defineEmits<{ close: [] }>();
const store = useCraftingStore();

const TABS = [
  { key: 'recipes', label: '配方' },
  { key: 'craft', label: '制作' },
  { key: 'materials', label: '材料' },
] as const;
const tab = ref<(typeof TABS)[number]['key']>('recipes');

const ATTRS: Attr[] = ['STR', 'AGI', 'CON', 'PER'];
const CATS = [...材料类别.filter(c => c !== '任意'), '未分类'];
const weaponTypes = Object.keys(WEAPON_TABLE);
const armorTypes: ArmorSpectrum[] = ['极轻', '轻装', '中装', '重装', '极重'];

const form = reactive({
  配方: null as 配方 | null,
  阶位: 1,
  子类型: '',
  副属性: 'AGI' as Attr,
  数量: 1,
  核心材料名: '',
  越阶材料: false,
  劣质材料: false,
});

const 设施标签 = computed(() => store.facilityInfo().标签);
const 核心类别 = computed(() => form.配方?.材料.find(m => m.核心)?.类别 ?? '任意');
const coreCandidates = computed(() => store.matchMaterials(核心类别.value));
const dcPreview = computed(() => {
  if (!form.配方) return '-';
  const 修正 = [
    ...(form.越阶材料 ? [{ 项: '越阶高级材料代替', 值: -2 }] : []),
    ...(form.劣质材料 ? [{ 项: '劣质材料替代', 值: 3 }] : []),
    ...(store.facilityInfo().修正 !== 0 ? [{ 项: 设施标签.value, 值: store.facilityInfo().修正 }] : []),
  ];
  return computeDC(form.配方.品质, form.阶位, 修正).最终;
});

function pickRecipe(r: 配方) {
  form.配方 = r;
  form.阶位 = r.来源 === '模板' ? 1 : r.阶位 || 1;
  form.子类型 = r.装备子类 === '武器' ? weaponTypes[2] : r.装备子类 === '防具' ? '轻装' : '';
  form.数量 = 1;
  form.核心材料名 = '';
  store.syncFromMvu();
  tab.value = 'craft';
}

async function go() {
  if (!form.配方) return;
  await store.doCraft({
    配方: form.配方,
    阶位: form.阶位,
    子类型: form.子类型,
    副属性: form.副属性,
    数量: form.数量,
    核心材料名: form.核心材料名,
    越阶材料: form.越阶材料,
    劣质材料: form.劣质材料,
  });
}

onMounted(() => store.syncFromMvu());
</script>

<style scoped>
.crf-page { display: flex; flex-direction: column; height: 100%; font-size: 13px; }
.crf-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(127,127,127,.25); }
.hdr-btn { background: none; border: none; cursor: pointer; padding: 4px; }
.hdr-btn svg { width: 18px; height: 18px; }
.hdr-title { font-weight: 700; flex: 1; }
.hdr-up { font-size: 12px; opacity: .8; }
.crf-tabs { display: flex; border-bottom: 1px solid rgba(127,127,127,.25); }
.crf-tab { flex: 1; padding: 8px 0; background: none; border: none; cursor: pointer; opacity: .6; }
.crf-tab.active { opacity: 1; font-weight: 700; border-bottom: 2px solid currentColor; }
.crf-body { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.crf-card { border: 1px solid rgba(127,127,127,.3); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.cc-head { display: flex; justify-content: space-between; align-items: center; }
.cc-name { font-weight: 700; }
.q-blue { color: #4a90d9; }
.cc-tag { font-size: 11px; opacity: .7; }
.cc-line { font-size: 12px; opacity: .85; margin-top: 4px; }
.crf-form { display: flex; flex-direction: column; gap: 8px; }
.crf-form label { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; }
.crf-form select, .crf-form input { max-width: 60%; }
.crf-check { justify-content: flex-start !important; }
.crf-dc { font-size: 12px; opacity: .8; }
.crf-go { padding: 10px; border-radius: 8px; border: none; background: #b8860b; color: #fff; font-weight: 700; cursor: pointer; }
.crf-go:disabled { opacity: .4; cursor: not-allowed; }
.crf-result .cr-title { font-weight: 700; margin-bottom: 4px; }
.r-杰作 .cr-title { color: #d4a017; }
.r-大失败 .cr-title, .crf-error { color: #c0392b; }
.r-失败 .cr-title { color: #e67e22; }
.crf-empty, .crf-hint { opacity: .6; text-align: center; padding: 8px; font-size: 12px; }
</style>
```

- [ ] **Step 2: Wire into App.vue（6 处锚点）**

1. **import**（在 `import MarketView from './market/MarketView.vue';` 后一行，约 2073 行）：
   ```ts
   import CraftingView from './crafting/CraftingView.vue';
   ```
2. **View 类型 union**（约 2137 行，`'desktop' | 'forum' | ... | 'market'`）：在 `'market'` 后加 `| 'crafting'`。
3. **appSubs**（约 2251 行，`market: '以物易物，童叟无欺',` 后一行）：
   ```ts
   crafting: '千锤百炼，巧夺天工',
   ```
4. **openCrafting**（在 `function openMarket() { currentView.value = 'market'; }` 后）：
   ```ts
   function openCrafting() {
     currentView.value = 'crafting';
   }
   ```
5. **桌面图标**：找到 market 图标块（含 `@click="openMarket"` 的 `app-icon-wrapper`，约 138-147 行），整块复制改为：
   ```html
   <div class="app-icon-wrapper" @click="openCrafting">
     <div class="app-icon crafting-icon">🔨</div>
     <span class="app-sub">{{ appSubs.crafting }}</span>
   </div>
   ```
   （图标内部结构与 emoji 以 market 块实际写法为准）
6. **视图挂载**（在 `<div v-if="currentView === 'market'" class="app-page"><MarketView @close="goDesktop" /></div>` 后）：
   ```html
   <!-- ============ CRAFTING ============ -->
   <div v-if="currentView === 'crafting'" class="app-page">
     <CraftingView @close="goDesktop" />
   </div>
   ```
   另在 `<style>` 中找到 `.market-icon` 规则，克隆一条 `.crafting-icon`（同尺寸圆角，底色换一个区分色如 #8b5a2b）。

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: 零 error

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/crafting/CraftingView.vue src/wxhl-003/App.vue
git commit -m "feat(wxhl): 工坊界面上线——桌面图标入口+配方/制作/材料三页签"
```

---

### Task 6: 全量回归

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: 全部 PASS（含 market/dice 等既有测试无回归）

- [ ] **Step 2: Build production**

Run: `pnpm build`
Expected: 零 error，`dist/wxhl-003/index.js` 重新生成

- [ ] **Step 3: Commit（若有 dist 变更需入库）**

```bash
git add -A
git commit -m "chore(wxhl): 工坊 v1 构建产物"
```

---

## Self-Review 记录

- **Spec coverage**：v1 范围（spec §12 v1 行）→ 配方库 UI(T5)、材料档案(T2/T4/T5)、DC+检定+五档(T3)、白/蓝制作(T3)、成品入包+模板描述(T3/T4)、设施判定(T4)。手动编辑成品描述 → 暂由 MVU 变量天然可编辑兜底，UI 编辑器留 v2 随图纸一起做（已在 spec 中）。装备数值表（spec §9 装备部分）→ T1；消耗品公式 → T2/T3。
- **Placeholder scan**：无 TBD/TODO；所有测试与实现代码完整。
- **Type consistency**：`INDUSTRY_ATTR` 定义在 recipes.ts（Task 3 代码块内已标注修正 import 来源）；`材料档案条目`/`配方` 跨 T2→T3→T4→T5 一致；`CraftInput`/`CraftOutcome` 跨 T3→T4 一致；`doCraft` 参数与 T5 调用一致；`codexOf` 在 T4 定义并在 `matchMaterials`/`setCodex` 内使用（同文件，符合"一个任务一个实现者"）。
- **已知留尾巴**（不影响 v1 交付）：图标 CSS 颜色值以 App.vue 实际风格微调；消耗品"状态/弹药/餐食"类描述文案较简，v2 配 AI 吐槽一起丰富。
